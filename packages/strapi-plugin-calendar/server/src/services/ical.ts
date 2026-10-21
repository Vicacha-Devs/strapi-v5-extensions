import type { Core } from '@strapi/strapi';
import { generateIcsCalendar } from '../../../shared/icalGenerator';
import { PLUGIN_ID } from '../../../shared/pluginId';
import { getCalendarService, type IcalService } from '../types';

export default ({ strapi }: { strapi: Core.Strapi }): IcalService => {
  const getSettingsService = () =>
    getCalendarService(strapi, PLUGIN_ID, 'settings');
  const getOccurrenceService = () =>
    getCalendarService(strapi, PLUGIN_ID, 'occurrence');

  return {
    async buildFeedIcs(params: {
      from?: string;
      to?: string;
      locale?: string;
      category?: string;
      sourceId?: string;
    }): Promise<string> {
      const settings = await getSettingsService().getSettings();
      const occurrences = await getOccurrenceService().getOccurrences({
        ...params,
        includeDrafts: false,
      });

      return generateIcsCalendar({
        calendarTitle: settings.feedTitle || 'Calendar',
        timezone: settings.defaultTimezone || 'UTC',
        occurrences,
      });
    },

    async buildSingleInviteIcs(params: {
      documentId: string;
      occurrenceDate?: string;
      locale?: string;
    }): Promise<string> {
      const settings = await getSettingsService().getSettings();
      const now = new Date();
      const from = new Date(now.getFullYear() - 1, 0, 1).toISOString();
      const to = new Date(now.getFullYear() + 2, 11, 31).toISOString();

      let occurrences = await getOccurrenceService().getOccurrences({
        documentId: params.documentId,
        from,
        to,
        locale: params.locale,
        includeDrafts: false,
      });

      if (params.occurrenceDate) {
        const filtered = occurrences.filter(
          (o) => o.occurrenceDate === params.occurrenceDate
        );
        if (filtered.length > 0) {
          occurrences = filtered;
        }
      } else if (occurrences.length > 1) {
        occurrences = [occurrences[0]];
      }

      return generateIcsCalendar({
        calendarTitle:
          occurrences[0]?.title || settings.feedTitle || 'Calendar Invite',
        timezone: settings.defaultTimezone || 'UTC',
        occurrences,
      });
    },
  };
};
