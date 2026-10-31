import type { Core } from "@strapi/strapi";

import {
  PLUGIN_ID,
  type CaptchaProvider,
  type ChecklistItem,
  type SubmissionPriority,
  type SubmissionRecord,
  type SubmissionStatus,
} from "../../../shared";
import type { ControllerCtx } from "./inboxController";

export const createCaseworkHandlers = (strapi: Core.Strapi) => ({
  async listSubmissions(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listSubmissions(filters?: {
        formSlug?: string;
        status?: SubmissionStatus;
        priority?: SubmissionPriority;
        department?: string;
      }): Promise<SubmissionRecord[]>;
    }>("submissionService");

    const data = await svc.listSubmissions({
      formSlug: ctx.query?.formSlug,
      status: ctx.query?.status as SubmissionStatus | undefined,
      priority: ctx.query?.priority as SubmissionPriority | undefined,
      department: ctx.query?.department,
    });
    ctx.body = { data };
  },

  async updateCasework(ctx: ControllerCtx) {
    const documentId = ctx.params?.documentId || "";
    const svc = strapi.plugin(PLUGIN_ID).service<{
      updateCasework(
        documentId: string,
        patch: {
          status?: SubmissionStatus;
          priority?: SubmissionPriority;
          department?: string;
          staffNotes?: string;
          assignedTo?: string;
          checklistItems?: ChecklistItem[];
        }
      ): Promise<SubmissionRecord>;
    }>("submissionService");

    const data = await svc.updateCasework(
      documentId,
      (ctx.request.body || {}) as Record<string, unknown>
    );
    ctx.body = { data };
  },

  async scheduleBooking(ctx: ControllerCtx) {
    const documentId = ctx.params?.documentId || "";
    const svc = strapi.plugin(PLUGIN_ID).service<{
      scheduleBookingFromSubmission(
        documentId: string,
        bookingInput: {
          serviceSlug: string;
          date: string;
          startTime: string;
          endTime?: string;
          notes?: string;
        }
      ): Promise<{ submission: SubmissionRecord; bookingId: string }>;
    }>("submissionService");

    const body = (ctx.request.body || {}) as {
      serviceSlug: string;
      date: string;
      startTime: string;
      endTime?: string;
      notes?: string;
    };
    const data = await svc.scheduleBookingFromSubmission(documentId, body);
    ctx.body = { data };
  },

  async issueCertificate(ctx: ControllerCtx) {
    const documentId = ctx.params?.documentId || "";
    const svc = strapi.plugin(PLUGIN_ID).service<{
      issueCertificateFromSubmission(
        documentId: string,
        certInput?: {
          templateSlug?: string;
          recipientName?: string;
          requireChecklistVerified?: boolean;
        }
      ): Promise<{ submission: SubmissionRecord; certificateNumber: string }>;
    }>("submissionService");

    const body = (ctx.request.body || {}) as {
      templateSlug?: string;
      recipientName?: string;
      requireChecklistVerified?: boolean;
    };
    const data = await svc.issueCertificateFromSubmission(documentId, body);
    ctx.body = { data };
  },

  async exportCsv(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      exportCsv(formSlug?: string): Promise<string>;
    }>("submissionService");

    const csv = await svc.exportCsv(ctx.query?.formSlug);
    ctx.set?.("Content-Type", "text/csv; charset=utf-8");
    ctx.body = csv;
  },

  async testCaptcha(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      testCaptchaSecret(
        provider: CaptchaProvider,
        secret: string
      ): Promise<{ ok: boolean; reason?: string }>;
    }>("submissionService");
    const body = (ctx.request.body || {}) as {
      provider: CaptchaProvider;
      secret: string;
    };
    const data = await svc.testCaptchaSecret(body.provider, body.secret);
    ctx.body = { data };
  },
});
