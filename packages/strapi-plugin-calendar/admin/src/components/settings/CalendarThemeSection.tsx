import React from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  Typography,
} from '@strapi/design-system';
import { useTheme } from 'styled-components';
import {
  CALENDAR_COLOR_PALETTES,
  CALENDAR_THEME_PRESETS,
  detectEffectiveColorScheme,
  resolveCalendarTheme,
  type CalendarColorPaletteId,
  type CalendarColorScheme,
  type CalendarPluginSettings,
  type CalendarThemePreset,
} from '../../../../shared/types';

export interface CalendarThemeSectionProps {
  t: (id: string, defaultMessage: string) => string;
  settings: CalendarPluginSettings;
  onPatchSettings: (patch: Partial<CalendarPluginSettings>) => void;
}

export const CalendarThemeSection: React.FC<CalendarThemeSectionProps> = ({
  t,
  settings,
  onPatchSettings,
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

  return (
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
                {t('settings.theme.previewSampleEvent', "09:00 · Jumu'ah / Event")}
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
  );
};

export default CalendarThemeSection;
