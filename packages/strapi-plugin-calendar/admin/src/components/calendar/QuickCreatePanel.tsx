import React from 'react';
import {
  Box,
  Button,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type { RecurrencePreset } from '../../../../shared/types';

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
  return (
    <Box padding={4} background="neutral0" hasRadius shadow="tableShadow">
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="delta" fontWeight="bold">
          {t('calendar.quickCreateTitle', 'Quick-Create Calendar Entry')}
        </Typography>
        <Flex gap={3} wrap="wrap">
          <Box style={{ flex: 2, minWidth: 220 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('calendar.field.title', 'Title')}
            </Typography>
            <TextInput
              value={quickTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onQuickTitleChange(e.target.value)
              }
              placeholder="e.g., Product Launch / Workshop / Reservation"
            />
          </Box>
          <Box style={{ flex: 1, minWidth: 180 }}>
            <Typography variant="pi" fontWeight="bold">
              {t('calendar.field.startDate', 'Start Date / Time')}
            </Typography>
            <TextInput
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
              placeholder="Room 101 / Online"
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
              <SingleSelectOption value="NONE">Single Entry</SingleSelectOption>
              {recurrencePresets.map((preset) => (
                <SingleSelectOption key={preset.id} value={preset.rrule}>
                  {preset.label}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Box>
        </Flex>

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
