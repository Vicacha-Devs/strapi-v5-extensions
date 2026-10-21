import { describe, it, expect } from 'vitest';
import type { Core } from '@strapi/strapi';
import settingsServiceFactory from '../server/src/services/settings';
import registryServiceFactory from '../server/src/services/registry';
import occurrenceServiceFactory from '../server/src/services/occurrence';
import icalServiceFactory from '../server/src/services/ical';
import adminControllerFactory from '../server/src/controllers/admin';
import contentApiControllerFactory from '../server/src/controllers/content-api';
import type {
  CalendarPluginServiceMap,
  StrapiRouteContext,
} from '../server/src/types';
import type {
  CalendarPluginSettings,
  DiscoveredContentType,
  ExpandedCalendarOccurrence,
} from '../shared/types';

import {
  buildFullCalendarTimeFormat,
  getLocalizedCalendarBundle,
  isRtlLocale,
  resolveCalendarDirection,
  resolveFullCalendarLocale,
  resolveLocaleFirstDay,
  SUPPORTED_CALENDAR_LOCALES,
} from '../shared/localization';

import en from '../admin/src/translations/en.json';
import es from '../admin/src/translations/es.json';
import fr from '../admin/src/translations/fr.json';
import de from '../admin/src/translations/de.json';
import pt from '../admin/src/translations/pt.json';
import itLocale from '../admin/src/translations/it.json';
import nl from '../admin/src/translations/nl.json';
import pl from '../admin/src/translations/pl.json';
import tr from '../admin/src/translations/tr.json';
import ar from '../admin/src/translations/ar.json';

function createMockStrapi(pluginConfig: Record<string, unknown> = {}) {
  let storedSettings: unknown = null;
  const documentsDb: Record<string, Array<Record<string, unknown>>> = {
    'api::event.event': [
      {
        documentId: 'evt-doc-1',
        title: 'Weekly Friday Khutbah',
        startDate: '2026-05-01T13:00:00.000Z',
        endDate: '2026-05-01T14:00:00.000Z',
        rrule: 'FREQ=WEEKLY;BYDAY=FR',
        category: 'Religious',
        hijriDate: '14 Dhu al-Qiʻdah 1447 AH',
      },
    ],
    'api::booking.booking': [
      {
        documentId: 'bkg-doc-1',
        bookingTitle: 'Hall Reservation - Wedding',
        checkIn: '2026-05-03T15:00:00.000Z',
        checkOut: '2026-05-03T19:00:00.000Z',
        status: 'confirmed',
      },
    ],
  };

  const services = {} as CalendarPluginServiceMap;

  const strapi: Core.Strapi = {
    config: {
      get: <T = unknown>(_key: string, defaultVal?: T): T =>
        (pluginConfig ?? defaultVal) as T,
    },
    contentTypes: {
      'api::event.event': {
        kind: 'collectionType',
        info: { displayName: 'Event', singularName: 'event' },
        attributes: {
          title: { type: 'string' },
          startDate: { type: 'datetime' },
          endDate: { type: 'datetime' },
          allDay: { type: 'boolean' },
          rrule: { type: 'string', customField: 'plugin::calendar.rrule' },
          category: { type: 'string' },
          color: { type: 'string' },
          hijriDate: { type: 'string' },
        },
      },
      'api::booking.booking': {
        kind: 'collectionType',
        info: { displayName: 'Booking', singularName: 'booking' },
        attributes: {
          bookingTitle: { type: 'string' },
          checkIn: { type: 'datetime' },
          checkOut: { type: 'datetime' },
          status: { type: 'enumeration' },
        },
      },
      'admin::permission': {
        kind: 'collectionType',
        info: { displayName: 'Permission' },
        attributes: { action: { type: 'string' } },
      },
    },
    store: () => ({
      get: async () => storedSettings,
      set: async ({ value }: { key: string; value: unknown }) => {
        storedSettings = value;
      },
    }),
    documents: (uid: string) => ({
      findMany: async () => documentsDb[uid] || [],
      findOne: async ({ documentId }: { documentId: string }) => {
        const list = documentsDb[uid] || [];
        return list.find((d) => d.documentId === documentId) ?? null;
      },
      update: async ({
        documentId,
        data,
      }: {
        documentId: string;
        data: Record<string, unknown>;
      }) => {
        const list = documentsDb[uid] || [];
        const idx = list.findIndex((d) => d.documentId === documentId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
          return list[idx];
        }
        return null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { documentId: `doc-${Date.now()}`, ...data };
        if (!documentsDb[uid]) documentsDb[uid] = [];
        documentsDb[uid].push(created);
        return created;
      },
    }),
    plugin: (name: string) => ({
      service: <T = Record<string, unknown>>(sName: string): T => {
        if (name === 'calendar') {
          return services[sName as keyof CalendarPluginServiceMap] as unknown as T;
        }
        return {} as T;
      },
    }),
    customFields: {
      register: () => {},
    },
  };

  services.registry = registryServiceFactory({ strapi });
  services.settings = settingsServiceFactory({ strapi });
  services.occurrence = occurrenceServiceFactory({ strapi });
  services.ical = icalServiceFactory({ strapi });

  return { strapi, services, documentsDb };
}

describe('Strapi Plugin Calendar Services & Controllers', () => {
  it('discovers non-system content types and classifies fields for the No-Code Mapper', async () => {
    const { services } = createMockStrapi();
    const schemas: DiscoveredContentType[] =
      services.settings.discoverContentTypes();

    expect(schemas.length).toBe(2);
    const eventSchema = schemas.find((s) => s.uid === 'api::event.event');
    expect(eventSchema?.displayName).toBe('Event');
    const fieldNames = (eventSchema?.fields ?? []).map((f) => f.name);
    expect(fieldNames).toContain('startDate');
    expect(fieldNames).toContain('endDate');
    expect(fieldNames).toContain('title');
    expect(fieldNames).toContain('rrule');
  });

  it('aggregates occurrences across multiple collections + runtime-registered companion plugins', async () => {
    const { services } = createMockStrapi({
      sources: [
        {
          id: 'events',
          label: 'Events',
          uid: 'api::event.event',
          color: '#4945ff',
          enabled: true,
          fields: {
            title: 'title',
            startDate: 'startDate',
            endDate: 'endDate',
            rrule: 'rrule',
            category: 'category',
          },
        },
      ],
      secondaryCalendars: [
        {
          id: 'hijri',
          label: 'Hijri',
          intlCalendar: 'islamic-umalqura',
          overrideField: 'hijriDate',
          enabled: true,
        },
      ],
    });

    // Companion plugin registers Bookings source programmatically
    services.registry.registerSource({
      id: 'bookings',
      label: 'Bookings',
      uid: 'api::booking.booking',
      color: '#059669',
      enabled: true,
      fields: {
        title: 'bookingTitle',
        startDate: 'checkIn',
        endDate: 'checkOut',
        status: 'status',
      },
    });

    const occurrences: ExpandedCalendarOccurrence[] =
      await services.occurrence.getOccurrences({
        from: '2026-05-01T00:00:00.000Z',
        to: '2026-05-10T23:59:59.000Z',
      });

    // 2 Friday Khutbahs (May 1 & May 8) + 1 Booking (May 3) = 3 unified occurrences
    expect(occurrences.length).toBe(3);

    const khutbah = occurrences.find((o) => o.sourceId === 'events');
    expect(khutbah?.title).toBe('Weekly Friday Khutbah');
    expect(khutbah?.alternateDates?.hijri?.formatted).toBe(
      '14 Dhu al-Qiʻdah 1447 AH'
    );

    const booking = occurrences.find((o) => o.sourceId === 'bookings');
    expect(booking?.title).toBe('Hall Reservation - Wedding');
    expect(booking?.color).toBe('#059669');
  });

  it('supports drag-and-drop rescheduling and slot quick-create via mapped field names', async () => {
    const { services, documentsDb } = createMockStrapi({
      sources: [
        {
          id: 'bookings',
          label: 'Bookings',
          uid: 'api::booking.booking',
          color: '#059669',
          enabled: true,
          fields: {
            title: 'bookingTitle',
            startDate: 'checkIn',
            endDate: 'checkOut',
          },
        },
      ],
    });

    // Reschedule existing booking
    await services.occurrence.rescheduleOccurrence({
      sourceId: 'bookings',
      documentId: 'bkg-doc-1',
      occurrenceDate: '2026-05-03',
      newStartDate: '2026-05-04T10:00:00.000Z',
      newEndDate: '2026-05-04T12:00:00.000Z',
    });
    expect(documentsDb['api::booking.booking'][0].checkIn).toBe(
      '2026-05-04T10:00:00.000Z'
    );
    expect(documentsDb['api::booking.booking'][0].checkOut).toBe(
      '2026-05-04T12:00:00.000Z'
    );

    // Quick-create new booking from slot selection
    const created = await services.occurrence.quickCreateEntry({
      sourceId: 'bookings',
      title: 'Board Room Meeting',
      startDate: '2026-05-06T09:00:00.000Z',
      endDate: '2026-05-06T10:30:00.000Z',
    });
    expect(created.bookingTitle).toBe('Board Room Meeting');
    expect(created.checkIn).toBe('2026-05-06T09:00:00.000Z');
  });

  it('supports clearSettings(), localization settings persistence, and controller endpoints', async () => {
    const { strapi } = createMockStrapi({ defaultView: 'dayGridMonth' });
    const adminCtrl = adminControllerFactory({ strapi });
    const contentCtrl = contentApiControllerFactory({ strapi });

    // Update settings including FullCalendar localization options
    const updateCtx: StrapiRouteContext<Partial<CalendarPluginSettings>> = {
      request: {
        body: {
          defaultView: 'timeGridWeek',
          defaultLocale: 'ar',
          direction: 'rtl',
          weekNumbers: true,
          weekNumberCalculation: 'local',
          timeFormat24h: false,
        },
      },
      body: null,
    };
    await adminCtrl.updateSettings(updateCtx);
    const updatedBody = updateCtx.body as { data: CalendarPluginSettings };
    expect(updatedBody.data.defaultView).toBe('timeGridWeek');
    expect(updatedBody.data.defaultLocale).toBe('ar');
    expect(updatedBody.data.direction).toBe('rtl');
    expect(updatedBody.data.weekNumbers).toBe(true);
    expect(updatedBody.data.weekNumberCalculation).toBe('local');
    expect(updatedBody.data.timeFormat24h).toBe(false);

    // Clear settings back to config defaults
    const clearCtx: StrapiRouteContext = { body: null };
    await adminCtrl.clearSettings(clearCtx);
    const clearedBody = clearCtx.body as { data: CalendarPluginSettings };
    expect(clearedBody.data.defaultView).toBe('dayGridMonth');
    expect(clearedBody.data.defaultLocale).toBe('auto');

    // Export .ics feed via content-api
    const headers: Record<string, string> = {};
    const icsCtx: StrapiRouteContext = {
      query: {},
      set: (k: string, v: string) => {
        headers[k] = v;
      },
      body: null,
    };
    await contentCtrl.downloadFeedIcs(icsCtx);
    expect(headers['Content-Type']).toContain('text/calendar');
    expect(String(icsCtx.body)).toContain('BEGIN:VCALENDAR');
  });
});

describe('FullCalendar Localization & 10-Locale Translation Parity', () => {
  it('ensures all 10 locales contain identical translation keys and non-empty strings', () => {
    const locales: Record<string, Record<string, string>> = {
      en,
      es,
      fr,
      de,
      pt,
      it: itLocale,
      nl,
      pl,
      tr,
      ar,
    };
    const baseKeys = Object.keys(en).sort();
    expect(baseKeys.length).toBeGreaterThanOrEqual(20);

    for (const [, dict] of Object.entries(locales)) {
      const keys = Object.keys(dict).sort();
      expect(keys).toEqual(baseKeys);
      for (const k of keys) {
        expect(typeof dict[k]).toBe('string');
        expect(dict[k].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('resolves FullCalendar LocaleInput bundles, RTL direction, firstDay, and 12h/24h time formats', () => {
    expect(SUPPORTED_CALENDAR_LOCALES.length).toBe(10);

    // Locale precedence: runtimeOverride > defaultLocaleSetting > uiLocale
    expect(resolveFullCalendarLocale('en', 'auto', 'auto')).toBe('en');
    expect(resolveFullCalendarLocale('fr-FR', 'auto', 'auto')).toBe('fr');
    expect(resolveFullCalendarLocale('en', 'es', 'auto')).toBe('es');
    expect(resolveFullCalendarLocale('en', 'es', 'ar-SA')).toBe('ar');

    // RTL detection & explicit direction override
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('he')).toBe(true);
    expect(isRtlLocale('es')).toBe(false);
    expect(resolveCalendarDirection('ar', 'auto')).toBe('rtl');
    expect(resolveCalendarDirection('ar', 'ltr')).toBe('ltr');
    expect(resolveCalendarDirection('es', 'auto')).toBe('ltr');

    // Locale-specific firstDay & buttonText bundle
    const arBundle = getLocalizedCalendarBundle('ar');
    expect(arBundle.direction).toBe('rtl');
    expect(arBundle.buttonText.today).toBe('اليوم');
    expect(resolveLocaleFirstDay('ar', null)).toBe(6); // Saturday
    expect(resolveLocaleFirstDay('es', null)).toBe(1); // Monday
    expect(resolveLocaleFirstDay('en', null)).toBe(0); // Sunday
    expect(resolveLocaleFirstDay('ar', 1)).toBe(1); // Explicit override

    // 24h vs 12h time format
    expect(buildFullCalendarTimeFormat(true).hour12).toBe(false);
    expect(buildFullCalendarTimeFormat(false).hour12).toBe(true);
  });
});

