import { Box, Button, Flex, Typography } from "@strapi/design-system";
import { Layouts, useFetchClient } from "@strapi/strapi/admin";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import { PLUGIN_ID } from "../../../shared/pluginId";
import type {
  EventsPluginSettings,
  ExpandedOccurrence,
  RsvpRegistrationRecord,
  RsvpStatus,
} from "../../../shared/types";
import { AttendeesManagerPanel } from "../components/events/AttendeesManagerPanel";
import { DEFAULT_RECURRENCE_PRESETS } from "../components/events/calendarPageHelpers";
import { EventsDirectoryPanel } from "../components/events/EventsDirectoryPanel";
import {
  EventsKpiCards,
  computeDashboardRsvpStats,
} from "../components/events/EventsKpiCards";
import { QuickCreateEventPanel } from "../components/events/QuickCreateEventPanel";

function shouldReplaceRepresentativeOccurrence(
  existing: ExpandedOccurrence,
  candidate: ExpandedOccurrence,
  todayKey: string
): boolean {
  const existingIsFuture = existing.occurrenceDate >= todayKey;
  const currentIsFuture = candidate.occurrenceDate >= todayKey;
  if (!existingIsFuture && currentIsFuture) return true;
  if (existingIsFuture && currentIsFuture) {
    return candidate.occurrenceDate < existing.occurrenceDate;
  }
  if (!existingIsFuture && !currentIsFuture) {
    return candidate.occurrenceDate > existing.occurrenceDate;
  }
  return false;
}

export const CalendarPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { get, post } = useFetchClient();
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const t = useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }),
    [formatMessage]
  );

  const [settings, setSettings] = useState<EventsPluginSettings | null>(null);
  const [occurrences, setOccurrences] = useState<ExpandedOccurrence[]>([]);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [showQuickCreate, setShowQuickCreate] = useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState<string>("");
  const [quickStart, setQuickStart] = useState<string>("");
  const [quickLocation, setQuickLocation] = useState<string>("");
  const [quickCategory] = useState<string>("general");
  const [quickRRule, setQuickRRule] = useState<string>("");
  const [quickRsvpEnabled, setQuickRsvpEnabled] = useState<boolean>(true);
  const [quickCapacity, setQuickCapacity] = useState<number>(50);

  const [registrations, setRegistrations] = useState<RsvpRegistrationRecord[]>(
    []
  );
  const [rsvpSearch, setRsvpSearch] = useState<string>("");
  const [debouncedRsvpSearch, setDebouncedRsvpSearch] = useState<string>("");
  const [rsvpStatusFilter, setRsvpStatusFilter] = useState<string>("all");
  const [rsvpEventFilter, setRsvpEventFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (
      new URLSearchParams(window.location.search).get("eventDocumentId") || ""
    );
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedRsvpSearch(rsvpSearch);
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [rsvpSearch]);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchCalendarData = useCallback(async () => {
    try {
      const now = new Date();
      const fromIso = `${now.getFullYear() - 1}-01-01T00:00:00.000Z`;
      const toIso = `${now.getFullYear() + 2}-12-31T23:59:59.000Z`;
      const res = await get(
        `/${PLUGIN_ID}/calendar?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
      );
      if (!isMountedRef.current) return;
      const payload = res?.data?.data as
        | {
            occurrences?: ExpandedOccurrence[];
            settings?: EventsPluginSettings;
          }
        | undefined;
      if (payload?.settings) {
        setSettings(payload.settings);
      }
      if (Array.isArray(payload?.occurrences)) {
        setOccurrences(payload.occurrences);
      }
    } catch {
      try {
        const res = await get(`/${PLUGIN_ID}/settings`);
        if (!isMountedRef.current) return;
        const payload = res?.data?.data as EventsPluginSettings | undefined;
        if (payload) {
          setSettings(payload);
        }
      } catch {
        // Ignore fallback failure
      }
    }
  }, [get]);

  const fetchRegistrations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedRsvpSearch.trim()) {
        params.set("search", debouncedRsvpSearch.trim());
      }
      if (rsvpStatusFilter !== "all") params.set("status", rsvpStatusFilter);
      if (rsvpEventFilter.trim()) {
        params.set("eventDocumentId", rsvpEventFilter.trim());
      }

      const res = await get(`/${PLUGIN_ID}/registrations?${params.toString()}`);
      if (!isMountedRef.current) return;
      const data = res?.data?.data;
      if (Array.isArray(data)) {
        setRegistrations(data as RsvpRegistrationRecord[]);
      }
    } catch {
      if (isMountedRef.current) {
        setBannerMessage(
          t("attendees.error.load", "Could not load registrations.")
        );
      }
    }
  }, [get, debouncedRsvpSearch, rsvpStatusFilter, rsvpEventFilter, t]);

  useEffect(() => {
    void fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    void fetchRegistrations();
  }, [fetchRegistrations]);

  const uniqueEvents = useMemo(() => {
    const byDoc = new Map<string, ExpandedOccurrence>();
    for (const occ of occurrences) {
      const key = `${occ.uid}:${occ.documentId}`;
      const existing = byDoc.get(key);
      if (
        !existing ||
        shouldReplaceRepresentativeOccurrence(existing, occ, todayKey)
      ) {
        byDoc.set(key, occ);
      }
    }
    return Array.from(byDoc.values()).sort((a, b) =>
      a.occurrenceDate.localeCompare(b.occurrenceDate)
    );
  }, [occurrences, todayKey]);

  const recurrencePresets = useMemo(
    () =>
      settings?.recurrencePresets && settings.recurrencePresets.length > 0
        ? settings.recurrencePresets
        : DEFAULT_RECURRENCE_PRESETS,
    [settings?.recurrencePresets]
  );

  const rsvpStats = useMemo(
    () => computeDashboardRsvpStats(uniqueEvents, registrations),
    [registrations, uniqueEvents]
  );

  const handleQuickCreateSubmit = useCallback(async () => {
    if (!quickTitle.trim() || !quickStart) return;
    try {
      const startIso = quickStart.includes("T")
        ? new Date(quickStart).toISOString()
        : `${quickStart}T10:00:00.000Z`;
      const endIso = new Date(
        new Date(startIso).getTime() + 3600000
      ).toISOString();

      await post(`/${PLUGIN_ID}/calendar/quick-create`, {
        title: quickTitle.trim(),
        startDate: startIso,
        endDate: endIso,
        location: quickLocation.trim() || undefined,
        category: quickCategory,
        rrule: quickRRule || undefined,
        rsvpEnabled: quickRsvpEnabled,
        capacity: quickRsvpEnabled ? quickCapacity : undefined,
      });

      if (!isMountedRef.current) return;
      setShowQuickCreate(false);
      setQuickTitle("");
      setQuickLocation("");
      setQuickRRule("");
      setBannerMessage(t("calendar.created", "Event created and published."));
      await Promise.all([fetchCalendarData(), fetchRegistrations()]);
    } catch {
      if (isMountedRef.current) {
        setBannerMessage(t("calendar.error.create", "Could not create event."));
      }
    }
  }, [
    quickTitle,
    quickStart,
    quickLocation,
    quickCategory,
    quickRRule,
    quickRsvpEnabled,
    quickCapacity,
    post,
    t,
    fetchCalendarData,
    fetchRegistrations,
  ]);

  const handleCheckIn = useCallback(
    async (regDocId: string) => {
      try {
        await post(
          `/${PLUGIN_ID}/registrations/${encodeURIComponent(regDocId)}/check-in`,
          {}
        );
        if (!isMountedRef.current) return;
        setBannerMessage(
          t("attendees.checkedInSuccess", "Attendee checked in.")
        );
        await Promise.all([fetchCalendarData(), fetchRegistrations()]);
      } catch {
        if (isMountedRef.current) {
          setBannerMessage(t("attendees.error.checkIn", "Check-in failed."));
        }
      }
    },
    [post, t, fetchCalendarData, fetchRegistrations]
  );

  const handleStatusChange = useCallback(
    async (regDocId: string, status: RsvpStatus) => {
      try {
        const res = await post(
          `/${PLUGIN_ID}/registrations/${encodeURIComponent(regDocId)}/status`,
          { status }
        );
        if (!isMountedRef.current) return;
        const promotedCount =
          (res?.data?.data as { promotedCount?: number } | undefined)
            ?.promotedCount ?? 0;
        const baseMsg = t("attendees.statusUpdated", "Status updated.");
        const promoSuffix = t(
          "attendees.waitlistPromoted",
          "attendee(s) automatically promoted from waitlist!"
        );
        setBannerMessage(
          promotedCount > 0
            ? `${baseMsg} ${promotedCount} ${promoSuffix}`
            : baseMsg
        );
        await Promise.all([fetchCalendarData(), fetchRegistrations()]);
      } catch {
        if (isMountedRef.current) {
          setBannerMessage(
            t("attendees.error.status", "Could not update status.")
          );
        }
      }
    },
    [post, t, fetchCalendarData, fetchRegistrations]
  );

  return (
    <Layouts.Root>
      <Box padding={6} background="neutral100">
        <Flex direction="column" alignItems="stretch" gap={5}>
          <Flex
            justifyContent="space-between"
            alignItems="center"
            wrap="wrap"
            gap={3}
          >
            <Box>
              <Typography variant="alpha" fontWeight="bold">
                {t("calendar.title", "Events, RSVPs & Check-In")}
              </Typography>
              <Box paddingTop={1}>
                <Typography variant="epsilon" textColor="neutral600">
                  {t(
                    "calendar.subtitle",
                    "Manage event registrations, waitlist auto-promotion, and attendee check-ins. Schedule views are unified in Calendar."
                  )}
                </Typography>
              </Box>
            </Box>

            <Flex gap={2} wrap="wrap">
              <Button
                variant="secondary"
                size="S"
                onClick={() => navigate("/plugins/calendar?source=events")}
              >
                {t("calendar.openUnifiedCalendar", "Open in Calendar")}
              </Button>
              <Button
                variant="default"
                size="S"
                onClick={() => {
                  setQuickStart(todayKey);
                  setShowQuickCreate(true);
                }}
              >
                + {t("calendar.quickCreate", "New Event")}
              </Button>
              <Button
                variant="secondary"
                size="S"
                tag="a"
                href="/api/events/feed.ics"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("calendar.downloadIcsFeed", "iCal Feed (.ics)")}
              </Button>
              <Button
                variant="tertiary"
                size="S"
                onClick={() => navigate(`/settings/${PLUGIN_ID}`)}
              >
                {t("calendar.settings", "Settings")}
              </Button>
            </Flex>
          </Flex>

          <EventsKpiCards stats={rsvpStats} t={t} />

          {bannerMessage && (
            <Box
              padding={3}
              background="primary100"
              hasRadius
              style={{ border: "1px solid #0284C7" }}
            >
              <Flex justifyContent="space-between" alignItems="center">
                <Typography
                  variant="omega"
                  fontWeight="bold"
                  textColor="primary700"
                >
                  {bannerMessage}
                </Typography>
                <Button
                  variant="tertiary"
                  size="S"
                  aria-label={t("common.close", "Close")}
                  onClick={() => setBannerMessage(null)}
                >
                  ×
                </Button>
              </Flex>
            </Box>
          )}

          {showQuickCreate && (
            <QuickCreateEventPanel
              t={t}
              quickTitle={quickTitle}
              onQuickTitleChange={setQuickTitle}
              quickStart={quickStart}
              onQuickStartChange={setQuickStart}
              quickLocation={quickLocation}
              onQuickLocationChange={setQuickLocation}
              quickRRule={quickRRule}
              onQuickRRuleChange={setQuickRRule}
              quickRsvpEnabled={quickRsvpEnabled}
              onQuickRsvpEnabledChange={setQuickRsvpEnabled}
              quickCapacity={quickCapacity}
              onQuickCapacityChange={setQuickCapacity}
              recurrencePresets={recurrencePresets}
              onCancel={() => setShowQuickCreate(false)}
              onSubmit={handleQuickCreateSubmit}
            />
          )}

          <EventsDirectoryPanel
            t={t}
            events={uniqueEvents}
            selectedEventDocId={rsvpEventFilter}
            onSelectEventDocId={setRsvpEventFilter}
            onEditInContentManager={(uid, docId, locale) => {
              const query = locale
                ? `?plugins[i18n][locale]=${encodeURIComponent(locale)}`
                : "";
              navigate(
                `/content-manager/collection-types/${uid}/${docId}${query}`
              );
            }}
            onOpenInCalendar={(docId) =>
              navigate(
                `/plugins/calendar?source=events${
                  docId ? `&documentId=${encodeURIComponent(docId)}` : ""
                }`
              )
            }
          />

          <AttendeesManagerPanel
            t={t}
            registrations={registrations}
            rsvpSearch={rsvpSearch}
            onRsvpSearchChange={setRsvpSearch}
            rsvpStatusFilter={rsvpStatusFilter}
            onRsvpStatusFilterChange={setRsvpStatusFilter}
            rsvpEventFilter={rsvpEventFilter}
            onClearRsvpEventFilter={() => setRsvpEventFilter("")}
            onCheckIn={handleCheckIn}
            onStatusChange={handleStatusChange}
          />
        </Flex>
      </Box>
    </Layouts.Root>
  );
};

export default CalendarPage;
