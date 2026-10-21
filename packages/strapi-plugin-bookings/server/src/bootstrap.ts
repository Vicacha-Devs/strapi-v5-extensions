import type { Core } from '@strapi/strapi';
import { registerCalendarSystemFormatter } from '../../shared/calendarSystems';
import { PLUGIN_ID } from '../../shared/pluginId';
import type { BookingsPluginConfig } from './types';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const pluginConfig = (strapi.config.get(`plugin::${PLUGIN_ID}`) ??
    {}) as BookingsPluginConfig;

  if (pluginConfig.calendarSystems) {
    for (const [systemId, formatter] of Object.entries(
      pluginConfig.calendarSystems
    )) {
      if (typeof formatter === 'function') {
        registerCalendarSystemFormatter(systemId, formatter);
      }
    }
  }

  const actions = [
    {
      section: 'plugins',
      displayName: 'Access the Bookings & Availability Workspace',
      uid: 'read',
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Manage Bookings, Resources & Approvals',
      uid: 'manage',
      pluginName: PLUGIN_ID,
    },
    {
      section: 'plugins',
      displayName: 'Configure Bookings Settings',
      uid: 'settings',
      pluginName: PLUGIN_ID,
    },
  ];

  const actionProvider = (
    strapi.admin?.services?.permission as
      | { actionProvider?: { registerMany?: (items: unknown[]) => Promise<void> } }
      | undefined
  )?.actionProvider;

  if (actionProvider?.registerMany) {
    await actionProvider.registerMany(actions);
  }

  // Automatically register plugin::bookings.booking with @vicacha-devs/strapi-plugin-calendar when present
  try {
    const calendarPlugin = strapi.plugin('calendar') as
      | {
          service?: (name: string) => {
            registerCompanionSource?: (source: Record<string, unknown>) => void;
          };
        }
      | undefined;

    const calendarSettingsSvc = calendarPlugin?.service?.('settings');
    if (calendarSettingsSvc?.registerCompanionSource) {
      calendarSettingsSvc.registerCompanionSource({
        id: 'companion-bookings',
        uid: 'plugin::bookings.booking',
        label: 'Bookings & Reservations',
        color: '#0d9488',
        enabled: true,
        titleField: 'title',
        startDateField: 'startDate',
        endDateField: 'endDate',
        categoryField: 'status',
        locationField: 'assignedHost',
        descriptionField: 'notes',
      });
    }
  } catch {
    // @vicacha-devs/strapi-plugin-calendar is optional at runtime
  }
};
