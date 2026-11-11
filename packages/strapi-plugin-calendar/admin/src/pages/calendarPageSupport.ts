import type {
  CalendarPluginSettings,
  ExpandedCalendarOccurrence,
} from "../../../shared/types";

export interface CalendarApiResponse {
  data?: {
    occurrences?: ExpandedCalendarOccurrence[];
    settings?: CalendarPluginSettings;
  };
}

export const getUrlParam = (key: string) =>
  typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get(key);
