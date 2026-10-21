import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvCell,
  escapeHtml,
  exportCertificatesToCsv,
  formatSecondaryCalendars,
  generateEd25519KeyPair,
  generateSerialNumber,
  generateVerificationToken,
  hashNationalId,
  maskNationalId,
  maskRecipientName,
  renderPrintableCertificateHtml,
  signCanonicalPayload,
  verifyCanonicalPayloadSignature,
  verifyNationalIdHash,
  verifyTokenConstantTime,
  type CanonicalCertificatePayload,
  type CertificateRecord,
  type CertificateTemplate,
} from '../shared';

describe('Cryptographic Ed25519 Signing, Verification & Tamper Detection', () => {
  it('signs a canonical certificate payload with Ed25519 and detects any tampering', () => {
    const keyPair = generateEd25519KeyPair();
    assert.ok(keyPair.publicKeyPem.includes('BEGIN PUBLIC KEY'));
    assert.ok(keyPair.privateKeyPem.includes('BEGIN PRIVATE KEY'));
    assert.ok(keyPair.fingerprint.startsWith('SHA256:'));

    const payload: CanonicalCertificatePayload = {
      version: '1.0',
      serialNumber: 'SHD-2026-A1B2C3D4',
      templateSlug: 'shahada-certificate',
      organizationName: 'Mezquita Central de Bogotá',
      recipientFullName: 'Carlos Andres Perez',
      recipientChosenName: 'Ibrahim',
      nationalIdHash: hashNationalId('CC-1020304050', 'SHD-2026-A1B2C3D4'),
      issuedAt: '2026-03-20T15:00:00.000Z',
      expiresAt: '',
      signatories: [{ name: 'Sheikh Ahmad', title: 'Resident Imam' }],
      witnesses: [
        { fullName: 'Yusuf Ali', role: 'Official Witness 1' },
        { fullName: 'Tariq Hassan', role: 'Official Witness 2' },
      ],
    };

    const signed = signCanonicalPayload(payload, keyPair.privateKeyPem);
    assert.ok(signed.signature.length > 40);
    assert.equal(signed.payloadHash.length, 64);

    // Valid verification with matching public key
    const isValid = verifyCanonicalPayloadSignature(
      payload,
      signed.signature,
      keyPair.publicKeyPem
    );
    assert.equal(isValid, true);

    // Tampered recipient name must fail verification
    const tamperedPayload: CanonicalCertificatePayload = {
      ...payload,
      recipientFullName: 'Mallory Attacker',
    };
    assert.equal(
      verifyCanonicalPayloadSignature(
        tamperedPayload,
        signed.signature,
        keyPair.publicKeyPem
      ),
      false
    );

    // Wrong public key must fail verification
    const otherKeyPair = generateEd25519KeyPair();
    assert.equal(
      verifyCanonicalPayloadSignature(
        payload,
        signed.signature,
        otherKeyPair.publicKeyPem
      ),
      false
    );
  });

  it('hashes and verifies national IDs with per-serial salt and masks PII', () => {
    const serial = generateSerialNumber('SHD', 2026);
    assert.ok(/^SHD-2026-[0-9A-F]{8}$/.test(serial));

    const masked = maskNationalId('CC 1020-3040-5891');
    assert.equal(masked, '***-***-5891');

    const digest = hashNationalId('cc 1020-3040-5891', serial);
    assert.equal(
      verifyNationalIdHash('CC102030405891', serial, digest),
      true
    );
    assert.equal(
      verifyNationalIdHash('CC999999999999', serial, digest),
      false
    );

    assert.equal(maskRecipientName('Carlos Andres Perez'), 'Carlos A. P.');
  });

  it('performs constant-time verification token checks and neutralizes XSS & CSV injection', () => {
    const token = generateVerificationToken();
    assert.equal(verifyTokenConstantTime(token, token), true);
    assert.equal(verifyTokenConstantTime(token, 'wrong-token'), false);

    assert.equal(
      escapeHtml('<script>alert("xss")</script>'),
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );

    assert.equal(
      escapeCsvCell('=cmd|"/c calc"!A0'),
      '"\'=cmd|""/c calc""!A0"'
    );

    const hijriDates = formatSecondaryCalendars(
      new Date('2026-03-20T12:00:00Z'),
      [
        {
          id: 'islamic-umalqura',
          label: 'Hijri (Umm al-Qura)',
          intlCalendar: 'islamic-umalqura',
          enabled: true,
          dayOffset: 0,
        },
      ],
      'en'
    );
    assert.ok(hijriDates['islamic-umalqura']?.formatted);

    const template: CertificateTemplate = {
      documentId: 'tpl-1',
      name: 'Shahada Certificate',
      slug: 'shahada-certificate',
      serialPrefix: 'SHD',
      requiresWitnesses: true,
      minWitnesses: 2,
      requiresApproval: true,
      organizationName: 'Mezquita Central de Bogotá',
      titleText: 'Certificate of Islamic Declaration (Shahada)',
      bodyTemplate:
        'This certifies that {{recipientFullName}} (chosen name: {{chosenName}}) declared the Shahada on {{issuedDateFormatted}}.',
      defaultSignatories: [{ name: 'Sheikh Ahmad', title: 'Head Imam' }],
      active: true,
    };

    const cert: CertificateRecord = {
      documentId: 'cert-1',
      serialNumber: 'SHD-2026-ABCDEF12',
      templateDocumentId: 'tpl-1',
      templateSlug: 'shahada-certificate',
      templateName: 'Shahada Certificate',
      status: 'issued',
      recipientFullName: 'Carlos <script>alert(1)</script> Perez',
      recipientChosenName: 'Ibrahim',
      nationalIdMasked: '***-***-5891',
      issuedAt: '2026-03-20T12:00:00.000Z',
      secondaryDates: hijriDates,
      signatories: [{ name: 'Sheikh Ahmad', title: 'Head Imam' }],
      witnesses: [
        { fullName: 'Witness One', role: 'Witness' },
        { fullName: 'Witness Two', role: 'Witness' },
      ],
      canonicalPayloadHash: 'a'.repeat(64),
      cryptographicSignature: 'b'.repeat(86),
      publicKeyFingerprint: 'SHA256:1234567890ABCDEF',
    };

    const html = renderPrintableCertificateHtml({
      certificate: cert,
      template,
      verificationUrl: 'https://mosque.example.org/verify/SHD-2026-ABCDEF12',
    });

    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.includes('CRYPTOGRAPHICALLY SIGNED RECORD (Ed25519)'));

    const csv = exportCertificatesToCsv([
      {
        ...cert,
        recipientFullName: '=SUM(A1:A2)',
      },
    ]);
    assert.ok(csv.includes("'=SUM(A1:A2)"));
  });
});
