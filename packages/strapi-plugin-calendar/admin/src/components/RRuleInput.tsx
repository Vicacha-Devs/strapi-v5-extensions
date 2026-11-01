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

const COMMON_TIMEZONES = [
  "UTC",
  "America/Bogota",
  "America/New_York",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Istanbul",
  "Asia/Riyadh",
  "Asia/Dubai",
];

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

interface SubSectionProps {
  t: (id: string, defaultMessage: string) => string;
  disabled: boolean;
  parsedRule: ParsedRRule;
  updateRule: (patch: Partial<ParsedRRule>) => void;
}

const RRuleFrequencyControls: React.FC<
  SubSectionProps & {
    fieldValue: RRuleFieldValue;
    emitChange: (next: RRuleFieldValue) => void;
  }
> = ({ t, disabled, parsedRule, fieldValue, updateRule, emitChange }) => {
  const isRepeating = parsedRule.freq !== "NONE";
  return (
    <Flex gap={3} wrap="wrap">
      <Box style={{ flex: 1, minWidth: 170 }}>
        <Field.Root>
          <Field.Label>{t("rrule.frequency", "Repeat Frequency")}</Field.Label>
          <SingleSelect
            disabled={disabled}
            placeholder={t(
              "placeholder.select_repeat_frequency",
              "Select repeat frequency"
            )}
            value={parsedRule.freq}
            onChange={(val: string) =>
              updateRule({
                freq: val as RRuleFrequency,
                byDay: val === "WEEKLY" ? ["FR"] : [],
              })
            }
          >
            <SingleSelectOption value="NONE">
              {t("rrule.freq.none", "Does not repeat (Single Entry)")}
            </SingleSelectOption>
            <SingleSelectOption value="DAILY">
              {t("rrule.freq.daily", "Daily")}
            </SingleSelectOption>
            <SingleSelectOption value="WEEKLY">
              {t("rrule.freq.weekly", "Weekly")}
            </SingleSelectOption>
            <SingleSelectOption value="MONTHLY">
              {t("rrule.freq.monthly", "Monthly")}
            </SingleSelectOption>
            <SingleSelectOption value="YEARLY">
              {t("rrule.freq.yearly", "Yearly")}
            </SingleSelectOption>
          </SingleSelect>
        </Field.Root>
      </Box>

      {isRepeating && (
        <Box style={{ width: 130 }}>
          <Field.Root>
            <Field.Label>{t("rrule.interval", "Every (Interval)")}</Field.Label>
            <NumberInput
              disabled={disabled}
              placeholder={t("placeholder.1", "1")}
              value={parsedRule.interval}
              onValueChange={(val: number | undefined) =>
                updateRule({ interval: val && val >= 1 ? val : 1 })
              }
            />
          </Field.Root>
        </Box>
      )}

      {isRepeating && (
        <Box style={{ flex: 1, minWidth: 190 }}>
          <Field.Root>
            <Field.Label>
              {t("rrule.rscale", "Calendar Scale (RSCALE)")}
            </Field.Label>
            <SingleSelect
              disabled={disabled}
              placeholder={t(
                "placeholder.select_calendar_scale",
                "Select calendar scale"
              )}
              value={parsedRule.rscale || "gregory"}
              onChange={(val: string) =>
                updateRule({ rscale: val === "gregory" ? undefined : val })
              }
            >
              {SUPPORTED_INTL_CALENDARS.map((cal) => (
                <SingleSelectOption key={cal.id} value={cal.intlCalendar}>
                  {cal.defaultLabel}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>
        </Box>
      )}

      <Box style={{ flex: 1, minWidth: 180 }}>
        <Field.Root>
          <Field.Label>{t("rrule.timezone", "Timezone")}</Field.Label>
          <SingleSelect
            disabled={disabled}
            placeholder={t("placeholder.select_timezone", "Select timezone")}
            value={fieldValue.timezone || "UTC"}
            onChange={(tz: string) =>
              emitChange({ ...fieldValue, timezone: String(tz) })
            }
          >
            {COMMON_TIMEZONES.map((tz) => (
              <SingleSelectOption key={tz} value={tz}>
                {tz}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Field.Root>
      </Box>
    </Flex>
  );
};

const RRulePatternControls: React.FC<
  SubSectionProps & { toggleWeekday: (day: RRuleWeekday) => void }
> = ({ t, disabled, parsedRule, updateRule, toggleWeekday }) => {
  if (parsedRule.freq === "WEEKLY") {
    return (
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
    );
  }

  if (parsedRule.freq !== "MONTHLY" && parsedRule.freq !== "YEARLY") {
    return null;
  }

  return (
    <Flex gap={3} wrap="wrap">
      {parsedRule.freq === "YEARLY" && (
        <Box style={{ width: 160 }}>
          <Field.Root>
            <Field.Label>{t("rrule.byMonth", "Month (1-12)")}</Field.Label>
            <NumberInput
              disabled={disabled}
              placeholder={t("placeholder.1", "1")}
              value={parsedRule.byMonth ?? 1}
              onValueChange={(val: number | undefined) =>
                updateRule({
                  byMonth:
                    val && val >= 1 && val <= 13 ? Math.floor(val) : undefined,
                })
              }
            />
          </Field.Root>
        </Box>
      )}
      <Box style={{ width: 160 }}>
        <Field.Root>
          <Field.Label>
            {t("rrule.byMonthDay", "Day of Month (1-31)")}
          </Field.Label>
          <NumberInput
            disabled={disabled}
            placeholder={t("placeholder.1", "1")}
            value={parsedRule.byMonthDay ?? 1}
            onValueChange={(val: number | undefined) =>
              updateRule({
                byMonthDay:
                  val && val >= 1 && val <= 31 ? Math.floor(val) : undefined,
              })
            }
          />
        </Field.Root>
      </Box>
    </Flex>
  );
};

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

const RRuleSeriesBoundsControls: React.FC<
  SubSectionProps & { endMode: "never" | "until" | "count" }
> = ({ t, disabled, parsedRule, updateRule, endMode }) => {
  if (parsedRule.freq === "NONE") return null;
  return (
    <Flex gap={3} wrap="wrap" alignItems="flex-end">
      <Box style={{ width: 180 }}>
        <Field.Root>
          <Field.Label>{t("rrule.ends", "Series Ends")}</Field.Label>
          <SingleSelect
            disabled={disabled}
            placeholder={t(
              "placeholder.select_series_end_mode",
              "Select series end mode"
            )}
            value={endMode}
            onChange={(mode: string) => applyEndModeChange(mode, updateRule)}
          >
            <SingleSelectOption value="never">
              {t("rrule.ends.never", "Never (Ongoing)")}
            </SingleSelectOption>
            <SingleSelectOption value="until">
              {t("rrule.ends.until", "On Specific Date (UNTIL)")}
            </SingleSelectOption>
            <SingleSelectOption value="count">
              {t("rrule.ends.count", "After N Occurrences (COUNT)")}
            </SingleSelectOption>
          </SingleSelect>
        </Field.Root>
      </Box>

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
                updateRule({ until: d ? formatLocalYmd(d) : undefined })
              }
              onClear={() => updateRule({ until: undefined })}
            />
          </Field.Root>
        </Box>
      )}

      {endMode === "count" && (
        <Box style={{ width: 180 }}>
          <Field.Root>
            <Field.Label>
              {t("rrule.occurrenceCount", "Max Occurrences")}
            </Field.Label>
            <NumberInput
              disabled={disabled}
              placeholder={t("placeholder.10", "10")}
              value={parsedRule.count ?? 10}
              onValueChange={(val: number | undefined) =>
                updateRule({ count: val && val >= 1 ? Math.floor(val) : 1 })
              }
            />
          </Field.Root>
        </Box>
      )}
    </Flex>
  );
};

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

  const exdatesList = fieldValue.exdates ?? [];
  const summaryText =
    parsedRule.freq === "NONE"
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

            <RRuleFrequencyControls
              t={t}
              disabled={disabled}
              parsedRule={parsedRule}
              fieldValue={fieldValue}
              updateRule={updateRule}
              emitChange={emitChange}
            />

            <Checkbox
              disabled={disabled}
              checked={Boolean(fieldValue.allDay)}
              onCheckedChange={(checked: boolean) =>
                emitChange({ ...fieldValue, allDay: Boolean(checked) })
              }
            >
              {t("rrule.allDay", "All-day entry")}
            </Checkbox>

            <RRulePatternControls
              t={t}
              disabled={disabled}
              parsedRule={parsedRule}
              updateRule={updateRule}
              toggleWeekday={toggleWeekday}
            />

            <RRuleSeriesBoundsControls
              t={t}
              disabled={disabled}
              parsedRule={parsedRule}
              updateRule={updateRule}
              endMode={endMode}
            />

            {parsedRule.freq !== "NONE" && (
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
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                          }}
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
