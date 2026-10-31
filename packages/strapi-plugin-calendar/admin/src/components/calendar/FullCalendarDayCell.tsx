import React from 'react';
import { formatDateInCalendarSystem } from '../../../../shared/calendarSystems';
import type {
  CalendarSystemConfig,
  CalendarThemeDefinition,
  SecondaryCalendarLanguageMode,
} from '../../../../shared/types';

export function computeSecondaryBadges(
  dateKey: string,
  effectiveSecondaryLang: SecondaryCalendarLanguageMode,
  localeCode: string,
  activeSecondaryCalendars: CalendarSystemConfig[]
): string[] {
  if (effectiveSecondaryLang === 'off') return [];
  const targetLoc = effectiveSecondaryLang === 'ar' ? 'ar-SA' : localeCode;
  return activeSecondaryCalendars
    .map((sys) => {
      const sysLocale =
        effectiveSecondaryLang === 'ar' ? 'ar-SA' : sys.locale || targetLoc;
      return formatDateInCalendarSystem(
        dateKey,
        { ...sys, locale: sysLocale },
        targetLoc,
        { compact: true }
      );
    })
    .filter(Boolean);
}

export function buildDayHeaderStyle(
  activeTheme: CalendarThemeDefinition,
  isCompactYear: boolean,
  hasSecondaryBadges: boolean,
  allowCreate: boolean
): React.CSSProperties {
  const isEndAligned = activeTheme.dayNumberAlign === 'end';
  const isCenterAligned = activeTheme.dayNumberAlign === 'center';
  const justifyCenter = isCompactYear || (isCenterAligned && !hasSecondaryBadges);
  return {
    display: 'flex',
    flexDirection: isEndAligned ? 'row-reverse' : 'row',
    flexWrap: isCompactYear ? 'nowrap' : 'wrap',
    justifyContent: justifyCenter ? 'center' : 'space-between',
    alignItems: 'center',
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    gap: isCompactYear ? 2 : 4,
    padding: isCompactYear ? '1px 2px' : '2px 4px',
    cursor: allowCreate ? 'pointer' : 'default',
  };
}

export function buildDayNumberBadgeStyle(
  activeTheme: CalendarThemeDefinition,
  isCompactYear: boolean,
  isToday: boolean
): React.CSSProperties {
  const fontSize = isCompactYear ? 12 : activeTheme.id === 'monarch' ? 13.5 : 13;
  const size = isCompactYear ? 22 : 26;
  const borderRadius = activeTheme.id === 'forma' && !isToday ? '3px' : '999px';
  return {
    fontWeight: 700,
    fontSize,
    lineHeight: 1.2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: size,
    height: size,
    flexShrink: 0,
    borderRadius,
    padding: isCompactYear ? '0 4px' : '0 6px',
    background: isToday ? activeTheme.todayNumberBg : 'transparent',
    color: isToday ? activeTheme.todayNumberText : activeTheme.cellText,
  };
}

export const DayCellMetaBadges: React.FC<{
  secondarySummary: string;
  effectiveSecondaryLang: SecondaryCalendarLanguageMode;
  activeTheme: CalendarThemeDefinition;
  allowCreate: boolean;
}> = ({ secondarySummary, effectiveSecondaryLang, activeTheme, allowCreate }) => (
  <span
    className="vicacha-fc-day-meta"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      minWidth: 0,
      maxWidth: '100%',
    }}
  >
    {secondarySummary && (
      <span
        className="vicacha-fc-secondary-badge"
        dir={effectiveSecondaryLang === 'ar' ? 'rtl' : 'auto'}
        style={{
          fontSize: 10.5,
          background: activeTheme.badgeBg,
          color: activeTheme.badgeText,
          border: `1px solid ${activeTheme.badgeBorder}`,
          borderRadius: activeTheme.id === 'forma' ? '4px' : '999px',
          padding: '1px 6px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          lineHeight: 1.3,
        }}
      >
        {secondarySummary}
      </span>
    )}
    {allowCreate && (
      <span
        className="vicacha-fc-day-quick-add"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: '999px',
          background: activeTheme.primaryColor,
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        +
      </span>
    )}
  </span>
);
