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

const VIEW_CHECKBOXES: Array<{
  key: keyof Pick<
    CalendarPluginSettings,
    "monthView" | "weekView" | "dayView" | "agendaView" | "yearView"
  >;
  labelId: string;
  defaultLabel: string;
}> = [
  { key: "monthView", labelId: "view.month", defaultLabel: "Month" },
  { key: "weekView", labelId: "view.week", defaultLabel: "Week" },
  { key: "dayView", labelId: "view.day", defaultLabel: "Day" },
  { key: "agendaView", labelId: "view.agenda", defaultLabel: "Agenda" },
  { key: "yearView", labelId: "view.year", defaultLabel: "Year" },
];

type TranslateFn = (id: string, defaultMessage: string) => string;

interface SubFieldsProps {
  t: TranslateFn;
  settings: CalendarPluginSettings;
  onPatchSettings: (patch: Partial<CalendarPluginSettings>) => void;
}

const GeneralLanguageSelectFields: React.FC<SubFieldsProps> = ({
  t,
  settings,
  onPatchSettings,
}) => (
  <>
    <Field.Root
      hint={t(
        "settings.defaultLocaleHint",
        "Language for month names, weekdays, and toolbar buttons."
      )}
    >
      <Field.Label>{t("settings.defaultLocale", "Primary Calendar Language")}</Field.Label>
      <SingleSelect
        placeholder={t("settings.defaultLocale.placeholder", "Select primary language")}
        value={settings.defaultLocale || "es"}
        onChange={(val: string | number) => onPatchSettings({ defaultLocale: String(val) })}
      >
        <SingleSelectOption value="es">
          {t("settings.locale.es", "Español — Spanish (ES)")}
        </SingleSelectOption>
        <SingleSelectOption value="en">
          {t("settings.locale.en", "English (EN)")}
        </SingleSelectOption>
        <SingleSelectOption value="ar">
          {t("settings.locale.ar", "العربية — Arabic (AR)")}
        </SingleSelectOption>
        <SingleSelectOption value="tr">
          {t("settings.locale.tr", "Türkçe — Turkish (TR)")}
        </SingleSelectOption>
        <SingleSelectOption value="auto">
          {t("settings.locale.auto", "Auto (Match Strapi Admin UI)")}
        </SingleSelectOption>
        {SUPPORTED_CALENDAR_LOCALES.filter(
          (loc) => !["es", "en", "ar", "tr"].includes(loc.code)
        ).map((loc) => (
          <SingleSelectOption key={loc.code} value={loc.code}>
            {loc.nativeName} — {loc.label} ({loc.code.toUpperCase()})
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <Field.Hint />
    </Field.Root>

    <Field.Root
      hint={t(
        "settings.secondaryCalendarLanguageHint",
        "Choose whether Hijri dates appear in local language, Arabic script, or hidden."
      )}
    >
      <Field.Label>
        {t("settings.secondaryCalendarLanguage", "Secondary Hijri / Arabic Date Display")}
      </Field.Label>
      <SingleSelect
        placeholder={t(
          "settings.secondaryCalendarLanguage.placeholder",
          "Select Hijri display mode"
        )}
        value={settings.secondaryCalendarLanguage || "local"}
        onChange={(val: string | number) =>
          onPatchSettings({
            secondaryCalendarLanguage: String(val) as SecondaryCalendarLanguageMode,
          })
        }
      >
        <SingleSelectOption value="local">
          {t("settings.secondaryCalendarLanguage.local", "Local Language (e.g. 16 Rabiʻ II)")}
        </SingleSelectOption>
        <SingleSelectOption value="ar">
          {t(
            "settings.secondaryCalendarLanguage.ar",
            "Arabic Script — العربية (e.g. ١٦ ربيع الآخر)"
          )}
        </SingleSelectOption>
        <SingleSelectOption value="off">
          {t("settings.secondaryCalendarLanguage.off", "Off (Gregorian Calendar Only)")}
        </SingleSelectOption>
      </SingleSelect>
      <Field.Hint />
    </Field.Root>

    <Field.Root hint={t("settings.directionHint", "Grid column order (LTR or RTL for Arabic).")}>
      <Field.Label>{t("settings.direction", "Layout Direction")}</Field.Label>
      <SingleSelect
        placeholder={t("settings.direction.placeholder", "Select layout direction")}
        value={settings.direction || "auto"}
        onChange={(val: string | number) =>
          onPatchSettings({ direction: String(val) as CalendarDirectionSetting })
        }
      >
        <SingleSelectOption value="auto">
          {t("settings.direction.auto", "Auto (LTR / RTL by Language)")}
        </SingleSelectOption>
        <SingleSelectOption value="ltr">
          {t("settings.direction.ltr", "Left-to-Right (LTR)")}
        </SingleSelectOption>
        <SingleSelectOption value="rtl">
          {t("settings.direction.rtl", "Right-to-Left (RTL)")}
        </SingleSelectOption>
      </SingleSelect>
      <Field.Hint />
    </Field.Root>

    <Field.Root
      hint={t("settings.defaultViewHint", "Initial view displayed when opening the calendar.")}
    >
      <Field.Label>{t("settings.defaultView", "Default Calendar View")}</Field.Label>
      <SingleSelect
        placeholder={t("settings.defaultView.placeholder", "Select default view")}
        value={settings.defaultView || "dayGridMonth"}
        onChange={(val: string | number) =>
          onPatchSettings({ defaultView: String(val) as CalendarViewMode })
        }
      >
        <SingleSelectOption value="dayGridMonth">
          {t("settings.defaultView.month", "Month Grid")}
        </SingleSelectOption>
        <SingleSelectOption value="timeGridWeek">
          {t("settings.defaultView.week", "Week (TimeGrid)")}
        </SingleSelectOption>
        <SingleSelectOption value="timeGridDay">
          {t("settings.defaultView.day", "Day (TimeGrid)")}
        </SingleSelectOption>
        <SingleSelectOption value="listMonth">
          {t("settings.defaultView.agenda", "Agenda List")}
        </SingleSelectOption>
        <SingleSelectOption value="multiMonthYear">
          {t("settings.defaultView.year", "Full Year (3x4 Grid)")}
        </SingleSelectOption>
        <SingleSelectOption value="multiMonthYearStacked">
          {t("settings.defaultView.yearStacked", "Year (Stacked Months)")}
        </SingleSelectOption>
        <SingleSelectOption value="dayGridYear">
          {t("settings.defaultView.dayGridYear", "Year (Continuous Grid)")}
        </SingleSelectOption>
      </SingleSelect>
      <Field.Hint />
    </Field.Root>

    <Field.Root
      hint={t("settings.firstDayHint", "Starting weekday column in Month and Week views.")}
    >
      <Field.Label>{t("settings.firstDayOfWeek", "First Day of Week")}</Field.Label>
      <SingleSelect
        placeholder={t("settings.firstDayOfWeek.placeholder", "Select first day of week")}
        value={String(settings.firstDayOfWeek ?? 1)}
        onChange={(val: string | number) =>
          onPatchSettings({ firstDayOfWeek: Number.parseInt(String(val), 10) })
        }
      >
        <SingleSelectOption value="1">
          {t("settings.firstDay.monday", "Monday (1)")}
        </SingleSelectOption>
        <SingleSelectOption value="0">
          {t("settings.firstDay.sunday", "Sunday (0)")}
        </SingleSelectOption>
        <SingleSelectOption value="6">
          {t("settings.firstDay.saturday", "Saturday (6)")}
        </SingleSelectOption>
      </SingleSelect>
      <Field.Hint />
    </Field.Root>

    <Field.Root hint={t("settings.weekCalcHint", "Standard used when computing week numbers.")}>
      <Field.Label>{t("settings.weekNumberCalculation", "Week Calculation")}</Field.Label>
      <SingleSelect
        placeholder={t(
          "settings.weekNumberCalculation.placeholder",
          "Select week calculation mode"
        )}
        value={settings.weekNumberCalculation || "ISO"}
        onChange={(val: string | number) =>
          onPatchSettings({
            weekNumberCalculation: String(val) as WeekNumberCalculationMode,
          })
        }
      >
        <SingleSelectOption value="ISO">
          {t("settings.weekCalc.iso", "ISO 8601 (Monday)")}
        </SingleSelectOption>
        <SingleSelectOption value="local">
          {t("settings.weekCalc.local", "Locale Default")}
        </SingleSelectOption>
      </SingleSelect>
      <Field.Hint />
    </Field.Root>
  </>
);

const GeneralTimeGridFields: React.FC<SubFieldsProps> = ({ t, settings, onPatchSettings }) => (
  <>
    <Field.Root
      hint={t("settings.timezoneHint", "IANA timezone identifier (e.g., America/Bogota or UTC).")}
    >
      <Field.Label>{t("settings.defaultTimezone", "Default Timezone (IANA)")}</Field.Label>
      <TextInput
        value={settings.defaultTimezone || "America/Bogota"}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onPatchSettings({ defaultTimezone: e.target.value })
        }
        placeholder={t("settings.defaultTimezone.placeholder", "e.g., America/Bogota")}
      />
      <Field.Hint />
    </Field.Root>

    <Field.Root
      hint={t(
        "settings.startHourHint",
        "Earliest visible time slot in Week/Day TimeGrid (HH:MM:SS)."
      )}
    >
      <Field.Label>{t("settings.startHour", "Daily Start Hour")}</Field.Label>
      <TextInput
        value={settings.startHour || "07:00:00"}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onPatchSettings({ startHour: e.target.value })
        }
        placeholder={t("settings.startHour.placeholder", "e.g., 07:00:00")}
      />
      <Field.Hint />
    </Field.Root>

    <Field.Root
      hint={t("settings.endHourHint", "Latest visible time slot in Week/Day TimeGrid (HH:MM:SS).")}
    >
      <Field.Label>{t("settings.endHour", "Daily End Hour")}</Field.Label>
      <TextInput
        value={settings.endHour || "21:00:00"}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onPatchSettings({ endHour: e.target.value })
        }
        placeholder={t("settings.endHour.placeholder", "e.g., 21:00:00")}
      />
      <Field.Hint />
    </Field.Root>
  </>
);

const GeneralSlotAndFeedFields: React.FC<SubFieldsProps> = ({ t, settings, onPatchSettings }) => (
  <div style={{ ...GRID_2_COL, marginTop: 16 }}>
    <Field.Root
      hint={t(
        "settings.slotDurationHint",
        "Time interval for rows in Week and Day TimeGrid views."
      )}
    >
      <Field.Label>{t("settings.slotDuration", "TimeGrid Slot Duration")}</Field.Label>
      <SingleSelect
        placeholder={t("settings.slotDuration.placeholder", "Select slot interval")}
        value={settings.slotDuration || "00:30:00"}
        onChange={(val: string | number) => onPatchSettings({ slotDuration: String(val) })}
      >
        <SingleSelectOption value="00:15:00">
          {t("settings.slotDuration.15m", "15 min (00:15:00)")}
        </SingleSelectOption>
        <SingleSelectOption value="00:30:00">
          {t("settings.slotDuration.30m", "30 min (00:30:00)")}
        </SingleSelectOption>
        <SingleSelectOption value="01:00:00">
          {t("settings.slotDuration.60m", "60 min (01:00:00)")}
        </SingleSelectOption>
      </SingleSelect>
      <Field.Hint />
    </Field.Root>

    <Field.Root
      hint={t(
        "settings.feedTitleHint",
        "Calendar title exported in /api/calendar/feed.ics for Google/Apple/Outlook subscriptions."
      )}
    >
      <Field.Label>{t("settings.feedTitle", "Public iCal (.ics) Feed Title")}</Field.Label>
      <TextInput
        value={
          settings.feedTitle ||
          t("settings.defaultFeedTitle", "Abu Bakr As-Siddiq Central Mosque — General Calendar")
        }
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onPatchSettings({ feedTitle: e.target.value })
        }
        placeholder={t(
          "settings.feedTitle.placeholder",
          "e.g., Abu Bakr As-Siddiq Central Mosque — General Calendar"
        )}
      />
      <Field.Hint />
    </Field.Root>
  </div>
);

const GridAndViewCheckboxes: React.FC<SubFieldsProps> = ({ t, settings, onPatchSettings }) => (
  <div style={GRID_2_COL}>
    <Box padding={4} background="neutral100" hasRadius style={SUB_BOX_STYLE}>
      <Flex direction="column" alignItems="flex-start" gap={3}>
        <Typography variant="sigma" textColor="neutral700">
          {t("settings.enabledViewsGroup", "Enabled Calendar View Tabs")}
        </Typography>
        <Flex gap={4} wrap="wrap">
          {VIEW_CHECKBOXES.map((vc) => (
            <Checkbox
              key={vc.key}
              checked={Boolean(settings[vc.key])}
              onCheckedChange={(c: boolean) => onPatchSettings({ [vc.key]: Boolean(c) })}
            >
              {t(vc.labelId, vc.defaultLabel)}
            </Checkbox>
          ))}
        </Flex>
      </Flex>
    </Box>

    <Box padding={4} background="neutral100" hasRadius style={SUB_BOX_STYLE}>
      <Flex direction="column" alignItems="flex-start" gap={3}>
        <Typography variant="sigma" textColor="neutral700">
          {t("settings.gridBehaviorGroup", "Grid Display & Interaction Options")}
        </Typography>
        <Flex gap={4} wrap="wrap">
          <Checkbox
            checked={settings.showWeekends}
            onCheckedChange={(c: boolean) => onPatchSettings({ showWeekends: Boolean(c) })}
          >
            {t("settings.showWeekends", "Show Weekends")}
          </Checkbox>
          <Checkbox
            checked={Boolean(settings.weekNumbers)}
            onCheckedChange={(c: boolean) => onPatchSettings({ weekNumbers: Boolean(c) })}
          >
            {t("settings.weekNumbers", "Show Week Numbers")}
          </Checkbox>
          <Checkbox
            checked={settings.timeFormat24h !== false}
            onCheckedChange={(c: boolean) => onPatchSettings({ timeFormat24h: Boolean(c) })}
          >
            {t("settings.timeFormat24h", "24-Hour Time Format")}
          </Checkbox>
          <Checkbox
            checked={settings.showCreateButton}
            onCheckedChange={(c: boolean) => onPatchSettings({ showCreateButton: Boolean(c) })}
          >
            {t("settings.showCreateButton", "Enable Quick-Create & Slot Selection")}
          </Checkbox>
        </Flex>
      </Flex>
    </Box>
  </div>
);

export const CalendarViewsSection: React.FC<CalendarViewsSectionProps> = ({
  t,
  settings,
  onPatchSettings,
  mode = "all",
}) => {
  const showTheme = mode === "all" || mode === "theme";
  const showGeneral = mode === "all" || mode === "general";

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
          <CalendarThemeSection t={t} settings={settings} onPatchSettings={onPatchSettings} />
        )}

        {showTheme && showGeneral && <Divider />}

        {showGeneral && (
          <>
            <Box>
              <Typography variant="delta" fontWeight="bold" tag="h2">
                {t("settings.section.general", "Language, TimeGrid & Schedule Configuration")}
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
                <GeneralLanguageSelectFields
                  t={t}
                  settings={settings}
                  onPatchSettings={onPatchSettings}
                />
                <GeneralTimeGridFields
                  t={t}
                  settings={settings}
                  onPatchSettings={onPatchSettings}
                />
              </div>
              <GeneralSlotAndFeedFields
                t={t}
                settings={settings}
                onPatchSettings={onPatchSettings}
              />
            </Box>
            <Divider />
            <GridAndViewCheckboxes t={t} settings={settings} onPatchSettings={onPatchSettings} />
          </>
        )}
      </Flex>
    </Box>
  );
};

export default CalendarViewsSection;
