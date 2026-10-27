import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../shared/pluginId';
import { getSettingsService } from './types';

interface CalendarRegistryService {
  registerSource?: (source: {
    id: string;
    label: string;
    uid: string;
    color: string;
    enabled: boolean;
    fields: Record<string, unknown>;
    timeSlotMap?: Record<string, { start: string; end: string }>;
    categoryColors?: Record<string, string>;
    defaultAllDay?: boolean;
  }) => Promise<unknown>;
}

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Read Calendar & Events',
      uid: 'read',
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Create & Reschedule Events / Manage RSVPs',
      uid: 'update',
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Manage Events Plugin Settings',
      uid: 'settings.update',
      pluginName: PLUGIN_ID,
    },
  ];

  if (strapi.admin?.services?.permission?.actionProvider?.registerMany) {
    await strapi.admin.services.permission.actionProvider.registerMany(actions);
  }

  // Ensure settings store is initialized with config defaults
  const settingsService = getSettingsService(strapi);
  let settings = null;
  if (settingsService && typeof settingsService.ensureInitialized === 'function') {
    settings = await settingsService.ensureInitialized();
  }

  // Register all event sources with @vicacha-devs/strapi-plugin-calendar (required dependency providing the unified calendar view)
  const calendarPlugin = strapi.plugin('calendar');
  const calendarRegistry = calendarPlugin?.service('registry') as
    | CalendarRegistryService
    | undefined;
  if (calendarRegistry && typeof calendarRegistry.registerSource === 'function' && settings) {
    for (const source of settings.sources ?? []) {
      try {
        await calendarRegistry.registerSource({
          id: source.id,
          label: source.label,
          uid: source.uid,
          color: source.color,
          enabled: source.enabled,
          fields: {
            title: source.fields.title,
            startDate: source.fields.startDate,
            endDate: source.fields.endDate,
            rrule: source.fields.rrule,
            location: source.fields.location,
            category: source.fields.category,
            status: source.fields.status,
            summary: source.fields.summary,
            slug: source.fields.slug,
            timeSlot: source.fields.timeSlot,
            alternateDateFields: source.fields.alternateDateFields,
            customFields: source.fields.customFields,
          },
          timeSlotMap: source.timeSlotMap,
          categoryColors: source.categoryColors,
          defaultAllDay: source.defaultAllDay,
        });
      } catch {
        // Ignore if calendar registry store is unavailable during isolated unit tests
      }
    }
  }
};
