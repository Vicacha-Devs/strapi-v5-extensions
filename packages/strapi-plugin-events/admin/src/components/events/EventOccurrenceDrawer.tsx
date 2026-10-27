import React from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { describeRRule } from '../../../../shared/rruleEngine';
import type { ExpandedOccurrence } from '../../../../shared/types';

export interface EventOccurrenceDrawerProps {
  t: (id: string, defaultMessage: string) => string;
  occurrence: ExpandedOccurrence;
  rescheduleDate: string;
  onRescheduleDateChange: (val: string) => void;
  applyToSeries: boolean;
  onApplyToSeriesChange: (val: boolean) => void;
  onRescheduleSave: (cancelOccurrence: boolean) => void;
  onClose: () => void;
}

export const EventOccurrenceDrawer: React.FC<EventOccurrenceDrawerProps> = ({
  t,
  occurrence,
  rescheduleDate,
  onRescheduleDateChange,
  applyToSeries,
  onApplyToSeriesChange,
  onRescheduleSave,
  onClose,
}) => {
  return (
    <Box
      padding={4}
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      style={{ borderLeft: `4px solid ${occurrence.color}` }}
    >
      <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap" gap={4}>
        <Box style={{ flex: 2, minWidth: 260 }}>
          <Flex gap={2} alignItems="center" wrap="wrap">
            <Badge backgroundColor="neutral150" textColor="neutral800">
              {occurrence.sourceLabel}
            </Badge>
            {occurrence.category && (
              <Badge backgroundColor="primary100" textColor="primary700">
                {occurrence.category}
              </Badge>
            )}
            {occurrence.isRecurring && (
              <Badge backgroundColor="secondary100" textColor="secondary700">
                {describeRRule(occurrence.rrule)}
              </Badge>
            )}
            {occurrence.alternateDates &&
              Object.values(occurrence.alternateDates).map((alt) => (
                <Badge
                  key={alt.calendarId}
                  backgroundColor="warning100"
                  textColor="warning700"
                >
                  {alt.label}: {alt.formatted}
                </Badge>
              ))}
          </Flex>

          <Box paddingTop={2}>
            <Typography variant="delta" fontWeight="bold">
              {occurrence.title}
            </Typography>
          </Box>
          <Box paddingTop={1}>
            <Typography variant="omega" textColor="neutral600">
              {occurrence.occurrenceDate}
              {occurrence.location ? ` • ${occurrence.location}` : ''}
            </Typography>
          </Box>
          {occurrence.customFields &&
            Object.keys(occurrence.customFields).length > 0 && (
              <Box paddingTop={2}>
                <Flex gap={2} wrap="wrap">
                  {Object.entries(occurrence.customFields).map(([k, v]) =>
                    v !== null && v !== undefined && String(v).trim() !== '' ? (
                      <Badge key={k} backgroundColor="neutral100" textColor="neutral700">
                        {k}: {String(v)}
                      </Badge>
                    ) : null
                  )}
                </Flex>
              </Box>
            )}
          {occurrence.rsvp && (
            <Box paddingTop={2}>
              <Typography variant="pi" fontWeight="bold">
                RSVP: {occurrence.rsvp.confirmedSeats}
                {occurrence.rsvp.capacity ? ` / ${occurrence.rsvp.capacity}` : ''} confirmed •{' '}
                {occurrence.rsvp.waitlistedSeats} waitlisted • {occurrence.rsvp.checkedInSeats}{' '}
                checked in
              </Typography>
            </Box>
          )}
        </Box>

        <Flex direction="column" gap={2} style={{ minWidth: 260 }}>
          <Flex gap={2} alignItems="flex-end">
            <Box style={{ flex: 1 }}>
              <Field.Root>
                <Field.Label>
                  {t('calendar.rescheduleTo', 'Reschedule Date')}
                </Field.Label>
                <TextInput
                  type="date"
                  placeholder={t('placeholder.yyyy_mm_dd', 'YYYY-MM-DD')}
                  value={rescheduleDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onRescheduleDateChange(e.target.value)
                  }
                />
              </Field.Root>
            </Box>
            <Button size="S" variant="secondary" onClick={() => onRescheduleSave(false)}>
              {t('common.save', 'Save')}
            </Button>
          </Flex>

          {occurrence.isRecurring && (
            <Checkbox
              checked={applyToSeries}
              onCheckedChange={(checked: boolean) => onApplyToSeriesChange(Boolean(checked))}
            >
              {t('calendar.applyToSeries', 'Apply to entire recurring series')}
            </Checkbox>
          )}

          <Flex gap={2} wrap="wrap" paddingTop={1}>
            <Button
              size="S"
              variant="tertiary"
              tag="a"
              href={`/admin/content-manager/collection-types/${occurrence.uid}/${occurrence.documentId}`}
            >
              {t('calendar.editInContentManager', 'Open in Content Manager')}
            </Button>
            <Button
              size="S"
              variant="tertiary"
              tag="a"
              href={occurrence.calendarLinks.icsPath}
              target="_blank"
              rel="noopener noreferrer"
            >
              .ICS
            </Button>
            <Button
              size="S"
              variant="danger-light"
              onClick={() => onRescheduleSave(true)}
            >
              {t('calendar.cancelInstance', 'Cancel Occurrence')}
            </Button>
            <Button size="S" variant="tertiary" onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};
