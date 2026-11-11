import {
  Box,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
} from "@strapi/design-system";
import React, { useEffect, useState } from "react";

import {
  PRAYER_CALCULATION_METHODS,
  type IslamPluginSettings,
} from "../../../shared";
import { FiqhRatesSettingsTab } from "./SettingsFiqhRatesTab";

export { FiqhRatesSettingsTab };

export type TranslateFn = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number>
) => string;

export interface InputChangeEvent {
  target: {
    value: string;
  };
}

export interface SettingsTabProps {
  settings: IslamPluginSettings;
  setSettings: (next: IslamPluginSettings) => void;
  t: TranslateFn;
}

const LOCALIZED_METHOD_KEYS: Record<string, string> = {
  "1": "settings.method.karachi",
  "2": "settings.method.isna",
  "3": "settings.method.mwl",
  "4": "settings.method.makkah",
  "5": "settings.method.egypt",
  "13": "settings.method.diyanet",
};

const ALL_CALCULATION_METHODS = Object.values(PRAYER_CALCULATION_METHODS).sort(
  (a, b) => Number(a.id) - Number(b.id)
);

function isIntermediateDecimalInput(raw: string): boolean {
  return (
    raw === "" ||
    raw === "-" ||
    raw === "." ||
    raw === "-." ||
    /^-?\d+\.$/.test(raw) ||
    /^-?\d+\.\d*0$/.test(raw)
  );
}

function tryParseCoordinate(
  raw: string,
  min: number,
  max: number
): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return null;
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < min || num > max) {
    return null;
  }
  return num;
}

export const CalculationSettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  setSettings,
  t,
}) => {
  const [latDraft, setLatDraft] = useState<string>(() =>
    String(settings.defaultLat ?? "")
  );
  const [lonDraft, setLonDraft] = useState<string>(() =>
    String(settings.defaultLon ?? "")
  );

  useEffect(() => {
    const parsed = tryParseCoordinate(latDraft, -90, 90);
    if (
      parsed !== settings.defaultLat &&
      !isIntermediateDecimalInput(latDraft)
    ) {
      setLatDraft(String(settings.defaultLat ?? ""));
    }
  }, [settings.defaultLat]);

  useEffect(() => {
    const parsed = tryParseCoordinate(lonDraft, -180, 180);
    if (
      parsed !== settings.defaultLon &&
      !isIntermediateDecimalInput(lonDraft)
    ) {
      setLonDraft(String(settings.defaultLon ?? ""));
    }
  }, [settings.defaultLon]);

  const handleLatChange = (e: InputChangeEvent) => {
    const raw = e.target.value;
    setLatDraft(raw);
    const parsed = tryParseCoordinate(raw, -90, 90);
    if (parsed !== null) {
      setSettings({ ...settings, defaultLat: parsed });
    }
  };

  const handleLonChange = (e: InputChangeEvent) => {
    const raw = e.target.value;
    setLonDraft(raw);
    const parsed = tryParseCoordinate(raw, -180, 180);
    if (parsed !== null) {
      setSettings({ ...settings, defaultLon: parsed });
    }
  };

  const handleLatBlur = () => {
    const parsed = tryParseCoordinate(latDraft, -90, 90);
    if (parsed !== null) {
      setLatDraft(String(parsed));
      setSettings({ ...settings, defaultLat: parsed });
    } else {
      setLatDraft(String(settings.defaultLat ?? 0));
    }
  };

  const handleLonBlur = () => {
    const parsed = tryParseCoordinate(lonDraft, -180, 180);
    if (parsed !== null) {
      setLonDraft(String(parsed));
      setSettings({ ...settings, defaultLon: parsed });
    } else {
      setLonDraft(String(settings.defaultLon ?? 0));
    }
  };

  return (
    <Tabs.Content value="calculation">
      <Box
        background="neutral0"
        padding={6}
        hasRadius
        shadow="filterShadow"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
      >
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="beta" tag="h2">
            {t(
              "settings.ui.1_mosque_coordinates_astronomical_calculation_pa",
              "Mosque Coordinates & Astronomical Calculation Parameters"
            )}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {t(
              "settings.ui.used_for_daily_5_prayer_schedules_qibla_bearing_",
              "Used for daily 5-prayer schedules, Qibla bearing & great-circle distance to Makkah, and local Hilal moonsighting adjustments."
            )}
          </Typography>
        </Flex>

        <Box
          paddingTop={4}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <Field.Root
            name="mosqueName"
            hint={t(
              "settings.ui.displayed_on_printable_monthly_prayer_timetables",
              "Displayed on printable monthly prayer timetables and Ramadan calendars."
            )}
          >
            <Field.Label>
              {t("field.mosque_official_name", "Mosque Official Name")}
            </Field.Label>
            <TextInput
              name="mosqueName"
              placeholder={t(
                "placeholder.e_g_mezquita_central_abu_bakr_as_siddiq_bogot",
                "e.g., Abu Bakr As-Siddiq Central Mosque — Bogotá"
              )}
              value={settings.mosqueName || ""}
              onChange={(e: InputChangeEvent) =>
                setSettings({ ...settings, mosqueName: e.target.value })
              }
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="defaultLat"
            hint={t(
              "settings.ui.geographic_latitude_of_the_mosque_bogot_4_6782",
              "Geographic latitude of the mosque (Bogotá: 4.6782)."
            )}
          >
            <Field.Label>
              {t(
                "field.latitude_decimal_degrees",
                "Latitude (Decimal Degrees)"
              )}
            </Field.Label>
            <TextInput
              name="defaultLat"
              placeholder={t("placeholder.e_g_4_6782", "e.g., 4.6782")}
              value={latDraft}
              onChange={handleLatChange}
              onBlur={handleLatBlur}
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="defaultLon"
            hint={t(
              "settings.ui.geographic_longitude_of_the_mosque_bogot_74_084",
              "Geographic longitude of the mosque (Bogotá: -74.084)."
            )}
          >
            <Field.Label>
              {t(
                "field.longitude_decimal_degrees",
                "Longitude (Decimal Degrees)"
              )}
            </Field.Label>
            <TextInput
              name="defaultLon"
              placeholder={t("placeholder.e_g_74_084", "e.g., -74.084")}
              value={lonDraft}
              onChange={handleLonChange}
              onBlur={handleLonBlur}
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="method"
            hint={t(
              "settings.ui.fajr_and_isha_twilight_angle_convention",
              "Fajr and Isha twilight angle convention."
            )}
          >
            <Field.Label>
              {t(
                "field.astronomical_calculation_method",
                "Astronomical Calculation Method"
              )}
            </Field.Label>
            <SingleSelect
              placeholder={t(
                "placeholder.select_calculation_method",
                "Select calculation method"
              )}
              value={String(settings.method || "3")}
              onChange={(val: string | number) =>
                setSettings({ ...settings, method: String(val) })
              }
            >
              {ALL_CALCULATION_METHODS.map((m) => {
                const defaultLabel = `${m.id} — ${m.name}`;
                const i18nKey = LOCALIZED_METHOD_KEYS[m.id];
                return (
                  <SingleSelectOption key={m.id} value={m.id}>
                    {i18nKey ? t(i18nKey, defaultLabel) : defaultLabel}
                  </SingleSelectOption>
                );
              })}
            </SingleSelect>
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="school"
            hint={t(
              "settings.ui.determines_the_afternoon_asr_prayer_entry_time",
              "Determines the afternoon Asr prayer entry time."
            )}
          >
            <Field.Label>
              {t("field.asr_juristic_school", "Asr Juristic School")}
            </Field.Label>
            <SingleSelect
              placeholder={t(
                "placeholder.select_juristic_school",
                "Select juristic school"
              )}
              value={String(settings.school || "1")}
              onChange={(val: string | number) =>
                setSettings({
                  ...settings,
                  school: String(val) === "2" ? "2" : "1",
                })
              }
            >
              <SingleSelectOption value="1">
                {t(
                  "settings.ui.1_standard_shafi_i_maliki_hanbali_shadow_1x",
                  "1 — Standard (Shafi’i, Maliki, Hanbali — Shadow = 1x)"
                )}
              </SingleSelectOption>
              <SingleSelectOption value="2">
                {t(
                  "settings.ui.2_hanafi_shadow_2x",
                  "2 — Hanafi (Shadow = 2x)"
                )}
              </SingleSelectOption>
            </SingleSelect>
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="shifting"
            hint={t(
              "settings.ui.adjusts_the_hijri_date_after_local_crescent_sigh",
              "Adjusts the Hijri date after local crescent sighting confirmation."
            )}
          >
            <Field.Label>
              {t(
                "field.hijri_moon_sighting_offset_days",
                "Hijri Moon-Sighting Offset (Days)"
              )}
            </Field.Label>
            <SingleSelect
              placeholder={t(
                "placeholder.select_moonsighting_day_offset",
                "Select moonsighting day offset"
              )}
              value={String(settings.shifting || "0")}
              onChange={(val: string | number) =>
                setSettings({
                  ...settings,
                  shifting: String(val) as IslamPluginSettings["shifting"],
                })
              }
            >
              <SingleSelectOption value="-2">
                {t("settings.ui.minus_2_days", "-2 Days")}
              </SingleSelectOption>
              <SingleSelectOption value="-1">
                {t("settings.ui.minus_1_day", "-1 Day")}
              </SingleSelectOption>
              <SingleSelectOption value="0">
                {t(
                  "settings.ui.0_days_umm_al_qura_standard",
                  "0 Days (Umm al-Qura Standard)"
                )}
              </SingleSelectOption>
              <SingleSelectOption value="1">
                {t("settings.ui.1_day", "+1 Day")}
              </SingleSelectOption>
              <SingleSelectOption value="2">
                {t("settings.ui.2_days", "+2 Days")}
              </SingleSelectOption>
            </SingleSelect>
            <Field.Hint />
          </Field.Root>
        </Box>
      </Box>
    </Tabs.Content>
  );
};
