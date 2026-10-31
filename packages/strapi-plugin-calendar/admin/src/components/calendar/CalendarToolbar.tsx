import {
  Badge,
  Box,
  Button,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system";
import React from "react";

import { getLocalizedCalendarBundle } from "../../../../shared/localization";
import { PLUGIN_ID } from "../../../../shared/pluginId";
import type {
  CalendarDirection,
  CalendarPluginSettings,
  CalendarViewMode,
  SecondaryCalendarLanguageMode,
} from "../../../../shared/types";
import { formatCategoryLabel } from "./calendarPageHelpers";

export interface CalendarToolbarProps {
  t: (id: string, defaultMessage: string) => string;
  effectiveLocale: string;
  effectiveDirection: CalendarDirection;
  localeOverride?: string;
  onLocaleOverrideChange?: (nextLocale: string) => void;
  secondaryLangMode: SecondaryCalendarLanguageMode;
  onSecondaryLangModeChange?: (nextMode: SecondaryCalendarLanguageMode) => void;
  monthLabel: string;
  secondaryHeaderLabel: string;
  loading: boolean;
  settings: CalendarPluginSettings | null;
  totalOccurrences: number;
  sourceCounts?: Record<string, number>;
  sourceFilter: string;
  onSourceFilterChange: (sourceId: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  availableCategories: string[];
  viewMode: CalendarViewMode;
  enabledViews: Array<{ mode: CalendarViewMode; label: string }>;
  onViewChange: (mode: CalendarViewMode) => void;
  onNavigate: (action: "prev" | "today" | "next") => void;
  onOpenQuickCreate: (targetSourceId?: string) => void;
}

const QuickCreateButtons: React.FC<{
  showCreateButton: boolean;
  enabledSources: Array<{ id: string; label: string }>;
  t: (id: string, defaultMessage: string) => string;
  onOpenQuickCreate: (targetSourceId?: string) => void;
}> = ({ showCreateButton, enabledSources, t, onOpenQuickCreate }) => {
  if (!showCreateButton) return null;
  if (enabledSources.length > 1) {
    return (
      <>
        {enabledSources.map((src, idx) => (
          <Button
            key={src.id}
            variant={idx === 0 ? "default" : "secondary"}
            size="S"
            onClick={() => onOpenQuickCreate(src.id)}
          >
            + {src.label}
          </Button>
        ))}
      </>
    );
  }
  return (
    <Button variant="default" size="S" onClick={() => onOpenQuickCreate(enabledSources[0]?.id)}>
      + {t("calendar.quickCreate", "New Entry")}
    </Button>
  );
};

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  t,
  effectiveLocale,
  effectiveDirection,
  secondaryLangMode,
  monthLabel,
  secondaryHeaderLabel,
  loading,
  settings,
  totalOccurrences,
  sourceCounts,
  sourceFilter,
  onSourceFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  viewMode,
  enabledViews,
  onViewChange,
  onNavigate,
  onOpenQuickCreate,
}) => {
  const localeBundle = getLocalizedCalendarBundle(effectiveLocale);
  const isRtl = effectiveDirection === "rtl";
  const enabledSources = (settings?.sources ?? []).filter((src) => src.enabled !== false);
  const showSecondaryBadge = Boolean(secondaryHeaderLabel && secondaryLangMode !== "off");

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {/* Header Bar */}
      <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
        <Box>
          <Typography variant="alpha" fontWeight="bold">
            {t("calendar.title", "Calendar & Scheduler")}
          </Typography>
          <Box paddingTop={1}>
            <Flex gap={2} alignItems="center" wrap="wrap">
              <Typography
                variant="delta"
                fontWeight="bold"
                textColor="neutral800"
                style={{ textTransform: "uppercase", letterSpacing: "0.03em" }}
              >
                {monthLabel.toUpperCase()}
              </Typography>
              {showSecondaryBadge && (
                <Badge backgroundColor="secondary100" textColor="secondary700">
                  {secondaryHeaderLabel}
                </Badge>
              )}
              <Badge backgroundColor="neutral150" textColor="neutral700">
                {localeBundle.nativeName} ({effectiveDirection.toUpperCase()})
              </Badge>
              {loading && (
                <Typography variant="pi" textColor="neutral500">
                  {t("calendar.loading", "Syncing...")}
                </Typography>
              )}
            </Flex>
          </Box>
        </Box>

        <Flex gap={2} wrap="wrap">
          <QuickCreateButtons
            showCreateButton={settings?.showCreateButton !== false}
            enabledSources={enabledSources}
            t={t}
            onOpenQuickCreate={onOpenQuickCreate}
          />
          <Button
            variant="secondary"
            size="S"
            tag="a"
            href="/api/calendar/feed.ics"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("calendar.downloadIcsFeed", "iCal Feed (.ics)")}
          </Button>
          <Button variant="tertiary" size="S" tag="a" href={`/admin/settings/${PLUGIN_ID}`}>
            {t("calendar.settings", "Settings")}
          </Button>
        </Flex>
      </Flex>

      {/* Navigation, Source Filter & View Switcher Toolbar */}
      <Box padding={3} background="neutral0" hasRadius shadow="filterShadow">
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
          <Flex gap={2} alignItems="center" wrap="wrap">
            <Button variant="tertiary" size="S" onClick={() => onNavigate("prev")}>
              {isRtl ? "→" : "←"} {localeBundle.buttonText.prev}
            </Button>
            {settings?.showTodayButton !== false && (
              <Button variant="secondary" size="S" onClick={() => onNavigate("today")}>
                {localeBundle.buttonText.today}
              </Button>
            )}
            <Button variant="tertiary" size="S" onClick={() => onNavigate("next")}>
              {localeBundle.buttonText.next} {isRtl ? "←" : "→"}
            </Button>
          </Flex>

          <Flex gap={2} wrap="wrap" alignItems="center">
            <Button
              size="S"
              variant={sourceFilter === "all" ? "default" : "tertiary"}
              onClick={() => onSourceFilterChange("all")}
            >
              {t("calendar.allSources", "All Sources")} ({totalOccurrences})
            </Button>
            {(settings?.sources ?? []).map((src) => {
              const srcCount = sourceCounts?.[src.id] ?? 0;
              return (
                <Button
                  key={src.id}
                  size="S"
                  variant={sourceFilter === src.id ? "default" : "tertiary"}
                  onClick={() => onSourceFilterChange(src.id)}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: src.color,
                      marginRight: 6,
                    }}
                  />
                  {src.label} ({srcCount})
                </Button>
              );
            })}
            <Box style={{ minWidth: 175, maxWidth: 220 }}>
              <SingleSelect
                size="S"
                aria-label={t("calendar.toolbar.category", "Category Filter")}
                placeholder={t("placeholder.all_categories", "All Categories")}
                value={categoryFilter}
                onChange={(val: string | number) => onCategoryFilterChange(String(val))}
              >
                <SingleSelectOption value="all">
                  {t("calendar.allCategories", "All Categories")}
                </SingleSelectOption>
                {availableCategories.map((cat) => (
                  <SingleSelectOption key={cat} value={cat}>
                    {formatCategoryLabel(cat)}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
          </Flex>

          <Flex gap={1} wrap="wrap">
            {enabledViews.map((v) => (
              <Button
                key={v.mode}
                size="S"
                variant={viewMode === v.mode ? "default" : "tertiary"}
                onClick={() => onViewChange(v.mode)}
              >
                {v.label}
              </Button>
            ))}
          </Flex>
        </Flex>
      </Box>
    </Flex>
  );
};

export default CalendarToolbar;
