import {
  Badge,
  Button,
  DateTimePicker,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import React from "react";

import type {
  CalendarSourceMapping,
  RecurrencePreset,
  RRuleWeekday,
} from "../../../../shared/types";
import { WEEKDAYS } from "./calendarPageHelpers";

export type TranslateFn = (id: string, defaultMessage: string) => string;

export function resolveActiveQuickSource(
  enabledSources: CalendarSourceMapping[],
  selectedSourceId: string
): CalendarSourceMapping | undefined {
  if (enabledSources.length === 0) return undefined;
  if (selectedSourceId) {
    const exact = enabledSources.find(
      (s) => s.id === selectedSourceId || s.uid === selectedSourceId
    );
    if (exact) return exact;
  }
  return enabledSources[0];
}

export function sourceIncludesKeyword(
  source: CalendarSourceMapping | undefined,
  keyword: string
): boolean {
  if (!source) return false;
  return (
    source.id.toLowerCase().includes(keyword) ||
    source.uid.toLowerCase().includes(keyword)
  );
}

export function computeToggledWeekdays(
  selectedWeekdays: RRuleWeekday[],
  code: RRuleWeekday
): RRuleWeekday[] {
  if (selectedWeekdays.includes(code)) {
    return selectedWeekdays.length > 1
      ? selectedWeekdays.filter((d) => d !== code)
      : [code];
  }
  return WEEKDAYS.map((w) => w.code).filter(
    (c) => c === code || selectedWeekdays.includes(c)
  );
}

export const QuickCreateHeader: React.FC<{
  t: TranslateFn;
  isBookingSource: boolean;
  isEventSource: boolean;
  activeSource?: CalendarSourceMapping;
  enabledSources: CalendarSourceMapping[];
  onSelectedSourceIdChange?: (sourceId: string) => void;
}> = ({
  t,
  isBookingSource,
  isEventSource,
  activeSource,
  enabledSources,
  onSelectedSourceIdChange,
}) => {
  const headingText = isBookingSource
    ? t("calendar.quickCreateBookingTitle", "New Booking / Reservation")
    : isEventSource
      ? t("calendar.quickCreateEventTitle", "New Calendar Event")
      : t("calendar.quickCreateTitle", "Quick-Create Calendar Entry");

  return (
    <Flex
      justifyContent="space-between"
      alignItems="center"
      wrap="wrap"
      gap={2}
    >
      <Flex alignItems="center" gap={2} wrap="wrap">
        <Typography variant="delta" fontWeight="bold">
          {headingText}
        </Typography>
        {activeSource && (
          <Badge backgroundColor="neutral150" textColor="neutral800">
            {activeSource.label}
          </Badge>
        )}
      </Flex>

      {enabledSources.length > 1 && onSelectedSourceIdChange && (
        <Flex gap={1} wrap="wrap" alignItems="center">
          <Typography variant="pi" textColor="neutral600">
            {t("calendar.targetSource", "Create in:")}
          </Typography>
          {enabledSources.map((src) => {
            const isSelected = activeSource?.id === src.id;
            return (
              <Button
                key={src.id}
                size="S"
                variant={isSelected ? "default" : "tertiary"}
                onClick={() => onSelectedSourceIdChange(src.id)}
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
                {src.label}
              </Button>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
};

export const BookingVisitorFields: React.FC<{
  t: TranslateFn;
  isBookingSource: boolean;
  quickCustomerName: string;
  onQuickCustomerNameChange?: (name: string) => void;
  quickCustomerEmail: string;
  onQuickCustomerEmailChange?: (email: string) => void;
  quickPartySize: number;
  onQuickPartySizeChange?: (size: number) => void;
}> = ({
  t,
  isBookingSource,
  quickCustomerName,
  onQuickCustomerNameChange,
  quickCustomerEmail,
  onQuickCustomerEmailChange,
  quickPartySize,
  onQuickPartySizeChange,
}) => {
  if (!isBookingSource) return null;
  return (
    <>
      {onQuickCustomerNameChange && (
        <Field.Root>
          <Field.Label>
            {t("calendar.field.customerName", "Visitor / Customer Name")}
          </Field.Label>
          <TextInput
            value={quickCustomerName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onQuickCustomerNameChange(e.target.value)
            }
            placeholder={t(
              "placeholder.customer_name",
              "Defaults to reservation title if omitted"
            )}
          />
        </Field.Root>
      )}

      {onQuickCustomerEmailChange && (
        <Field.Root>
          <Field.Label>
            {t("calendar.field.customerEmail", "Visitor / Customer Email")}
          </Field.Label>
          <TextInput
            value={quickCustomerEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onQuickCustomerEmailChange(e.target.value)
            }
            placeholder={t("placeholder.customer_email", "guest@example.com")}
          />
        </Field.Root>
      )}

      {onQuickPartySizeChange && (
        <Field.Root>
          <Field.Label>
            {t("calendar.field.partySize", "Party Size (Guests)")}
          </Field.Label>
          <TextInput
            type="number"
            value={String(quickPartySize || 1)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onQuickPartySizeChange(
                Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1)
              )
            }
          />
        </Field.Root>
      )}
    </>
  );
};

export const QuickCreateRecurrenceSelect: React.FC<{
  t: TranslateFn;
  supportsRecurrence: boolean;
  quickRRule: string;
  normalizedPresets: RecurrencePreset[];
  hasCustomWeeklyOption: boolean;
  customWeeklyLabel: string;
  onRecurrenceSelect: (val: string | number) => void;
}> = ({
  t,
  supportsRecurrence,
  quickRRule,
  normalizedPresets,
  hasCustomWeeklyOption,
  customWeeklyLabel,
  onRecurrenceSelect,
}) => {
  if (!supportsRecurrence) return null;
  return (
    <Field.Root>
      <Field.Label>
        {t("calendar.field.recurrence", "Recurrence Preset")}
      </Field.Label>
      <SingleSelect
        placeholder={t(
          "placeholder.select_recurrence_preset",
          "Select recurrence preset"
        )}
        value={quickRRule || "NONE"}
        onChange={onRecurrenceSelect}
      >
        <SingleSelectOption value="NONE">
          {t("calendar.singleEntry", "Single Entry")}
        </SingleSelectOption>
        {normalizedPresets.map((preset) => (
          <SingleSelectOption key={preset.id} value={preset.rrule}>
            {preset.label}
          </SingleSelectOption>
        ))}
        {hasCustomWeeklyOption && (
          <SingleSelectOption value={quickRRule}>
            {customWeeklyLabel}
          </SingleSelectOption>
        )}
      </SingleSelect>
    </Field.Root>
  );
};

export const QuickCreateDateFields: React.FC<{
  t: TranslateFn;
  startDateValue: Date | undefined;
  endDateValue: Date | undefined;
  onStartDateChange: (nextDateStr: string) => void;
  onQuickEndChange?: (end: string) => void;
}> = ({
  t,
  startDateValue,
  endDateValue,
  onStartDateChange,
  onQuickEndChange,
}) => (
  <>
    <Field.Root required>
      <Field.Label>
        {t("calendar.field.startDate", "Start Date / Time")}
      </Field.Label>
      <DateTimePicker
        value={startDateValue}
        step={15}
        clearLabel={t("common.clear", "Clear")}
        onChange={(date: Date | undefined) =>
          onStartDateChange(date ? date.toISOString() : "")
        }
        onClear={() => onStartDateChange("")}
      />
    </Field.Root>

    {onQuickEndChange && (
      <Field.Root
        hint={t(
          "placeholder.end_date_optional",
          "Defaults to +1 hour if omitted"
        )}
      >
        <Field.Label>
          {t("calendar.field.endDate", "End Date / Time (optional)")}
        </Field.Label>
        <DateTimePicker
          value={endDateValue}
          step={15}
          clearLabel={t("common.clear", "Clear")}
          onChange={(date: Date | undefined) =>
            onQuickEndChange(date ? date.toISOString() : "")
          }
          onClear={() => onQuickEndChange("")}
        />
        <Field.Hint />
      </Field.Root>
    )}
  </>
);
