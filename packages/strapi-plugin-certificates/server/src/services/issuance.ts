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

function trimStr(val: unknown, fallback = ""): string {
  const s = val ? String(val).trim() : "";
  return s || fallback;
}

function trimOptStr(val: unknown): string | undefined {
  const s = val ? String(val).trim() : "";
  return s || undefined;
}

function pickNonEmptyArray<T>(primary: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(primary) && primary.length > 0 ? primary : fallback;
}

function slugifyName(name: string, explicitSlug?: string): string {
  if (explicitSlug && explicitSlug.trim()) return explicitSlug.trim();
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const DEFAULT_BODY_TEMPLATE =
  "This is to certify that {{recipientFullName}} has been officially attested by {{organizationName}} on {{issuedDateFormatted}}.";

function buildTemplateCreateData(
  name: string,
  data: Partial<CertificateTemplate>,
  settings: CertificatesPluginSettings
) {
  return {
    name,
    slug: slugifyName(name, data.slug),
    description: trimStr(data.description),
    serialPrefix: trimStr(data.serialPrefix, "CERT").toUpperCase().slice(0, 8),
    defaultValidityDays:
      typeof data.defaultValidityDays === "number" ? data.defaultValidityDays : null,
    requiresWitnesses: Boolean(data.requiresWitnesses),
    minWitnesses: typeof data.minWitnesses === "number" ? data.minWitnesses : 0,
    requiresApproval: data.requiresApproval !== false,
    organizationName: trimStr(data.organizationName, settings.organizationName),
    organizationSubheader: data.organizationSubheader ?? settings.organizationSubheader,
    headerText: trimStr(data.headerText),
    titleText: trimStr(data.titleText, name),
    bodyTemplate: trimStr(data.bodyTemplate, DEFAULT_BODY_TEMPLATE),
    footerText: trimStr(data.footerText),
    defaultSignatories: normalizeSignatories(data.defaultSignatories),
    customFieldsSchema: Array.isArray(data.customFieldsSchema) ? data.customFieldsSchema : [],
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
  if (enforceNow && template?.requiresWitnesses && witnesses.length < template.minWitnesses) {
    throw new Error(
      `Template "${template.name}" requires at least ${template.minWitnesses} official witness(es) before issuance`
    );
  }
}

function resolveIssueDatesAndIdentity(input: CertificateIssueInput, template: CertificateTemplate) {
  const issuedDateObj = input.issuedAt ? new Date(input.issuedAt) : new Date();
  if (Number.isNaN(issuedDateObj.getTime())) {
    throw new Error("Invalid issuedAt date");
  }
  const issuedAt = issuedDateObj.toISOString();
  const validityDays = template.defaultValidityDays;
  const computedExpiry =
    typeof validityDays === "number" && validityDays > 0
      ? new Date(issuedDateObj.getTime() + validityDays * 86_400_000).toISOString()
      : null;
  const expiresAt: string | null = input.expiresAt ?? computedExpiry;
  const serialNumber = generateSerialNumber(template.serialPrefix, issuedDateObj.getUTCFullYear());
  const rawNationalId = trimOptStr(input.nationalIdRaw);
  return {
    issuedDateObj,
    issuedAt,
    expiresAt,
    serialNumber,
    verificationToken: generateVerificationToken(),
    nationalIdMasked: rawNationalId ? maskNationalId(rawNationalId) : "",
    nationalIdHash: rawNationalId ? hashNationalId(rawNationalId, serialNumber) : "",
  };
}

function buildIssueRecordPayload(p: {
  input: CertificateIssueInput;
  template: CertificateTemplate;
  recipientFullName: string;
  status: CertificateStatus;
  signatories: CertificateSignatory[];
  witnesses: CertificateWitness[];
  datesAndId: ReturnType<typeof resolveIssueDatesAndIdentity>;
  secondaryDates: CertificateRecord["secondaryDates"];
  signed: { payloadHash: string; signature: string };
  fingerprint: string;
}) {
  return {
    serialNumber: p.datesAndId.serialNumber,
    templateDocumentId: p.template.documentId,
    templateSlug: p.template.slug,
    templateName: p.template.name,
    status: p.status,
    recipientFullName: p.recipientFullName,
    recipientChosenName: trimStr(p.input.recipientChosenName),
    recipientEmail: trimOptStr(p.input.recipientEmail),
    recipientPhone: trimStr(p.input.recipientPhone),
    recipientNationality: trimStr(p.input.recipientNationality),
    nationalIdMasked: p.datesAndId.nationalIdMasked,
    nationalIdHash: p.datesAndId.nationalIdHash,
    issuedAt: p.datesAndId.issuedAt,
    expiresAt: p.datesAndId.expiresAt,
    signatories: p.signatories,
    witnesses: p.witnesses,
    customData: p.input.customData ?? {},
    secondaryDates: p.secondaryDates,
    canonicalPayloadHash: p.signed.payloadHash,
    cryptographicSignature: p.signed.signature,
    publicKeyFingerprint: p.fingerprint,
    verificationToken: p.datesAndId.verificationToken,
    linkedBookingCode: trimStr(p.input.linkedBookingCode),
    notes: trimStr(p.input.notes),
  };
}

interface ApproveCertificateOptions {
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

function resolveApprovalFields(existing: CertificateRecord, options?: ApproveCertificateOptions) {
  const witnesses =
    options?.witnesses !== undefined ? normalizeWitnesses(options.witnesses) : existing.witnesses;
  const signatories =
    options?.signatories !== undefined
      ? normalizeSignatories(options.signatories)
      : existing.signatories;
  const recipientChosenName =
    options?.recipientChosenName !== undefined
      ? trimStr(options.recipientChosenName)
      : existing.recipientChosenName;
  const notes = options?.notes !== undefined ? options.notes : existing.notes;
  return { witnesses, signatories, recipientChosenName, notes };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service<SettingsServiceContract>("settings");

  return {
    async listTemplates(activeOnly = false): Promise<CertificateTemplate[]> {
      const filters = activeOnly ? { active: true } : undefined;
      const docs = await strapi.documents(TEMPLATE_UID).findMany({ filters, limit: 100 });
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
        const matches = await strapi.documents(TEMPLATE_UID).findMany({
          filters: { slug: identifier.templateSlug },
          limit: 1,
        });
        if (matches.length > 0) {
          return normalizeTemplateRecord(matches[0]);
        }
      }
      return null;
    },

    async createTemplate(data: Partial<CertificateTemplate>): Promise<CertificateTemplate> {
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
      const defaults = settings.defaultTemplates || [];
      let seededCount = 0;
      for (const tpl of defaults) {
        const existing = await this.findTemplate({ templateSlug: tpl.slug });
        if (!existing) {
          await this.createTemplate(tpl);
          seededCount++;
        }
      }
      return seededCount;
    },

    async issueCertificate(input: CertificateIssueInput): Promise<CertificateRecord> {
      const recipientFullName = trimStr(input.recipientFullName);
      if (!recipientFullName) throw new Error("recipientFullName is required");

      const template = await this.findTemplate({
        templateDocumentId: input.templateDocumentId,
        templateSlug: input.templateSlug,
      });
      if (!template?.active) throw new Error("Active certificate template not found");

      const settings = await getSettingsService().getSettings();
      const keyPair = await getSettingsService().getSigningKeyPair();
      const isIssued = input.autoApprove === true || !template.requiresApproval;
      const status: CertificateStatus = isIssued ? "issued" : "pending_approval";

      const witnesses = normalizeWitnesses(input.witnesses);
      assertWitnessCount(template, witnesses, isIssued);

      const signatories = pickNonEmptyArray(
        normalizeSignatories(input.signatories),
        template.defaultSignatories
      );
      const datesAndId = resolveIssueDatesAndIdentity(input, template);
      const activeCalendars = pickNonEmptyArray(
        template.secondaryCalendars,
        settings.secondaryCalendars
      );
      const secondaryDates = formatSecondaryCalendars(
        datesAndId.issuedDateObj,
        activeCalendars,
        trimStr(input.locale, trimStr(settings.defaultLocale, "en"))
      );

      const canonicalPayload = buildCanonicalPayload({
        serialNumber: datesAndId.serialNumber,
        templateSlug: template.slug,
        organizationName: trimStr(template.organizationName, settings.organizationName),
        recipientFullName,
        recipientChosenName: input.recipientChosenName,
        nationalIdHash: datesAndId.nationalIdHash,
        issuedAt: datesAndId.issuedAt,
        expiresAt: datesAndId.expiresAt,
        signatories,
        witnesses,
      });

      const signed = signCanonicalPayload(canonicalPayload, keyPair.privateKeyPem);
      const created = await strapi.documents(CERTIFICATE_UID).create({
        data: buildIssueRecordPayload({
          input,
          template,
          recipientFullName,
          status,
          signatories,
          witnesses,
          datesAndId,
          secondaryDates,
          signed,
          fingerprint: keyPair.fingerprint,
        }),
      });

      const record = normalizeCertificateRecord(created, true);
      strapi.eventHub?.emit(isIssued ? "certificates.issued" : "certificates.requested", {
        serialNumber: record.serialNumber,
        templateSlug: record.templateSlug,
        status: record.status,
      });
      return record;
    },

    async approveCertificate(
      documentId: string,
      options?: ApproveCertificateOptions
    ): Promise<CertificateRecord> {
      const existingDoc = await strapi.documents(CERTIFICATE_UID).findOne({ documentId });
      if (!existingDoc) {
        throw new Error("Certificate record not found");
      }
      const existing = normalizeCertificateRecord(existingDoc, true);
      const template = await this.findTemplate({
        templateDocumentId: existing.templateDocumentId,
        templateSlug: existing.templateSlug,
      });

      const { witnesses, signatories, recipientChosenName, notes } = resolveApprovalFields(
        existing,
        options
      );
      assertWitnessCount(template, witnesses, true);

      const keyPair = await getSettingsService().getSigningKeyPair();
      const settings = await getSettingsService().getSettings();
      const issuedAt = new Date().toISOString();

      const canonicalPayload = buildCanonicalPayload({
        serialNumber: existing.serialNumber,
        templateSlug: existing.templateSlug,
        organizationName: trimStr(template?.organizationName, settings.organizationName),
        recipientFullName: existing.recipientFullName,
        recipientChosenName,
        nationalIdHash: existing.nationalIdHash,
        issuedAt,
        expiresAt: existing.expiresAt,
        signatories,
        witnesses,
      });

      const signed = signCanonicalPayload(canonicalPayload, keyPair.privateKeyPem);
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

      if (!updated) {
        throw new Error("Failed to update certificate record");
      }

      const record = normalizeCertificateRecord(updated, true);
      strapi.eventHub?.emit("certificates.issued", {
        serialNumber: record.serialNumber,
        templateSlug: record.templateSlug,
        status: record.status,
      });
      return record;
    },

    async revokeCertificate(documentId: string, reason: string): Promise<CertificateRecord> {
      const cleanReason = String(reason || "Revoked by administrator").trim();
      const updated = await strapi.documents(CERTIFICATE_UID).update({
        documentId,
        data: {
          status: "revoked",
          revokedAt: new Date().toISOString(),
          revocationReason: cleanReason,
        },
      });
      if (!updated) {
        throw new Error("Certificate record not found");
      }
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
      const cleanSerial = String(serialNumber || "")
        .trim()
        .toUpperCase();
      if (!cleanSerial) return null;

      const matches = await strapi.documents(CERTIFICATE_UID).findMany({
        filters: { serialNumber: cleanSerial },
        limit: 1,
      });
      if (matches.length === 0) return null;

      const cert = normalizeCertificateRecord(matches[0], true);
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
        const list = await strapi.documents(CERTIFICATE_UID).findMany({
          filters: { serialNumber: identifier.serialNumber.trim().toUpperCase() },
          limit: 1,
        });
        rawDoc = list[0] || null;
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
      const allDocs = await strapi.documents(CERTIFICATE_UID).findMany({
        limit: 500,
      });
      const allRecords = allDocs.map((d) => normalizeCertificateRecord(d, true));
      return filterAndComputeCertificateStats(allRecords, filters);
    },

    async exportCsv(filters?: { status?: string; templateSlug?: string }): Promise<string> {
      const { records } = await this.listCertificates(filters);
      return exportCertificatesToCsv(records);
    },
  };
};
