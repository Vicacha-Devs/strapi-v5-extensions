import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { SUPPORTED_INTL_CALENDARS } from '../../../../shared/calendarSystems';
import type { CalendarSystemConfig } from '../../../../shared/types';

export interface SecondaryCalendarsSectionProps {
  t: (id: string, defaultMessage: string) => string;
  secondaryCalendars: CalendarSystemConfig[];
  onAddOrUpdateCalendar: (calendar: CalendarSystemConfig) => void;
  onToggleCalendarEnabled: (calId: string, enabled: boolean) => void;
  onRemoveCalendar: (calId: string) => void;
}

export const SecondaryCalendarsSection: React.FC<SecondaryCalendarsSectionProps> = ({
  t,
  secondaryCalendars,
  onAddOrUpdateCalendar,
  onToggleCalendarEnabled,
  onRemoveCalendar,
}) => {
  const [newCalPreset, setNewCalPreset] = useState<string>('islamic-umalqura');
  const [newCalId, setNewCalId] = useState<string>('hijri');
  const [newCalLabel, setNewCalLabel] = useState<string>('Hijri (Umm al-Qura)');
  const [newCalOverrideField, setNewCalOverrideField] = useState<string>('hijriDate');
  const [newCalDayOffset, setNewCalDayOffset] = useState<number>(0);

  const handleAddCalendarSystem = () => {
    if (!newCalId.trim() || !newCalPreset) return;
    const cleanId = newCalId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!cleanId) return;

    const nextEntry: CalendarSystemConfig = {
      id: cleanId,
      label: newCalLabel.trim() || cleanId,
      intlCalendar: newCalPreset,
      dayOffset: newCalDayOffset || 0,
      overrideField: newCalOverrideField.trim() || undefined,
      enabled: true,
    };

    onAddOrUpdateCalendar(nextEntry);
  };

  return (
    <Box padding={5} background="neutral0" hasRadius shadow="tableShadow">
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Box>
          <Typography variant="delta" fontWeight="bold">
            {t(
              'settings.section.secondaryCalendars',
              'Secondary & Alternative Calendar Systems (Intl / Custom)'
            )}
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.secondaryCalendarsHint',
                'Add Unicode CLDR calendar systems (e.g. Hijri, Hebrew, Persian, Buddhist, Chinese) or custom formatters with optional day-offset adjustments and document field overrides.'
              )}
            </Typography>
          </Box>
        </Box>

        {secondaryCalendars.map((cal) => (
          <Box key={cal.id} padding={3} background="neutral100" hasRadius>
            <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
              <Flex gap={2} alignItems="center" wrap="wrap">
                <Typography variant="omega" fontWeight="bold">
                  {cal.label}
                </Typography>
                <Badge backgroundColor="secondary100" textColor="secondary700">
                  {cal.intlCalendar}
                </Badge>
                {cal.overrideField && (
                  <Badge backgroundColor="neutral200" textColor="neutral800">
                    overrideField: {cal.overrideField}
                  </Badge>
                )}
                {typeof cal.dayOffset === 'number' && cal.dayOffset !== 0 && (
                  <Badge backgroundColor="warning100" textColor="warning700">
                    offset: {cal.dayOffset > 0 ? `+${cal.dayOffset}` : cal.dayOffset}d
                  </Badge>
                )}
              </Flex>

              <Flex gap={3} alignItems="center">
                <Checkbox
                  checked={cal.enabled}
                  onCheckedChange={(checked: boolean) =>
                    onToggleCalendarEnabled(cal.id, Boolean(checked))
                  }
                >
                  {t('settings.calendarEnabled', 'Enabled')}
                </Checkbox>
                <Button
                  variant="danger-light"
                  size="S"
                  onClick={() => onRemoveCalendar(cal.id)}
                >
                  {t('common.remove', 'Remove')}
                </Button>
              </Flex>
            </Flex>
          </Box>
        ))}

        <Box padding={3} background="neutral100" hasRadius>
          <Flex gap={3} wrap="wrap" alignItems="flex-end">
            <Box style={{ flex: 1, minWidth: 180 }}>
              <Typography variant="pi" fontWeight="bold">
                {t('settings.calendarPreset', 'Calendar System (CLDR)')}
              </Typography>
              <SingleSelect
                value={newCalPreset}
                onChange={(val: string) => {
                  setNewCalPreset(val);
                  const match = SUPPORTED_INTL_CALENDARS.find(
                    (c) => c.intlCalendar === val
                  );
                  if (match) {
                    setNewCalId(match.id.split('-')[0]);
                    setNewCalLabel(match.defaultLabel);
                  }
                }}
              >
                {SUPPORTED_INTL_CALENDARS.filter((c) => c.id !== 'gregory').map((cal) => (
                  <SingleSelectOption key={cal.id} value={cal.intlCalendar}>
                    {cal.defaultLabel} ({cal.intlCalendar})
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>

            <Box style={{ width: 130 }}>
              <Typography variant="pi" fontWeight="bold">
                {t('settings.calendarId', 'ID Key')}
              </Typography>
              <TextInput
                value={newCalId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewCalId(e.target.value)
                }
                placeholder="hijri"
              />
            </Box>

            <Box style={{ flex: 1, minWidth: 180 }}>
              <Typography variant="pi" fontWeight="bold">
                {t('settings.calendarLabel', 'Display Label')}
              </Typography>
              <TextInput
                value={newCalLabel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewCalLabel(e.target.value)
                }
                placeholder="Hijri (Umm al-Qura)"
              />
            </Box>

            <Box style={{ width: 160 }}>
              <Typography variant="pi" fontWeight="bold">
                {t('settings.overrideField', 'Override Field (Optional)')}
              </Typography>
              <TextInput
                value={newCalOverrideField}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewCalOverrideField(e.target.value)
                }
                placeholder="hijriDate"
              />
            </Box>

            <Box style={{ width: 120 }}>
              <Typography variant="pi" fontWeight="bold">
                {t('settings.dayOffset', 'Day Offset')}
              </Typography>
              <NumberInput
                value={newCalDayOffset}
                onValueChange={(val: number | undefined) =>
                  setNewCalDayOffset(typeof val === 'number' ? val : 0)
                }
              />
            </Box>

            <Button variant="secondary" onClick={handleAddCalendarSystem}>
              + {t('settings.addCalendar', 'Add Calendar System')}
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

export default SecondaryCalendarsSection;
