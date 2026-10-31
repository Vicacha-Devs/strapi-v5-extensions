import type { Core } from '@strapi/strapi';
import type {
  CalendarPluginSettings,
  CalendarSourceMapping,
  CalendarSystemConfig,
  CalendarSystemFormatterFn,
  DiscoveredContentType,
  ExpandedCalendarOccurrence,
} from '../../shared/types';

export interface StrapiRouteContext<
  TBody = Record<string, unknown>,
  TQuery = Record<string, string | undefined>,
  TParams = Record<string, string | undefined>,
> {
  query?: TQuery;
  params?: TParams;
  request?: {
    body?: TBody;
  };
  status?: number;
  body?: unknown;
  set?: (header: string, value: string) => void;
}

export interface RegistryService {
  registerSource(source: CalendarSourceMapping): void;
  unregisterSource(sourceId: string): void;
  getRegisteredSources(): CalendarSourceMapping[];
  registerSecondaryCalendar(calendar: CalendarSystemConfig): void;
  getRegisteredSecondaryCalendars(): CalendarSystemConfig[];
  registerCalendarFormatter(
    calendarId: string,
    formatter: CalendarSystemFormatterFn
  ): void;
  unregisterCalendarFormatter(calendarId: string): void;
}

export interface SettingsService {
  ensureInitialized(): Promise<CalendarPluginSettings>;
  getSettings(): Promise<CalendarPluginSettings>;
  updateSettings(patch: Partial<CalendarPluginSettings>): Promise<CalendarPluginSettings>;
  clearSettings(): Promise<CalendarPluginSettings>;
  discoverContentTypes(): DiscoveredContentType[];
}

export interface OccurrenceQueryParams {
  from?: string;
  to?: string;
  locale?: string;
  category?: string;
  sourceId?: string;
  documentId?: string;
  includeDrafts?: boolean;
}

export interface RescheduleOccurrenceParams {
  sourceId?: string;
  uid?: string;
  documentId: string;
  occurrenceDate: string;
  newStartDate: string;
  newEndDate?: string;
  applyToSeries?: boolean;
  cancelOccurrence?: boolean;
}

export interface QuickCreateEntryParams {
  sourceId?: string;
  title: string;
  startDate: string;
  endDate?: string;
  location?: string;
  category?: string;
  summary?: string;
  rrule?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  partySize?: number;
  bookingStatus?: 'confirmed' | 'pending';
}

export interface OccurrenceService {
  registerCalendarFormatter(
    calendarId: string,
    formatter: CalendarSystemFormatterFn
  ): void;
  unregisterCalendarFormatter(calendarId: string): void;
  formatDateInCalendarSystem(
    isoOrDateKey: string,
    system: CalendarSystemConfig,
    locale?: string,
    options?: { compact?: boolean }
  ): string;
  getOccurrences(params: OccurrenceQueryParams): Promise<ExpandedCalendarOccurrence[]>;
  rescheduleOccurrence(
    params: RescheduleOccurrenceParams
  ): Promise<Record<string, unknown>>;
  quickCreateEntry(params: QuickCreateEntryParams): Promise<Record<string, unknown>>;
}

export interface IcalService {
  buildFeedIcs(params: {
    from?: string;
    to?: string;
    locale?: string;
    category?: string;
    sourceId?: string;
  }): Promise<string>;
  buildSingleInviteIcs(params: {
    documentId: string;
    occurrenceDate?: string;
    locale?: string;
  }): Promise<string>;
}

export interface CalendarPluginServiceMap {
  registry: RegistryService;
  settings: SettingsService;
  occurrence: OccurrenceService;
  ical: IcalService;
}

export function getCalendarService<K extends keyof CalendarPluginServiceMap>(
  strapi: Core.Strapi,
  pluginId: string,
  serviceName: K
): CalendarPluginServiceMap[K] {
  return strapi.plugin(pluginId).service<CalendarPluginServiceMap[K]>(serviceName);
}

export function formatErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
