import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { RecurrencePreset, RRuleWeekday } from '../../../../shared/types';
import { DEFAULT_RECURRENCE_PRESETS } from './calendarPageHelpers';

const WEEKDAYS: Array<{ code: RRuleWeekday; labelKey: string; defaultLabel: string; jsDay: number }> = [
  { code: 'MO', labelKey: 'rrule.weekday.mo', defaultLabel: 'Mon', jsDay: 1 },
  { code: 'TU', labelKey: 'rrule.weekday.tu', defaultLabel: 'Tue', jsDay: 2 },
  { code: 'WE', labelKey: 'rrule.weekday.we', defaultLabel: 'Wed', jsDay: 3 },
  { code: 'TH', labelKey: 'rrule.weekday.th', defaultLabel: 'Thu', jsDay: 4 },
  { code: 'FR', labelKey: 'rrule.weekday.fr', defaultLabel: 'Fri', jsDay: 5 },
  { code: 'SA', labelKey: 'rrule.weekday.sa', defaultLabel: 'Sat', jsDay: 6 },
  { code: 'SU', labelKey: 'rrule.weekday.su', defaultLabel: 'Sun', jsDay: 0 },
];

function extractByDays(rrule: string): RRuleWeekday[] {
  const match = rrule.match(/BYDAY=([A-Z,]+)/i);
  if (!match?.[1]) return [];
  const validCodes = new Set<RRuleWeekday>(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);
  return match[1]
    .toUpperCase()
    .split(',')
    .map((d) => d.trim() as RRuleWeekday)
    .filter((d) => validCodes.has(d));
}

function alignStartDateToWeekday(startStr: string, targetCode: RRuleWeekday): string {
  if (!startStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr)) return startStr;
  const target = WEEKDAYS.find((w) => w.code === targetCode);
  if (!target) return startStr;
  const dt = new Date(`${startStr}T00:00:00.000Z`);
  if (Number.isNaN(dt.getTime())) return startStr;
  const currentDay = dt.getUTCDay();
  const diff = (target.jsDay - currentDay + 7) % 7;
  if (diff === 0) return startStr;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

export interface QuickCreateEventPanelProps {
  t: (id: string, defaultMessage: string) => string;
  quickTitle: string;
  onQuickTitleChange: (val: string) => void;
  quickStart: string;
  onQuickStartChange: (val: string) => void;
  quickLocation: string;
  onQuickLocationChange: (val: string) => void;
  quickRRule: string;
  onQuickRRuleChange: (val: string) => void;
  quickRsvpEnabled: boolean;
  onQuickRsvpEnabledChange: (val: boolean) => void;
  quickCapacity: number;
  onQuickCapacityChange: (val: number) => void;
  recurrencePresets: RecurrencePreset[];
  onCancel: () => void;
  onSubmit: () => void;
}

export const QuickCreateEventPanel: React.FC<QuickCreateEventPanelProps> = ({
  t,
  quickTitle,
  onQuickTitleChange,
  quickStart,
  onQuickStartChange,
  quickLocation,
  onQuickLocationChange,
  quickRRule,
  onQuickRRuleChange,
  quickRsvpEnabled,
  onQuickRsvpEnabledChange,
  quickCapacity,
  onQuickCapacityChange,
  recurrencePresets,
  onCancel,
  onSubmit,
}) => {
  const normalizedPresets = useMemo(() => {
    const byRRule = new Map<string, RecurrencePreset>();
    for (const def of DEFAULT_RECURRENCE_PRESETS) {
      byRRule.set(def.rrule, def);
    }
    for (const p of recurrencePresets) {
      if (p?.rrule) {
        byRRule.set(p.rrule, p);
      }
    }
    return Array.from(byRRule.values());
  }, [recurrencePresets]);

  const isWeekly = quickRRule.toUpperCase().includes('FREQ=WEEKLY');
  const selectedWeekdays = useMemo(() => extractByDays(quickRRule), [quickRRule]);
  const hasCustomWeeklyOption =
    isWeekly &&
    Boolean(quickRRule) &&
    !normalizedPresets.some((p) => p.rrule === quickRRule);

  const handleRecurrenceSelect = (val: string) => {
    const nextRRule = val === 'NONE' ? '' : val;
    onQuickRRuleChange(nextRRule);
    if (nextRRule.toUpperCase().includes('FREQ=WEEKLY')) {
      const days = extractByDays(nextRRule);
      if (days.length === 1 && quickStart) {
        const aligned = alignStartDateToWeekday(quickStart, days[0]);
        if (aligned !== quickStart) {
          onQuickStartChange(aligned);
        }
      }
    }
  };

  const handleToggleWeekday = (code: RRuleWeekday) => {
    const exists = selectedWeekdays.includes(code);
    let nextDays: RRuleWeekday[];
    if (exists) {
      nextDays = selectedWeekdays.length > 1 ? selectedWeekdays.filter((d) => d !== code) : [code];
    } else {
      nextDays = WEEKDAYS.map((w) => w.code).filter(
        (c) => c === code || selectedWeekdays.includes(c)
      );
    }
    const nextRRule = `FREQ=WEEKLY;INTERVAL=1;BYDAY=${nextDays.join(',')}`;
    onQuickRRuleChange(nextRRule);
    if (nextDays.length === 1 && quickStart) {
      const aligned = alignStartDateToWeekday(quickStart, nextDays[0]);
      if (aligned !== quickStart) {
        onQuickStartChange(aligned);
      }
    }
  };

  const handleStartDateChange = (nextDateStr: string) => {
    onQuickStartChange(nextDateStr);
    if (
      isWeekly &&
      selectedWeekdays.length === 1 &&
      /^\d{4}-\d{2}-\d{2}$/.test(nextDateStr)
    ) {
      const dt = new Date(`${nextDateStr}T00:00:00.000Z`);
      if (!Number.isNaN(dt.getTime())) {
        const match = WEEKDAYS.find((w) => w.jsDay === dt.getUTCDay());
        if (match && match.code !== selectedWeekdays[0]) {
          onQuickRRuleChange(`FREQ=WEEKLY;INTERVAL=1;BYDAY=${match.code}`);
        }
      }
    }
  };

  return (
    <Box padding={4} background="neutral0" hasRadius shadow="tableShadow">
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="delta" fontWeight="bold">
          {t('calendar.quickCreateTitle', 'Quick-Create Event')}
        </Typography>
        <Flex gap={3} wrap="wrap">
          <Box style={{ flex: 2, minWidth: 220 }}>
            <Field.Root required>
              <Field.Label>
                {t('calendar.field.title', 'Event Title')}
              </Field.Label>
              <TextInput
                value={quickTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onQuickTitleChange(e.target.value)
                }
                placeholder={t(
                  'placeholder.e_g_product_launch_webinar_weekly_workshop',
                  'e.g., Product Launch Webinar / Weekly Workshop'
                )}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Field.Root required>
              <Field.Label>
                {t('calendar.field.startDate', 'Start Date')}
              </Field.Label>
              <TextInput
                type="date"
                placeholder={t('placeholder.yyyy_mm_dd', 'YYYY-MM-DD')}
                value={quickStart}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleStartDateChange(e.target.value)
                }
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Field.Root>
              <Field.Label>
                {t('calendar.field.location', 'Location')}
              </Field.Label>
              <TextInput
                value={quickLocation}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onQuickLocationChange(e.target.value)
                }
                placeholder={t('placeholder.main_auditorium_online', 'Main Auditorium / Online')}
              />
            </Field.Root>
          </Box>
          <Box style={{ flex: 1, minWidth: 210 }}>
            <Field.Root>
              <Field.Label>
                {t('calendar.field.recurrence', 'Recurrence Preset')}
              </Field.Label>
              <SingleSelect
                placeholder={t('placeholder.select_recurrence_preset', 'Select recurrence preset')}
                value={quickRRule || 'NONE'}
                onChange={handleRecurrenceSelect}
              >
                <SingleSelectOption value="NONE">
                  {t('rrule.freq.none', 'Does not repeat (Single Event)')}
                </SingleSelectOption>
                {normalizedPresets.map((preset) => (
                  <SingleSelectOption key={preset.id} value={preset.rrule}>
                    {preset.label}
                  </SingleSelectOption>
                ))}
                {hasCustomWeeklyOption && (
                  <SingleSelectOption value={quickRRule}>
                    {`${t('rrule.freq.weekly', 'Weekly')} (${selectedWeekdays.join(', ')})`}
                  </SingleSelectOption>
                )}
              </SingleSelect>
            </Field.Root>
          </Box>
        </Flex>

        {isWeekly && (
          <Box padding={3} background="neutral100" hasRadius>
            <Flex alignItems="center" gap={2} wrap="wrap">
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {t('calendar.field.repeatWeekdays', 'Repeat on Day(s) of Week:')}
              </Typography>
              {WEEKDAYS.map((day) => {
                const active = selectedWeekdays.includes(day.code);
                return (
                  <Button
                    key={day.code}
                    size="S"
                    variant={active ? 'default' : 'tertiary'}
                    onClick={() => handleToggleWeekday(day.code)}
                  >
                    {t(day.labelKey, day.defaultLabel)}
                  </Button>
                );
              })}
            </Flex>
          </Box>
        )}

        <Flex gap={4} alignItems="flex-end" wrap="wrap">
          <Box style={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={quickRsvpEnabled}
              onCheckedChange={(checked: boolean) => onQuickRsvpEnabledChange(Boolean(checked))}
            >
              {t('calendar.field.enableRsvp', 'Enable RSVP & Seat Capacity')}
            </Checkbox>
          </Box>
          {quickRsvpEnabled && (
            <Box style={{ width: 180 }}>
              <Field.Root>
                <Field.Label>
                  {t('calendar.field.capacity', 'Max Capacity (Seats)')}
                </Field.Label>
                <NumberInput
                  placeholder={t('placeholder.50', '50')}
                  value={quickCapacity}
                  onValueChange={(val: number | undefined) =>
                    onQuickCapacityChange(val && val >= 1 ? val : 50)
                  }
                />
              </Field.Root>
            </Box>
          )}
          <Flex gap={2} alignItems="center" style={{ marginLeft: 'auto', minHeight: 40 }}>
            <Button variant="tertiary" onClick={onCancel}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="default" onClick={onSubmit}>
              {t('common.create', 'Create Event')}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};
