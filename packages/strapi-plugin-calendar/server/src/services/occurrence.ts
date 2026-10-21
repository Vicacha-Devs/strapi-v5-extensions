import type { Core } from '@strapi/strapi';
import {
  formatDateInCalendarSystem,
  registerCalendarSystemFormatter,
  resolveOccurrenceAlternateDates,
  unregisterCalendarSystemFormatter,
} from '../../../shared/calendarSystems';
import { buildCalendarLinks } from '../../../shared/icalGenerator';
import { PLUGIN_ID } from '../../../shared/pluginId';
import {
  expandRuleSlots,
  parseRRuleFieldValue,
} from '../../../shared/rruleEngine';
import type {
  CalendarItemStatus,
  CalendarSourceMapping,
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
  ExpandedCalendarOccurrence,
  TimeSlotWindow,
} from '../../../shared/types';
import {
  getCalendarService,
  type OccurrenceQueryParams,
  type OccurrenceService,
  type QuickCreateEntryParams,
  type RescheduleOccurrenceParams,
} from '../types';

const DEFAULT_TIME_SLOTS: Record<string, TimeSlotWindow> = {
  morning: { start: '09:00:00', end: '11:00:00' },
  afternoon: { start: '14:00:00', end: '16:00:00' },
  evening: { start: '18:00:00', end: '20:00:00' },
};

function resolveStartEndFromDocument(
  doc: Record<string, unknown>,
  source: CalendarSourceMapping
): { startDate: string; endDate: string | null; allDay: boolean } | null {
  const rawStart = doc[source.fields.startDate];
  if (!rawStart || typeof rawStart !== 'string') {
    return null;
  }

  const rawEnd = source.fields.endDate ? doc[source.fields.endDate] : null;
  const rawSlot = source.fields.timeSlot ? doc[source.fields.timeSlot] : null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart)) {
    if (typeof rawSlot === 'string' && rawSlot) {
      const slotMap = { ...DEFAULT_TIME_SLOTS, ...(source.timeSlotMap ?? {}) };
      const mapped = slotMap[rawSlot];
      if (mapped) {
        return {
          startDate: `${rawStart}T${mapped.start}.000Z`,
          endDate: `${rawStart}T${mapped.end}.000Z`,
          allDay: false,
        };
      }
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(rawSlot)) {
        const normalizedTime = rawSlot.length === 5 ? `${rawSlot}:00` : rawSlot;
        return {
          startDate: `${rawStart}T${normalizedTime}.000Z`,
          endDate: null,
          allDay: false,
        };
      }
    }
    return {
      startDate: `${rawStart}T00:00:00.000Z`,
      endDate: `${rawStart}T23:59:59.000Z`,
      allDay: source.defaultAllDay ?? true,
    };
  }

  const allDay =
    typeof doc.allDay === 'boolean' ? doc.allDay : Boolean(source.defaultAllDay);
  return {
    startDate: rawStart,
    endDate: typeof rawEnd === 'string' && rawEnd ? rawEnd : null,
    allDay,
  };
}

function mapStatus(rawStatus: unknown): CalendarItemStatus {
  if (typeof rawStatus !== 'string') return 'scheduled';
  const lower = rawStatus.toLowerCase();
  if (lower === 'cancelled' || lower === 'canceled' || lower === 'rejected') {
    return 'cancelled';
  }
  if (lower === 'postponed' || lower === 'pending') return 'postponed';
  if (lower === 'rescheduled') return 'rescheduled';
  return 'scheduled';
}

export default ({ strapi }: { strapi: Core.Strapi }): OccurrenceService => {
  const getSettingsService = () =>
    getCalendarService(strapi, PLUGIN_ID, 'settings');

  return {
    registerCalendarFormatter(
      calendarId: string,
      formatter: CalendarSystemFormatterFn
    ): void {
      registerCalendarSystemFormatter(calendarId, formatter);
    },

    unregisterCalendarFormatter(calendarId: string): void {
      unregisterCalendarSystemFormatter(calendarId);
    },

    formatDateInCalendarSystem(
      isoOrDateKey: string,
      system: CalendarSystemConfig,
      locale = 'en',
      options?: { compact?: boolean }
    ): string {
      return formatDateInCalendarSystem(isoOrDateKey, system, locale, options);
    },

    async getOccurrences(
      params: OccurrenceQueryParams
    ): Promise<ExpandedCalendarOccurrence[]> {
      const settings = await getSettingsService().getSettings();
      const now = new Date();
      const defaultFrom = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      ).toISOString();
      const defaultTo = new Date(
        now.getFullYear(),
        now.getMonth() + 3,
        0,
        23,
        59,
        59
      ).toISOString();

      const windowStart =
        params.from && !Number.isNaN(new Date(params.from).getTime())
          ? params.from
          : defaultFrom;
      const windowEnd =
        params.to && !Number.isNaN(new Date(params.to).getTime())
          ? params.to
          : defaultTo;

      const activeSources = (settings.sources ?? []).filter(
        (s: CalendarSourceMapping) =>
          s.enabled &&
          (!params.sourceId || s.id === params.sourceId || s.uid === params.sourceId)
      );

      const allOccurrences: ExpandedCalendarOccurrence[] = [];

      for (const source of activeSources) {
        let docs: Array<Record<string, unknown>> = [];
        try {
          const queryOpts: Core.DocumentQueryOptions = { limit: 500 };
          if (params.documentId) {
            queryOpts.filters = { documentId: { $eq: params.documentId } };
          }
          if (params.locale) {
            queryOpts.locale = params.locale;
          }
          if (!params.includeDrafts) {
            queryOpts.status = 'published';
          }
          docs = await strapi.documents(source.uid).findMany(queryOpts);
        } catch {
          try {
            const fallbackOpts: Core.DocumentQueryOptions = { limit: 500 };
            if (params.documentId) {
              fallbackOpts.filters = { documentId: { $eq: params.documentId } };
            }
            docs = await strapi.documents(source.uid).findMany(fallbackOpts);
          } catch {
            docs = [];
          }
        }

        for (const doc of docs) {
          const docId = String(doc.documentId ?? doc.id ?? '');
          if (!docId) continue;

          const startEnd = resolveStartEndFromDocument(doc, source);
          if (!startEnd) continue;

          const categoryVal = source.fields.category
            ? String(doc[source.fields.category] ?? '')
            : '';
          if (
            params.category &&
            params.category !== 'all' &&
            categoryVal.toLowerCase() !== params.category.toLowerCase()
          ) {
            continue;
          }

          const rawRecurrence = source.fields.rrule ? doc[source.fields.rrule] : null;
          const recurrence = parseRRuleFieldValue(
            rawRecurrence,
            typeof doc.timezone === 'string' && doc.timezone
              ? doc.timezone
              : settings.defaultTimezone
          );
          if (startEnd.allDay) {
            recurrence.allDay = true;
          }

          const slots = expandRuleSlots({
            baseStartDate: startEnd.startDate,
            baseEndDate: startEnd.endDate,
            recurrence,
            windowStart,
            windowEnd,
          });

          if (slots.length === 0) continue;

          const baseTitle = String(doc[source.fields.title] ?? doc.title ?? 'Untitled');
          const baseLocation = source.fields.location
            ? String(doc[source.fields.location] ?? '')
            : '';
          const summary = source.fields.summary
            ? String(doc[source.fields.summary] ?? '')
            : '';
          const slug = source.fields.slug
            ? String(doc[source.fields.slug] ?? '')
            : undefined;
          const statusVal = mapStatus(
            source.fields.status ? doc[source.fields.status] : doc.status
          );

          const docColorVal = source.fields.color ? doc[source.fields.color] : doc.color;
          const color =
            (categoryVal && source.categoryColors?.[categoryVal]) ||
            (typeof docColorVal === 'string' && docColorVal.startsWith('#')
              ? docColorVal
              : source.color);

          const baseDateKey = startEnd.startDate.slice(0, 10);

          let extractedCustomFields: Record<string, unknown> | undefined;
          if (
            Array.isArray(source.fields.customFields) &&
            source.fields.customFields.length > 0
          ) {
            extractedCustomFields = {};
            for (const fieldKey of source.fields.customFields) {
              if (fieldKey && doc[fieldKey] !== undefined) {
                extractedCustomFields[fieldKey] = doc[fieldKey];
              }
            }
            if (Object.keys(extractedCustomFields).length === 0) {
              extractedCustomFields = undefined;
            }
          }

          for (const slot of slots) {
            const effectiveTitle = slot.override?.title || baseTitle;
            const effectiveLocation = slot.override?.location || baseLocation;

            const calendarLinks = buildCalendarLinks({
              documentId: docId,
              title: effectiveTitle,
              startDate: slot.startDate,
              endDate: slot.endDate,
              allDay: Boolean(recurrence.allDay),
              summary,
              location: effectiveLocation,
              occurrenceDate: slot.occurrenceDate,
            });

            const alternateDates = resolveOccurrenceAlternateDates({
              occurrenceDate: slot.occurrenceDate,
              baseDateKey,
              isRecurring: slot.isRecurring,
              doc,
              source,
              secondaryCalendars: settings.secondaryCalendars ?? [],
              locale: params.locale || 'en',
            });

            allOccurrences.push({
              occurrenceId: `${source.id}:${docId}:${slot.occurrenceDate}`,
              sourceId: source.id,
              sourceLabel: source.label,
              uid: source.uid,
              documentId: docId,
              occurrenceDate: slot.occurrenceDate,
              startDate: slot.startDate,
              endDate: slot.endDate,
              allDay: Boolean(recurrence.allDay),
              timezone: recurrence.timezone,
              title: effectiveTitle,
              slug,
              summary: summary || undefined,
              location: effectiveLocation || undefined,
              category: categoryVal || undefined,
              status: statusVal,
              color,
              isRecurring: slot.isRecurring,
              rrule: recurrence.rrule || undefined,
              rscale: slot.rscale,
              isOverridden: slot.isOverridden,
              calendarLinks,
              alternateDates:
                Object.keys(alternateDates).length > 0 ? alternateDates : undefined,
              customFields: extractedCustomFields,
            });
          }
        }
      }

      allOccurrences.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      return allOccurrences;
    },

    async rescheduleOccurrence(
      params: RescheduleOccurrenceParams
    ): Promise<Record<string, unknown>> {
      const settings = await getSettingsService().getSettings();
      const source =
        (settings.sources ?? []).find(
          (s: CalendarSourceMapping) =>
            s.id === params.sourceId || s.uid === params.uid
        ) ?? settings.sources[0];

      if (!source) {
        throw new Error('Target calendar source is not configured.');
      }

      const existing = await strapi.documents(source.uid).findOne({
        documentId: params.documentId,
      });

      if (!existing) {
        throw new Error(`Document ${params.documentId} not found in ${source.uid}.`);
      }

      const rruleField = source.fields.rrule;
      const recurrence = rruleField
        ? parseRRuleFieldValue(existing[rruleField], settings.defaultTimezone)
        : null;

      if (recurrence && recurrence.rrule && !params.applyToSeries && rruleField) {
        const nextOverrides = { ...(recurrence.overrides ?? {}) };
        nextOverrides[params.occurrenceDate] = {
          ...(nextOverrides[params.occurrenceDate] ?? {}),
          originalDate: params.occurrenceDate,
          cancelled: Boolean(params.cancelOccurrence),
          startDate: params.newStartDate || undefined,
          endDate: params.newEndDate || undefined,
        };

        const updatedRecurrence = {
          ...recurrence,
          overrides: nextOverrides,
        };

        const updatedDoc = await strapi.documents(source.uid).update({
          documentId: params.documentId,
          data: {
            [rruleField]: updatedRecurrence,
          },
        });
        return updatedDoc ?? {};
      }

      const updatePayload: Record<string, unknown> = {};
      if (params.cancelOccurrence && source.fields.status) {
        updatePayload[source.fields.status] = 'cancelled';
      } else {
        updatePayload[source.fields.startDate] = params.newStartDate;
        if (params.newEndDate && source.fields.endDate) {
          updatePayload[source.fields.endDate] = params.newEndDate;
        }
      }

      const updatedDoc = await strapi.documents(source.uid).update({
        documentId: params.documentId,
        data: updatePayload,
      });
      return updatedDoc ?? {};
    },

    async quickCreateEntry(
      params: QuickCreateEntryParams
    ): Promise<Record<string, unknown>> {
      const settings = await getSettingsService().getSettings();
      const source =
        (settings.sources ?? []).find(
          (s: CalendarSourceMapping) => s.id === params.sourceId
        ) ?? settings.sources[0];

      if (!source) {
        throw new Error('No calendar collection source is configured.');
      }

      const title = (params.title ?? '').trim();
      if (!title) {
        throw new Error('Entry title is required.');
      }

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);

      const data: Record<string, unknown> = {
        [source.fields.title]: title,
        [source.fields.startDate]: params.startDate,
      };

      if (source.fields.endDate && params.endDate) {
        data[source.fields.endDate] = params.endDate;
      }
      if (source.fields.slug) {
        data[source.fields.slug] = `${slug}-${Date.now().toString(36)}`;
      }
      if (source.fields.location && params.location) {
        data[source.fields.location] = params.location;
      }
      if (source.fields.category && params.category) {
        data[source.fields.category] = params.category;
      }
      if (source.fields.summary && params.summary) {
        data[source.fields.summary] = params.summary;
      }
      if (source.fields.rrule && params.rrule) {
        data[source.fields.rrule] = {
          rrule: params.rrule,
          timezone: settings.defaultTimezone,
          allDay: false,
          exdates: [],
          overrides: {},
        };
      }

      return strapi.documents(source.uid).create({
        data,
        status: 'published',
      });
    },
  };
};
