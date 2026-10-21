import type { CertificateRecord, CertificateTemplate } from './types';

function computeDeterministicHex(input: string): string {
  const out: string[] = [];
  for (let pass = 0; pass < 8; pass++) {
    let h = (0x811c9dc5 ^ pass) >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out.push(h.toString(16).padStart(8, '0'));
  }
  return out.join('');
}

export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHexColor(input?: string, fallback = '#14532d'): string {
  const cleaned = String(input || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    return cleaned;
  }
  return fallback;
}

export function interpolateBodyTemplate(
  templateText: string,
  variables: Record<string, string>
): string {
  const safeTemplate = escapeHtml(templateText);
  return safeTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const rawVal = variables[key] ?? '';
    return `<strong>${escapeHtml(rawVal)}</strong>`;
  });
}

export function renderVerificationMatrixSvg(seedText: string, accentColor = '#14532d'): string {
  const safeColor = sanitizeHexColor(accentColor);
  const hashHex = computeDeterministicHex(seedText);
  const size = 9;
  const cells: string[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const isCornerFinder =
        (row < 3 && col < 3) ||
        (row < 3 && col >= size - 3) ||
        (row >= size - 3 && col < 3);
      const hexIdx = (row * size + col) % hashHex.length;
      const nibble = parseInt(hashHex[hexIdx], 16);
      const filled = isCornerFinder || nibble % 2 === 0;
      if (filled) {
        const x = 6 + col * 8;
        const y = 6 + row * 8;
        cells.push(
          `<rect x="${x}" y="${y}" width="6.5" height="6.5" rx="1" fill="${safeColor}" />`
        );
      }
    }
  }

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84" width="84" height="84" role="img" aria-label="Cryptographic Verification Matrix">',
    `<rect x="1" y="1" width="82" height="82" rx="6" fill="#ffffff" stroke="${safeColor}" stroke-width="2" />`,
    ...cells,
    '</svg>',
  ].join('');
}

export function renderPrintableCertificateHtml(params: {
  certificate: CertificateRecord;
  template: CertificateTemplate;
  verificationUrl: string;
}): string {
  const { certificate, template, verificationUrl } = params;
  const accent = sanitizeHexColor(template.accentColor, '#14532d');
  const issuedDateFormatted = certificate.issuedAt.slice(0, 10);
  const secondaryFormattedList = Object.values(certificate.secondaryDates || {})
    .map((d) => `${d.label}: ${d.formatted}`)
    .join(' • ');

  const variables: Record<string, string> = {
    recipientFullName: certificate.recipientFullName,
    recipientChosenName: certificate.recipientChosenName || certificate.recipientFullName,
    chosenName: certificate.recipientChosenName || '',
    nationalIdMasked: certificate.nationalIdMasked || 'N/A',
    recipientNationality: certificate.recipientNationality || '',
    issuedDateFormatted,
    secondaryDateFormatted: secondaryFormattedList || issuedDateFormatted,
    serialNumber: certificate.serialNumber,
    organizationName: template.organizationName,
    ...(certificate.customData || {}),
  };

  const renderedBody = interpolateBodyTemplate(template.bodyTemplate, variables);
  const matrixSvg = renderVerificationMatrixSvg(
    `${certificate.serialNumber}:${certificate.cryptographicSignature}`,
    accent
  );

  const signatoriesHtml = (certificate.signatories || [])
    .map(
      (sig, idx) => `
      <div class="sig-block">
        <div class="sig-line"><span class="esign-anchor">/sig_${idx + 1}/</span></div>
        <div class="sig-name">${escapeHtml(sig.name)}</div>
        <div class="sig-title">${escapeHtml(sig.title)}</div>
        ${sig.role ? `<div class="sig-role">${escapeHtml(sig.role)}</div>` : ''}
      </div>`
    )
    .join('');

  const witnessesHtml =
    (certificate.witnesses || []).length > 0
      ? `
      <div class="witness-section">
        <div class="witness-heading">Official Witnesses</div>
        <div class="witness-grid">
          ${certificate.witnesses
            .map(
              (w, idx) => `
            <div class="witness-card">
              <div class="sig-line"><span class="esign-anchor">/wit_${idx + 1}/</span></div>
              <div class="witness-name">${escapeHtml(w.fullName)}</div>
              <div class="witness-meta">
                ${w.role ? `<span>${escapeHtml(w.role)}</span>` : ''}
                ${w.documentIdMasked ? `<span>ID: ${escapeHtml(w.documentIdMasked)}</span>` : ''}
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>`
      : '';

  const statusBanner =
    certificate.status !== 'issued'
      ? `<div class="watermark-alert">STATUS: ${escapeHtml(certificate.status.toUpperCase())}</div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(template.titleText)} — ${escapeHtml(certificate.serialNumber)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: Georgia, "Times New Roman", serif;
      background: #f8fafc;
      color: #0f172a;
    }
    .certificate-frame {
      max-width: 1020px;
      margin: 0 auto;
      background: #ffffff;
      border: 3px solid ${accent};
      padding: 10px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
      position: relative;
    }
    .certificate-inner {
      border: 1px solid ${accent};
      padding: 36px 48px;
      position: relative;
    }
    .watermark-alert {
      background: #fef2f2;
      color: #991b1b;
      border: 2px solid #dc2626;
      padding: 8px 16px;
      text-align: center;
      font-weight: bold;
      letter-spacing: 0.1em;
      margin-bottom: 16px;
    }
    .header-Invocation {
      text-align: center;
      font-size: 20px;
      color: ${accent};
      margin-bottom: 8px;
      font-weight: 600;
    }
    .org-name {
      text-align: center;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #0f172a;
    }
    .org-subheader {
      text-align: center;
      font-size: 13px;
      color: #475569;
      margin-top: 4px;
      margin-bottom: 24px;
    }
    .cert-title {
      text-align: center;
      font-size: 30px;
      color: ${accent};
      margin: 18px 0 24px;
      font-weight: 700;
      border-bottom: 2px solid ${accent};
      display: inline-block;
      padding-bottom: 6px;
    }
    .title-wrap { text-align: center; }
    .recipient-banner {
      text-align: center;
      margin: 16px 0 20px;
    }
    .recipient-name {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
    }
    .recipient-chosen {
      font-size: 18px;
      color: ${accent};
      margin-top: 4px;
      font-style: italic;
    }
    .cert-body {
      font-size: 16px;
      line-height: 1.75;
      text-align: center;
      max-width: 820px;
      margin: 0 auto 28px;
      color: #1e293b;
    }
    .dates-bar {
      display: flex;
      justify-content: center;
      gap: 28px;
      font-size: 13px;
      color: #334155;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }
    .sig-row {
      display: flex;
      justify-content: space-around;
      gap: 24px;
      margin-top: 32px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .sig-block {
      min-width: 200px;
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px solid #334155;
      height: 36px;
      margin-bottom: 8px;
    }
    .esign-anchor {
      color: #ffffff;
      font-size: 1px;
      line-height: 1px;
      opacity: 0.01;
      user-select: none;
    }
    .sig-name { font-weight: 700; font-size: 15px; }
    .sig-title { font-size: 13px; color: #475569; }
    .sig-role { font-size: 12px; color: ${accent}; }
    .witness-section {
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
      margin-top: 16px;
      margin-bottom: 20px;
    }
    .witness-heading {
      text-align: center;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 10px;
    }
    .witness-grid {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .witness-card {
      font-size: 13px;
      text-align: center;
      padding: 6px 14px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .witness-name { font-weight: 600; }
    .witness-meta { font-size: 11px; color: #64748b; display: flex; gap: 8px; justify-content: center; }
    .crypto-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 2px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 16px;
      gap: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #475569;
    }
    .crypto-details { line-height: 1.5; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .certificate-frame { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="certificate-frame">
    <div class="certificate-inner">
      ${statusBanner}
      ${template.headerText ? `<div class="header-Invocation">${escapeHtml(template.headerText)}</div>` : ''}
      <div class="org-name">${escapeHtml(template.organizationName)}</div>
      ${template.organizationSubheader ? `<div class="org-subheader">${escapeHtml(template.organizationSubheader)}</div>` : ''}
      <div class="title-wrap">
        <div class="cert-title">${escapeHtml(template.titleText)}</div>
      </div>
      <div class="recipient-banner">
        <div class="recipient-name">${escapeHtml(certificate.recipientFullName)}</div>
        ${
          certificate.recipientChosenName
            ? `<div class="recipient-chosen">Chosen Name / Title: ${escapeHtml(certificate.recipientChosenName)}</div>`
            : ''
        }
      </div>
      <div class="cert-body">${renderedBody}</div>
      <div class="dates-bar">
        <span><strong>Serial No:</strong> ${escapeHtml(certificate.serialNumber)}</span>
        <span><strong>Issued Date:</strong> ${escapeHtml(issuedDateFormatted)}</span>
        ${
          secondaryFormattedList
            ? `<span><strong>Secondary Calendar:</strong> ${escapeHtml(secondaryFormattedList)}</span>`
            : ''
        }
        ${
          certificate.nationalIdMasked
            ? `<span><strong>Document ID:</strong> ${escapeHtml(certificate.nationalIdMasked)}</span>`
            : ''
        }
      </div>
      <div class="sig-row">${signatoriesHtml}</div>
      ${witnessesHtml}
      <div class="crypto-footer">
        <div class="crypto-details">
          <div><strong>CRYPTOGRAPHICALLY SIGNED RECORD (Ed25519)</strong></div>
          <div>Serial: ${escapeHtml(certificate.serialNumber)} | Key Fingerprint: ${escapeHtml(certificate.publicKeyFingerprint)}</div>
          <div>Payload SHA-256: ${escapeHtml(certificate.canonicalPayloadHash.slice(0, 32))}...</div>
          <div>Signature (Ed25519): ${escapeHtml(certificate.cryptographicSignature.slice(0, 40))}...</div>
          ${
            certificate.esignEnvelopeId
              ? `<div>E-Sign Envelope (${escapeHtml(certificate.esignProvider || 'docusign')}): ${escapeHtml(certificate.esignEnvelopeId)} [${escapeHtml(certificate.esignEnvelopeStatus || 'sent')}]</div>`
              : ''
          }
          <div>Verify Online: ${escapeHtml(verificationUrl)}</div>
        </div>
        <div>${matrixSvg}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function escapeCsvCell(value: unknown): string {
  let str = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCertificatesToCsv(records: CertificateRecord[]): string {
  const headers = [
    'Serial Number',
    'Template',
    'Status',
    'Recipient Full Name',
    'Chosen Name / Title',
    'Masked ID',
    'Issued At',
    'Expires At',
    'Signatories',
    'Witnesses Count',
    'Key Fingerprint',
  ];
  const rows = records.map((r) => [
    escapeCsvCell(r.serialNumber),
    escapeCsvCell(r.templateName || r.templateSlug),
    escapeCsvCell(r.status),
    escapeCsvCell(r.recipientFullName),
    escapeCsvCell(r.recipientChosenName || ''),
    escapeCsvCell(r.nationalIdMasked || ''),
    escapeCsvCell(r.issuedAt),
    escapeCsvCell(r.expiresAt || ''),
    escapeCsvCell((r.signatories || []).map((s) => s.name).join('; ')),
    escapeCsvCell((r.witnesses || []).length),
    escapeCsvCell(r.publicKeyFingerprint),
  ]);
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
