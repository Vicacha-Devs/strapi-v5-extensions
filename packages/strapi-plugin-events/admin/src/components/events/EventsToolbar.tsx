import React from 'react';
import {
  Box,
  Button,
  Flex,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { SUPPORTED_INTL_CALENDARS } from '../../../../shared/calendarSystems';
import type { EventSourceMapping } from '../../../../shared/types';

export type EventsViewMode = 'month' | 'week' | 'day' | 'agenda' | 'attendees';

export interface EventsToolbarProps {
  t: (id: string, defaultMessage: string) => string;
  viewMode: EventsViewMode;
  onViewModeChange: (mode: EventsViewMode) => void;
  onNavigatePeriod: (direction: -1 | 0 | 1) => void;
  sourceFilter: string;
  onSourceFilterChange: (sourceId: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  calendarOverlayId: string;
  onCalendarOverlayChange: (overlayId: string) => void;
  sources: EventSourceMapping[];
  totalOccurrencesCount: number;
  availableCategories: string[];
}

export const EventsToolbar: React.FC<EventsToolbarProps> = ({
  t,
  viewMode,
  onViewModeChange,
  onNavigatePeriod,
  sourceFilter,
  onSourceFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  calendarOverlayId,
  onCalendarOverlayChange,
  sources,
  totalOccurrencesCount,
  availableCategories,
}) => {
  return (
    <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
      <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
        {/* Period Navigation */}
        <Flex gap={2} alignItems="center">
          <Button variant="tertiary" size="S" onClick={() => onNavigatePeriod(-1)}>
            ← {t('calendar.prev', 'Prev')}
          </Button>
          <Button variant="secondary" size="S" onClick={() => onNavigatePeriod(0)}>
            {t('calendar.today', 'Today')}
          </Button>
          <Button variant="tertiary" size="S" onClick={() => onNavigatePeriod(1)}>
            {t('calendar.next', 'Next')} →
          </Button>
        </Flex>

        {/* Source Filter Pills & Secondary Calendar Switcher */}
        <Flex gap={2} wrap="wrap" alignItems="center">
          <Button
            size="S"
            variant={sourceFilter === 'all' ? 'default' : 'tertiary'}
            onClick={() => onSourceFilterChange('all')}
          >
            {t('calendar.allSources', 'All Sources')} ({totalOccurrencesCount})
          </Button>
          {sources.map((src) => (
            <Button
              key={src.id}
              size="S"
              variant={sourceFilter === src.id ? 'default' : 'tertiary'}
              onClick={() => onSourceFilterChange(src.id)}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: src.color,
                  marginRight: 6,
                }}
              />
              {src.label}
            </Button>
          ))}

          {availableCategories.length > 0 && (
            <Box style={{ minWidth: 150 }}>
              <SingleSelect
                value={categoryFilter}
                onChange={(val: string) => onCategoryFilterChange(val)}
              >
                <SingleSelectOption value="all">
                  {t('calendar.allCategories', 'All Categories')}
                </SingleSelectOption>
                {availableCategories.map((cat) => (
                  <SingleSelectOption key={cat} value={cat}>
                    {cat}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>
          )}

          {/* Secondary Calendar Overlay Selector */}
          <Box style={{ minWidth: 185 }}>
            <SingleSelect
              value={calendarOverlayId}
              onChange={(val: string) => onCalendarOverlayChange(val)}
            >
              <SingleSelectOption value="configured">
                {t('calendar.overlay.configured', 'Calendar Overlay: Default')}
              </SingleSelectOption>
              <SingleSelectOption value="none">
                {t('calendar.overlay.none', 'Gregorian Only')}
              </SingleSelectOption>
              {SUPPORTED_INTL_CALENDARS.filter((c) => c.id !== 'gregory').map((cal) => (
                <SingleSelectOption key={cal.id} value={cal.id}>
                  + {cal.defaultLabel}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Box>
        </Flex>

        {/* View Mode Tabs */}
        <Flex gap={1}>
          {(['month', 'week', 'day', 'agenda', 'attendees'] as EventsViewMode[]).map((mode) => (
            <Button
              key={mode}
              size="S"
              variant={viewMode === mode ? 'default' : 'tertiary'}
              onClick={() => onViewModeChange(mode)}
            >
              {mode === 'month'
                ? t('view.month', 'Month')
                : mode === 'week'
                  ? t('view.week', 'Week')
                  : mode === 'day'
                    ? t('view.day', 'Day')
                    : mode === 'agenda'
                      ? t('view.agenda', 'Agenda')
                      : t('view.attendees', 'Attendees & Check-In')}
            </Button>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
};
