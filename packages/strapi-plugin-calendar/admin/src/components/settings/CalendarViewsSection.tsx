import React from 'react';
import {
  Box,
  Checkbox,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { SUPPORTED_CALENDAR_LOCALES } from '../../../../shared/localization';
import type {
  CalendarDirectionSetting,
  CalendarPluginSettings,
  CalendarViewMode,
  WeekNumberCalculationMode,
} from '../../../../shared/types';

export interface CalendarViewsSectionProps {
  t: (id: string, defaultMessage: string) => string;
  settings: CalendarPluginSettings;
  onPatchSettings: (patch: Partial<CalendarPluginSettings>) => void;
}

export const CalendarViewsSection: React.FC<CalendarViewsSectionProps> = ({
  t,
  settings,
  onPatchSettings,
}) => {
  return (
    <Box padding={5} background="neutral0" hasRadius shadow="tableShadow">
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" fontWeight="bold">
          {t(
            'settings.section.general',
            'Calendar Views, Localization, TimeGrid & Schedule Settings'
          )}
        </Typography>

        <Flex gap={4} wrap="wrap">
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('settings.defaultLocale', 'Default Calendar Locale')}
            </Typography>
            <SingleSelect
              value={settings.defaultLocale || 'auto'}
              onChange={(val: string) =>
                onPatchSettings({ defaultLocale: val })
              }
            >
              <SingleSelectOption value="auto">
                Auto (Match Strapi Admin Locale)
              </SingleSelectOption>
              {SUPPORTED_CALENDAR_LOCALES.map((loc) => (
                <SingleSelectOption key={loc.code} value={loc.code}>
                  {loc.nativeName} — {loc.label} ({loc.code.toUpperCase()})
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Box>

          <Box style={{ width: 170 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('settings.direction', 'Layout Direction')}
            </Typography>
            <SingleSelect
              value={settings.direction || 'auto'}
              onChange={(val: string) =>
                onPatchSettings({ direction: val as CalendarDirectionSetting })
              }
            >
              <SingleSelectOption value="auto">
                Auto (LTR / RTL by Locale)
              </SingleSelectOption>
              <SingleSelectOption value="ltr">
                Left-to-Right (LTR)
              </SingleSelectOption>
              <SingleSelectOption value="rtl">
                Right-to-Left (RTL)
              </SingleSelectOption>
            </SingleSelect>
          </Box>

          <Box style={{ flex: 1, minWidth: 180 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('settings.defaultTimezone', 'Default Timezone (IANA)')}
            </Typography>
            <TextInput
              value={settings.defaultTimezone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onPatchSettings({ defaultTimezone: e.target.value })
              }
            />
          </Box>

          <Box style={{ flex: 1, minWidth: 180 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('settings.defaultView', 'Default View')}
            </Typography>
            <SingleSelect
              value={settings.defaultView}
              onChange={(val: string) =>
                onPatchSettings({ defaultView: val as CalendarViewMode })
              }
            >
              <SingleSelectOption value="dayGridMonth">Month</SingleSelectOption>
              <SingleSelectOption value="timeGridWeek">Week (TimeGrid)</SingleSelectOption>
              <SingleSelectOption value="timeGridDay">Day (TimeGrid)</SingleSelectOption>
              <SingleSelectOption value="listMonth">Agenda List</SingleSelectOption>
              <SingleSelectOption value="multiMonthYear">Full Year</SingleSelectOption>
            </SingleSelect>
          </Box>

          <Box style={{ width: 155 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('settings.firstDayOfWeek', 'First Day of Week')}
            </Typography>
            <SingleSelect
              value={String(settings.firstDayOfWeek ?? 1)}
              onChange={(val: string) =>
                onPatchSettings({ firstDayOfWeek: Number.parseInt(val, 10) })
              }
            >
              <SingleSelectOption value="0">Sunday (0)</SingleSelectOption>
              <SingleSelectOption value="1">Monday (1)</SingleSelectOption>
              <SingleSelectOption value="6">Saturday (6)</SingleSelectOption>
            </SingleSelect>
          </Box>

          <Box style={{ width: 165 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('settings.weekNumberCalculation', 'Week Calculation')}
            </Typography>
            <SingleSelect
              value={settings.weekNumberCalculation || 'ISO'}
              onChange={(val: string) =>
                onPatchSettings({
                  weekNumberCalculation: val as WeekNumberCalculationMode,
                })
              }
            >
              <SingleSelectOption value="ISO">ISO 8601 (Monday)</SingleSelectOption>
              <SingleSelectOption value="local">Locale Default</SingleSelectOption>
            </SingleSelect>
          </Box>

          <Box style={{ width: 140 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('settings.startHour', 'Start Hour')}
            </Typography>
            <TextInput
              value={settings.startHour}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onPatchSettings({ startHour: e.target.value })
              }
            />
          </Box>

          <Box style={{ width: 140 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('settings.endHour', 'End Hour')}
            </Typography>
            <TextInput
              value={settings.endHour}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onPatchSettings({ endHour: e.target.value })
              }
            />
          </Box>

          <Box style={{ flex: 1, minWidth: 200 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('settings.feedTitle', 'Public iCal (.ics) Feed Title')}
            </Typography>
            <TextInput
              value={settings.feedTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onPatchSettings({ feedTitle: e.target.value })
              }
            />
          </Box>
        </Flex>

        <Flex gap={4} wrap="wrap">
          <Checkbox
            checked={settings.monthView}
            onCheckedChange={(c: boolean) => onPatchSettings({ monthView: Boolean(c) })}
          >
            {t('view.month', 'Month View')}
          </Checkbox>
          <Checkbox
            checked={settings.weekView}
            onCheckedChange={(c: boolean) => onPatchSettings({ weekView: Boolean(c) })}
          >
            {t('view.week', 'Week View')}
          </Checkbox>
          <Checkbox
            checked={settings.dayView}
            onCheckedChange={(c: boolean) => onPatchSettings({ dayView: Boolean(c) })}
          >
            {t('view.day', 'Day View')}
          </Checkbox>
          <Checkbox
            checked={settings.agendaView}
            onCheckedChange={(c: boolean) => onPatchSettings({ agendaView: Boolean(c) })}
          >
            {t('view.agenda', 'Agenda View')}
          </Checkbox>
          <Checkbox
            checked={settings.yearView}
            onCheckedChange={(c: boolean) => onPatchSettings({ yearView: Boolean(c) })}
          >
            {t('view.year', 'Year View')}
          </Checkbox>
          <Checkbox
            checked={settings.showWeekends}
            onCheckedChange={(c: boolean) =>
              onPatchSettings({ showWeekends: Boolean(c) })
            }
          >
            {t('settings.showWeekends', 'Show Weekends')}
          </Checkbox>
          <Checkbox
            checked={Boolean(settings.weekNumbers)}
            onCheckedChange={(c: boolean) =>
              onPatchSettings({ weekNumbers: Boolean(c) })
            }
          >
            {t('settings.weekNumbers', 'Show Week Numbers')}
          </Checkbox>
          <Checkbox
            checked={settings.timeFormat24h !== false}
            onCheckedChange={(c: boolean) =>
              onPatchSettings({ timeFormat24h: Boolean(c) })
            }
          >
            {t('settings.timeFormat24h', '24-Hour Time Format')}
          </Checkbox>
          <Checkbox
            checked={settings.showCreateButton}
            onCheckedChange={(c: boolean) =>
              onPatchSettings({ showCreateButton: Boolean(c) })
            }
          >
            {t('settings.showCreateButton', 'Enable Quick-Create & Slot Selection')}
          </Checkbox>
        </Flex>
      </Flex>
    </Box>
  );
};

export default CalendarViewsSection;
