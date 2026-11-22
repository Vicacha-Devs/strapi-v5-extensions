import type { Core } from "@strapi/strapi";

import type {
  CertificateRecord,
  CertificatesPluginSettings,
  DocuSealSignerLink,
} from "../../../shared";
import { escapeHtml, sanitizeHeaderLine } from "./docusealHelpers";

export function buildBrandedSigningInviteEmail(params: {
  settings: CertificatesPluginSettings;
  certificate: CertificateRecord;
  signer: DocuSealSignerLink;
}): { subject: string; text: string; html: string } {
  const { settings, certificate, signer } = params;
  const prefix = sanitizeHeaderLine(
    settings.esign?.emailSubjectPrefix ||
      "Official Certificate Signature Request",
    100
  );
  const subject = sanitizeHeaderLine(
    `${prefix} — ${certificate.serialNumber}`,
    180
  );
  const orgName = escapeHtml(settings.organizationName);
  const orgSub = escapeHtml(settings.organizationSubheader || "");
  const signerName = escapeHtml(signer.name);
  const signerRole = escapeHtml(signer.role);
  const certName = escapeHtml(
    certificate.templateName || "Official Certificate"
  );
  const serial = escapeHtml(certificate.serialNumber);
  const recipient = escapeHtml(certificate.recipientFullName);
  const safeHref = escapeHtml(signer.embedSrc);

  const text = [
    `${settings.organizationName}`,
    "",
    `Hello ${signer.name},`,
    "",
    `You have been invited as ${signer.role} to electronically sign "${certificate.templateName || "Official Certificate"}" (${certificate.serialNumber}) for ${certificate.recipientFullName}.`,
    "",
    `Review and sign here: ${signer.embedSrc}`,
    "",
    settings.organizationSubheader || "",
  ]
    .filter((line, idx, arr) => line !== "" || arr[idx - 1] !== "")
    .join("\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:28px;background-color:#ffffff;border:1px solid #d8e2dc;border-radius:10px;line-height:1.6;color:#14281d">
  <div style="border-bottom:3px solid #1b4332;padding-bottom:16px;margin-bottom:20px">
    <h1 style="margin:0;font-size:20px;color:#1b4332">${orgName}</h1>
    ${orgSub ? `<p style="margin:4px 0 0;font-size:13px;color:#52796f">${orgSub}</p>` : ""}
  </div>
  <h2 style="margin:0 0 12px;font-size:17px;color:#14281d">Hello, ${signerName}</h2>
  <p style="margin:0 0 16px">You are requested to sign the following official document as <strong>${signerRole}</strong>:</p>
  <div style="background-color:#f6f8f7;border:1px solid #d8e2dc;border-radius:8px;padding:14px 16px;margin:0 0 22px">
    <p style="margin:0 0 6px"><strong>Document:</strong> ${certName}</p>
    <p style="margin:0 0 6px"><strong>Serial Number:</strong> ${serial}</p>
    <p style="margin:0"><strong>Recipient:</strong> ${recipient}</p>
  </div>
  <p style="text-align:center;margin:24px 0">
    <a href="${safeHref}" style="display:inline-block;background-color:#1b4332;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:6px">Review &amp; Sign Document</a>
  </p>
  <p style="font-size:12px;color:#52796f;word-break:break-all">If the button does not work, copy and open this link in your browser:<br />${safeHref}</p>
  <hr style="border:none;border-top:1px solid #d8e2dc;margin:22px 0" />
  <p style="font-size:12px;color:#52796f;margin:0">${orgName}${orgSub ? ` • ${orgSub}` : ""}</p>
</div>`;

  return { subject, text, html };
}

export async function dispatchBrandedSigningInvites(
  strapi: Core.Strapi,
  params: {
    settings: CertificatesPluginSettings;
    certificate: CertificateRecord;
    signers: DocuSealSignerLink[];
  }
): Promise<{ invitesSent: number; invitesFailed: number }> {
  const { settings, certificate, signers } = params;
  const designerTemplateId = settings.esign?.emailDesignerTemplateId;
  const designerService = strapi
    .plugin?.("email-designer-5")
    ?.service?.("email") as
    | {
        sendTemplatedEmail?: (
          emailOptions: { to: string },
          emailTemplate: { templateReferenceId: number; subject?: string },
          data: Record<string, unknown>
        ) => Promise<unknown>;
      }
    | undefined;
  const coreEmailService = strapi.plugin?.("email")?.service?.("email") as
    | {
        send?: (options: {
          to: string;
          subject: string;
          text: string;
          html: string;
        }) => Promise<unknown>;
      }
    | undefined;

  let invitesSent = 0;
  let invitesFailed = 0;

  const dispatches = signers.map(async (signer) => {
    const emailContent = buildBrandedSigningInviteEmail({
      settings,
      certificate,
      signer,
    });

    if (
      designerTemplateId &&
      typeof designerService?.sendTemplatedEmail === "function"
    ) {
      try {
        const sentViaDesigner = await designerService.sendTemplatedEmail(
          { to: signer.email },
          {
            templateReferenceId: designerTemplateId,
            subject: emailContent.subject,
          },
          {
            organization: {
              name: settings.organizationName,
              subheader: settings.organizationSubheader,
            },
            certificate: {
              serialNumber: certificate.serialNumber,
              templateName: certificate.templateName,
              recipientFullName: certificate.recipientFullName,
            },
            signer: {
              name: signer.name,
              email: signer.email,
              role: signer.role,
              signingUrl: signer.embedSrc,
            },
          }
        );
        if (sentViaDesigner !== null && sentViaDesigner !== false) {
          return;
        }
      } catch (err) {
        strapi.log?.warn?.(
          `[certificates] email-designer-5 template ${designerTemplateId} failed, falling back to built-in branded HTML: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    if (typeof coreEmailService?.send === "function") {
      await coreEmailService.send({
        to: signer.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
      return;
    }

    throw new Error("Strapi email plugin service is not configured");
  });

  const settled = await Promise.allSettled(dispatches);
  for (const res of settled) {
    if (res.status === "fulfilled") {
      invitesSent += 1;
    } else {
      invitesFailed += 1;
      strapi.log?.warn?.(
        `[certificates] Failed to dispatch branded DocuSeal signing invite: ${
          res.reason instanceof Error ? res.reason.message : String(res.reason)
        }`
      );
    }
  }

  return { invitesSent, invitesFailed };
}
