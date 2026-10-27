import type { Core } from '@strapi/strapi';
import {
  formatDateInCalendarSystem,
  registerCalendarSystemFormatter,
  resolveOccurrenceAlternateDates,
  unregisterCalendarSystemFormatter,
} from '../../../shared/calendarSystems';
import { buildCalendarLinks } from '../../../shared/icalGenerator';
import { EVENT_CONTENT_TYPE_UID } from '../../../shared/pluginId';
import {
  expandRuleSlots,
  parseRRuleFieldValue,
} from '../../../shared/rruleEngine';
import {
  deduplicateAndSortSpotlights,
  isEventSpotlightActiveOnDate,
  mapEventStatus,
  normalizeEventActionLinks,
  normalizeEventPoster,
  normalizeEventSpotlightConfig,
  resolveStartEndFromDocument,
} from '../../../shared/spotlightHelpers';
import type {
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
  EventSourceMapping,
  ExpandedOccurrence,
} from '../../../shared/types';
import {
  type StrapiDocumentQueryOptions,
  getDocumentsClient,
  getRsvpService,
  getSettingsService,
} from '../types';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    registerCalendarFormatter(calendarId: string, formatter: CalendarSystemFormatterFn): void {
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

    async getOccurrences(params: {
      from?: string;
      to?: string;
      locale?: string;
      category?: string;
      sourceId?: string;
      documentId?: string;
      includeDrafts?: boolean;
    }): Promise<ExpandedOccurrence[]> {
      const settings = await getSettingsService(strapi).getSettings();
      const now = new Date();
      const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const defaultTo = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59).toISOString();

      const windowStart =
        params.from && !Number.isNaN(new Date(params.from).getTime()) ? params.from : defaultFrom;
      const windowEnd =
        params.to && !Number.isNaN(new Date(params.to).getTime()) ? params.to : defaultTo;

      const activeSources = (settings.sources ?? []).filter(
        (s: EventSourceMapping) =>
          s.enabled && (!params.sourceId || s.id === params.sourceId || s.uid === params.sourceId)
      );

      const allOccurrences: ExpandedOccurrence[] = [];

      for (const source of activeSources) {
        let docs: Array<Record<string, unknown>> = [];
        const posterField = source.fields.poster;
        try {
          const queryOpts: StrapiDocumentQueryOptions = {
            limit: 500,
            ...(posterField ? { populate: [posterField] } : {}),
          };
          if (params.documentId) {
            queryOpts.filters = { documentId: { $eq: params.documentId } };
          }
          if (params.locale && params.locale !== 'auto') {
            queryOpts.locale = params.locale;
          }
          if (!params.includeDrafts) {
            queryOpts.status = 'published';
          }
          docs = await getDocumentsClient(strapi, source.uid).findMany(queryOpts);
        } catch {
          try {
            const fallbackOpts: StrapiDocumentQueryOptions = { limit: 500 };
            if (params.documentId) {
              fallbackOpts.filters = { documentId: { $eq: params.documentId } };
            }
            docs = await getDocumentsClient(strapi, source.uid).findMany(fallbackOpts);
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
          const slug = source.fields.slug ? String(doc[source.fields.slug] ?? '') : undefined;
          const statusVal = mapEventStatus(
            source.fields.status ? doc[source.fields.status] : doc.eventStatus
          );

          const color =
            (categoryVal && source.categoryColors?.[categoryVal]) ||
            (typeof doc.color === 'string' && doc.color.startsWith('#') ? doc.color : source.color);

          const rsvpField = source.fields.rsvpEnabled ?? 'rsvpEnabled';
          const capField = source.fields.capacity ?? 'capacity';
          const rsvpEnabled =
            doc[rsvpField] !== undefined ? Boolean(doc[rsvpField]) : false;
          const rawCap = doc[capField];
          const capacity =
            typeof rawCap === 'number' && rawCap > 0
              ? Math.floor(rawCap)
              : null;

          const baseDateKey = startEnd.startDate.slice(0, 10);

          const poster = normalizeEventPoster(
            posterField ? doc[posterField] : doc.poster,
            baseTitle
          );
          const actionLinksField = source.fields.actionLinks ?? 'actionLinks';
          const actionLinks = normalizeEventActionLinks(doc[actionLinksField]);
          const spotlightField = source.fields.spotlightConfig ?? 'spotlightConfig';
          const spotlightConfig = normalizeEventSpotlightConfig(doc[spotlightField]);

          let extractedCustomFields: Record<string, unknown> | undefined;
          if (Array.isArray(source.fields.customFields) && source.fields.customFields.length > 0) {
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

            const rsvpStats = rsvpEnabled
              ? await getRsvpService(strapi).getEventStats({
                  eventUid: source.uid,
                  eventDocumentId: docId,
                  occurrenceDate: slot.occurrenceDate,
                  capacityOverride: capacity,
                  waitlistOverride:
                    typeof doc.waitlistEnabled === 'boolean'
                      ? doc.waitlistEnabled
                      : settings.waitlistEnabledByDefault,
                  rsvpEnabledOverride: rsvpEnabled,
                })
              : undefined;

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
              locale: params.locale && params.locale !== 'auto' ? params.locale : 'en',
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
              virtualUrl: typeof doc.virtualUrl === 'string' ? doc.virtualUrl : undefined,
              category: categoryVal || undefined,
              status: statusVal,
              color,
              isRecurring: slot.isRecurring,
              rrule: recurrence.rrule || undefined,
              isOverridden: slot.isOverridden,
              rsvp: rsvpStats,
              calendarLinks,
              alternateDates:
                Object.keys(alternateDates).length > 0 ? alternateDates : undefined,
              poster,
              actionLinks,
              spotlightConfig,
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

    async getActiveSpotlights(params?: {
      date?: string;
      locale?: string;
      sourceId?: string;
      category?: string;
      includeDrafts?: boolean;
    }): Promise<ExpandedOccurrence[]> {
      const refDate =
        params?.date && !Number.isNaN(new Date(params.date).getTime())
          ? new Date(params.date)
          : new Date();

      const fromWindow = new Date(refDate.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const toWindow = new Date(refDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();

      const occurrences = await this.getOccurrences({
        from: fromWindow,
        to: toWindow,
        locale: params?.locale,
        sourceId: params?.sourceId,
        category: params?.category,
        includeDrafts: params?.includeDrafts ?? false,
      });

      const active = occurrences.filter((occ) =>
        isEventSpotlightActiveOnDate({
          spotlightConfig: occ.spotlightConfig,
          eventStartDate: occ.startDate,
          eventEndDate: occ.endDate,
          referenceDate: refDate,
        })
      );

      return deduplicateAndSortSpotlights(active);
    },

    async rescheduleOccurrence(params: {
      sourceId?: string;
      uid?: string;
      documentId: string;
      occurrenceDate: string;
      newStartDate: string;
      newEndDate?: string;
      applyToSeries?: boolean;
      cancelOccurrence?: boolean;
    }): Promise<Record<string, unknown>> {
      const settings = await getSettingsService(strapi).getSettings();
      const source =
        (settings.sources ?? []).find(
          (s: EventSourceMapping) => s.id === params.sourceId || s.uid === params.uid
        ) ?? settings.sources[0];

      if (!source) {
        throw new Error('Target event source is not configured.');
      }

      const existing = await getDocumentsClient(strapi, source.uid).findOne({
        documentId: params.documentId,
      });

      if (!existing) {
        throw new Error(`Document ${params.documentId} not found in ${source.uid}.`);
      }

      const rruleField = source.fields.rrule;
      const recurrence = rruleField
        ? parseRRuleFieldValue(existing[rruleField], settings.defaultTimezone)
        : null;

      // Single-occurrence override on a recurring event
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

        return getDocumentsClient(strapi, source.uid).update({
          documentId: params.documentId,
          data: {
            [rruleField]: updatedRecurrence,
          },
        });
      }

      // Update whole event series or single non-recurring event
      const updatePayload: Record<string, unknown> = {};
      if (params.cancelOccurrence && source.fields.status) {
        updatePayload[source.fields.status] = 'cancelled';
      } else {
        updatePayload[source.fields.startDate] = params.newStartDate;
        if (params.newEndDate && source.fields.endDate) {
          updatePayload[source.fields.endDate] = params.newEndDate;
        }
      }

      return getDocumentsClient(strapi, source.uid).update({
        documentId: params.documentId,
        data: updatePayload,
      });
    },

    async quickCreateEvent(params: {
      sourceId?: string;
      title: string;
      startDate: string;
      endDate?: string;
      location?: string;
      category?: string;
      summary?: string;
      rrule?: string;
      rsvpEnabled?: boolean;
      capacity?: number;
    }): Promise<Record<string, unknown>> {
      const settings = await getSettingsService(strapi).getSettings();
      const source =
        (settings.sources ?? []).find((s: EventSourceMapping) => s.id === params.sourceId) ??
        (settings.sources ?? []).find(
          (s: EventSourceMapping) => s.uid === EVENT_CONTENT_TYPE_UID
        ) ??
        settings.sources[0];

      const title = (params.title ?? '').trim();
      if (!title) {
        throw new Error('Event title is required.');
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
      if (source.fields.rsvpEnabled && typeof params.rsvpEnabled === 'boolean') {
        data[source.fields.rsvpEnabled] = params.rsvpEnabled;
      }
      if (source.fields.capacity && typeof params.capacity === 'number' && params.capacity > 0) {
        data[source.fields.capacity] = Math.floor(params.capacity);
      }

      return getDocumentsClient(strapi, source.uid).create({
        data,
        status: 'published',
      });
    },
  };
};
