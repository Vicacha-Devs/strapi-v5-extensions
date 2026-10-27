import React from 'react';
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import {
  getLocalizedCalendarBundle,
} from '../../../../shared/localization';
import { PLUGIN_ID } from '../../../../shared/pluginId';
import type {
  CalendarDirection,
  CalendarPluginSettings,
  CalendarViewMode,
  SecondaryCalendarLanguageMode,
} from '../../../../shared/types';

export interface CalendarToolbarProps {
  t: (id: string, defaultMessage: string) => string;
  effectiveLocale: string;
  effectiveDirection: CalendarDirection;
  localeOverride?: string;
  onLocaleOverrideChange?: (nextLocale: string) => void;
  secondaryLangMode: SecondaryCalendarLanguageMode;
  onSecondaryLangModeChange?: (nextMode: SecondaryCalendarLanguageMode) => void;
  monthLabel: string;
  secondaryHeaderLabel: string;
  loading: boolean;
  settings: CalendarPluginSettings | null;
  totalOccurrences: number;
  sourceFilter: string;
  onSourceFilterChange: (sourceId: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  availableCategories: string[];
  viewMode: CalendarViewMode;
  enabledViews: Array<{ mode: CalendarViewMode; label: string }>;
  onViewChange: (mode: CalendarViewMode) => void;
  onNavigate: (action: 'prev' | 'today' | 'next') => void;
  onOpenQuickCreate: () => void;
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  t,
  effectiveLocale,
  effectiveDirection,
  secondaryLangMode,
  monthLabel,
  secondaryHeaderLabel,
  loading,
  settings,
  totalOccurrences,
  sourceFilter,
  onSourceFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  viewMode,
  enabledViews,
  onViewChange,
  onNavigate,
  onOpenQuickCreate,
}) => {
  const localeBundle = getLocalizedCalendarBundle(effectiveLocale);
  const isRtl = effectiveDirection === 'rtl';

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {/* Header Bar */}
      <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
        <Box>
          <Typography variant="alpha" fontWeight="bold">
            {t('calendar.title', 'Calendar & Scheduler')}
          </Typography>
          <Box paddingTop={1}>
            <Flex gap={2} alignItems="center" wrap="wrap">
              <Typography
                variant="delta"
                fontWeight="bold"
                textColor="neutral800"
                style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}
              >
                {monthLabel.toUpperCase()}
              </Typography>
              {secondaryHeaderLabel && secondaryLangMode !== 'off' && (
                <Badge backgroundColor="secondary100" textColor="secondary700">
                  {secondaryHeaderLabel}
                </Badge>
              )}
              <Badge backgroundColor="neutral150" textColor="neutral700">
                {localeBundle.nativeName} ({effectiveDirection.toUpperCase()})
              </Badge>
              {loading && (
                <Typography variant="pi" textColor="neutral500">
                  {t('calendar.loading', 'Syncing...')}
                </Typography>
              )}
            </Flex>
          </Box>
        </Box>

        <Flex gap={2} wrap="wrap">
          {settings?.showCreateButton !== false && (
            <Button variant="default" size="S" onClick={onOpenQuickCreate}>
              + {t('calendar.quickCreate', 'New Entry')}
            </Button>
          )}
          <Button
            variant="secondary"
            size="S"
            tag="a"
            href="/api/calendar/feed.ics"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('calendar.downloadIcsFeed', 'iCal Feed (.ics)')}
          </Button>
          <Button
            variant="tertiary"
            size="S"
            tag="a"
            href={`/admin/settings/${PLUGIN_ID}`}
          >
            {t('calendar.settings', 'Settings')}
          </Button>
        </Flex>
      </Flex>

      {/* Navigation, Source Filter & 3-Column Filter Controls Toolbar */}
      <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
            <Flex gap={2} alignItems="center">
              <Button variant="tertiary" size="S" onClick={() => onNavigate('prev')}>
                {isRtl ? '→' : '←'} {localeBundle.buttonText.prev}
              </Button>
              {settings?.showTodayButton !== false && (
                <Button variant="secondary" size="S" onClick={() => onNavigate('today')}>
                  {localeBundle.buttonText.today}
                </Button>
              )}
              <Button variant="tertiary" size="S" onClick={() => onNavigate('next')}>
                {localeBundle.buttonText.next} {isRtl ? '←' : '→'}
              </Button>
            </Flex>

            <Flex gap={2} wrap="wrap" alignItems="center">
              <Button
                size="S"
                variant={sourceFilter === 'all' ? 'default' : 'tertiary'}
                onClick={() => onSourceFilterChange('all')}
              >
                {t('calendar.allSources', 'All Sources')} ({totalOccurrences})
              </Button>
              {(settings?.sources ?? []).map((src) => (
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

            <Flex gap={1} wrap="wrap">
              {enabledViews.map((v) => (
                <Button
                  key={v.mode}
                  size="S"
                  variant={viewMode === v.mode ? 'default' : 'tertiary'}
                  onClick={() => onViewChange(v.mode)}
                >
                  {v.label}
                </Button>
              ))}
            </Flex>
          </Flex>

          {/* Category Filter Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 320px)',
              gap: 16,
              paddingTop: 4,
              borderTop: '1px solid rgba(128, 128, 128, 0.15)',
            }}
          >
            <Field.Root>
              <Field.Label>
                {t('calendar.toolbar.category', 'Category Filter')}
              </Field.Label>
              <SingleSelect
                placeholder={t('placeholder.all_categories', 'All Categories')}
                value={categoryFilter}
                onChange={(val: string | number) =>
                  onCategoryFilterChange(String(val))
                }
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
          </div>
        </Flex>
      </Box>
    </Flex>
  );
};

export default CalendarToolbar;
