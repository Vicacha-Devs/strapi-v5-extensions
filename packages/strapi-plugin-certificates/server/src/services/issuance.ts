import type { Core } from '@strapi/strapi';
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
} from '../../../shared';
import {
  buildCanonicalPayload,
  evaluateCertificateVerification,
  filterAndComputeCertificateStats,
  normalizeCertificateRecord,
  normalizeSignatories,
  normalizeTemplateRecord,
  normalizeWitnesses,
  renderPrintableFromRecord,
} from './issuanceHelpers';

const TEMPLATE_UID = 'plugin::certificates.template';
const CERTIFICATE_UID = 'plugin::certificates.certificate';

interface SettingsServiceContract {
  getSettings(): Promise<CertificatesPluginSettings>;
  getSigningKeyPair(): Promise<Ed25519KeyPairMaterial>;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getSettingsService = () =>
    strapi.plugin(PLUGIN_ID).service<SettingsServiceContract>('settings');

  return {
    async listTemplates(activeOnly = false): Promise<CertificateTemplate[]> {
      const filters = activeOnly ? { active: true } : undefined;
      const docs = await strapi.documents(TEMPLATE_UID).findMany({
        filters,
        limit: 100,
      });
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

    async createTemplate(
      data: Partial<CertificateTemplate>
    ): Promise<CertificateTemplate> {
      const settings = await getSettingsService().getSettings();
      const name = String(data.name || '').trim();
      if (!name) {
        throw new Error('Template name is required');
      }
      const slug = String(
        data.slug ||
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
      );
      const created = await strapi.documents(TEMPLATE_UID).create({
        data: {
          name,
          slug,
          description: data.description || '',
          serialPrefix: String(data.serialPrefix || 'CERT')
            .toUpperCase()
            .slice(0, 8),
          defaultValidityDays:
            typeof data.defaultValidityDays === 'number'
              ? data.defaultValidityDays
              : null,
          requiresWitnesses: Boolean(data.requiresWitnesses),
          minWitnesses:
            typeof data.minWitnesses === 'number' ? data.minWitnesses : 0,
          requiresApproval: data.requiresApproval !== false,
          organizationName:
            data.organizationName || settings.organizationName,
          organizationSubheader:
            data.organizationSubheader ?? settings.organizationSubheader,
          headerText: data.headerText || '',
          titleText: data.titleText || name,
          bodyTemplate:
            data.bodyTemplate ||
            'This is to certify that {{recipientFullName}} has been officially attested by {{organizationName}} on {{issuedDateFormatted}}.',
          footerText: data.footerText || '',
          defaultSignatories: normalizeSignatories(data.defaultSignatories),
          customFieldsSchema: Array.isArray(data.customFieldsSchema)
            ? data.customFieldsSchema
            : [],
          secondaryCalendars: Array.isArray(data.secondaryCalendars)
            ? data.secondaryCalendars
            : settings.secondaryCalendars,
          accentColor: data.accentColor || '#14532d',
          active: data.active !== false,
        },
      });
      return normalizeTemplateRecord(created);
    },

    async seedDefaultTemplates(): Promise<number> {
      const settings = await getSettingsService().getSettings();
      const defaults = settings.defaultTemplates || [];
      if (defaults.length === 0) return 0;

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

    async issueCertificate(
      input: CertificateIssueInput
    ): Promise<CertificateRecord> {
      const recipientFullName = String(input.recipientFullName || '').trim();
      if (!recipientFullName) {
        throw new Error('recipientFullName is required');
      }

      const template = await this.findTemplate({
        templateDocumentId: input.templateDocumentId,
        templateSlug: input.templateSlug,
      });
      if (!template || !template.active) {
        throw new Error('Active certificate template not found');
      }

      const settings = await getSettingsService().getSettings();
      const keyPair = await getSettingsService().getSigningKeyPair();

      const status: CertificateStatus =
        input.autoApprove === true || !template.requiresApproval
          ? 'issued'
          : 'pending_approval';

      const witnesses: CertificateWitness[] = normalizeWitnesses(input.witnesses);
      if (
        status === 'issued' &&
        template.requiresWitnesses &&
        witnesses.length < template.minWitnesses
      ) {
        throw new Error(
          `Template "${template.name}" requires at least ${template.minWitnesses} official witness(es) before issuance`
        );
      }

      const signatories: CertificateSignatory[] =
        input.signatories && input.signatories.length > 0
          ? normalizeSignatories(input.signatories)
          : template.defaultSignatories;

      const issuedDateObj = input.issuedAt ? new Date(input.issuedAt) : new Date();
      if (Number.isNaN(issuedDateObj.getTime())) {
        throw new Error('Invalid issuedAt date');
      }
      const issuedAt = issuedDateObj.toISOString();

      let expiresAt: string | null = input.expiresAt ?? null;
      if (
        !expiresAt &&
        typeof template.defaultValidityDays === 'number' &&
        template.defaultValidityDays > 0
      ) {
        const expDate = new Date(
          issuedDateObj.getTime() + template.defaultValidityDays * 86_400_000
        );
        expiresAt = expDate.toISOString();
      }

      const serialNumber = generateSerialNumber(
        template.serialPrefix,
        issuedDateObj.getUTCFullYear()
      );
      const verificationToken = generateVerificationToken();
      const nationalIdMasked = input.nationalIdRaw
        ? maskNationalId(input.nationalIdRaw)
        : '';
      const nationalIdHash = input.nationalIdRaw
        ? hashNationalId(input.nationalIdRaw, serialNumber)
        : '';

      const activeCalendars =
        template.secondaryCalendars && template.secondaryCalendars.length > 0
          ? template.secondaryCalendars
          : settings.secondaryCalendars;
      const secondaryDates = formatSecondaryCalendars(
        issuedDateObj,
        activeCalendars,
        input.locale || settings.defaultLocale || 'en'
      );

      const canonicalPayload = buildCanonicalPayload({
        serialNumber,
        templateSlug: template.slug,
        organizationName: template.organizationName || settings.organizationName,
        recipientFullName,
        recipientChosenName: input.recipientChosenName,
        nationalIdHash,
        issuedAt,
        expiresAt,
        signatories,
        witnesses,
      });

      const signed = signCanonicalPayload(canonicalPayload, keyPair.privateKeyPem);

      const created = await strapi.documents(CERTIFICATE_UID).create({
        data: {
          serialNumber,
          templateDocumentId: template.documentId,
          templateSlug: template.slug,
          templateName: template.name,
          status,
          recipientFullName,
          recipientChosenName: input.recipientChosenName
            ? String(input.recipientChosenName).trim()
            : '',
          recipientEmail: input.recipientEmail
            ? String(input.recipientEmail).trim()
            : undefined,
          recipientPhone: input.recipientPhone
            ? String(input.recipientPhone).trim()
            : '',
          recipientNationality: input.recipientNationality
            ? String(input.recipientNationality).trim()
            : '',
          nationalIdMasked,
          nationalIdHash,
          issuedAt,
          expiresAt,
          signatories,
          witnesses,
          customData: input.customData || {},
          secondaryDates,
          canonicalPayloadHash: signed.payloadHash,
          cryptographicSignature: signed.signature,
          publicKeyFingerprint: keyPair.fingerprint,
          verificationToken,
          linkedBookingCode: input.linkedBookingCode || '',
          notes: input.notes || '',
        },
      });

      const record = normalizeCertificateRecord(created, true);
      strapi.eventHub?.emit(
        status === 'issued' ? 'certificates.issued' : 'certificates.requested',
        {
          serialNumber: record.serialNumber,
          templateSlug: record.templateSlug,
          status: record.status,
        }
      );
      return record;
    },

    async approveCertificate(
      documentId: string,
      options?: {
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
    ): Promise<CertificateRecord> {
      const existingDoc = await strapi.documents(CERTIFICATE_UID).findOne({
        documentId,
      });
      if (!existingDoc) {
        throw new Error('Certificate record not found');
      }
      const existing = normalizeCertificateRecord(existingDoc, true);
      const template = await this.findTemplate({
        templateDocumentId: existing.templateDocumentId,
        templateSlug: existing.templateSlug,
      });

      const witnesses =
        options?.witnesses !== undefined
          ? normalizeWitnesses(options.witnesses)
          : existing.witnesses;
      const signatories =
        options?.signatories !== undefined
          ? normalizeSignatories(options.signatories)
          : existing.signatories;

      if (
        template?.requiresWitnesses &&
        witnesses.length < template.minWitnesses
      ) {
        throw new Error(
          `At least ${template.minWitnesses} official witness(es) required before approving "${template.name}"`
        );
      }

      const recipientChosenName =
        options?.recipientChosenName !== undefined
          ? String(options.recipientChosenName).trim()
          : existing.recipientChosenName;

      const keyPair = await getSettingsService().getSigningKeyPair();
      const settings = await getSettingsService().getSettings();
      const issuedAt = new Date().toISOString();

      const canonicalPayload = buildCanonicalPayload({
        serialNumber: existing.serialNumber,
        templateSlug: existing.templateSlug,
        organizationName:
          template?.organizationName || settings.organizationName,
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
          status: 'issued',
          issuedAt,
          recipientChosenName: recipientChosenName || '',
          signatories,
          witnesses,
          canonicalPayloadHash: signed.payloadHash,
          cryptographicSignature: signed.signature,
          publicKeyFingerprint: keyPair.fingerprint,
          notes: options?.notes !== undefined ? options.notes : existing.notes,
        },
      });

      if (!updated) {
        throw new Error('Failed to update certificate record');
      }

      const record = normalizeCertificateRecord(updated, true);
      strapi.eventHub?.emit('certificates.issued', {
        serialNumber: record.serialNumber,
        templateSlug: record.templateSlug,
        status: record.status,
      });
      return record;
    },

    async revokeCertificate(
      documentId: string,
      reason: string
    ): Promise<CertificateRecord> {
      const cleanReason = String(reason || 'Revoked by administrator').trim();
      const updated = await strapi.documents(CERTIFICATE_UID).update({
        documentId,
        data: {
          status: 'revoked',
          revokedAt: new Date().toISOString(),
          revocationReason: cleanReason,
        },
      });
      if (!updated) {
        throw new Error('Certificate record not found');
      }
      const record = normalizeCertificateRecord(updated, false);
      strapi.eventHub?.emit('certificates.revoked', {
        serialNumber: record.serialNumber,
        revocationReason: cleanReason,
      });
      return record;
    },

    async verifyCertificateBySerial(
      serialNumber: string,
      options?: { token?: string; nationalId?: string }
    ): Promise<CertificateVerificationResult | null> {
      const cleanSerial = String(serialNumber || '')
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

    async exportCsv(filters?: {
      status?: string;
      templateSlug?: string;
    }): Promise<string> {
      const { records } = await this.listCertificates(filters);
      return exportCertificatesToCsv(records);
    },
  };
};
