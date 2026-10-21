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

export function normalizeTemplateRecord(
  doc: Record<string, unknown>
): CertificateTemplate {
  const esignProviderRaw = String(doc.esignProvider || 'none');
  const esignProvider: ESignProviderType =
    esignProviderRaw === 'docusign' || esignProviderRaw === 'webhook'
      ? esignProviderRaw
      : 'none';

  return {
    id: doc.id as number | string | undefined,
    documentId: String(doc.documentId || doc.id || ''),
    name: String(doc.name || ''),
    slug: String(doc.slug || ''),
    description: doc.description ? String(doc.description) : undefined,
    serialPrefix: String(doc.serialPrefix || 'CERT'),
    defaultValidityDays:
      typeof doc.defaultValidityDays === 'number' ? doc.defaultValidityDays : null,
    requiresWitnesses: Boolean(doc.requiresWitnesses),
    minWitnesses:
      typeof doc.minWitnesses === 'number' && Number.isFinite(doc.minWitnesses)
        ? Math.max(0, Math.trunc(doc.minWitnesses))
        : 0,
    requiresApproval: doc.requiresApproval !== false,
    esignEnabled: Boolean(doc.esignEnabled),
    esignProvider,
    organizationName: String(doc.organizationName || ''),
    organizationSubheader: doc.organizationSubheader
      ? String(doc.organizationSubheader)
      : undefined,
    headerText: doc.headerText ? String(doc.headerText) : undefined,
    titleText: String(doc.titleText || ''),
    bodyTemplate: String(doc.bodyTemplate || ''),
    footerText: doc.footerText ? String(doc.footerText) : undefined,
    defaultSignatories: normalizeSignatories(doc.defaultSignatories),
    customFieldsSchema: Array.isArray(doc.customFieldsSchema)
      ? (doc.customFieldsSchema as CertificateTemplate['customFieldsSchema'])
      : [],
    secondaryCalendars: Array.isArray(doc.secondaryCalendars)
      ? (doc.secondaryCalendars as CertificateTemplate['secondaryCalendars'])
      : [],
    accentColor: doc.accentColor ? String(doc.accentColor) : '#14532d',
    active: doc.active !== false,
  };
}

export function normalizeCertificateRecord(
  doc: Record<string, unknown>,
  includePrivate = false
): CertificateRecord {
  const statusRaw = String(doc.status || 'pending_approval') as CertificateStatus;
  const esignProviderRaw = String(doc.esignProvider || 'none');
  const esignProvider: ESignProviderType =
    esignProviderRaw === 'docusign' || esignProviderRaw === 'webhook'
      ? esignProviderRaw
      : 'none';
  const esignEnvelopeStatus = (doc.esignEnvelopeStatus
    ? String(doc.esignEnvelopeStatus)
    : 'not_sent') as ESignEnvelopeStatus;

  const record: CertificateRecord = {
    id: doc.id as number | string | undefined,
    documentId: String(doc.documentId || doc.id || ''),
    serialNumber: String(doc.serialNumber || ''),
    templateDocumentId: String(doc.templateDocumentId || ''),
    templateSlug: String(doc.templateSlug || ''),
    templateName: String(doc.templateName || ''),
    status: statusRaw,
    recipientFullName: String(doc.recipientFullName || ''),
    recipientChosenName: doc.recipientChosenName
      ? String(doc.recipientChosenName)
      : undefined,
    recipientEmail: doc.recipientEmail ? String(doc.recipientEmail) : undefined,
    recipientPhone: doc.recipientPhone ? String(doc.recipientPhone) : undefined,
    recipientNationality: doc.recipientNationality
      ? String(doc.recipientNationality)
      : undefined,
    nationalIdMasked: doc.nationalIdMasked
      ? String(doc.nationalIdMasked)
      : undefined,
    issuedAt: String(doc.issuedAt || ''),
    expiresAt: doc.expiresAt ? String(doc.expiresAt) : null,
    revokedAt: doc.revokedAt ? String(doc.revokedAt) : null,
    revocationReason: doc.revocationReason ? String(doc.revocationReason) : null,
    signatories: normalizeSignatories(doc.signatories),
    witnesses: normalizeWitnesses(doc.witnesses),
    customData:
      doc.customData && typeof doc.customData === 'object'
        ? (doc.customData as Record<string, string>)
        : {},
    secondaryDates:
      doc.secondaryDates && typeof doc.secondaryDates === 'object'
        ? (doc.secondaryDates as CertificateRecord['secondaryDates'])
        : {},
    canonicalPayloadHash: String(doc.canonicalPayloadHash || ''),
    cryptographicSignature: String(doc.cryptographicSignature || ''),
    publicKeyFingerprint: String(doc.publicKeyFingerprint || ''),
    esignProvider,
    esignEnvelopeId: doc.esignEnvelopeId
      ? String(doc.esignEnvelopeId)
      : undefined,
    esignEnvelopeStatus,
    esignCompletedAt: doc.esignCompletedAt
      ? String(doc.esignCompletedAt)
      : null,
    linkedBookingCode: doc.linkedBookingCode
      ? String(doc.linkedBookingCode)
      : undefined,
    notes: doc.notes ? String(doc.notes) : undefined,
  };

  if (includePrivate) {
    record.nationalIdHash = doc.nationalIdHash
      ? String(doc.nationalIdHash)
      : undefined;
    record.verificationToken = doc.verificationToken
      ? String(doc.verificationToken)
      : undefined;
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
