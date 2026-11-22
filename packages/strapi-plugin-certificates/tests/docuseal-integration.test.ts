import assert from "node:assert/strict";
import { describe, it } from "node:test";

import docusealFactory, {
  buildBrandedSigningInviteEmail,
  buildDocuSealHtmlSubmissionPayload,
  validateDocuSealBaseUrl,
  validateDocuSealSigningUrl,
} from "../server/src/services/docuseal";
import issuanceFactory from "../server/src/services/issuance";
import settingsFactory from "../server/src/services/settings";
import { computeDocuSealWebhookHmac } from "../shared";

function createMockStrapi() {
  const storeData = new Map<string, unknown>();
  const templates = new Map<string, Record<string, unknown>>();
  const certificates = new Map<string, Record<string, unknown>>();
  const emittedEvents: Array<{ event: string; payload: unknown }> = [];
  const sentEmails: Array<Record<string, unknown>> = [];
  const sentDesignerEmails: Array<Record<string, unknown>> = [];
  let docCounter = 1;

  const strapiMock: Record<string, unknown> = {
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
      const map =
        uid === "plugin::certificates.template" ? templates : certificates;
      return {
        findMany: async (params?: { filters?: Record<string, unknown> }) => {
          const all = Array.from(map.values());
          if (!params?.filters) return all;
          return all.filter((item) =>
            Object.entries(params.filters || {}).every(
              ([k, v]) => item[k] === v
            )
          );
        },
        findOne: async ({ documentId }: { documentId: string }) =>
          map.get(documentId) || null,
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
    plugin: (pluginName: string) => {
      if (pluginName === "email") {
        return {
          service: () => ({
            send: async (opts: Record<string, unknown>) => {
              sentEmails.push(opts);
              return { messageId: `mock_${sentEmails.length}` };
            },
          }),
        };
      }
      if (pluginName === "email-designer-5") {
        return {
          service: () => ({
            sendTemplatedEmail: async (
              emailOptions: Record<string, unknown>,
              emailTemplate: Record<string, unknown>,
              data: Record<string, unknown>
            ) => {
              sentDesignerEmails.push({ emailOptions, emailTemplate, data });
              return { ok: true };
            },
          }),
        };
      }
      return {
        service: (name: string) => services[name],
      };
    },
  };

  const services: Record<string, unknown> = {
    settings: settingsFactory({ strapi: strapiMock as never }),
    issuance: issuanceFactory({ strapi: strapiMock as never }),
    docuseal: docusealFactory({ strapi: strapiMock as never }),
  };

  return {
    services: {
      settings: services.settings as ReturnType<typeof settingsFactory>,
      issuance: services.issuance as ReturnType<typeof issuanceFactory>,
      docuseal: services.docuseal as ReturnType<typeof docusealFactory>,
    },
    emittedEvents,
    sentEmails,
    sentDesignerEmails,
  };
}

describe("Strapi Certificates — Self-Hosted DocuSeal E-Signature Provider", () => {
  it("enforces SSRF guards on DocuSeal base URLs and signing embed URLs", () => {
    assert.equal(
      validateDocuSealBaseUrl("https://sign.ops.example.org/"),
      "https://sign.ops.example.org"
    );
    assert.throws(
      () => validateDocuSealBaseUrl("http://sign.ops.example.org"),
      /HTTPS/
    );
    assert.throws(
      () => validateDocuSealBaseUrl("https://127.0.0.1:3000"),
      /private or loopback/
    );
    assert.throws(
      () => validateDocuSealBaseUrl("https://169.254.169.254"),
      /private or loopback/
    );
    assert.throws(
      () => validateDocuSealBaseUrl("https://10.0.0.12"),
      /private or loopback/
    );
    assert.throws(
      () => validateDocuSealBaseUrl("https://user:pass@sign.ops.example.org"),
      /credentials/
    );
    assert.equal(
      validateDocuSealBaseUrl("http://127.0.0.1:3000/", {
        allowLocalhost: true,
      }),
      "http://127.0.0.1:3000"
    );

    assert.equal(
      validateDocuSealSigningUrl(
        "https://sign.ops.example.org/s/abc123",
        "https://sign.ops.example.org"
      ),
      "https://sign.ops.example.org/s/abc123"
    );
    assert.throws(
      () =>
        validateDocuSealSigningUrl(
          "javascript:alert(1)",
          "https://sign.ops.example.org"
        ),
      /HTTPS/
    );
    assert.throws(
      () =>
        validateDocuSealSigningUrl(
          "https://evil.example.net/s/phish",
          "https://sign.ops.example.org"
        ),
      /origin does not match/
    );
  });

  it("sends send_email:false to DocuSeal and dispatches branded Strapi HTML invites, then verifies webhook & Ed25519 seals", async () => {
    const { services, emittedEvents, sentEmails, sentDesignerEmails } =
      createMockStrapi();

    await services.settings.updateSettings({
      organizationName: "Mezquita Central de Bogotá",
      organizationSubheader: "Centro Cultural Islámico de Colombia",
      esign: {
        enabled: true,
        provider: "docuseal",
        baseUrl: "https://sign.ops.example.org",
        accountId: "",
        emailSubjectPrefix: "Mezquita Central — Firma Oficial",
      },
    });

    const tpl = await services.issuance.createTemplate({
      name: "Shahada con Firma DocuSeal",
      slug: "shahada-docuseal",
      serialPrefix: "SHD",
      requiresWitnesses: true,
      minWitnesses: 2,
      requiresApproval: true,
      esignEnabled: true,
      esignProvider: "docuseal",
      organizationName: "Mezquita Central de Bogotá",
      titleText: "Certificado de Shahada",
      bodyTemplate: "Certificamos a {{recipientFullName}}.",
      defaultSignatories: [
        {
          name: "Sheikh Ahmad",
          title: 'Imam "Principal"',
          email: "imam@mezquitabogota.org",
          routingOrder: 2,
        },
      ],
    });

    const pendingCert = await services.issuance.issueCertificate({
      templateSlug: tpl.slug,
      recipientFullName: "Mateo <script>alert(1)</script> Vargas",
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

    const previewPayload = buildDocuSealHtmlSubmissionPayload({
      certificate: pendingCert,
      htmlDocument: "<div>/wit_1/ /wit_2/ /sig_1/</div>",
      sendEmail: false,
    });
    assert.equal(previewPayload.send_email, false);
    assert.equal(previewPayload.order, "preserved");
    assert.equal(previewPayload.submitters.length, 3);
    assert.ok(previewPayload.documents[0].html.includes("<signature-field"));
    assert.ok(
      previewPayload.documents[0].html.includes("Imam &quot;Principal&quot;")
    );

    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: Record<string, unknown> = {};
    const mockFetch = async (
      url: string,
      init: { method: string; headers: Record<string, string>; body: string }
    ) => {
      capturedUrl = url;
      capturedHeaders = init.headers;
      capturedBody = JSON.parse(init.body) as Record<string, unknown>;
      return {
        ok: true,
        status: 201,
        json: async () => [
          {
            id: 101,
            submission_id: 4242,
            role: "Witness 1",
            name: "Witness One",
            email: "witness1@example.org",
            embed_src: "https://sign.ops.example.org/s/wit-1-token",
          },
          {
            id: 102,
            submission_id: 4242,
            role: "Witness 2",
            name: "Witness Two",
            email: "witness2@example.org",
            embed_src: "https://sign.ops.example.org/s/wit-2-token",
          },
          {
            id: 103,
            submission_id: 4242,
            role: 'Imam "Principal"',
            name: "Sheikh Ahmad",
            email: "imam@mezquitabogota.org",
            embed_src: "https://sign.ops.example.org/s/imam-token",
          },
        ],
      };
    };

    const sent = await services.docuseal.sendSubmissionForCertificate(
      pendingCert.documentId,
      {
        fetchImpl: mockFetch,
        apiKey: "docuseal_test_api_key",
      }
    );

    assert.equal(
      capturedUrl,
      "https://sign.ops.example.org/api/submissions/html"
    );
    assert.equal(capturedHeaders["X-Auth-Token"], "docuseal_test_api_key");
    assert.equal(capturedBody.send_email, false);
    assert.equal(sent.envelopeId, "4242");
    assert.equal(sent.emailDeliveryMode, "strapi");
    assert.equal(sent.signers.length, 3);
    assert.equal(sent.invitesSent, 3);
    assert.equal(sentEmails.length, 3);
    assert.equal(sentEmails[2].to, "imam@mezquitabogota.org");
    assert.ok(
      String(sentEmails[2].html).includes(
        "https://sign.ops.example.org/s/imam-token"
      )
    );
    assert.ok(!String(sentEmails[2].html).includes("<script>"));
    assert.ok(
      String(sentEmails[2].html).includes(
        "&lt;script&gt;alert(1)&lt;/script&gt;"
      )
    );

    // Email Designer 5 templated dispatch when templateReferenceId is configured
    await services.settings.updateSettings({
      esign: {
        enabled: true,
        provider: "docuseal",
        baseUrl: "https://sign.ops.example.org",
        accountId: "",
        emailDeliveryMode: "strapi",
        emailDesignerTemplateId: 501,
      },
    });
    const sentDesigner = await services.docuseal.sendSubmissionForCertificate(
      pendingCert.documentId,
      {
        fetchImpl: mockFetch,
        apiKey: "docuseal_test_api_key",
      }
    );
    assert.equal(sentDesigner.invitesSent, 3);
    assert.equal(sentDesignerEmails.length, 3);
    assert.equal(
      (sentDesignerEmails[0].emailTemplate as Record<string, unknown>)
        .templateReferenceId,
      501
    );

    // Provider mode passes send_email: true and skips Strapi mail dispatch
    const sentProviderMode =
      await services.docuseal.sendSubmissionForCertificate(
        pendingCert.documentId,
        {
          fetchImpl: mockFetch,
          apiKey: "docuseal_test_api_key",
          emailDeliveryMode: "provider",
        }
      );
    assert.equal(capturedBody.send_email, true);
    assert.equal(sentProviderMode.emailDeliveryMode, "provider");
    assert.equal(sentProviderMode.invitesSent, 0);

    // Subject CRLF header injection check
    const built = buildBrandedSigningInviteEmail({
      settings: await services.settings.getSettings(),
      certificate: pendingCert,
      signer: sent.signers[0],
    });
    assert.ok(!/[\r\n]/.test(built.subject));

    // Webhook verification (timestamp.signature HMAC-SHA256)
    const webhookPayload = {
      event_type: "submission.completed",
      data: { id: 4242, status: "completed" },
    };
    const rawBody = JSON.stringify(webhookPayload);
    const secret = "docuseal-webhook-secret-test";
    const ts = "1760000000";
    const validSig = `${ts}.${computeDocuSealWebhookHmac(rawBody, secret, ts)}`;

    await assert.rejects(
      () =>
        services.docuseal.handleWebhookEvent({
          rawBody,
          signatureHeader: `${ts}.0000deadbeef`,
          payload: webhookPayload,
          webhookSecret: secret,
        }),
      /Invalid DocuSeal webhook/
    );

    const completed = await services.docuseal.handleWebhookEvent({
      rawBody,
      signatureHeader: validSig,
      payload: webhookPayload,
      webhookSecret: secret,
    });
    assert.equal(completed.envelopeStatus, "completed");
    assert.equal(completed.certificate.status, "issued");
    assert.equal(completed.certificate.esignEnvelopeStatus, "completed");
    assert.ok(completed.certificate.cryptographicSignature);
    assert.ok(
      emittedEvents.some((e) => e.event === "certificates.docuseal.completed")
    );
  });
});
