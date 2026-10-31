import assert from "node:assert/strict";
import { describe, it } from "node:test";

import docusignFactory, { validateDocuSignBaseUrl } from "../server/src/services/docusign";
import issuanceFactory from "../server/src/services/issuance";
import settingsFactory from "../server/src/services/settings";
import { computeDocuSignWebhookHmac } from "../shared";

function createMockStrapi() {
  const storeData = new Map<string, unknown>();
  const templates = new Map<string, Record<string, unknown>>();
  const certificates = new Map<string, Record<string, unknown>>();
  const emittedEvents: Array<{ event: string; payload: unknown }> = [];
  let docCounter = 1;

  const strapiMock: any = {
    config: {
      get: (_key: string, fallback: unknown) => fallback,
    },
    log: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    eventHub: {
      emit: (event: string, payload: unknown) => {
        emittedEvents.push({ event, payload });
      },
    },
    store: () => ({
      get: async ({ key }: { key: string }) => storeData.get(key),
      set: async ({ key, value }: { key: string; value: unknown }) => {
        storeData.set(key, value);
      },
    }),
    documents: (uid: string) => {
      const map = uid === "plugin::certificates.template" ? templates : certificates;
      return {
        findMany: async (params?: { filters?: Record<string, unknown> }) => {
          const all = Array.from(map.values());
          if (!params?.filters) return all;
          return all.filter((item) =>
            Object.entries(params.filters!).every(([k, v]) => item[k] === v)
          );
        },
        findOne: async ({ documentId }: { documentId: string }) => map.get(documentId) || null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const documentId = `doc_${docCounter++}`;
          const rec = { ...data, id: docCounter, documentId };
          map.set(documentId, rec);
          return rec;
        },
        update: async ({
          documentId,
          data,
        }: {
          documentId: string;
          data: Record<string, unknown>;
        }) => {
          const existing = map.get(documentId);
          if (!existing) return null;
          const updated = { ...existing, ...data };
          map.set(documentId, updated);
          return updated;
        },
      };
    },
    plugin: () => ({
      service: (name: string) => services[name],
    }),
  };

  const services: Record<string, any> = {
    settings: settingsFactory({ strapi: strapiMock }),
    issuance: issuanceFactory({ strapi: strapiMock }),
    docusign: docusignFactory({ strapi: strapiMock }),
  };

  return { strapiMock, services, emittedEvents };
}

describe("Strapi Certificates Service Lifecycle & Optional DocuSign E-Signature", () => {
  it("enforces minimum witnesses on Shahada certificates, signs with Ed25519, verifies masked vs unmasked, and revokes", async () => {
    const { services, emittedEvents } = createMockStrapi();

    const shahadaTpl = await services.issuance.createTemplate({
      name: "Official Shahada Certificate",
      slug: "shahada-certificate",
      serialPrefix: "SHD",
      requiresWitnesses: true,
      minWitnesses: 2,
      requiresApproval: true,
      organizationName: "Mezquita Central de Bogotá",
      headerText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      titleText: "Certificado Oficial de Profesión de Fe Islámica (Shahada)",
      bodyTemplate:
        "Certificamos que {{recipientFullName}} (Nombre Islámico: {{chosenName}}) pronunció la Shahada el {{issuedDateFormatted}} ({{secondaryDateFormatted}}).",
      defaultSignatories: [{ name: "Sheikh Ahmad Al-Mansoor", title: "Imam Principal" }],
    });

    await assert.rejects(async () => {
      await services.issuance.issueCertificate({
        templateSlug: shahadaTpl.slug,
        recipientFullName: "Juan Sebastian Gomez",
        recipientChosenName: "Bilal",
        nationalIdRaw: "CC 1015432198",
        autoApprove: true,
        witnesses: [{ fullName: "Only One Witness" }],
      });
    }, /requires at least 2 official witness/);

    const pendingCert = await services.issuance.issueCertificate({
      templateSlug: shahadaTpl.slug,
      recipientFullName: "Juan Sebastian Gomez",
      recipientChosenName: "Bilal",
      nationalIdRaw: "CC 1015432198",
      autoApprove: false,
    });
    assert.equal(pendingCert.status, "pending_approval");
    assert.equal(pendingCert.nationalIdMasked, "***-***-2198");

    const approvedCert = await services.issuance.approveCertificate(pendingCert.documentId, {
      witnesses: [
        { fullName: "Omar Farooq", documentIdRaw: "CC 79112233", role: "Testigo 1" },
        { fullName: "Khalid Tariq", documentIdRaw: "CC 80223344", role: "Testigo 2" },
      ],
    });
    assert.equal(approvedCert.status, "issued");
    assert.equal(approvedCert.witnesses.length, 2);
    assert.equal(approvedCert.witnesses[0].documentIdMasked, "***-***-2233");

    const publicVerify = await services.issuance.verifyCertificateBySerial(
      approvedCert.serialNumber,
      { nationalId: "CC 1015432198" }
    );
    assert.ok(publicVerify);
    assert.equal(publicVerify.valid, true);
    assert.equal(publicVerify.cryptographicallyVerified, true);
    assert.equal(publicVerify.isUnmasked, false);
    assert.equal(publicVerify.recipientNameDisplay, "Juan S. G.");
    assert.equal(publicVerify.nationalIdMatches, true);

    const tokenVerify = await services.issuance.verifyCertificateBySerial(
      approvedCert.serialNumber,
      { token: pendingCert.verificationToken }
    );
    assert.ok(tokenVerify);
    assert.equal(tokenVerify.isUnmasked, true);
    assert.equal(tokenVerify.recipientNameDisplay, "Juan Sebastian Gomez");

    await services.issuance.revokeCertificate(
      approvedCert.documentId,
      "Duplicate record superseded"
    );
    const revokedVerify = await services.issuance.verifyCertificateBySerial(
      approvedCert.serialNumber
    );
    assert.ok(revokedVerify);
    assert.equal(revokedVerify.valid, false);
    assert.equal(revokedVerify.status, "revoked");
    assert.equal(revokedVerify.revocationReason, "Duplicate record superseded");

    assert.ok(emittedEvents.some((e) => e.event === "certificates.issued"));
    assert.ok(emittedEvents.some((e) => e.event === "certificates.revoked"));
  });

  it("dispatches a multi-party DocuSign envelope, blocks SSRF URLs, verifies HMAC-SHA256 webhook, and auto-seals with Ed25519", async () => {
    const { services, emittedEvents } = createMockStrapi();

    // SSRF defense check
    assert.equal(
      validateDocuSignBaseUrl("https://demo.docusign.net/restapi/"),
      "https://demo.docusign.net/restapi"
    );
    assert.throws(() => validateDocuSignBaseUrl("http://demo.docusign.net/restapi"), /HTTPS/);
    assert.throws(
      () => validateDocuSignBaseUrl("https://127.0.0.1/restapi"),
      /private or loopback/
    );
    assert.throws(
      () => validateDocuSignBaseUrl("https://evil.example.com/restapi"),
      /docusign\.net/
    );

    await services.settings.updateSettings({
      esign: {
        enabled: true,
        provider: "docusign",
        baseUrl: "https://demo.docusign.net/restapi",
        accountId: "acc-bogota-mosque-01",
        emailSubjectPrefix: "Mezquita Central — Firma de Shahada",
      },
    });

    const shahadaTpl = await services.issuance.createTemplate({
      name: "Shahada con Firma DocuSign",
      slug: "shahada-docusign",
      serialPrefix: "SHD",
      requiresWitnesses: true,
      minWitnesses: 2,
      requiresApproval: true,
      esignEnabled: true,
      esignProvider: "docusign",
      organizationName: "Mezquita Central de Bogotá",
      titleText: "Certificado de Shahada",
      bodyTemplate: "Certificamos a {{recipientFullName}} ({{chosenName}}).",
      defaultSignatories: [
        {
          name: "Sheikh Ahmad",
          title: "Imam Principal",
          email: "imam@mezquitabogota.org",
          routingOrder: 2,
        },
      ],
    });

    const pendingCert = await services.issuance.issueCertificate({
      templateSlug: shahadaTpl.slug,
      recipientFullName: "Mateo Alejandro Vargas",
      recipientChosenName: "Yusuf",
      nationalIdRaw: "CC 1030507090",
      autoApprove: false,
      witnesses: [
        {
          fullName: "Witness One",
          documentIdRaw: "CC 11112222",
          email: "witness1@example.org",
          routingOrder: 1,
        },
        {
          fullName: "Witness Two",
          documentIdRaw: "CC 33334444",
          email: "witness2@example.org",
          routingOrder: 1,
        },
      ],
    });

    let capturedUrl = "";
    let capturedBody: Record<string, any> = {};
    const mockFetch = async (
      url: string,
      init: { method: string; headers: Record<string, string>; body: string }
    ) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          envelopeId: "env-docusign-998877",
          status: "sent",
        }),
      };
    };

    const sentResult = await services.docusign.sendEnvelopeForCertificate(pendingCert.documentId, {
      fetchImpl: mockFetch,
      accessToken: "test-oauth-token",
    });

    assert.equal(
      capturedUrl,
      "https://demo.docusign.net/restapi/v2.1/accounts/acc-bogota-mosque-01/envelopes"
    );
    assert.equal(capturedBody.recipients.signers.length, 3);
    assert.equal(capturedBody.recipients.signers[0].tabs.signHereTabs[0].anchorString, "/wit_1/");
    assert.equal(capturedBody.recipients.signers[2].tabs.signHereTabs[0].anchorString, "/sig_1/");
    assert.equal(sentResult.envelopeId, "env-docusign-998877");
    assert.equal(sentResult.certificate.esignEnvelopeStatus, "sent");

    // Simulate DocuSign Connect Webhook with HMAC-SHA256 signature
    const webhookPayload = {
      event: "envelope-completed",
      data: {
        envelopeId: "env-docusign-998877",
        envelopeSummary: {
          status: "completed",
        },
      },
    };
    const rawWebhookBody = JSON.stringify(webhookPayload);
    const testWebhookSecret = "test-hmac-secret-key-from-env";
    const validSignature = computeDocuSignWebhookHmac(rawWebhookBody, testWebhookSecret);

    // Forged signature must be rejected
    await assert.rejects(async () => {
      await services.docusign.handleWebhookEvent({
        rawBody: rawWebhookBody,
        signatureHeader: "forged-signature",
        payload: webhookPayload,
        webhookSecret: testWebhookSecret,
      });
    }, /Invalid DocuSign webhook HMAC-SHA256 signature/);

    // Valid HMAC signature transitions certificate to 'issued' and signs with Ed25519
    const completedResult = await services.docusign.handleWebhookEvent({
      rawBody: rawWebhookBody,
      signatureHeader: validSignature,
      payload: webhookPayload,
      webhookSecret: testWebhookSecret,
    });

    assert.equal(completedResult.envelopeStatus, "completed");
    assert.equal(completedResult.certificate.status, "issued");
    assert.equal(completedResult.certificate.esignEnvelopeStatus, "completed");

    // Verify public verification confirms Ed25519 cryptographic validity + DocuSign envelope completion
    const verification = await services.issuance.verifyCertificateBySerial(
      pendingCert.serialNumber
    );
    assert.ok(verification);
    assert.equal(verification.valid, true);
    assert.equal(verification.cryptographicallyVerified, true);
    assert.equal(verification.esignProvider, "docusign");
    assert.equal(verification.esignEnvelopeId, "env-docusign-998877");
    assert.equal(verification.esignEnvelopeStatus, "completed");
    assert.ok(emittedEvents.some((e) => e.event === "certificates.docusign.completed"));
  });
});
