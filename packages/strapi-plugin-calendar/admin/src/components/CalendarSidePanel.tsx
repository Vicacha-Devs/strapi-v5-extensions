import { Box, Button, Flex, Typography } from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { NavLink } from "react-router-dom";

import { formatDateInCalendarSystem } from "../../../shared/calendarSystems";
import { PLUGIN_ID } from "../../../shared/pluginId";
import type { CalendarPluginSettings } from "../../../shared/types";
import {
  formatPluginMessageWithUrlLocale,
  resolveActiveContentLocale,
} from "./calendar/calendarPageHelpers";

export interface SidePanelProps {
  activeTab?: string;
  collectionType?: string;
  document?: Record<string, unknown>;
  documentId?: string;
  meta?: Record<string, unknown>;
  model?: string;
}

function resolveSidePanelStartDate(
  docRecord: Record<string, unknown>,
  mappedStartField?: string
): string {
  const candidates = [
    ...(mappedStartField ? [mappedStartField] : []),
    "startDate",
    "preferredDate",
    "date",
    "checkIn",
  ];
  for (const key of candidates) {
    const val = docRecord[key];
    if (typeof val === "string" && val) return val;
  }
  return "";
}

export const CalendarSidePanel = (props: SidePanelProps) => {
  const { formatMessage, locale } = useIntl();
  const { get } = useFetchClient();
  const [settings, setSettings] = useState<CalendarPluginSettings | null>(null);

  const model = props.model ?? "";
  const docRecord = props.document ?? {};
  const documentId =
    props.documentId ??
    (typeof docRecord.documentId === "string" ? docRecord.documentId : "");
  const matchedSource = useMemo(
    () => settings?.sources?.find((s) => s.uid === model && s.enabled),
    [settings?.sources, model]
  );
  const rawStartDate = resolveSidePanelStartDate(
    docRecord,
    matchedSource?.fields.startDate
  );
  const activeLocale = resolveActiveContentLocale(locale);
  const rruleField = matchedSource?.fields.rrule || "recurrence";
  const hasScheduleFields = Boolean(rawStartDate || docRecord[rruleField]);

  useEffect(() => {
    if (!hasScheduleFields || !documentId) return;
    let mounted = true;
    get<{ data?: CalendarPluginSettings }>(`/${PLUGIN_ID}/settings`)
      .then((res) => {
        if (mounted && res?.data?.data) {
          setSettings(res.data.data);
        }
      })
      .catch(() => {
        // Ignore if settings request fails
      });

    return () => {
      mounted = false;
    };
  }, [model, get, hasScheduleFields, documentId]);

  const computedAlternateDates = useMemo(() => {
    if (!rawStartDate || !settings?.secondaryCalendars) {
      return [];
    }
    return settings.secondaryCalendars
      .filter((sys) => sys.enabled)
      .map((sys) => {
        const rawFieldVal = sys.overrideField
          ? docRecord[sys.overrideField]
          : undefined;
        const overrideVal =
          typeof rawFieldVal === "string" ? rawFieldVal.trim() : "";
        const formatted =
          overrideVal ||
          formatDateInCalendarSystem(rawStartDate, sys, activeLocale, {
            compact: false,
          });
        return {
          id: sys.id,
          label: sys.label,
          formatted,
          isOverridden: Boolean(overrideVal),
        };
      })
      .filter((item) => Boolean(item.formatted));
  }, [rawStartDate, settings?.secondaryCalendars, docRecord, activeLocale]);

  if (!hasScheduleFields || !documentId) {
    return null;
  }

  const t = (id: string, defaultMessage: string) =>
    formatPluginMessageWithUrlLocale(
      PLUGIN_ID,
      id,
      defaultMessage,
      formatMessage
    );

  const icsUrl = `/api/calendar/${encodeURIComponent(documentId)}/invite.ics`;

  return {
    title: t("sidePanel.title", "Calendar & Schedule"),
    content: (
      <Box paddingTop={2} paddingBottom={2}>
        <Flex direction="column" alignItems="stretch" gap={3}>
          {computedAlternateDates.length > 0 && (
            <Box padding={3} background="neutral100" hasRadius>
              <Typography variant="sigma" textColor="neutral600">
                {t(
                  "sidePanel.secondaryCalendars",
                  "Alternative Calendar Dates"
                )}
              </Typography>
              <Flex
                direction="column"
                alignItems="stretch"
                gap={1}
                paddingTop={2}
              >
                {computedAlternateDates.map((alt) => (
                  <Flex
                    key={alt.id}
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="pi" textColor="neutral600">
                      {alt.label}:
                    </Typography>
                    <Typography variant="pi" fontWeight="bold">
                      {alt.formatted}
                    </Typography>
                  </Flex>
                ))}
              </Flex>
            </Box>
          )}

          <Flex direction="column" alignItems="stretch" gap={2}>
            <Button
              variant="secondary"
              size="S"
              tag="a"
              href={icsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("sidePanel.downloadIcs", "Download .ics Invite")}
            </Button>
            <Button
              variant="tertiary"
              size="S"
              tag={NavLink}
              to={`/plugins/${PLUGIN_ID}?documentId=${encodeURIComponent(documentId)}`}
            >
              {t("sidePanel.openCalendar", "Open in Calendar View")}
            </Button>
          </Flex>
        </Flex>
      </Box>
    ),
  };
};

export default CalendarSidePanel;
