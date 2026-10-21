import type { Core } from '@strapi/strapi';
import {
  DEFAULT_BROADCAST_SETTINGS,
  PLUGIN_ID,
  isSupportedCalendar,
  isSupportedWhatsAppDriver,
  validateGatewayUrl,
  type BroadcastSettings,
  type CalendarSystemId,
} from '../../../shared';

const SETTINGS_KEY = 'settings';
const MASKED_SECRET = '••••••••';

function maskSecret(val?: string): string {
  if (!val || val === MASKED_SECRET) return '';
  return MASKED_SECRET;
}

const createSettingsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getPluginStore() {
    return strapi.store({
      type: 'plugin',
      name: PLUGIN_ID,
    });
  },

  getConfigDefaults(): BroadcastSettings {
    const rawConfig = strapi.config.get<Partial<BroadcastSettings>>(
      `plugin::${PLUGIN_ID}`,
      {}
    );

    const primaryCalendar: CalendarSystemId = isSupportedCalendar(
      rawConfig.primaryCalendar
    )
      ? rawConfig.primaryCalendar
      : DEFAULT_BROADCAST_SETTINGS.primaryCalendar;

    const secondaryCalendars: CalendarSystemId[] = Array.isArray(
      rawConfig.secondaryCalendars
    )
      ? rawConfig.secondaryCalendars.filter((cal): cal is CalendarSystemId =>
          isSupportedCalendar(cal)
        )
      : DEFAULT_BROADCAST_SETTINGS.secondaryCalendars;

    return {
      ...DEFAULT_BROADCAST_SETTINGS,
      ...rawConfig,
      primaryCalendar,
      secondaryCalendars,
      whatsappDriver: isSupportedWhatsAppDriver(rawConfig.whatsappDriver)
        ? rawConfig.whatsappDriver
        : DEFAULT_BROADCAST_SETTINGS.whatsappDriver,
    };
  },

  async getSettings(): Promise<BroadcastSettings> {
    const defaults = this.getConfigDefaults();
    const store = this.getPluginStore();
    const stored = (await store.get({
      key: SETTINGS_KEY,
    })) as Partial<BroadcastSettings> | null;

    if (!stored) {
      return defaults;
    }

    return {
      ...defaults,
      ...stored,
    };
  },

  async getPublicSafeSettings(): Promise<BroadcastSettings> {
    const full = await this.getSettings();
    return {
      ...full,
      telegramBotToken: maskSecret(full.telegramBotToken),
      whatsappAccessToken: maskSecret(full.whatsappAccessToken),
      whatsappGatewayApiKey: maskSecret(full.whatsappGatewayApiKey),
    };
  },

  async updateSettings(
    partial: Partial<BroadcastSettings>
  ): Promise<BroadcastSettings> {
    const current = await this.getSettings();

    if (partial.whatsappGatewayUrl) {
      const check = validateGatewayUrl(partial.whatsappGatewayUrl, {
        allowLocalhost: Boolean(
          partial.allowLocalhostGateways ?? current.allowLocalhostGateways
        ),
      });
      if (!check.valid) {
        throw new Error(check.errors.join('; '));
      }
    }

    const next: BroadcastSettings = {
      ...current,
      ...partial,
      primaryCalendar: isSupportedCalendar(partial.primaryCalendar)
        ? partial.primaryCalendar
        : current.primaryCalendar,
      secondaryCalendars: Array.isArray(partial.secondaryCalendars)
        ? partial.secondaryCalendars.filter((cal): cal is CalendarSystemId =>
            isSupportedCalendar(cal)
          )
        : current.secondaryCalendars,
      whatsappDriver: isSupportedWhatsAppDriver(partial.whatsappDriver)
        ? partial.whatsappDriver
        : current.whatsappDriver,
      telegramBotToken:
        partial.telegramBotToken === MASKED_SECRET ||
        partial.telegramBotToken === undefined
          ? current.telegramBotToken
          : partial.telegramBotToken,
      whatsappAccessToken:
        partial.whatsappAccessToken === MASKED_SECRET ||
        partial.whatsappAccessToken === undefined
          ? current.whatsappAccessToken
          : partial.whatsappAccessToken,
      whatsappGatewayApiKey:
        partial.whatsappGatewayApiKey === MASKED_SECRET ||
        partial.whatsappGatewayApiKey === undefined
          ? current.whatsappGatewayApiKey
          : partial.whatsappGatewayApiKey,
    };

    const store = this.getPluginStore();
    await store.set({
      key: SETTINGS_KEY,
      value: next,
    });

    return next;
  },
});

export default createSettingsService;
