import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useTheme } from 'styled-components';
import { SUPPORTED_CALENDAR_LOCALES } from '../../../../shared/localization';
import {
  CALENDAR_COLOR_PALETTES,
  CALENDAR_THEME_PRESETS,
  detectEffectiveColorScheme,
  resolveCalendarTheme,
  type CalendarColorPaletteId,
  type CalendarColorScheme,
  type CalendarDirectionSetting,
  type CalendarPluginSettings,
  type CalendarThemePreset,
  type CalendarViewMode,
  type SecondaryCalendarLanguageMode,
  type WeekNumberCalculationMode,
} from '../../../../shared/types';

export interface CalendarViewsSectionProps {
  t: (id: string, defaultMessage: string) => string;
  settings: CalendarPluginSettings;
  onPatchSettings: (patch: Partial<CalendarPluginSettings>) => void;
  mode?: 'all' | 'theme' | 'general';
}

export const CalendarViewsSection: React.FC<CalendarViewsSectionProps> = ({
  t,
  settings,
  onPatchSettings,
  mode = 'all',
}) => {
  const styledTheme = useTheme() as { colors?: { neutral0?: string } } | undefined;
  const strapiNeutral0 = styledTheme?.colors?.neutral0;

  const activeTheme: CalendarThemePreset = settings.theme ?? 'breeze';
  const configuredColorScheme: CalendarColorScheme =
    settings.colorScheme ?? 'auto';
  const effectiveColorScheme = detectEffectiveColorScheme(
    configuredColorScheme,
    strapiNeutral0
  );
  const activePalette: CalendarColorPaletteId =
    settings.themePalette ?? 'default';

  const showTheme = mode === 'all' || mode === 'theme';
  const showGeneral = mode === 'all' || mode === 'general';

  return (
    <Box
      padding={5}
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      style={{ border: '1px solid rgba(128, 128, 128, 0.22)' }}
    >
      <Flex direction="column" alignItems="stretch" gap={5}>
        {/* 1. Theme Selector & Palette Appearance */}
        {showTheme && (
        <Box>
          <Typography variant="delta" fontWeight="bold" tag="h2">
            {t('settings.section.theme', 'Calendar Theme & Visual Style')}
          </Typography>
          <Box paddingTop={1} paddingBottom={4}>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.themeHint',
                'Select a modern FullCalendar stock theme (Breezy, Monarch, Forma, Pulse, Classic), design system (Shadcn, MUI), or heritage palette, plus accent swatch and light/dark mode.'
              )}
            </Typography>
          </Box>

          {/* Palette & Appearance Bar with clear spacing below before the Theme Selector Cards */}
          <Box
            padding={4}
            background="neutral100"
            hasRadius
            style={{
              border: '1px solid rgba(128, 128, 128, 0.18)',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <Field.Root>
                <Field.Label>
                  {t('settings.paletteLabel', 'Accent Color Palette')}
                </Field.Label>
                <Flex gap={2} alignItems="center" wrap="wrap" paddingTop={1}>
                  {Object.values(CALENDAR_COLOR_PALETTES).map((pal) => {
                    const isSelected = activePalette === pal.id;
                    const swatchColor =
                      pal.id === 'default'
                        ? CALENDAR_THEME_PRESETS[activeTheme]?.primaryColor ??
                          '#0284C7'
                        : effectiveColorScheme === 'dark'
                          ? pal.darkPrimary
                          : pal.lightPrimary;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        title={pal.label}
                        aria-label={pal.label}
                        onClick={() =>
                          onPatchSettings({
                            themePalette: pal.id,
                            primaryColor: swatchColor,
                          })
                        }
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '999px',
                          background: swatchColor,
                          border: isSelected
                            ? '2px solid #FFFFFF'
                            : '1px solid rgba(128,128,128,0.35)',
                          boxShadow: isSelected
                            ? `0 0 0 2px ${swatchColor}`
                            : 'none',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'transform 0.12s ease',
                          transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                        }}
                      />
                    );
                  })}
                </Flex>
              </Field.Root>

              <Field.Root>
                <Field.Label>
                  {t('settings.colorSchemeLabel', 'Calendar Appearance (Color Scheme)')}
                </Field.Label>
                <Flex gap={2} alignItems="center" wrap="wrap" paddingTop={1}>
                  <Button
                    size="S"
                    variant={configuredColorScheme === 'auto' ? 'default' : 'tertiary'}
                    onClick={() => onPatchSettings({ colorScheme: 'auto' })}
                  >
                    {t('calendar.scheme.auto', 'Auto (Match Strapi Theme)')}
                  </Button>
                  <Button
                    size="S"
                    variant={configuredColorScheme === 'light' ? 'default' : 'tertiary'}
                    onClick={() => onPatchSettings({ colorScheme: 'light' })}
                  >
                    {t('calendar.scheme.light', 'Light')}
                  </Button>
                  <Button
                    size="S"
                    variant={configuredColorScheme === 'dark' ? 'default' : 'tertiary'}
                    onClick={() => onPatchSettings({ colorScheme: 'dark' })}
                  >
                    {t('calendar.scheme.dark', 'Dark')}
                  </Button>
                </Flex>
              </Field.Root>
            </div>
          </Box>

          {/* 3-Column Theme Selector Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 14,
            }}
          >
            {Object.values(CALENDAR_THEME_PRESETS).map((preset) => {
              const isSelected = activeTheme === preset.id;
              const preview = resolveCalendarTheme(
                preset.id,
                effectiveColorScheme,
                activePalette,
                strapiNeutral0
              );
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onPatchSettings({
                      theme: preset.id,
                      primaryColor: preview.primaryColor,
                    })
                  }
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: preview.containerRadius ?? '8px',
                    cursor: 'pointer',
                    background: preview.cellBg,
                    color: preview.cellText,
                    border: isSelected
                      ? `2px solid ${preview.primaryColor}`
                      : `1px solid ${preview.borderColor}`,
                    boxShadow: isSelected
                      ? `0 0 0 2px ${preview.headerBg}`
                      : preview.containerShadow ?? 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: preview.cellText,
                      }}
                    >
                      {t(`settings.theme.${preset.id}.label`, preset.label)}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius:
                            preset.id === 'forma' ? '3px' : '999px',
                          background: preview.todayNumberBg,
                          color: preview.todayNumberText,
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        16
                      </span>
                    </span>
                  </div>

                  {/* Mini Event Style Preview Bar */}
                  <div
                    style={{
                      marginBottom: 8,
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: preset.eventRadius ?? '5px',
                      background:
                        preset.eventStyle === 'solid'
                          ? preview.primaryColor
                          : `${preview.primaryColor}22`,
                      color:
                        preset.eventStyle === 'solid'
                          ? '#FFFFFF'
                          : preview.cellText,
                      borderLeft:
                        preset.eventStyle === 'accent-bar'
                          ? `5px solid ${preview.primaryColor}`
                          : `1px solid ${preview.primaryColor}55`,
                    }}
                  >
                    09:00 · Jumu&apos;ah / Event
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: preview.cellMutedText,
                      lineHeight: 1.4,
                    }}
                  >
                    {t(
                      `settings.theme.${preset.id}.description`,
                      preset.description
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Box>
        )}

        {showTheme && showGeneral && <Divider />}

        {/* Localization, Views & Schedule Grid in 3-Column & 2-Column Layout */}
        {showGeneral && (
        <>
        <Box>
          <Typography variant="delta" fontWeight="bold" tag="h2">
            {t(
              'settings.section.general',
              'Language, TimeGrid & Schedule Configuration'
            )}
          </Typography>
          <Box paddingTop={1} paddingBottom={4}>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.generalHint',
                'Configure the primary local language, optional Arabic/Hijri secondary calendar display, timezone, and daily operating hours.'
              )}
            </Typography>
          </Box>

          {/* 3-Column Grid for the 9 Select & Time Fields (3 rows x 3 columns) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 16,
            }}
          >
            <Field.Root>
              <Field.Label>
                {t('settings.defaultLocale', 'Primary Calendar Language')}
              </Field.Label>
              <SingleSelect
                placeholder={t(
                  'settings.defaultLocale.placeholder',
                  'Select primary language'
                )}
                value={settings.defaultLocale || 'es'}
                onChange={(val: string | number) =>
                  onPatchSettings({ defaultLocale: String(val) })
                }
              >
                <SingleSelectOption value="es">
                  {t('settings.locale.es', 'Español — Spanish (ES)')}
                </SingleSelectOption>
                <SingleSelectOption value="en">
                  {t('settings.locale.en', 'English (EN)')}
                </SingleSelectOption>
                <SingleSelectOption value="ar">
                  {t('settings.locale.ar', 'العربية — Arabic (AR)')}
                </SingleSelectOption>
                <SingleSelectOption value="tr">
                  {t('settings.locale.tr', 'Türkçe — Turkish (TR)')}
                </SingleSelectOption>
                <SingleSelectOption value="auto">
                  {t('settings.locale.auto', 'Auto (Match Strapi Admin UI)')}
                </SingleSelectOption>
                {SUPPORTED_CALENDAR_LOCALES.filter(
                  (loc) => !['es', 'en', 'ar', 'tr'].includes(loc.code)
                ).map((loc) => (
                  <SingleSelectOption key={loc.code} value={loc.code}>
                    {loc.nativeName} — {loc.label} ({loc.code.toUpperCase()})
                  </SingleSelectOption>
                ))}
              </SingleSelect>
              <Field.Hint>
                {t(
                  'settings.defaultLocaleHint',
                  'Language for month names, weekdays, and toolbar buttons.'
                )}
              </Field.Hint>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t(
                  'settings.secondaryCalendarLanguage',
                  'Secondary Hijri / Arabic Date Display'
                )}
              </Field.Label>
              <SingleSelect
                placeholder={t(
                  'settings.secondaryCalendarLanguage.placeholder',
                  'Select Hijri display mode'
                )}
                value={settings.secondaryCalendarLanguage || 'local'}
                onChange={(val: string | number) =>
                  onPatchSettings({
                    secondaryCalendarLanguage: String(
                      val
                    ) as SecondaryCalendarLanguageMode,
                  })
                }
              >
                <SingleSelectOption value="local">
                  {t(
                    'settings.secondaryCalendarLanguage.local',
                    'Local Language (e.g. 16 Rabiʻ II)'
                  )}
                </SingleSelectOption>
                <SingleSelectOption value="ar">
                  {t(
                    'settings.secondaryCalendarLanguage.ar',
                    'Arabic Script — العربية (e.g. ١٦ ربيع الآخر)'
                  )}
                </SingleSelectOption>
                <SingleSelectOption value="off">
                  {t(
                    'settings.secondaryCalendarLanguage.off',
                    'Off (Gregorian Calendar Only)'
                  )}
                </SingleSelectOption>
              </SingleSelect>
              <Field.Hint>
                {t(
                  'settings.secondaryCalendarLanguageHint',
                  'Choose whether Hijri dates appear in local language, Arabic script, or hidden.'
                )}
              </Field.Hint>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('settings.direction', 'Layout Direction')}
              </Field.Label>
              <SingleSelect
                placeholder={t(
                  'settings.direction.placeholder',
                  'Select layout direction'
                )}
                value={settings.direction || 'auto'}
                onChange={(val: string | number) =>
                  onPatchSettings({ direction: String(val) as CalendarDirectionSetting })
                }
              >
                <SingleSelectOption value="auto">
                  {t(
                    'settings.direction.auto',
                    'Auto (LTR / RTL by Language)'
                  )}
                </SingleSelectOption>
                <SingleSelectOption value="ltr">
                  {t('settings.direction.ltr', 'Left-to-Right (LTR)')}
                </SingleSelectOption>
                <SingleSelectOption value="rtl">
                  {t('settings.direction.rtl', 'Right-to-Left (RTL)')}
                </SingleSelectOption>
              </SingleSelect>
              <Field.Hint>
                {t('settings.directionHint', 'Grid column order (LTR or RTL for Arabic).')}
              </Field.Hint>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('settings.defaultView', 'Default Calendar View')}
              </Field.Label>
              <SingleSelect
                placeholder={t(
                  'settings.defaultView.placeholder',
                  'Select default view'
                )}
                value={settings.defaultView || 'dayGridMonth'}
                onChange={(val: string | number) =>
                  onPatchSettings({ defaultView: String(val) as CalendarViewMode })
                }
              >
                <SingleSelectOption value="dayGridMonth">
                  {t('settings.defaultView.month', 'Month Grid')}
                </SingleSelectOption>
                <SingleSelectOption value="timeGridWeek">
                  {t('settings.defaultView.week', 'Week (TimeGrid)')}
                </SingleSelectOption>
                <SingleSelectOption value="timeGridDay">
                  {t('settings.defaultView.day', 'Day (TimeGrid)')}
                </SingleSelectOption>
                <SingleSelectOption value="listMonth">
                  {t('settings.defaultView.agenda', 'Agenda List')}
                </SingleSelectOption>
                <SingleSelectOption value="multiMonthYear">
                  {t('settings.defaultView.year', 'Full Year (3x4 Grid)')}
                </SingleSelectOption>
                <SingleSelectOption value="multiMonthYearStacked">
                  {t('settings.defaultView.yearStacked', 'Year (Stacked Months)')}
                </SingleSelectOption>
                <SingleSelectOption value="dayGridYear">
                  {t('settings.defaultView.dayGridYear', 'Year (Continuous Grid)')}
                </SingleSelectOption>
              </SingleSelect>
              <Field.Hint>
                {t('settings.defaultViewHint', 'Initial view displayed when opening the calendar.')}
              </Field.Hint>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('settings.firstDayOfWeek', 'First Day of Week')}
              </Field.Label>
              <SingleSelect
                placeholder={t(
                  'settings.firstDayOfWeek.placeholder',
                  'Select first day of week'
                )}
                value={String(settings.firstDayOfWeek ?? 1)}
                onChange={(val: string | number) =>
                  onPatchSettings({ firstDayOfWeek: Number.parseInt(String(val), 10) })
                }
              >
                <SingleSelectOption value="1">
                  {t('settings.firstDay.monday', 'Monday (1)')}
                </SingleSelectOption>
                <SingleSelectOption value="0">
                  {t('settings.firstDay.sunday', 'Sunday (0)')}
                </SingleSelectOption>
                <SingleSelectOption value="6">
                  {t('settings.firstDay.saturday', 'Saturday (6)')}
                </SingleSelectOption>
              </SingleSelect>
              <Field.Hint>
                {t('settings.firstDayHint', 'Starting weekday column in Month and Week views.')}
              </Field.Hint>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('settings.weekNumberCalculation', 'Week Calculation')}
              </Field.Label>
              <SingleSelect
                placeholder={t(
                  'settings.weekNumberCalculation.placeholder',
                  'Select week calculation mode'
                )}
                value={settings.weekNumberCalculation || 'ISO'}
                onChange={(val: string | number) =>
                  onPatchSettings({
                    weekNumberCalculation: String(val) as WeekNumberCalculationMode,
                  })
                }
              >
                <SingleSelectOption value="ISO">
                  {t('settings.weekCalc.iso', 'ISO 8601 (Monday)')}
                </SingleSelectOption>
                <SingleSelectOption value="local">
                  {t('settings.weekCalc.local', 'Locale Default')}
                </SingleSelectOption>
              </SingleSelect>
              <Field.Hint>
                {t('settings.weekCalcHint', 'Standard used when computing week numbers.')}
              </Field.Hint>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('settings.defaultTimezone', 'Default Timezone (IANA)')}
              </Field.Label>
              <TextInput
                value={settings.defaultTimezone || 'America/Bogota'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onPatchSettings({ defaultTimezone: e.target.value })
                }
                placeholder={t(
                  'settings.defaultTimezone.placeholder',
                  'e.g., America/Bogota'
                )}
              />
              <Field.Hint>
                {t('settings.timezoneHint', 'IANA timezone identifier (e.g., America/Bogota or UTC).')}
              </Field.Hint>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('settings.startHour', 'Daily Start Hour')}
              </Field.Label>
              <TextInput
                value={settings.startHour || '07:00:00'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onPatchSettings({ startHour: e.target.value })
                }
                placeholder={t('settings.startHour.placeholder', 'e.g., 07:00:00')}
              />
              <Field.Hint>
                {t('settings.startHourHint', 'Earliest visible time slot in Week/Day TimeGrid (HH:MM:SS).')}
              </Field.Hint>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('settings.endHour', 'Daily End Hour')}
              </Field.Label>
              <TextInput
                value={settings.endHour || '21:00:00'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onPatchSettings({ endHour: e.target.value })
                }
                placeholder={t('settings.endHour.placeholder', 'e.g., 21:00:00')}
              />
              <Field.Hint>
                {t('settings.endHourHint', 'Latest visible time slot in Week/Day TimeGrid (HH:MM:SS).')}
              </Field.Hint>
            </Field.Root>
          </div>

          {/* 2-Column Row for Slot Duration & Public iCal (.ics) Feed Title */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 16,
              marginTop: 16,
            }}
          >
            <Field.Root>
              <Field.Label>
                {t('settings.slotDuration', 'TimeGrid Slot Duration')}
              </Field.Label>
              <SingleSelect
                placeholder={t('settings.slotDuration.placeholder', 'Select slot interval')}
                value={settings.slotDuration || '00:30:00'}
                onChange={(val: string | number) =>
                  onPatchSettings({ slotDuration: String(val) })
                }
              >
                <SingleSelectOption value="00:15:00">15 min (00:15:00)</SingleSelectOption>
                <SingleSelectOption value="00:30:00">30 min (00:30:00)</SingleSelectOption>
                <SingleSelectOption value="01:00:00">60 min (01:00:00)</SingleSelectOption>
              </SingleSelect>
              <Field.Hint>
                {t('settings.slotDurationHint', 'Time interval for rows in Week and Day TimeGrid views.')}
              </Field.Hint>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                {t('settings.feedTitle', 'Public iCal (.ics) Feed Title')}
              </Field.Label>
              <TextInput
                value={
                  settings.feedTitle ||
                  t(
                    'settings.defaultFeedTitle',
                    'Abu Bakr As-Siddiq Central Mosque — General Calendar'
                  )
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onPatchSettings({ feedTitle: e.target.value })
                }
                placeholder={t(
                  'settings.feedTitle.placeholder',
                  'e.g., Abu Bakr As-Siddiq Central Mosque — General Calendar'
                )}
              />
              <Field.Hint>
                {t(
                  'settings.feedTitleHint',
                  'Calendar title exported in /api/calendar/feed.ics for Google/Apple/Outlook subscriptions.'
                )}
              </Field.Hint>
            </Field.Root>
          </div>
        </Box>

        <Divider />

        {/* Structured Checkboxes in 2-Column Sub-Panels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          <Box
            padding={4}
            background="neutral100"
            hasRadius
            style={{ border: '1px solid rgba(128, 128, 128, 0.18)' }}
          >
            <Flex direction="column" alignItems="flex-start" gap={3}>
              <Typography variant="sigma" textColor="neutral700">
                {t('settings.enabledViewsGroup', 'Enabled Calendar View Tabs')}
              </Typography>
              <Flex gap={4} wrap="wrap">
                <Checkbox
                  checked={settings.monthView}
                  onCheckedChange={(c: boolean) =>
                    onPatchSettings({ monthView: Boolean(c) })
                  }
                >
                  {t('view.month', 'Month')}
                </Checkbox>
                <Checkbox
                  checked={settings.weekView}
                  onCheckedChange={(c: boolean) =>
                    onPatchSettings({ weekView: Boolean(c) })
                  }
                >
                  {t('view.week', 'Week')}
                </Checkbox>
                <Checkbox
                  checked={settings.dayView}
                  onCheckedChange={(c: boolean) =>
                    onPatchSettings({ dayView: Boolean(c) })
                  }
                >
                  {t('view.day', 'Day')}
                </Checkbox>
                <Checkbox
                  checked={settings.agendaView}
                  onCheckedChange={(c: boolean) =>
                    onPatchSettings({ agendaView: Boolean(c) })
                  }
                >
                  {t('view.agenda', 'Agenda')}
                </Checkbox>
                <Checkbox
                  checked={settings.yearView}
                  onCheckedChange={(c: boolean) =>
                    onPatchSettings({ yearView: Boolean(c) })
                  }
                >
                  {t('view.year', 'Year')}
                </Checkbox>
              </Flex>
            </Flex>
          </Box>

          <Box
            padding={4}
            background="neutral100"
            hasRadius
            style={{ border: '1px solid rgba(128, 128, 128, 0.18)' }}
          >
            <Flex direction="column" alignItems="flex-start" gap={3}>
              <Typography variant="sigma" textColor="neutral700">
                {t('settings.gridBehaviorGroup', 'Grid Display & Interaction Options')}
              </Typography>
              <Flex gap={4} wrap="wrap">
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
                  {t(
                    'settings.showCreateButton',
                    'Enable Quick-Create & Slot Selection'
                  )}
                </Checkbox>
              </Flex>
            </Flex>
          </Box>
        </div>
        </>
        )}
      </Flex>
    </Box>
  );
};

export default CalendarViewsSection;
