import {
  Badge,
  Box,
  Button,
  Checkbox,
  DatePicker,
  Field,
  Flex,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system";
import React, { useMemo, useState } from "react";
import { useIntl } from "react-intl";

import { SUPPORTED_INTL_CALENDARS } from "../../../shared/calendarSystems";
import { PLUGIN_ID } from "../../../shared/pluginId";
import {
  buildRRule,
  describeRRule,
  parseRRule,
  parseRRuleFieldValue,
} from "../../../shared/rruleEngine";
import type {
  ParsedRRule,
  RRuleFieldValue,
  RRuleFrequency,
  RRuleWeekday,
} from "../../../shared/types";
import {
  formatLocalYmd,
  formatPluginMessageWithUrlLocale,
  parseDateTimePickerValue,
} from "./calendar/calendarPageHelpers";

const WEEKDAYS: { code: RRuleWeekday; label: string }[] = [
  { code: "MO", label: "Mon" },
  { code: "TU", label: "Tue" },
  { code: "WE", label: "Wed" },
  { code: "TH", label: "Thu" },
  { code: "FR", label: "Fri" },
  { code: "SA", label: "Sat" },
  { code: "SU", label: "Sun" },
];

const COMMON_TIMEZONES =
  "UTC,America/Bogota,America/New_York,America/Mexico_City,America/Sao_Paulo,Europe/Madrid,Europe/London,Europe/Paris,Europe/Berlin,Europe/Amsterdam,Europe/Istanbul,Asia/Riyadh,Asia/Dubai".split(
    ","
  );

const FREQ_OPTIONS: Array<[RRuleFrequency, string, string]> = [
  ["NONE", "rrule.freq.none", "Does not repeat (Single Entry)"],
  ["DAILY", "rrule.freq.daily", "Daily"],
  ["WEEKLY", "rrule.freq.weekly", "Weekly"],
  ["MONTHLY", "rrule.freq.monthly", "Monthly"],
  ["YEARLY", "rrule.freq.yearly", "Yearly"],
];

const END_OPTIONS: Array<["never" | "until" | "count", string, string]> = [
  ["never", "rrule.ends.never", "Never (Ongoing)"],
  ["until", "rrule.ends.until", "On Specific Date (UNTIL)"],
  ["count", "rrule.ends.count", "After N Occurrences (COUNT)"],
];

const REMOVE_BTN_STYLE: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

export interface RRuleInputProps {
  name: string;
  value?: unknown;
  onChange: (event: {
    target: { name: string; value: unknown; type: string };
  }) => void;
  attribute?: Record<string, unknown>;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  hint?: string;
}

function applyEndModeChange(
  mode: string,
  updateRule: (patch: Partial<ParsedRRule>) => void
): void {
  if (mode === "never") {
    updateRule({ count: undefined, until: undefined });
  } else if (mode === "count") {
    updateRule({ count: 10, until: undefined });
  } else if (mode === "until") {
    const nextYear = new Date();
    nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
    updateRule({
      until: nextYear.toISOString().slice(0, 10),
      count: undefined,
    });
  }
}

export const RRuleInput: React.FC<RRuleInputProps> = ({
  name,
  value,
  onChange,
  disabled = false,
  error,
  label,
  required = false,
  hint,
}) => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatPluginMessageWithUrlLocale(
      PLUGIN_ID,
      id,
      defaultMessage,
      formatMessage
    );

  const fieldValue = useMemo(() => parseRRuleFieldValue(value, "UTC"), [value]);
  const parsedRule = useMemo(
    () => parseRRule(fieldValue.rrule),
    [fieldValue.rrule]
  );
  const [newExdate, setNewExdate] = useState("");

  const isRepeating = parsedRule.freq !== "NONE";
  const endMode: "never" | "until" | "count" = parsedRule.until
    ? "until"
    : parsedRule.count
      ? "count"
      : "never";

  const emitChange = (next: RRuleFieldValue) => {
    onChange({ target: { name, value: next, type: "json" } });
  };

  const updateRule = (patch: Partial<ParsedRRule>) => {
    const merged = { ...parsedRule, ...patch };
    emitChange({
      ...fieldValue,
      rrule: buildRRule(merged),
      rscale: merged.rscale,
    });
  };

  const toggleWeekday = (day: RRuleWeekday) => {
    const nextDays = parsedRule.byDay.includes(day)
      ? parsedRule.byDay.filter((d) => d !== day)
      : [...parsedRule.byDay, day];
    updateRule({ byDay: nextDays });
  };

  const handleAddExdate = () => {
    const clean = newExdate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return;
    const current = fieldValue.exdates ?? [];
    if (!current.includes(clean)) {
      emitChange({ ...fieldValue, exdates: [...current, clean].sort() });
    }
    setNewExdate("");
  };

  const handleRemoveExdate = (dateToRemove: string) => {
    emitChange({
      ...fieldValue,
      exdates: (fieldValue.exdates ?? []).filter((d) => d !== dateToRemove),
    });
  };

  const renderSelect = (
    style: React.CSSProperties,
    labelText: string,
    placeholderText: string,
    val: string,
    options: Array<[string, string]>,
    onSelect: (next: string) => void
  ) => (
    <Box style={style}>
      <Field.Root>
        <Field.Label>{labelText}</Field.Label>
        <SingleSelect
          disabled={disabled}
          placeholder={placeholderText}
          value={val}
          onChange={onSelect}
        >
          {options.map(([optVal, optLabel]) => (
            <SingleSelectOption key={optVal} value={optVal}>
              {optLabel}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
    </Box>
  );

  const renderNumber = (
    width: number,
    labelText: string,
    placeholderText: string,
    val: number,
    onValChange: (next: number | undefined) => void
  ) => (
    <Box style={{ width }}>
      <Field.Root>
        <Field.Label>{labelText}</Field.Label>
        <NumberInput
          disabled={disabled}
          placeholder={placeholderText}
          value={val}
          onValueChange={onValChange}
        />
      </Field.Root>
    </Box>
  );

  const exdatesList = fieldValue.exdates ?? [];
  const summaryText = !isRepeating
    ? t("rrule.freq.none", "Does not repeat (Single Entry)")
    : describeRRule(fieldValue.rrule);

  return (
    <Field.Root name={name} error={error} hint={hint} required={required}>
      <Flex direction="column" alignItems="stretch" gap={3}>
        {label && <Field.Label>{label}</Field.Label>}

        <Box
          padding={4}
          background="neutral100"
          borderColor="neutral200"
          hasRadius
        >
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Flex
              justifyContent="space-between"
              alignItems="center"
              wrap="wrap"
              gap={2}
            >
              <Typography variant="sigma" textColor="neutral600">
                {t("rrule.summaryLabel", "Recurrence Summary")}
              </Typography>
              <Badge backgroundColor="primary100" textColor="primary700">
                {summaryText}
              </Badge>
            </Flex>

            <Flex gap={3} wrap="wrap">
              {renderSelect(
                { flex: 1, minWidth: 170 },
                t("rrule.frequency", "Repeat Frequency"),
                t(
                  "placeholder.select_repeat_frequency",
                  "Select repeat frequency"
                ),
                parsedRule.freq,
                FREQ_OPTIONS.map(([v, id, def]) => [v, t(id, def)]),
                (val) =>
                  updateRule({
                    freq: val as RRuleFrequency,
                    byDay: val === "WEEKLY" ? ["FR"] : [],
                  })
              )}
              {isRepeating &&
                renderNumber(
                  130,
                  t("rrule.interval", "Every (Interval)"),
                  t("placeholder.1", "1"),
                  parsedRule.interval,
                  (val) => updateRule({ interval: val && val >= 1 ? val : 1 })
                )}
              {isRepeating &&
                renderSelect(
                  { flex: 1, minWidth: 190 },
                  t("rrule.rscale", "Calendar Scale (RSCALE)"),
                  t(
                    "placeholder.select_calendar_scale",
                    "Select calendar scale"
                  ),
                  parsedRule.rscale || "gregory",
                  SUPPORTED_INTL_CALENDARS.map((c) => [
                    c.intlCalendar,
                    c.defaultLabel,
                  ]),
                  (val) =>
                    updateRule({ rscale: val === "gregory" ? undefined : val })
                )}
              {renderSelect(
                { flex: 1, minWidth: 180 },
                t("rrule.timezone", "Timezone"),
                t("placeholder.select_timezone", "Select timezone"),
                fieldValue.timezone || "UTC",
                COMMON_TIMEZONES.map((tz) => [tz, tz]),
                (tz) => emitChange({ ...fieldValue, timezone: String(tz) })
              )}
            </Flex>

            <Checkbox
              disabled={disabled}
              checked={Boolean(fieldValue.allDay)}
              onCheckedChange={(checked: boolean) =>
                emitChange({ ...fieldValue, allDay: Boolean(checked) })
              }
            >
              {t("rrule.allDay", "All-day entry")}
            </Checkbox>

            {parsedRule.freq === "WEEKLY" && (
              <Box>
                <Typography variant="pi" fontWeight="bold">
                  {t("rrule.byDay", "Repeat on Weekdays")}
                </Typography>
                <Flex gap={2} paddingTop={2} wrap="wrap">
                  {WEEKDAYS.map((day) => {
                    const active = parsedRule.byDay.includes(day.code);
                    return (
                      <Button
                        key={day.code}
                        size="S"
                        variant={active ? "default" : "tertiary"}
                        disabled={disabled}
                        onClick={() => toggleWeekday(day.code)}
                      >
                        {t(`weekday.${day.code.toLowerCase()}`, day.label)}
                      </Button>
                    );
                  })}
                </Flex>
              </Box>
            )}

            {(parsedRule.freq === "MONTHLY" ||
              parsedRule.freq === "YEARLY") && (
              <Flex gap={3} wrap="wrap">
                {parsedRule.freq === "YEARLY" &&
                  renderNumber(
                    160,
                    t("rrule.byMonth", "Month (1-12)"),
                    t("placeholder.1", "1"),
                    parsedRule.byMonth ?? 1,
                    (val) =>
                      updateRule({
                        byMonth:
                          val && val >= 1 && val <= 13
                            ? Math.floor(val)
                            : undefined,
                      })
                  )}
                {renderNumber(
                  160,
                  t("rrule.byMonthDay", "Day of Month (1-31)"),
                  t("placeholder.1", "1"),
                  parsedRule.byMonthDay ?? 1,
                  (val) =>
                    updateRule({
                      byMonthDay:
                        val && val >= 1 && val <= 31
                          ? Math.floor(val)
                          : undefined,
                    })
                )}
              </Flex>
            )}

            {isRepeating && (
              <Flex gap={3} wrap="wrap" alignItems="flex-end">
                {renderSelect(
                  { width: 180 },
                  t("rrule.ends", "Series Ends"),
                  t(
                    "placeholder.select_series_end_mode",
                    "Select series end mode"
                  ),
                  endMode,
                  END_OPTIONS.map(([v, id, def]) => [v, t(id, def)]),
                  (mode) => applyEndModeChange(mode, updateRule)
                )}
                {endMode === "until" && (
                  <Box style={{ width: 200 }}>
                    <Field.Root>
                      <Field.Label>
                        {t("rrule.untilDate", "Until Date (YYYY-MM-DD)")}
                      </Field.Label>
                      <DatePicker
                        disabled={disabled}
                        value={parseDateTimePickerValue(parsedRule.until)}
                        clearLabel={t("common.clear", "Clear")}
                        onChange={(d: Date | undefined) =>
                          updateRule({
                            until: d ? formatLocalYmd(d) : undefined,
                          })
                        }
                        onClear={() => updateRule({ until: undefined })}
                      />
                    </Field.Root>
                  </Box>
                )}
                {endMode === "count" &&
                  renderNumber(
                    180,
                    t("rrule.occurrenceCount", "Max Occurrences"),
                    t("placeholder.10", "10"),
                    parsedRule.count ?? 10,
                    (val) =>
                      updateRule({
                        count: val && val >= 1 ? Math.floor(val) : 1,
                      })
                  )}
              </Flex>
            )}

            {isRepeating && (
              <Box>
                <Flex gap={2} paddingTop={1} wrap="wrap" alignItems="flex-end">
                  <Box style={{ width: 240 }}>
                    <Field.Root>
                      <Field.Label>
                        {t(
                          "rrule.exdates",
                          "Excluded Dates (Holiday / Exception Dates)"
                        )}
                      </Field.Label>
                      <DatePicker
                        disabled={disabled}
                        value={parseDateTimePickerValue(newExdate)}
                        clearLabel={t("common.clear", "Clear")}
                        onChange={(d: Date | undefined) =>
                          setNewExdate(d ? formatLocalYmd(d) : "")
                        }
                        onClear={() => setNewExdate("")}
                      />
                    </Field.Root>
                  </Box>
                  <Button
                    variant="secondary"
                    size="S"
                    disabled={disabled}
                    onClick={handleAddExdate}
                  >
                    {t("rrule.addExdate", "Add Excluded Date")}
                  </Button>
                </Flex>

                {exdatesList.length > 0 && (
                  <Flex gap={2} paddingTop={2} wrap="wrap">
                    {exdatesList.map((dt) => (
                      <Badge
                        key={dt}
                        backgroundColor="neutral200"
                        textColor="neutral800"
                      >
                        {dt}{" "}
                        <button
                          type="button"
                          onClick={() => handleRemoveExdate(dt)}
                          style={REMOVE_BTN_STYLE}
                          aria-label={`Remove ${dt}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </Flex>
                )}
              </Box>
            )}
          </Flex>
        </Box>

        <Field.Error />
        <Field.Hint />
      </Flex>
    </Field.Root>
  );
};

export default RRuleInput;
