import type { Core } from '@strapi/strapi';
import {
  PLUGIN_ID,
  type AlertBannerRecord,
  type SubscriberRecord,
  type SubscriberStatus,
} from '../../../shared';
import type { ControllerCtx } from './inboxController';

export const createCommunityHandlers = (strapi: Core.Strapi) => ({
  async subscribe(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      subscribe(input: {
        email: string;
        fullName?: string;
        phone?: string;
        locale?: string;
        topics?: string[];
        sourceFormSlug?: string;
      }): Promise<SubscriberRecord>;
    }>('subscriberService');

    try {
      const body = (ctx.request.body || {}) as {
        email: string;
        fullName?: string;
        phone?: string;
        locale?: string;
        topics?: string[];
        sourceFormSlug?: string;
      };
      const subscriber = await svc.subscribe(body);
      ctx.status = 201;
      ctx.body = {
        data: {
          email: subscriber.email,
          status: subscriber.status,
          topics: subscriber.topics,
          locale: subscriber.locale,
        },
      };
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async confirmSubscription(ctx: ControllerCtx) {
    const token =
      ctx.params?.token ||
      ctx.query?.token ||
      ((ctx.request.body?.token as string) ?? '');
    const svc = strapi.plugin(PLUGIN_ID).service<{
      confirmSubscription(token: string): Promise<SubscriberRecord>;
    }>('subscriberService');

    try {
      const subscriber = await svc.confirmSubscription(token);
      ctx.body = {
        data: {
          email: subscriber.email,
          status: subscriber.status,
          confirmedAt: subscriber.confirmedAt,
        },
      };
    } catch (err) {
      ctx.status = 404;
      ctx.body = { error: (err as Error).message };
    }
  },

  async unsubscribe(ctx: ControllerCtx) {
    const token =
      ctx.params?.token ||
      ctx.query?.token ||
      ((ctx.request.body?.token as string) ?? '');
    const svc = strapi.plugin(PLUGIN_ID).service<{
      unsubscribe(token: string): Promise<SubscriberRecord>;
    }>('subscriberService');

    try {
      const subscriber = await svc.unsubscribe(token);
      ctx.body = {
        data: {
          email: subscriber.email,
          status: subscriber.status,
          unsubscribedAt: subscriber.unsubscribedAt,
        },
      };
    } catch (err) {
      ctx.status = 404;
      ctx.body = { error: (err as Error).message };
    }
  },

  async listSubscribers(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      listSubscribers(filters?: {
        status?: SubscriberStatus;
        topic?: string;
        locale?: string;
      }): Promise<SubscriberRecord[]>;
    }>('subscriberService');

    const data = await svc.listSubscribers({
      status: ctx.query?.status as SubscriberStatus | undefined,
      topic: ctx.query?.topic,
      locale: ctx.query?.locale,
    });
    ctx.body = { data };
  },

  async getActiveAlerts(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      getActiveAlerts(params?: {
        locale?: string;
        nowIso?: string;
      }): Promise<AlertBannerRecord[]>;
    }>('alertService');

    const data = await svc.getActiveAlerts({
      locale: ctx.query?.locale,
      nowIso: ctx.query?.now,
    });
    ctx.body = { data };
  },

  async upsertAlertBanner(ctx: ControllerCtx) {
    const svc = strapi.plugin(PLUGIN_ID).service<{
      upsertAlertBanner(
        input: Partial<AlertBannerRecord> & {
          code: string;
          title: string;
          message: string;
        }
      ): Promise<AlertBannerRecord>;
    }>('alertService');

    const body = (ctx.request.body || {}) as Partial<AlertBannerRecord> & {
      code: string;
      title: string;
      message: string;
    };
    const data = await svc.upsertAlertBanner(body);
    ctx.body = { data };
  },
});
