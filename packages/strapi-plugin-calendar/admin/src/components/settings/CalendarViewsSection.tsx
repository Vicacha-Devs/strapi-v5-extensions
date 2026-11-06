import {
  Box,
  Checkbox,
  Divider,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import React from "react";

import { SUPPORTED_CALENDAR_LOCALES } from "../../../../shared/localization";
import type {
  CalendarDirectionSetting,
  CalendarPluginSettings,
  CalendarViewMode,
  SecondaryCalendarLanguageMode,
  WeekNumberCalculationMode,
} from "../../../../shared/types";
import { CalendarThemeSection } from "./CalendarThemeSection";

export interface CalendarViewsSectionProps {
  t: (id: string, defaultMessage: string) => string;
  settings: CalendarPluginSettings;
  onPatchSettings: (patch: Partial<CalendarPluginSettings>) => void;
  mode?: "all" | "theme" | "general";
}

const GRID_3_COL: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

const GRID_2_COL: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const SUB_BOX_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.18)",
};

const VIEW_CHECKBOXES: Array<
  [
    keyof Pick<
      CalendarPluginSettings,
      "monthView" | "weekView" | "dayView" | "agendaView" | "yearView"
    >,
    string,
    string,
  ]
> = [
  ["monthView", "view.month", "Month"],
  ["weekView", "view.week", "Week"],
  ["dayView", "view.day", "Day"],
  ["agendaView", "view.agenda", "Agenda"],
  ["yearView", "view.year", "Year"],
];

const BEHAVIOR_CHECKBOXES: Array<
  [
    keyof Pick<
      CalendarPluginSettings,
      "showWeekends" | "weekNumbers" | "timeFormat24h" | "showCreateButton"
    >,
    string,
    string,
  ]
> = [
  ["showWeekends", "settings.showWeekends", "Show Weekends"],
  ["weekNumbers", "settings.weekNumbers", "Show Week Numbers"],
  ["timeFormat24h", "settings.timeFormat24h", "24-Hour Time Format"],
  [
    "showCreateButton",
    "settings.showCreateButton",
    "Enable Quick-Create & Slot Selection",
  ],
];

export const CalendarViewsSection: React.FC<CalendarViewsSectionProps> = ({
  t,
  settings,
  onPatchSettings,
  mode = "all",
}) => {
  const showTheme = mode === "all" || mode === "theme";
  const showGeneral = mode === "all" || mode === "general";

  const renderSelect = (
    label: [string, string],
    hint: [string, string],
    placeholder: [string, string],
    value: string,
    options: Array<[string, string, string?]>,
    onChange: (val: string) => void
  ) => (
    <Field.Root hint={t(hint[0], hint[1])}>
      <Field.Label>{t(label[0], label[1])}</Field.Label>
      <SingleSelect
        placeholder={t(placeholder[0], placeholder[1])}
        value={value}
        onChange={(val: string | number) => onChange(String(val))}
      >
        {options.map(([optVal, optIdOrLabel, optDef]) => (
          <SingleSelectOption key={optVal} value={optVal}>
            {optDef ? t(optIdOrLabel, optDef) : optIdOrLabel}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <Field.Hint />
    </Field.Root>
  );

  const renderText = (
    label: [string, string],
    hint: [string, string],
    placeholder: [string, string],
    value: string,
    onChange: (val: string) => void
  ) => (
    <Field.Root hint={t(hint[0], hint[1])}>
      <Field.Label>{t(label[0], label[1])}</Field.Label>
      <TextInput
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        placeholder={t(placeholder[0], placeholder[1])}
      />
      <Field.Hint />
    </Field.Root>
  );

  const extraLocales: Array<[string, string]> =
    SUPPORTED_CALENDAR_LOCALES.filter(
      (loc) => !["es", "en", "ar", "tr"].includes(loc.code)
    ).map((loc) => [
      loc.code,
      `${loc.nativeName} — ${loc.label} (${loc.code.toUpperCase()})`,
    ]);

  return (
    <Box
      padding={5}
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      style={{ border: "1px solid rgba(128, 128, 128, 0.22)" }}
    >
      <Flex direction="column" alignItems="stretch" gap={5}>
        {showTheme && (
          <CalendarThemeSection
            t={t}
            settings={settings}
            onPatchSettings={onPatchSettings}
          />
        )}

        {showTheme && showGeneral && <Divider />}

        {showGeneral && (
          <>
            <Box>
              <Typography variant="delta" fontWeight="bold" tag="h2">
                {t(
                  "settings.section.general",
                  "Language, TimeGrid & Schedule Configuration"
                )}
              </Typography>
              <Box paddingTop={1} paddingBottom={4}>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    "settings.generalHint",
                    "Configure the primary local language, optional Arabic/Hijri secondary calendar display, timezone, and daily operating hours."
                  )}
                </Typography>
              </Box>
              <div style={GRID_3_COL}>
                {renderSelect(
                  ["settings.defaultLocale", "Primary Calendar Language"],
                  [
                    "settings.defaultLocaleHint",
                    "Language for month names, weekdays, and toolbar buttons.",
                  ],
                  [
                    "settings.defaultLocale.placeholder",
                    "Select primary language",
                  ],
                  settings.defaultLocale || "auto",
                  [
                    ["es", "settings.locale.es", "Español — Spanish (ES)"],
                    ["en", "settings.locale.en", "English (EN)"],
                    ["ar", "settings.locale.ar", "العربية — Arabic (AR)"],
                    ["tr", "settings.locale.tr", "Türkçe — Turkish (TR)"],
                    [
                      "auto",
                      "settings.locale.auto",
                      "Auto (Match Strapi Admin UI)",
                    ],
                    ...extraLocales,
                  ],
                  (defaultLocale) => onPatchSettings({ defaultLocale })
                )}

                {renderSelect(
                  [
                    "settings.secondaryCalendarLanguage",
                    "Secondary Hijri / Arabic Date Display",
                  ],
                  [
                    "settings.secondaryCalendarLanguageHint",
                    "Choose whether Hijri dates appear in local language, Arabic script, or hidden.",
                  ],
                  [
                    "settings.secondaryCalendarLanguage.placeholder",
                    "Select Hijri display mode",
                  ],
                  settings.secondaryCalendarLanguage || "local",
                  [
                    [
                      "local",
                      "settings.secondaryCalendarLanguage.local",
                      "Local Language (e.g. 16 Rabiʻ II)",
                    ],
                    [
                      "ar",
                      "settings.secondaryCalendarLanguage.ar",
                      "Arabic Script — العربية (e.g. ١٦ ربيع الآخر)",
                    ],
                    [
                      "off",
                      "settings.secondaryCalendarLanguage.off",
                      "Off (Gregorian Calendar Only)",
                    ],
                  ],
                  (val) =>
                    onPatchSettings({
                      secondaryCalendarLanguage:
                        val as SecondaryCalendarLanguageMode,
                    })
                )}

                {renderSelect(
                  ["settings.direction", "Layout Direction"],
                  [
                    "settings.directionHint",
                    "Grid column order (LTR or RTL for Arabic).",
                  ],
                  ["settings.direction.placeholder", "Select layout direction"],
                  settings.direction || "auto",
                  [
                    [
                      "auto",
                      "settings.direction.auto",
                      "Auto (LTR / RTL by Language)",
                    ],
                    ["ltr", "settings.direction.ltr", "Left-to-Right (LTR)"],
                    ["rtl", "settings.direction.rtl", "Right-to-Left (RTL)"],
                  ],
                  (val) =>
                    onPatchSettings({
                      direction: val as CalendarDirectionSetting,
                    })
                )}

                {renderSelect(
                  ["settings.defaultView", "Default Calendar View"],
                  [
                    "settings.defaultViewHint",
                    "Initial view displayed when opening the calendar.",
                  ],
                  ["settings.defaultView.placeholder", "Select default view"],
                  settings.defaultView || "dayGridMonth",
                  [
                    [
                      "dayGridMonth",
                      "settings.defaultView.month",
                      "Month Grid",
                    ],
                    [
                      "timeGridWeek",
                      "settings.defaultView.week",
                      "Week (TimeGrid)",
                    ],
                    [
                      "timeGridDay",
                      "settings.defaultView.day",
                      "Day (TimeGrid)",
                    ],
                    ["listMonth", "settings.defaultView.agenda", "Agenda List"],
                    [
                      "multiMonthYear",
                      "settings.defaultView.year",
                      "Full Year (3x4 Grid)",
                    ],
                    [
                      "multiMonthYearStacked",
                      "settings.defaultView.yearStacked",
                      "Year (Stacked Months)",
                    ],
                    [
                      "dayGridYear",
                      "settings.defaultView.dayGridYear",
                      "Year (Continuous Grid)",
                    ],
                  ],
                  (val) =>
                    onPatchSettings({ defaultView: val as CalendarViewMode })
                )}

                {renderSelect(
                  ["settings.firstDayOfWeek", "First Day of Week"],
                  [
                    "settings.firstDayHint",
                    "Starting weekday column in Month and Week views.",
                  ],
                  [
                    "settings.firstDayOfWeek.placeholder",
                    "Select first day of week",
                  ],
                  String(settings.firstDayOfWeek ?? 1),
                  [
                    ["1", "settings.firstDay.monday", "Monday (1)"],
                    ["0", "settings.firstDay.sunday", "Sunday (0)"],
                    ["6", "settings.firstDay.saturday", "Saturday (6)"],
                  ],
                  (val) =>
                    onPatchSettings({
                      firstDayOfWeek: Number.parseInt(val, 10),
                    })
                )}

                {renderSelect(
                  ["settings.weekNumberCalculation", "Week Calculation"],
                  [
                    "settings.weekCalcHint",
                    "Standard used when computing week numbers.",
                  ],
                  [
                    "settings.weekNumberCalculation.placeholder",
                    "Select week calculation mode",
                  ],
                  settings.weekNumberCalculation || "ISO",
                  [
                    ["ISO", "settings.weekCalc.iso", "ISO 8601 (Monday)"],
                    ["local", "settings.weekCalc.local", "Locale Default"],
                  ],
                  (val) =>
                    onPatchSettings({
                      weekNumberCalculation: val as WeekNumberCalculationMode,
                    })
                )}

                {renderText(
                  ["settings.defaultTimezone", "Default Timezone (IANA)"],
                  [
                    "settings.timezoneHint",
                    "IANA timezone identifier (e.g., UTC or America/New_York).",
                  ],
                  ["settings.defaultTimezone.placeholder", "e.g., UTC"],
                  settings.defaultTimezone || "UTC",
                  (defaultTimezone) => onPatchSettings({ defaultTimezone })
                )}

                {renderText(
                  ["settings.startHour", "Daily Start Hour"],
                  [
                    "settings.startHourHint",
                    "Earliest visible time slot in Week/Day TimeGrid (HH:MM:SS).",
                  ],
                  ["settings.startHour.placeholder", "e.g., 07:00:00"],
                  settings.startHour || "07:00:00",
                  (startHour) => onPatchSettings({ startHour })
                )}

                {renderText(
                  ["settings.endHour", "Daily End Hour"],
                  [
                    "settings.endHourHint",
                    "Latest visible time slot in Week/Day TimeGrid (HH:MM:SS).",
                  ],
                  ["settings.endHour.placeholder", "e.g., 21:00:00"],
                  settings.endHour || "21:00:00",
                  (endHour) => onPatchSettings({ endHour })
                )}
              </div>

              <div style={{ ...GRID_2_COL, marginTop: 16 }}>
                {renderSelect(
                  ["settings.slotDuration", "TimeGrid Slot Duration"],
                  [
                    "settings.slotDurationHint",
                    "Time interval for rows in Week and Day TimeGrid views.",
                  ],
                  ["settings.slotDuration.placeholder", "Select slot interval"],
                  settings.slotDuration || "00:30:00",
                  [
                    [
                      "00:15:00",
                      "settings.slotDuration.15m",
                      "15 min (00:15:00)",
                    ],
                    [
                      "00:30:00",
                      "settings.slotDuration.30m",
                      "30 min (00:30:00)",
                    ],
                    [
                      "01:00:00",
                      "settings.slotDuration.60m",
                      "60 min (01:00:00)",
                    ],
                  ],
                  (slotDuration) => onPatchSettings({ slotDuration })
                )}

                {renderText(
                  ["settings.feedTitle", "Public iCal (.ics) Feed Title"],
                  [
                    "settings.feedTitleHint",
                    "Calendar title exported in /api/calendar/feed.ics for Google/Apple/Outlook subscriptions.",
                  ],
                  [
                    "settings.feedTitle.placeholder",
                    "e.g., Organization — General Calendar",
                  ],
                  settings.feedTitle ||
                    t(
                      "settings.defaultFeedTitle",
                      "Organization — General Calendar"
                    ),
                  (feedTitle) => onPatchSettings({ feedTitle })
                )}
              </div>
            </Box>
            <Divider />
            <div style={GRID_2_COL}>
              {(
                [
                  [
                    "settings.enabledViewsGroup",
                    "Enabled Calendar View Tabs",
                    VIEW_CHECKBOXES,
                  ],
                  [
                    "settings.gridBehaviorGroup",
                    "Grid Display & Interaction Options",
                    BEHAVIOR_CHECKBOXES,
                  ],
                ] as const
              ).map(([groupId, groupDef, items]) => (
                <Box
                  key={groupId}
                  padding={4}
                  background="neutral100"
                  hasRadius
                  style={SUB_BOX_STYLE}
                >
                  <Flex direction="column" alignItems="flex-start" gap={3}>
                    <Typography variant="sigma" textColor="neutral700">
                      {t(groupId, groupDef)}
                    </Typography>
                    <Flex gap={4} wrap="wrap">
                      {items.map(([key, id, def]) => (
                        <Checkbox
                          key={key}
                          checked={
                            key === "timeFormat24h"
                              ? settings.timeFormat24h !== false
                              : Boolean(settings[key])
                          }
                          onCheckedChange={(c: boolean) =>
                            onPatchSettings({ [key]: Boolean(c) })
                          }
                        >
                          {t(id, def)}
                        </Checkbox>
                      ))}
                    </Flex>
                  </Flex>
                </Box>
              ))}
            </div>
          </>
        )}
      </Flex>
    </Box>
  );
};

export default CalendarViewsSection;
