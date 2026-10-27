import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import serverPlugin from '../server/src/index.ts';
import type {
  AvailabilityService,
  ReservationService,
  SettingsService,
} from '../server/src/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createMockStrapi() {
  const storeData = new Map<string, unknown>();
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  const emittedEvents: Array<{ name: string; payload: unknown }> = [];
  const registeredCustomFields: unknown[] = [];
  const companionSources: unknown[] = [];

  const ensureCollection = (uid: string) => {
    if (!collections.has(uid)) {
      collections.set(uid, new Map());
    }
    return collections.get(uid)!;
  };

  let idCounter = 1;

  const strapi: Record<string, unknown> = {
    config: {
      get(key: string) {
        if (key === 'plugin::bookings') {
          return {
            defaultTimezone: 'UTC',
            defaultSlotDurationMinutes: 60,
            defaultCapacityPerSlot: 20,
            secondaryCalendars: [
              {
                id: 'islamic-umalqura',
                label: 'Hijri (Umm al-Qura)',
                intlCalendar: 'islamic-umalqura',
                dayOffset: 0,
                enabled: true,
              },
            ],
            schemaExtensions: {
              booking: {
                customDepartment: { type: 'string' },
              },
            },
            customFields: [{ name: 'slot-picker', type: 'json' }],
          };
        }
        return {};
      },
    },
    contentTypes: {
      'plugin::bookings.resource': {
        uid: 'plugin::bookings.resource',
        kind: 'collectionType',
        info: {
          displayName: 'Booking Resource',
          singularName: 'resource',
          pluralName: 'resources',
        },
        attributes: {
          name: { type: 'string' },
          slotDurationMinutes: { type: 'integer' },
        },
      },
      'plugin::bookings.booking': {
        uid: 'plugin::bookings.booking',
        kind: 'collectionType',
        info: {
          displayName: 'Booking',
          singularName: 'booking',
          pluralName: 'bookings',
        },
        attributes: {
          bookingCode: { type: 'string' },
          startDate: { type: 'datetime' },
          partySize: { type: 'integer' },
          status: { type: 'enumeration' },
        },
      },
      'api::external-reservation.external-reservation': {
        uid: 'api::external-reservation.external-reservation',
        kind: 'collectionType',
        info: {
          displayName: 'External Reservation',
          singularName: 'external-reservation',
          pluralName: 'external-reservations',
        },
        attributes: {
          clientName: { type: 'string' },
          clientEmail: { type: 'email' },
          reservationDate: { type: 'date' },
          slotWindow: { type: 'enumeration' },
          guests: { type: 'integer' },
          status: { type: 'enumeration' },
        },
      },
    },
    customFields: {
      register(def: unknown) {
        registeredCustomFields.push(def);
      },
    },
    admin: {
      services: {
        permission: {
          actionProvider: {
            async registerMany() {},
          },
        },
      },
    },
    eventHub: {
      emit(name: string, payload: unknown) {
        emittedEvents.push({ name, payload });
      },
    },
    store() {
      return {
        async get({ key }: { key: string }) {
          return storeData.get(key);
        },
        async set({ key, value }: { key: string; value: unknown }) {
          storeData.set(key, value);
        },
      };
    },
    documents(uid: string) {
      const col = ensureCollection(uid);
      return {
        async findMany(params?: { filters?: Record<string, unknown> }) {
          const rows = Array.from(col.values());
          if (params?.filters?.isActive) {
            return rows.filter((r) => Boolean(r.isActive) === true);
          }
          return rows;
        },
        async create({ data }: { data: Record<string, unknown> }) {
          const documentId = `doc-${idCounter++}`;
          const record = {
            ...data,
            documentId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          col.set(documentId, record);
          return record;
        },
        async update({
          documentId,
          data,
        }: {
          documentId: string;
          data: Record<string, unknown>;
        }) {
          const existing = col.get(documentId);
          if (!existing) {
            throw new Error(`Document ${documentId} not found`);
          }
          const updated = {
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          col.set(documentId, updated);
          return updated;
        },
      };
    },
    plugin(name: string) {
      if (name === 'calendar') {
        return {
          service(svcName: string) {
            if (svcName === 'registry') {
              return {
                async registerSource(src: unknown) {
                  companionSources.push(src);
                },
              };
            }
            return {};
          },
        };
      }
      if (name === 'bookings') {
        return {
          service(svcName: string) {
            return servicesMap[svcName];
          },
        };
      }
      return {};
    },
  };

  const servicesMap: Record<string, unknown> = {
    settings: serverPlugin.services.settings({ strapi: strapi as never }),
    availability: serverPlugin.services.availability({ strapi: strapi as never }),
    reservation: serverPlugin.services.reservation({ strapi: strapi as never }),
  };

  return {
    strapi,
    services: {
      settings: servicesMap.settings as SettingsService,
      availability: servicesMap.availability as AvailabilityService,
      reservation: servicesMap.reservation as ReservationService,
    },
    emittedEvents,
    registeredCustomFields,
    companionSources,
    ensureCollection,
  };
}

describe('Strapi Plugin Bookings Services, Controllers & Calendar Integration', () => {
  it('registers customFields, schemaExtensions, and companion source with @vicacha-devs/strapi-plugin-calendar', async () => {
    const {
      strapi,
      registeredCustomFields,
      companionSources,
    } = createMockStrapi();

    serverPlugin.register({ strapi: strapi as never });
    await serverPlugin.bootstrap({ strapi: strapi as never });

    assert.equal(registeredCustomFields.length, 1);
    assert.equal(companionSources.length, 1);
    const ct = (strapi.contentTypes as Record<string, { attributes: Record<string, unknown> }>)[
      'plugin::bookings.booking'
    ];
    assert.ok(ct.attributes.customDepartment);
  });

  it('creates resources, computes slots with secondary calendars, enforces capacity, auto-assigns host by language, and supports token reschedule/cancel', async () => {
    const { strapi, services, ensureCollection } = createMockStrapi();

    const resource = await services.availability.saveResource({
      name: 'Conference Room A',
      resourceType: 'room',
      slotDurationMinutes: 60,
      capacityPerSlot: 15,
      maxPartySize: 15,
      minLeadTimeHours: 1,
      requiresApproval: false,
      weeklySchedule: {
        mode: 'interval',
        days: {
          '1': [{ start: '09:00', end: '11:00' }],
        },
      },
      assignedHosts: [
        { id: 'h-en', name: 'Sarah', languages: ['en'] },
        { id: 'h-es', name: 'Carlos', languages: ['es', 'pt'] },
      ],
    });

    // Available slots for Monday 2026-10-19
    const slotsBefore = await services.availability.getAvailableSlots({
      resourceSlug: resource.slug,
      from: '2026-10-19',
      to: '2026-10-19',
      partySize: 10,
      preferredLanguage: 'es',
    });
    assert.equal(slotsBefore.length, 2);
    assert.ok(slotsBefore[0].secondaryDates?.['islamic-umalqura']);

    // Reserve 10 seats in 09:00-10:00 slot with preferredLanguage 'es'
    const res1 = await services.reservation.createReservation(
      {
        resourceDocumentId: resource.documentId,
        customerName: 'Maria Gomez',
        customerEmail: 'maria@example.org',
        organization: 'Tech Org',
        startDate: '2026-10-19T09:00:00.000Z',
        endDate: '2026-10-19T10:00:00.000Z',
        partySize: 10,
        preferredLanguage: 'es',
      },
      { skipLeadTimeCheck: true }
    );

    assert.equal(res1.booking.status, 'confirmed');
    assert.equal(res1.booking.assignedHost, 'Carlos');
    assert.ok(res1.cancelToken.length >= 32);

    // Attempting to reserve 8 more seats in the same 09:00-10:00 slot (capacity 15, 10 taken -> 5 left) must fail
    await assert.rejects(
      () =>
        services.reservation.createReservation(
          {
            resourceDocumentId: resource.documentId,
            customerName: 'Overflow Guest',
            customerEmail: 'overflow@example.org',
            startDate: '2026-10-19T09:00:00.000Z',
            endDate: '2026-10-19T10:00:00.000Z',
            partySize: 8,
          },
          { skipLeadTimeCheck: true }
        ),
      /Insufficient slot capacity/
    );

    // Self-service reschedule with invalid token must fail
    await assert.rejects(
      () =>
        services.reservation.rescheduleBooking({
          bookingCode: res1.booking.bookingCode,
          cancelToken: 'invalid-token',
          newStartDate: '2026-10-19T10:00:00.000Z',
          newEndDate: '2026-10-19T11:00:00.000Z',
        }),
      /Invalid or missing cancelToken/
    );

    // Self-service reschedule with valid token succeeds
    const rescheduled = await services.reservation.rescheduleBooking({
      bookingCode: res1.booking.bookingCode,
      cancelToken: res1.cancelToken,
      newStartDate: '2026-10-19T10:00:00.000Z',
      newEndDate: '2026-10-19T11:00:00.000Z',
    });
    assert.equal(rescheduled.startDate, '2026-10-19T10:00:00.000Z');

    // External collection source mapping test
    await services.settings.updateSettings({
      sources: [
        {
          id: 'ext-source',
          uid: 'api::external-reservation.external-reservation',
          label: 'External Bookings',
          color: '#2563eb',
          enabled: true,
          customerNameField: 'clientName',
          customerEmailField: 'clientEmail',
          dateField: 'reservationDate',
          slotLabelField: 'slotWindow',
          partySizeField: 'guests',
          statusField: 'status',
        },
      ],
    });
    ensureCollection('api::external-reservation.external-reservation').set('ext-1', {
      documentId: 'ext-1',
      clientName: 'External Partner',
      clientEmail: 'partner@example.com',
      reservationDate: '2026-10-19',
      slotWindow: 'morning',
      guests: 4,
      status: 'confirmed',
    });

    const calendarResult = await services.availability.getCalendarOccurrences({});
    assert.equal(calendarResult.bookings.length, 2);
    assert.equal(calendarResult.stats.totalGuests, 14);

    // Public Content-API Cancel with valid token
    const contentApiCtrl = serverPlugin.controllers['content-api']({
      strapi: strapi as never,
    });
    const cancelCtx = {
      query: {},
      params: {},
      request: {
        body: {
          bookingCode: res1.booking.bookingCode,
          cancelToken: res1.cancelToken,
          reason: 'Schedule change',
        },
      },
      body: null as unknown,
      status: 200,
      set() {},
      badRequest(msg: string) {
        throw new Error(msg);
      },
    };
    await contentApiCtrl.cancelReservation(cancelCtx);
    const cancelledData = (cancelCtx.body as { data: { status: string } }).data;
    assert.equal(cancelledData.status, 'cancelled');
  });
});

describe('10-Locale Admin Translation Parity', () => {
  it('ensures all 10 locales contain identical keys and non-empty translations', () => {
    const translationsDir = path.resolve(__dirname, '../admin/src/translations');
    const locales = ['en', 'es', 'ar', 'fr', 'de', 'pt', 'tr', 'id', 'ur', 'zh'];
    const enJson = JSON.parse(
      fs.readFileSync(path.join(translationsDir, 'en.json'), 'utf8')
    ) as Record<string, string>;
    const expectedKeys = Object.keys(enJson).sort();

    assert.ok(expectedKeys.length >= 60);

    for (const locale of locales) {
      const filePath = path.join(translationsDir, `${locale}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<
        string,
        string
      >;
      const actualKeys = Object.keys(data).sort();
      assert.deepEqual(
        actualKeys,
        expectedKeys,
        `Locale ${locale} keys mismatch en.json`
      );
      for (const [k, v] of Object.entries(data)) {
        assert.ok(
          typeof v === 'string' && v.trim().length > 0,
          `Empty translation for ${locale}.${k}`
        );
      }
    }
  });
});
