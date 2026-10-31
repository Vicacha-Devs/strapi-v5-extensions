import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type {
  CalendarSourceMapping,
  RecurrencePreset,
  RRuleWeekday,
} from '../../../../shared/types';
import {
  alignStartDateToWeekday,
  buildOrderedRecurrencePresets,
  extractByDays,
  parseDateTimePickerValue,
  WEEKDAYS,
} from './calendarPageHelpers';
import {
  BookingVisitorFields,
  computeToggledWeekdays,
  QuickCreateDateFields,
  QuickCreateHeader,
  QuickCreateRecurrenceSelect,
  resolveActiveQuickSource,
  sourceIncludesKeyword,
} from './QuickCreateSubcomponents';

export interface QuickCreatePanelProps {
  t: (id: string, defaultMessage: string) => string;
  sources?: CalendarSourceMapping[];
  selectedSourceId?: string;
  onSelectedSourceIdChange?: (sourceId: string) => void;
  quickTitle: string;
  onQuickTitleChange: (title: string) => void;
  quickStart: string;
  onQuickStartChange: (start: string) => void;
  quickEnd?: string;
  onQuickEndChange?: (end: string) => void;
  quickLocation: string;
  onQuickLocationChange: (location: string) => void;
  quickRRule: string;
  onQuickRRuleChange: (rrule: string) => void;
  quickCustomerName?: string;
  onQuickCustomerNameChange?: (name: string) => void;
  quickCustomerEmail?: string;
  onQuickCustomerEmailChange?: (email: string) => void;
  quickPartySize?: number;
  onQuickPartySizeChange?: (size: number) => void;
  recurrencePresets: RecurrencePreset[];
  onCancel: () => void;
  onSubmit: () => void;
}

function resolveSubmitLabel(
  t: (id: string, defaultMessage: string) => string,
  isBookingSource: boolean,
  isEventSource: boolean
): string {
  if (isBookingSource) return t('calendar.createBooking', 'Create Booking');
  if (isEventSource) return t('calendar.createEvent', 'Create Event');
  return t('common.create', 'Create Entry');
}

function resolveTitleAndLocationLabels(
  t: (id: string, defaultMessage: string) => string,
  isBookingSource: boolean
) {
  return {
    titleLabel: isBookingSource
      ? t('calendar.field.bookingTitle', 'Reservation Title / Purpose')
      : t('calendar.field.title', 'Title'),
    titlePlaceholder: isBookingSource
      ? t('placeholder.booking_title', 'e.g., Guided Visit / Hall Reservation / Counseling')
      : t('placeholder.e_g_product_launch_workshop_reservation', 'e.g., Product Launch / Workshop / Reservation'),
    locationLabel: isBookingSource
      ? t('calendar.field.assignedHost', 'Assigned Host / Resource')
      : t('calendar.field.location', 'Location'),
    locationPlaceholder: isBookingSource
      ? t('placeholder.assigned_host', 'Main Hall / Imam / Coordinator')
      : t('placeholder.room_101_online', 'Room 101 / Online'),
  };
}

export const QuickCreatePanel: React.FC<QuickCreatePanelProps> = (props) => {
  const {
    t,
    sources = [],
    selectedSourceId = '',
    onSelectedSourceIdChange,
    quickTitle,
    onQuickTitleChange,
    quickStart,
    onQuickStartChange,
    quickEnd = '',
    onQuickEndChange,
    quickLocation,
    onQuickLocationChange,
    quickRRule,
    onQuickRRuleChange,
    quickCustomerName = '',
    onQuickCustomerNameChange,
    quickCustomerEmail = '',
    onQuickCustomerEmailChange,
    quickPartySize = 1,
    onQuickPartySizeChange,
    recurrencePresets,
    onCancel,
    onSubmit,
  } = props;

  const enabledSources = useMemo(
    () => sources.filter((s) => s.enabled !== false),
    [sources]
  );
  const activeSource = useMemo(
    () => resolveActiveQuickSource(enabledSources, selectedSourceId),
    [enabledSources, selectedSourceId]
  );
  const isBookingSource = useMemo(
    () => sourceIncludesKeyword(activeSource, 'booking'),
    [activeSource]
  );
  const isEventSource = useMemo(
    () => !activeSource || sourceIncludesKeyword(activeSource, 'event'),
    [activeSource]
  );
  const supportsRecurrence = useMemo(
    () => !isBookingSource || Boolean(activeSource?.fields?.rrule),
    [activeSource, isBookingSource]
  );

  const startDateValue = useMemo(() => parseDateTimePickerValue(quickStart), [quickStart]);
  const endDateValue = useMemo(() => parseDateTimePickerValue(quickEnd), [quickEnd]);
  const normalizedPresets = useMemo(
    () => buildOrderedRecurrencePresets(recurrencePresets, startDateValue),
    [recurrencePresets, startDateValue]
  );

  const isWeekly =
    supportsRecurrence && quickRRule.toUpperCase().includes('FREQ=WEEKLY');
  const selectedWeekdays = useMemo(() => extractByDays(quickRRule), [quickRRule]);
  const hasCustomWeeklyOption =
    isWeekly && !normalizedPresets.some((p) => p.rrule === quickRRule);
  const customWeeklyLabel = `${t('rrule.freq.weekly', 'Weekly')} (${selectedWeekdays.join(', ')})`;

  const alignSingleDayRRule = (days: RRuleWeekday[]) => {
    if (days.length === 1 && quickStart) {
      const aligned = alignStartDateToWeekday(quickStart, days[0]);
      if (aligned !== quickStart) onQuickStartChange(aligned);
    }
  };

  const handleRecurrenceSelect = (val: string | number) => {
    const strVal = String(val);
    const nextRRule = strVal === 'NONE' ? '' : strVal;
    onQuickRRuleChange(nextRRule);
    if (nextRRule.toUpperCase().includes('FREQ=WEEKLY')) {
      alignSingleDayRRule(extractByDays(nextRRule));
    }
  };

  const handleToggleWeekday = (code: RRuleWeekday) => {
    const nextDays = computeToggledWeekdays(selectedWeekdays, code);
    onQuickRRuleChange(`FREQ=WEEKLY;INTERVAL=1;BYDAY=${nextDays.join(',')}`);
    alignSingleDayRRule(nextDays);
  };

  const handleStartDateChange = (nextDateStr: string) => {
    onQuickStartChange(nextDateStr);
    if (!isWeekly || selectedWeekdays.length !== 1 || !nextDateStr) return;
    const dt = parseDateTimePickerValue(nextDateStr);
    const match = dt ? WEEKDAYS.find((w) => w.jsDay === dt.getDay()) : undefined;
    if (match && match.code !== selectedWeekdays[0]) {
      onQuickRRuleChange(`FREQ=WEEKLY;INTERVAL=1;BYDAY=${match.code}`);
    }
  };

  const labels = resolveTitleAndLocationLabels(t, isBookingSource);
  const submitLabel = resolveSubmitLabel(t, isBookingSource, isEventSource);
  const canSubmit = Boolean(quickTitle.trim() && quickStart.trim());
  const borderColor = activeSource?.color || '#0284C7';

  return (
    <Box
      padding={4}
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <Flex direction="column" alignItems="stretch" gap={3}>
        <QuickCreateHeader
          t={t}
          isBookingSource={isBookingSource}
          isEventSource={isEventSource}
          activeSource={activeSource}
          enabledSources={enabledSources}
          onSelectedSourceIdChange={onSelectedSourceIdChange}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          {enabledSources.length > 1 && onSelectedSourceIdChange && (
            <Field.Root>
              <Field.Label>
                {t('calendar.field.sourceType', 'Entry Collection / Type')}
              </Field.Label>
              <SingleSelect
                value={activeSource?.id || ''}
                onChange={(val: string | number) =>
                  onSelectedSourceIdChange(String(val))
                }
              >
                {enabledSources.map((src) => (
                  <SingleSelectOption key={src.id} value={src.id}>
                    {`${src.label} (${src.uid})`}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>
          )}

          <Field.Root required>
            <Field.Label>{labels.titleLabel}</Field.Label>
            <TextInput
              value={quickTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onQuickTitleChange(e.target.value)
              }
              placeholder={labels.titlePlaceholder}
            />
          </Field.Root>

          <QuickCreateDateFields
            t={t}
            startDateValue={startDateValue}
            endDateValue={endDateValue}
            onStartDateChange={handleStartDateChange}
            onQuickEndChange={onQuickEndChange}
          />

          <Field.Root>
            <Field.Label>{labels.locationLabel}</Field.Label>
            <TextInput
              value={quickLocation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onQuickLocationChange(e.target.value)
              }
              placeholder={labels.locationPlaceholder}
            />
          </Field.Root>

          <BookingVisitorFields
            t={t}
            isBookingSource={isBookingSource}
            quickCustomerName={quickCustomerName}
            onQuickCustomerNameChange={onQuickCustomerNameChange}
            quickCustomerEmail={quickCustomerEmail}
            onQuickCustomerEmailChange={onQuickCustomerEmailChange}
            quickPartySize={quickPartySize}
            onQuickPartySizeChange={onQuickPartySizeChange}
          />

          <QuickCreateRecurrenceSelect
            t={t}
            supportsRecurrence={supportsRecurrence}
            quickRRule={quickRRule}
            normalizedPresets={normalizedPresets}
            hasCustomWeeklyOption={hasCustomWeeklyOption}
            customWeeklyLabel={customWeeklyLabel}
            onRecurrenceSelect={handleRecurrenceSelect}
          />
        </div>

        {isWeekly && (
          <Box padding={3} background="neutral100" hasRadius>
            <Flex alignItems="center" gap={2} wrap="wrap">
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {t('calendar.field.repeatWeekdays', 'Repeat on Day(s) of Week:')}
              </Typography>
              {WEEKDAYS.map((day) => (
                <Button
                  key={day.code}
                  size="S"
                  variant={selectedWeekdays.includes(day.code) ? 'default' : 'tertiary'}
                  onClick={() => handleToggleWeekday(day.code)}
                >
                  {day.label}
                </Button>
              ))}
            </Flex>
          </Box>
        )}

        <Flex gap={2} justifyContent="flex-end">
          <Button variant="tertiary" onClick={onCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="default" onClick={onSubmit} disabled={!canSubmit}>
            {submitLabel}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default QuickCreatePanel;
