import React from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
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
  activeLocale?: string;
  onLocaleChange?: (locale: string) => void;
  secondaryCalendarLanguage?: 'local' | 'ar' | 'off';
  onSecondaryCalendarLanguageChange?: (mode: 'local' | 'ar' | 'off') => void;
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
  activeLocale = 'es',
  onLocaleChange,
  secondaryCalendarLanguage = 'local',
  onSecondaryCalendarLanguageChange,
  sources,
  totalOccurrencesCount,
  availableCategories,
}) => {
  return (
    <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
      <Flex direction="column" gap={3} alignItems="stretch">
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

          {/* Source Filter Pills */}
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
          </Flex>

          {/* View Mode Tabs */}
          <Flex gap={1} wrap="wrap">
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

        {/* Labeled Filter Controls */}
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 320px)',
            gap: 12,
            paddingTop: 8,
            borderTop: '1px solid rgba(128, 128, 128, 0.15)',
          }}
        >
          <Field.Root>
            <Field.Label>{t('calendar.categoryFilter', 'Category')}</Field.Label>
            <SingleSelect
              placeholder={t('placeholder.all_categories', 'All Categories')}
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
          </Field.Root>
        </Box>
      </Flex>
    </Box>
  );
};
