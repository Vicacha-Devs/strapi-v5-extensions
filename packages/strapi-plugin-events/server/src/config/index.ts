import { EVENT_CONTENT_TYPE_UID } from '../../../shared/pluginId';
import type { EventsPluginSettings } from '../../../shared/types';

export const DEFAULT_PLUGIN_SETTINGS: EventsPluginSettings = {
  defaultTimezone: 'UTC',
  defaultCapacity: 100,
  waitlistEnabledByDefault: true,
  defaultMaxGuestsPerRegistration: 5,
  sendRsvpEmails: true,
  feedTitle: 'Events Calendar',
  sources: [
    {
      id: 'builtin-events',
      label: 'Events',
      uid: EVENT_CONTENT_TYPE_UID,
      color: '#0D9488',
      enabled: true,
      fields: {
        title: 'title',
        startDate: 'startDate',
        endDate: 'endDate',
        rrule: 'recurrence',
        location: 'location',
        category: 'category',
        status: 'eventStatus',
        summary: 'summary',
        slug: 'slug',
        capacity: 'capacity',
        rsvpEnabled: 'rsvpEnabled',
        poster: 'poster',
        actionLinks: 'actionLinks',
        spotlightConfig: 'spotlightConfig',
      },
    },
  ],
  secondaryCalendars: [],
  recurrencePresets: [
    { id: 'daily', label: 'Daily', rrule: 'FREQ=DAILY;INTERVAL=1' },
    { id: 'weekly-mon', label: 'Weekly on Mondays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO' },
    { id: 'weekly-tue', label: 'Weekly on Tuesdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU' },
    { id: 'weekly-wed', label: 'Weekly on Wednesdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE' },
    { id: 'weekly-thu', label: 'Weekly on Thursdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TH' },
    { id: 'weekly-fri', label: 'Weekly on Fridays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=FR' },
    { id: 'weekly-sat', label: 'Weekly on Saturdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SA' },
    { id: 'weekly-sun', label: 'Weekly on Sundays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SU' },
    { id: 'monthly', label: 'Monthly', rrule: 'FREQ=MONTHLY;INTERVAL=1' },
    { id: 'yearly', label: 'Yearly', rrule: 'FREQ=YEARLY;INTERVAL=1' },
  ],
};

export default {
  default: DEFAULT_PLUGIN_SETTINGS,
  validator(config: Partial<EventsPluginSettings>) {
    if (config.defaultCapacity !== undefined && config.defaultCapacity < 1) {
      throw new Error('events plugin config: defaultCapacity must be >= 1');
    }
  },
};
