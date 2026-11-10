import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  exportCertificatesToCsv,
  formatSecondaryCalendars,
  generateSerialNumber,
  generateVerificationToken,
  hashNationalId,
  maskNationalId,
  signCanonicalPayload,
  type CertificateIssueInput,
  type CertificateRecord,
  type CertificateSignatory,
  type CertificateStats,
  type CertificateStatus,
  type CertificateTemplate,
  type CertificateVerificationResult,
  type CertificateWitness,
  type CertificatesPluginSettings,
  type Ed25519KeyPairMaterial,
} from "../../../shared";
import {
  buildCanonicalPayload,
  evaluateCertificateVerification,
  filterAndComputeCertificateStats,
  normalizeCertificateRecord,
  normalizeSignatories,
  normalizeTemplateRecord,
  normalizeWitnesses,
  renderPrintableFromRecord,
} from "./issuanceHelpers";

const TEMPLATE_UID = "plugin::certificates.template";
const CERTIFICATE_UID = "plugin::certificates.certificate";

interface SettingsServiceContract {
  getSettings(): Promise<CertificatesPluginSettings>;
  getSigningKeyPair(): Promise<Ed25519KeyPairMaterial>;
}

const trimStr = (val: unknown, fallback = ""): string =>
  (val ? String(val).trim() : "") || fallback;

const trimOptStr = (val: unknown): string | undefined =>
  trimStr(val) || undefined;

const pickNonEmptyArray = <T>(primary: T[] | undefined, fallback: T[]): T[] =>
  Array.isArray(primary) && primary.length > 0 ? primary : fallback;

const slugifyName = (name: string, explicitSlug?: string): string =>
  trimStr(explicitSlug) ||
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const DEFAULT_BODY_TEMPLATE =
  "This is to certify that {{recipientFullName}} has been officially attested by {{organizationName}} on {{issuedDateFormatted}}.";

function buildTemplateCreateData(
  name: string,
  data: Partial<CertificateTemplate>,
  settings: CertificatesPluginSettings
) {
  const days = data.defaultValidityDays;
  return {
    name,
    slug: slugifyName(name, data.slug),
    description: trimStr(data.description),
    serialPrefix: trimStr(data.serialPrefix, "CERT").toUpperCase().slice(0, 8),
    defaultValidityDays: typeof days === "number" ? days : null,
    requiresWitnesses: Boolean(data.requiresWitnesses),
    minWitnesses: typeof data.minWitnesses === "number" ? data.minWitnesses : 0,
    requiresApproval: data.requiresApproval !== false,
    organizationName: trimStr(data.organizationName, settings.organizationName),
    organizationSubheader:
      data.organizationSubheader ?? settings.organizationSubheader,
    headerText: trimStr(data.headerText),
    titleText: trimStr(data.titleText, name),
    bodyTemplate: trimStr(data.bodyTemplate, DEFAULT_BODY_TEMPLATE),
    footerText: trimStr(data.footerText),
    defaultSignatories: normalizeSignatories(data.defaultSignatories),
    customFieldsSchema: Array.isArray(data.customFieldsSchema)
      ? data.customFieldsSchema
      : [],
    secondaryCalendars: Array.isArray(data.secondaryCalendars)
      ? data.secondaryCalendars
      : settings.secondaryCalendars,
    accentColor: trimStr(data.accentColor, "#14532d"),
    active: data.active !== false,
  };
}

function assertWitnessCount(
  template: CertificateTemplate | null,
  witnesses: CertificateWitness[],
  enforceNow: boolean
): void {
  if (enforceNow && template?.requiresWitnesses) {
    if (witnesses.length < template.minWitnesses) {
      throw new Error(
        `Template "${template.name}" requires at least ${template.minWitnesses} official witness(es) before issuance`
      );
    }
  }
}

function emitCertEvent(
  strapi: Core.Strapi,
  event: string,
  record: CertificateRecord
) {
  strapi.eventHub?.emit(event, {
    serialNumber: record.serialNumber,
    templateSlug: record.templateSlug,
    status: record.status,
  });
}

function resolveIssueDatesAndIdentity(
  input: CertificateIssueInput,
  template: CertificateTemplate
) {
  const issuedDateObj = input.issuedAt ? new Date(input.issuedAt) : new Date();
  if (Number.isNaN(issuedDateObj.getTime())) {
    throw new Error("Invalid issuedAt date");
  }
  const issuedAt = issuedDateObj.toISOString();
  const days = template.defaultValidityDays;
  const computedExpiry =
    typeof days === "number" && days > 0
      ? new Date(issuedDateObj.getTime() + days * 86_400_000).toISOString()
      : null;
  const serialNumber = generateSerialNumber(
    template.serialPrefix,
    issuedDateObj.getUTCFullYear()
  );
  const rawNationalId = trimOptStr(input.nationalIdRaw);
  return {
    issuedDateObj,
    fields: {
      issuedAt,
      expiresAt: (input.expiresAt ?? computedExpiry) as string | null,
      serialNumber,
      verificationToken: generateVerificationToken(),
      nationalIdMasked: rawNationalId ? maskNationalId(rawNationalId) : "",
      nationalIdHash: rawNationalId
        ? hashNationalId(rawNationalId, serialNumber)
        : "",
    },
  };
}

export interface ApproveCertificateOptions {
  signatories?: CertificateSignatory[];
  witnesses?: Array<{
    fullName: string;
    documentIdRaw?: string;
    documentIdMasked?: string;
    role?: string;
  }>;
  recipientChosenName?: string;
  notes?: string;
}

function resolveApprovalFields(
  existing: CertificateRecord,
  options?: ApproveCertificateOptions
) {
  return {
    witnesses:
      options?.witnesses !== undefined
        ? normalizeWitnesses(options.witnesses)
        : existing.witnesses,
    signatories:
      options?.signatories !== undefined
        ? normalizeSignatories(options.signatories)
        : existing.signatories,
    recipientChosenName:
      options?.recipientChosenName !== undefined
        ? trimStr(options.recipientChosenName)
        : existing.recipientChosenName,
    notes: options?.notes !== undefined ? options.notes : existing.notes,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service<SettingsServiceContract>("settings");

  return {
    async listTemplates(activeOnly = false): Promise<CertificateTemplate[]> {
      const filters = activeOnly ? { active: true } : undefined;
      const docs = await strapi
        .documents(TEMPLATE_UID)
        .findMany({ filters, limit: 100 });
      return docs.map(normalizeTemplateRecord);
    },

    async findTemplate(identifier: {
      templateDocumentId?: string;
      templateSlug?: string;
    }): Promise<CertificateTemplate | null> {
      if (identifier.templateDocumentId) {
        const doc = await strapi.documents(TEMPLATE_UID).findOne({
          documentId: identifier.templateDocumentId,
        });
        if (doc) return normalizeTemplateRecord(doc);
      }
      if (identifier.templateSlug) {
        const [first] = await strapi.documents(TEMPLATE_UID).findMany({
          filters: { slug: identifier.templateSlug },
          limit: 1,
        });
        if (first) return normalizeTemplateRecord(first);
      }
      return null;
    },

    async createTemplate(
      data: Partial<CertificateTemplate>
    ): Promise<CertificateTemplate> {
      const settings = await getSettingsService().getSettings();
      const name = trimStr(data.name);
      if (!name) throw new Error("Template name is required");
      const created = await strapi.documents(TEMPLATE_UID).create({
        data: buildTemplateCreateData(name, data, settings),
      });
      return normalizeTemplateRecord(created);
    },

    async seedDefaultTemplates(): Promise<number> {
      const settings = await getSettingsService().getSettings();
      let seededCount = 0;
      for (const tpl of settings.defaultTemplates || []) {
        if (!(await this.findTemplate({ templateSlug: tpl.slug }))) {
          await this.createTemplate(tpl);
          seededCount++;
        }
      }
      return seededCount;
    },

    async issueCertificate(
      input: CertificateIssueInput
    ): Promise<CertificateRecord> {
      const recipientFullName = trimStr(input.recipientFullName);
      if (!recipientFullName) throw new Error("recipientFullName is required");

      const template = await this.findTemplate({
        templateDocumentId: input.templateDocumentId,
        templateSlug: input.templateSlug,
      });
      if (!template?.active)
        throw new Error("Active certificate template not found");

      const settings = await getSettingsService().getSettings();
      const keyPair = await getSettingsService().getSigningKeyPair();
      const isIssued = input.autoApprove === true || !template.requiresApproval;
      const status: CertificateStatus = isIssued
        ? "issued"
        : "pending_approval";

      const witnesses = normalizeWitnesses(input.witnesses);
      assertWitnessCount(template, witnesses, isIssued);

      const signatories = pickNonEmptyArray(
        normalizeSignatories(input.signatories),
        template.defaultSignatories
      );
      const { issuedDateObj, fields } = resolveIssueDatesAndIdentity(
        input,
        template
      );
      const secondaryDates = formatSecondaryCalendars(
        issuedDateObj,
        pickNonEmptyArray(
          template.secondaryCalendars,
          settings.secondaryCalendars
        ),
        trimStr(input.locale, trimStr(settings.defaultLocale, "en"))
      );

      const signed = signCanonicalPayload(
        buildCanonicalPayload({
          ...fields,
          templateSlug: template.slug,
          organizationName: trimStr(
            template.organizationName,
            settings.organizationName
          ),
          recipientFullName,
          recipientChosenName: input.recipientChosenName,
          signatories,
          witnesses,
        }),
        keyPair.privateKeyPem
      );
      const created = await strapi.documents(CERTIFICATE_UID).create({
        data: {
          ...fields,
          templateDocumentId: template.documentId,
          templateSlug: template.slug,
          templateName: template.name,
          status,
          recipientFullName,
          recipientChosenName: trimStr(input.recipientChosenName),
          recipientEmail: trimOptStr(input.recipientEmail),
          recipientPhone: trimStr(input.recipientPhone),
          recipientNationality: trimStr(input.recipientNationality),
          signatories,
          witnesses,
          customData: input.customData ?? {},
          secondaryDates,
          canonicalPayloadHash: signed.payloadHash,
          cryptographicSignature: signed.signature,
          publicKeyFingerprint: keyPair.fingerprint,
          linkedBookingCode: trimStr(input.linkedBookingCode),
          notes: trimStr(input.notes),
        },
      });

      const record = normalizeCertificateRecord(created, true);
      emitCertEvent(
        strapi,
        isIssued ? "certificates.issued" : "certificates.requested",
        record
      );
      return record;
    },

    async approveCertificate(
      documentId: string,
      options?: ApproveCertificateOptions
    ): Promise<CertificateRecord> {
      const existingDoc = await strapi
        .documents(CERTIFICATE_UID)
        .findOne({ documentId });
      if (!existingDoc) throw new Error("Certificate record not found");

      const existing = normalizeCertificateRecord(existingDoc, true);
      const template = await this.findTemplate({
        templateDocumentId: existing.templateDocumentId,
        templateSlug: existing.templateSlug,
      });

      const { witnesses, signatories, recipientChosenName, notes } =
        resolveApprovalFields(existing, options);
      assertWitnessCount(template, witnesses, true);

      const keyPair = await getSettingsService().getSigningKeyPair();
      const settings = await getSettingsService().getSettings();
      const issuedAt = new Date().toISOString();

      const signed = signCanonicalPayload(
        buildCanonicalPayload({
          ...existing,
          organizationName: trimStr(
            template?.organizationName,
            settings.organizationName
          ),
          recipientChosenName,
          issuedAt,
          signatories,
          witnesses,
        }),
        keyPair.privateKeyPem
      );
      const updated = await strapi.documents(CERTIFICATE_UID).update({
        documentId,
        data: {
          status: "issued",
          issuedAt,
          recipientChosenName: trimStr(recipientChosenName),
          signatories,
          witnesses,
          canonicalPayloadHash: signed.payloadHash,
          cryptographicSignature: signed.signature,
          publicKeyFingerprint: keyPair.fingerprint,
          notes,
        },
      });
      if (!updated) throw new Error("Failed to update certificate record");

      const record = normalizeCertificateRecord(updated, true);
      emitCertEvent(strapi, "certificates.issued", record);
      return record;
    },

    async revokeCertificate(
      documentId: string,
      reason: string
    ): Promise<CertificateRecord> {
      const cleanReason = trimStr(reason, "Revoked by administrator");
      const updated = await strapi.documents(CERTIFICATE_UID).update({
        documentId,
        data: {
          status: "revoked",
          revokedAt: new Date().toISOString(),
          revocationReason: cleanReason,
        },
      });
      if (!updated) throw new Error("Certificate record not found");
      const record = normalizeCertificateRecord(updated, false);
      strapi.eventHub?.emit("certificates.revoked", {
        serialNumber: record.serialNumber,
        revocationReason: cleanReason,
      });
      return record;
    },

    async verifyCertificateBySerial(
      serialNumber: string,
      options?: { token?: string; nationalId?: string }
    ): Promise<CertificateVerificationResult | null> {
      const cleanSerial = trimStr(serialNumber).toUpperCase();
      if (!cleanSerial) return null;

      const [match] = await strapi.documents(CERTIFICATE_UID).findMany({
        filters: { serialNumber: cleanSerial },
        limit: 1,
      });
      if (!match) return null;

      const cert = normalizeCertificateRecord(match, true);
      const settings = await getSettingsService().getSettings();
      const template = await this.findTemplate({
        templateDocumentId: cert.templateDocumentId,
        templateSlug: cert.templateSlug,
      });

      return evaluateCertificateVerification({
        cert,
        template,
        settings,
        options,
      });
    },

    async renderCertificateDocument(
      identifier: { documentId?: string; serialNumber?: string },
      options?: { token?: string; isAdmin?: boolean }
    ): Promise<{ html: string; serialNumber: string } | null> {
      let rawDoc: Record<string, unknown> | null = null;
      if (identifier.documentId) {
        rawDoc = await strapi.documents(CERTIFICATE_UID).findOne({
          documentId: identifier.documentId,
        });
      } else if (identifier.serialNumber) {
        const [first] = await strapi.documents(CERTIFICATE_UID).findMany({
          filters: {
            serialNumber: identifier.serialNumber.trim().toUpperCase(),
          },
          limit: 1,
        });
        rawDoc = first || null;
      }
      if (!rawDoc) return null;

      const cert = normalizeCertificateRecord(rawDoc, true);
      const settings = await getSettingsService().getSettings();
      const template = await this.findTemplate({
        templateDocumentId: cert.templateDocumentId,
        templateSlug: cert.templateSlug,
      });

      return renderPrintableFromRecord({
        cert,
        template,
        settings,
        options,
      });
    },

    async listCertificates(filters?: {
      status?: string;
      templateSlug?: string;
      search?: string;
    }): Promise<{ records: CertificateRecord[]; stats: CertificateStats }> {
      const docs = await strapi
        .documents(CERTIFICATE_UID)
        .findMany({ limit: 500 });
      return filterAndComputeCertificateStats(
        docs.map((d) => normalizeCertificateRecord(d, true)),
        filters
      );
    },

    async exportCsv(filters?: {
      status?: string;
      templateSlug?: string;
    }): Promise<string> {
      return exportCertificatesToCsv(
        (await this.listCertificates(filters)).records
      );
    },
  };
};
