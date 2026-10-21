import React from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { SUPPORTED_INTL_CALENDARS } from '../../../../shared/calendarSystems';
import {
  getLocalizedCalendarBundle,
  SUPPORTED_CALENDAR_LOCALES,
} from '../../../../shared/localization';
import { PLUGIN_ID } from '../../../../shared/pluginId';
import type {
  CalendarDirection,
  CalendarPluginSettings,
  CalendarViewMode,
} from '../../../../shared/types';

export interface CalendarToolbarProps {
  t: (id: string, defaultMessage: string) => string;
  effectiveLocale: string;
  effectiveDirection: CalendarDirection;
  localeOverride: string;
  onLocaleOverrideChange: (nextLocale: string) => void;
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
  calendarOverlayId: string;
  onCalendarOverlayChange: (overlayId: string) => void;
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
  localeOverride,
  onLocaleOverrideChange,
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
  calendarOverlayId,
  onCalendarOverlayChange,
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
              <Typography variant="epsilon" textColor="neutral600">
                {monthLabel}
              </Typography>
              {secondaryHeaderLabel && (
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

      {/* Navigation, Multi-Source Filter, Locale & Secondary Calendar Overlay Toolbar */}
      <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
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

            {availableCategories.length > 0 && (
              <Box style={{ minWidth: 145 }}>
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

            {/* FullCalendar Locale Switcher */}
            <Box style={{ minWidth: 165 }}>
              <SingleSelect
                value={localeOverride}
                onChange={(val: string) => onLocaleOverrideChange(val)}
              >
                <SingleSelectOption value="auto">
                  {t('calendar.locale.auto', 'Locale: Auto')} ({effectiveLocale.toUpperCase()})
                </SingleSelectOption>
                {SUPPORTED_CALENDAR_LOCALES.map((loc) => (
                  <SingleSelectOption key={loc.code} value={loc.code}>
                    {loc.nativeName} ({loc.code.toUpperCase()}
                    {loc.direction === 'rtl' ? ' · RTL' : ''})
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>

            {/* Secondary Calendar Overlay Switcher */}
            <Box style={{ minWidth: 180 }}>
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

          <Flex gap={1}>
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
      </Box>
    </Flex>
  );
};

export default CalendarToolbar;
