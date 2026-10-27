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
import type { RecurrencePreset, RRuleWeekday } from '../../../../shared/types';

const DEFAULT_CALENDAR_RECURRENCE_PRESETS: RecurrencePreset[] = [
  { id: 'daily', label: 'Daily', rrule: 'FREQ=DAILY;INTERVAL=1' },
  { id: 'weekly-mon', label: 'Weekly on Mondays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO' },
  { id: 'weekly-tue', label: 'Weekly on Tuesdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU' },
  { id: 'weekly-wed', label: 'Weekly on Wednesdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE' },
  { id: 'weekly-thu', label: 'Weekly on Thursdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TH' },
  { id: 'weekly-fri', label: 'Weekly on Fridays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=FR' },
  { id: 'weekly-sat', label: 'Weekly on Saturdays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SA' },
  { id: 'weekly-sun', label: 'Weekly on Sundays', rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=SU' },
  { id: 'monthly', label: 'Monthly', rrule: 'FREQ=MONTHLY;INTERVAL=1' },
  { id: 'yearly', label: 'Yearly', rrule: 'FREQ=YEARLY;INTERVAL=1' },
];

const WEEKDAYS: Array<{ code: RRuleWeekday; label: string; jsDay: number }> = [
  { code: 'MO', label: 'Mon', jsDay: 1 },
  { code: 'TU', label: 'Tue', jsDay: 2 },
  { code: 'WE', label: 'Wed', jsDay: 3 },
  { code: 'TH', label: 'Thu', jsDay: 4 },
  { code: 'FR', label: 'Fri', jsDay: 5 },
  { code: 'SA', label: 'Sat', jsDay: 6 },
  { code: 'SU', label: 'Sun', jsDay: 0 },
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

export interface QuickCreatePanelProps {
  t: (id: string, defaultMessage: string) => string;
  quickTitle: string;
  onQuickTitleChange: (title: string) => void;
  quickStart: string;
  onQuickStartChange: (start: string) => void;
  quickLocation: string;
  onQuickLocationChange: (location: string) => void;
  quickRRule: string;
  onQuickRRuleChange: (rrule: string) => void;
  recurrencePresets: RecurrencePreset[];
  onCancel: () => void;
  onSubmit: () => void;
}

export const QuickCreatePanel: React.FC<QuickCreatePanelProps> = ({
  t,
  quickTitle,
  onQuickTitleChange,
  quickStart,
  onQuickStartChange,
  quickLocation,
  onQuickLocationChange,
  quickRRule,
  onQuickRRuleChange,
  recurrencePresets,
  onCancel,
  onSubmit,
}) => {
  const normalizedPresets = useMemo(() => {
    const byRRule = new Map<string, RecurrencePreset>();
    for (const def of DEFAULT_CALENDAR_RECURRENCE_PRESETS) {
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
          {t('calendar.quickCreateTitle', 'Quick-Create Calendar Entry')}
        </Typography>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          <Field.Root required>
            <Field.Label>
              {t('calendar.field.title', 'Title')}
            </Field.Label>
            <TextInput
              value={quickTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onQuickTitleChange(e.target.value)
              }
              placeholder={t(
                'placeholder.e_g_product_launch_workshop_reservation',
                'e.g., Product Launch / Workshop / Reservation'
              )}
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>
              {t('calendar.field.startDate', 'Start Date / Time')}
            </Field.Label>
            <TextInput
              placeholder={t('placeholder.yyyy_mm_dd', 'YYYY-MM-DD')}
              value={quickStart}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleStartDateChange(e.target.value)
              }
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>
              {t('calendar.field.location', 'Location')}
            </Field.Label>
            <TextInput
              value={quickLocation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onQuickLocationChange(e.target.value)
              }
              placeholder={t('placeholder.room_101_online', 'Room 101 / Online')}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>
              {t('calendar.field.recurrence', 'Recurrence Preset')}
            </Field.Label>
            <SingleSelect
              placeholder={t(
                'placeholder.select_recurrence_preset',
                'Select recurrence preset'
              )}
              value={quickRRule || 'NONE'}
              onChange={handleRecurrenceSelect}
            >
              <SingleSelectOption value="NONE">Single Entry</SingleSelectOption>
              {normalizedPresets.map((preset) => (
                <SingleSelectOption key={preset.id} value={preset.rrule}>
                  {preset.label}
                </SingleSelectOption>
              ))}
              {hasCustomWeeklyOption && (
                <SingleSelectOption value={quickRRule}>
                  {`Weekly (${selectedWeekdays.join(', ')})`}
                </SingleSelectOption>
              )}
            </SingleSelect>
          </Field.Root>
        </div>

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
                    {day.label}
                  </Button>
                );
              })}
            </Flex>
          </Box>
        )}

        <Flex gap={2} justifyContent="flex-end">
          <Button variant="tertiary" onClick={onCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="default" onClick={onSubmit}>
            {t('common.create', 'Create Entry')}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default QuickCreatePanel;
