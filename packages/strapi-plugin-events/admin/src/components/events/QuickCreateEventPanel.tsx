import React from 'react';
import {
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
import type { RecurrencePreset } from '../../../../shared/types';

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
  return (
    <Box padding={4} background="neutral0" hasRadius shadow="tableShadow">
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="delta" fontWeight="bold">
          {t('calendar.quickCreateTitle', 'Quick-Create Event')}
        </Typography>
        <Flex gap={3} wrap="wrap">
          <Box style={{ flex: 2, minWidth: 220 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('calendar.field.title', 'Event Title')}
            </Typography>
            <TextInput
              value={quickTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onQuickTitleChange(e.target.value)
              }
              placeholder="e.g., Product Launch Webinar / Weekly Workshop"
            />
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('calendar.field.startDate', 'Start Date')}
            </Typography>
            <TextInput
              type="date"
              value={quickStart}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onQuickStartChange(e.target.value)
              }
            />
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('calendar.field.location', 'Location')}
            </Typography>
            <TextInput
              value={quickLocation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onQuickLocationChange(e.target.value)
              }
              placeholder="Main Auditorium / Online"
            />
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('calendar.field.recurrence', 'Recurrence Preset')}
            </Typography>
            <SingleSelect
              value={quickRRule || 'NONE'}
              onChange={(val: string) => onQuickRRuleChange(val === 'NONE' ? '' : val)}
            >
              <SingleSelectOption value="NONE">Single Event</SingleSelectOption>
              {recurrencePresets.map((preset) => (
                <SingleSelectOption key={preset.id} value={preset.rrule}>
                  {preset.label}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Box>
        </Flex>

        <Flex gap={3} alignItems="center" wrap="wrap">
          <Checkbox
            checked={quickRsvpEnabled}
            onCheckedChange={(checked: boolean) => onQuickRsvpEnabledChange(Boolean(checked))}
          >
            {t('calendar.field.enableRsvp', 'Enable RSVP & Seat Capacity')}
          </Checkbox>
          {quickRsvpEnabled && (
            <Box style={{ width: 140 }}>
              <NumberInput
                value={quickCapacity}
                onValueChange={(val: number | undefined) =>
                  onQuickCapacityChange(val && val >= 1 ? val : 50)
                }
              />
            </Box>
          )}
          <Flex gap={2} style={{ marginLeft: 'auto' }}>
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
