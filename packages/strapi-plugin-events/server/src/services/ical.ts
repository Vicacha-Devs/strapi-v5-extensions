import type { Core } from '@strapi/strapi';
import { generateIcsCalendar } from '../../../shared/icalGenerator';
import { getOccurrenceService, getSettingsService } from '../types';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async generateFeedIcs(params?: {
      from?: string;
      to?: string;
      category?: string;
      sourceId?: string;
      locale?: string;
    }): Promise<string> {
      const settings = await getSettingsService(strapi).getSettings();
      const occurrences = await getOccurrenceService(strapi).getOccurrences({
        from: params?.from,
        to: params?.to,
        category: params?.category,
        sourceId: params?.sourceId,
        locale: params?.locale,
        includeDrafts: false,
      });

      return generateIcsCalendar(occurrences, settings.feedTitle);
    },

    async generateEventInviteIcs(params: {
      documentId: string;
      occurrenceDate?: string;
      locale?: string;
    }): Promise<string> {
      const settings = await getSettingsService(strapi).getSettings();
      const now = new Date();
      const from = new Date(now.getFullYear() - 1, 0, 1).toISOString();
      const to = new Date(now.getFullYear() + 2, 11, 31).toISOString();

      const occurrences = await getOccurrenceService(strapi).getOccurrences({
        documentId: params.documentId,
        from,
        to,
        locale: params.locale,
        includeDrafts: false,
      });

      const filtered = params.occurrenceDate
        ? occurrences.filter((o) => o.occurrenceDate === params.occurrenceDate)
        : occurrences.slice(0, 1);

      return generateIcsCalendar(filtered, settings.feedTitle);
    },
  };
};
