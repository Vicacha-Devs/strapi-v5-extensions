import {
  maskNationalId,
  maskRecipientName,
  renderPrintableCertificateHtml,
  verifyCanonicalPayloadSignature,
  verifyNationalIdHash,
  verifyTokenConstantTime,
  type CanonicalCertificatePayload,
  type CertificateRecord,
  type CertificateSignatory,
  type CertificateStats,
  type CertificateStatus,
  type CertificateTemplate,
  type CertificateVerificationResult,
  type CertificateWitness,
  type CertificatesPluginSettings,
  type ESignEnvelopeStatus,
  type ESignProviderType,
} from '../../../shared';

const rateLimitStore = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests = 20,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const existing = rateLimitStore.get(key) || [];
  const recent = existing.filter((ts) => now - ts < windowMs);
  if (recent.length >= maxRequests) {
    rateLimitStore.set(key, recent);
    return false;
  }
  recent.push(now);
  rateLimitStore.set(key, recent);
  return true;
}

export function normalizeSignatories(raw: unknown): CertificateSignatory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      name: String(item.name || '').trim(),
      title: String(item.title || '').trim(),
      role: item.role ? String(item.role).trim() : undefined,
      email: item.email ? String(item.email).trim() : undefined,
      routingOrder:
        typeof item.routingOrder === 'number' && Number.isFinite(item.routingOrder)
          ? Math.max(1, Math.trunc(item.routingOrder))
          : undefined,
      signatureImageUrl: item.signatureImageUrl
        ? String(item.signatureImageUrl).trim()
        : undefined,
      signedAt: item.signedAt ? String(item.signedAt).trim() : undefined,
    }))
    .filter((s) => Boolean(s.name && s.title));
}

export function normalizeWitnesses(raw: unknown): CertificateWitness[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const rawDocId = item.documentIdRaw ? String(item.documentIdRaw) : undefined;
      const maskedDocId = item.documentIdMasked
        ? String(item.documentIdMasked).trim()
        : rawDocId
          ? maskNationalId(rawDocId)
          : undefined;
      return {
        fullName: String(item.fullName || '').trim(),
        documentIdMasked: maskedDocId,
        role: item.role ? String(item.role).trim() : undefined,
        email: item.email ? String(item.email).trim() : undefined,
        routingOrder:
          typeof item.routingOrder === 'number' && Number.isFinite(item.routingOrder)
            ? Math.max(1, Math.trunc(item.routingOrder))
            : undefined,
        signedAt: item.signedAt ? String(item.signedAt).trim() : undefined,
      };
    })
    .filter((w) => Boolean(w.fullName));
}

function asStr(val: unknown, fallback = ''): string {
  return val ? String(val) : fallback;
}

function asOptStr(val: unknown): string | undefined {
  return val ? String(val) : undefined;
}

function asNullStr(val: unknown): string | null {
  return val ? String(val) : null;
}

function asArr<T>(val: unknown, fallback: T[] = []): T[] {
  return Array.isArray(val) ? (val as T[]) : fallback;
}

function asObj<T>(val: unknown): T {
  return val && typeof val === 'object' ? (val as T) : ({} as T);
}

function asEsignProvider(val: unknown): ESignProviderType {
  const raw = asStr(val, 'none');
  return raw === 'docusign' || raw === 'webhook' ? raw : 'none';
}

function asNonNegativeInt(val: unknown, fallback = 0): number {
  return typeof val === 'number' && Number.isFinite(val)
    ? Math.max(0, Math.trunc(val))
    : fallback;
}

export function normalizeTemplateRecord(
  doc: Record<string, unknown>
): CertificateTemplate {
  return {
    id: doc.id as number | string | undefined,
    documentId: asStr(doc.documentId, asStr(doc.id)),
    name: asStr(doc.name),
    slug: asStr(doc.slug),
    description: asOptStr(doc.description),
    serialPrefix: asStr(doc.serialPrefix, 'CERT'),
    defaultValidityDays:
      typeof doc.defaultValidityDays === 'number' ? doc.defaultValidityDays : null,
    requiresWitnesses: Boolean(doc.requiresWitnesses),
    minWitnesses: asNonNegativeInt(doc.minWitnesses, 0),
    requiresApproval: doc.requiresApproval !== false,
    esignEnabled: Boolean(doc.esignEnabled),
    esignProvider: asEsignProvider(doc.esignProvider),
    organizationName: asStr(doc.organizationName),
    organizationSubheader: asOptStr(doc.organizationSubheader),
    headerText: asOptStr(doc.headerText),
    titleText: asStr(doc.titleText),
    bodyTemplate: asStr(doc.bodyTemplate),
    footerText: asOptStr(doc.footerText),
    defaultSignatories: normalizeSignatories(doc.defaultSignatories),
    customFieldsSchema: asArr(doc.customFieldsSchema),
    secondaryCalendars: asArr(doc.secondaryCalendars),
    accentColor: asStr(doc.accentColor, '#14532d'),
    active: doc.active !== false,
  };
}

export function normalizeCertificateRecord(
  doc: Record<string, unknown>,
  includePrivate = false
): CertificateRecord {
  const record: CertificateRecord = {
    id: doc.id as number | string | undefined,
    documentId: asStr(doc.documentId, asStr(doc.id)),
    serialNumber: asStr(doc.serialNumber),
    templateDocumentId: asStr(doc.templateDocumentId),
    templateSlug: asStr(doc.templateSlug),
    templateName: asStr(doc.templateName),
    status: asStr(doc.status, 'pending_approval') as CertificateStatus,
    recipientFullName: asStr(doc.recipientFullName),
    recipientChosenName: asOptStr(doc.recipientChosenName),
    recipientEmail: asOptStr(doc.recipientEmail),
    recipientPhone: asOptStr(doc.recipientPhone),
    recipientNationality: asOptStr(doc.recipientNationality),
    nationalIdMasked: asOptStr(doc.nationalIdMasked),
    issuedAt: asStr(doc.issuedAt),
    expiresAt: asNullStr(doc.expiresAt),
    revokedAt: asNullStr(doc.revokedAt),
    revocationReason: asNullStr(doc.revocationReason),
    signatories: normalizeSignatories(doc.signatories),
    witnesses: normalizeWitnesses(doc.witnesses),
    customData: asObj<Record<string, string>>(doc.customData),
    secondaryDates: asObj<CertificateRecord['secondaryDates']>(doc.secondaryDates),
    canonicalPayloadHash: asStr(doc.canonicalPayloadHash),
    cryptographicSignature: asStr(doc.cryptographicSignature),
    publicKeyFingerprint: asStr(doc.publicKeyFingerprint),
    esignProvider: asEsignProvider(doc.esignProvider),
    esignEnvelopeId: asOptStr(doc.esignEnvelopeId),
    esignEnvelopeStatus: asStr(
      doc.esignEnvelopeStatus,
      'not_sent'
    ) as ESignEnvelopeStatus,
    esignCompletedAt: asNullStr(doc.esignCompletedAt),
    linkedBookingCode: asOptStr(doc.linkedBookingCode),
    notes: asOptStr(doc.notes),
  };

  if (includePrivate) {
    record.nationalIdHash = asOptStr(doc.nationalIdHash);
    record.verificationToken = asOptStr(doc.verificationToken);
  }

  return record;
}

export function buildCanonicalPayload(params: {
  serialNumber: string;
  templateSlug: string;
  organizationName: string;
  recipientFullName: string;
  recipientChosenName?: string;
  nationalIdHash?: string;
  issuedAt: string;
  expiresAt?: string | null;
  signatories: CertificateSignatory[];
  witnesses: CertificateWitness[];
}): CanonicalCertificatePayload {
  return {
    version: '1.0',
    serialNumber: params.serialNumber,
    templateSlug: params.templateSlug,
    organizationName: params.organizationName,
    recipientFullName: params.recipientFullName,
    recipientChosenName: params.recipientChosenName || '',
    nationalIdHash: params.nationalIdHash || '',
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt || '',
    signatories: (params.signatories || []).map((s) => ({
      name: s.name,
      title: s.title,
    })),
    witnesses: (params.witnesses || []).map((w) => ({
      fullName: w.fullName,
      role: w.role || 'Witness',
    })),
  };
}

export function evaluateCertificateVerification(params: {
  cert: CertificateRecord;
  template: CertificateTemplate | null;
  settings: CertificatesPluginSettings;
  options?: { token?: string; nationalId?: string };
}): CertificateVerificationResult {
  const { cert, template, settings, options } = params;
  const organizationName =
    template?.organizationName || settings.organizationName;

  const canonicalPayload = buildCanonicalPayload({
    serialNumber: cert.serialNumber,
    templateSlug: cert.templateSlug,
    organizationName,
    recipientFullName: cert.recipientFullName,
    recipientChosenName: cert.recipientChosenName,
    nationalIdHash: cert.nationalIdHash,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    signatories: cert.signatories,
    witnesses: cert.witnesses,
  });

  const cryptographicallyVerified = verifyCanonicalPayloadSignature(
    canonicalPayload,
    cert.cryptographicSignature,
    settings.publicKeyPem
  );

  let effectiveStatus: CertificateStatus = cert.status;
  if (
    effectiveStatus === 'issued' &&
    cert.expiresAt &&
    new Date(cert.expiresAt).getTime() < Date.now()
  ) {
    effectiveStatus = 'expired';
  }

  const isTokenValid = verifyTokenConstantTime(
    options?.token,
    cert.verificationToken
  );
  const isUnmasked = isTokenValid || !settings.maskPublicRecipientName;

  const nationalIdMatches = options?.nationalId
    ? verifyNationalIdHash(
        options.nationalId,
        cert.serialNumber,
        cert.nationalIdHash
      )
    : undefined;

  return {
    valid: effectiveStatus === 'issued' && cryptographicallyVerified,
    cryptographicallyVerified,
    status: effectiveStatus,
    serialNumber: cert.serialNumber,
    templateSlug: cert.templateSlug,
    templateName: cert.templateName,
    organizationName,
    recipientNameDisplay: isUnmasked
      ? cert.recipientFullName
      : maskRecipientName(cert.recipientFullName),
    recipientChosenName: cert.recipientChosenName,
    nationalIdMasked: cert.nationalIdMasked,
    nationalIdMatches,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    revokedAt: cert.revokedAt,
    revocationReason: cert.revocationReason,
    secondaryDates: cert.secondaryDates,
    signatories: cert.signatories,
    witnesses: cert.witnesses.map((w) => ({
      fullName: isUnmasked ? w.fullName : maskRecipientName(w.fullName),
      role: w.role,
    })),
    canonicalPayloadHash: cert.canonicalPayloadHash,
    cryptographicSignature: cert.cryptographicSignature,
    publicKeyFingerprint: cert.publicKeyFingerprint,
    publicKeyPem: settings.publicKeyPem,
    esignProvider: cert.esignProvider,
    esignEnvelopeId: cert.esignEnvelopeId,
    esignEnvelopeStatus: cert.esignEnvelopeStatus,
    esignCompletedAt: cert.esignCompletedAt,
    isUnmasked,
    verifiedAt: new Date().toISOString(),
  };
}

export function renderPrintableFromRecord(params: {
  cert: CertificateRecord;
  template: CertificateTemplate | null;
  settings: CertificatesPluginSettings;
  options?: { token?: string; isAdmin?: boolean };
}): { html: string; serialNumber: string } {
  const { cert, template, settings, options } = params;
  if (!options?.isAdmin) {
    const tokenOk = verifyTokenConstantTime(
      options?.token,
      cert.verificationToken
    );
    if (!tokenOk) {
      throw new Error('Valid verificationToken required to print certificate');
    }
  }

  const effectiveTemplate: CertificateTemplate = template || {
    documentId: 'fallback',
    name: cert.templateName,
    slug: cert.templateSlug,
    serialPrefix: 'CERT',
    requiresWitnesses: false,
    minWitnesses: 0,
    requiresApproval: false,
    organizationName: settings.organizationName,
    organizationSubheader: settings.organizationSubheader,
    titleText: cert.templateName,
    bodyTemplate:
      'This is to certify that {{recipientFullName}} has been officially attested by {{organizationName}} on {{issuedDateFormatted}}.',
    defaultSignatories: cert.signatories,
    active: true,
  };

  const verificationUrl = `${settings.verificationBaseUrl}/${encodeURIComponent(
    cert.serialNumber
  )}`;
  const html = renderPrintableCertificateHtml({
    certificate: cert,
    template: effectiveTemplate,
    verificationUrl,
  });

  return { html, serialNumber: cert.serialNumber };
}

export function filterAndComputeCertificateStats(
  allRecords: CertificateRecord[],
  filters?: { status?: string; templateSlug?: string; search?: string }
): { records: CertificateRecord[]; stats: CertificateStats } {
  const stats: CertificateStats = {
    total: allRecords.length,
    issued: allRecords.filter((r) => r.status === 'issued').length,
    pending_approval: allRecords.filter((r) => r.status === 'pending_approval')
      .length,
    revoked: allRecords.filter((r) => r.status === 'revoked').length,
    expired: allRecords.filter((r) => r.status === 'expired').length,
  };

  const records = allRecords.filter((r) => {
    if (filters?.status && r.status !== filters.status) return false;
    if (filters?.templateSlug && r.templateSlug !== filters.templateSlug) {
      return false;
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      const hay = [
        r.serialNumber,
        r.recipientFullName,
        r.recipientChosenName || '',
        r.recipientEmail || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return { records, stats };
}
