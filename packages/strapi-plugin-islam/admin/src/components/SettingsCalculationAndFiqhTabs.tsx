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
import React from "react";

import type { IslamPluginSettings } from "../../../shared";

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

const CALCULATION_METHODS: Array<{
  value: string;
  labelKey: string;
  defaultLabel: string;
}> = [
  {
    value: "3",
    labelKey: "settings.method.mwl",
    defaultLabel: "3 — Muslim World League (MWL — Standard Bogotá)",
  },
  {
    value: "2",
    labelKey: "settings.method.isna",
    defaultLabel: "2 — Islamic Society of North America (ISNA)",
  },
  {
    value: "4",
    labelKey: "settings.method.makkah",
    defaultLabel: "4 — Umm al-Qura University, Makkah",
  },
  {
    value: "5",
    labelKey: "settings.method.egypt",
    defaultLabel: "5 — Egyptian General Authority of Survey",
  },
  {
    value: "1",
    labelKey: "settings.method.karachi",
    defaultLabel: "1 — University of Islamic Sciences, Karachi",
  },
  {
    value: "13",
    labelKey: "settings.method.diyanet",
    defaultLabel: "13 — Diyanet İşleri Başkanlığı, Turkey",
  },
];

export const CalculationSettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  setSettings,
  t,
}) => (
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
            {t("field.latitude_decimal_degrees", "Latitude (Decimal Degrees)")}
          </Field.Label>
          <TextInput
            name="defaultLat"
            placeholder={t("placeholder.e_g_4_6782", "e.g., 4.6782")}
            value={String(settings.defaultLat ?? "")}
            onChange={(e: InputChangeEvent) =>
              setSettings({
                ...settings,
                defaultLat: Number(e.target.value) || 0,
              })
            }
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
            value={String(settings.defaultLon ?? "")}
            onChange={(e: InputChangeEvent) =>
              setSettings({
                ...settings,
                defaultLon: Number(e.target.value) || 0,
              })
            }
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
            {CALCULATION_METHODS.map((m) => (
              <SingleSelectOption key={m.value} value={m.value}>
                {t(m.labelKey, m.defaultLabel)}
              </SingleSelectOption>
            ))}
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
              {t("settings.ui.2_hanafi_shadow_2x", "2 — Hanafi (Shadow = 2x)")}
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

export const FiqhRatesSettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  setSettings,
  t,
}) => (
  <Tabs.Content value="fiqh">
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
            "settings.ui.2_fiqh_financial_benchmarks_gold_silver_nisab_za",
            "Fiqh Financial Benchmarks (Gold/Silver Nisab, Zakat al-Fitr & Fidyah in COP)"
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {t(
            "settings.ui.reference_benchmarks_used_by_the_zakat_al_mal_ca",
            "Reference benchmarks used by the Zakat al-Mal calculator (85g Gold / 595g Silver) and Ramadan obligations."
          )}
        </Typography>
      </Flex>

      <Box
        paddingTop={4}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 20,
        }}
      >
        <Field.Root
          name="goldCop"
          hint={t(
            "settings.ui.gold_nisab_threshold_85_grams_price_per_gram",
            "Gold Nisab threshold = 85 grams × price per gram."
          )}
        >
          <Field.Label>
            {t(
              "field.24k_gold_price_per_gram_cop",
              "24K Gold Price per Gram (COP)"
            )}
          </Field.Label>
          <TextInput
            name="goldCop"
            placeholder={t("placeholder.e_g_365000", "e.g., 365000")}
            value={String(settings.fiqhRates.goldPricePerGramByCurrency.COP)}
            onChange={(e: InputChangeEvent) =>
              setSettings({
                ...settings,
                fiqhRates: {
                  ...settings.fiqhRates,
                  goldPricePerGramByCurrency: {
                    ...settings.fiqhRates.goldPricePerGramByCurrency,
                    COP: Number(e.target.value) || 0,
                  },
                },
              })
            }
          />
          <Field.Hint />
        </Field.Root>

        <Field.Root
          name="silverCop"
          hint={t(
            "settings.ui.silver_nisab_threshold_595_grams_price_per_gram",
            "Silver Nisab threshold = 595 grams × price per gram."
          )}
        >
          <Field.Label>
            {t(
              "field.pure_silver_price_per_gram_cop",
              "Pure Silver Price per Gram (COP)"
            )}
          </Field.Label>
          <TextInput
            name="silverCop"
            placeholder={t("placeholder.e_g_4200", "e.g., 4200")}
            value={String(settings.fiqhRates.silverPricePerGramByCurrency.COP)}
            onChange={(e: InputChangeEvent) =>
              setSettings({
                ...settings,
                fiqhRates: {
                  ...settings.fiqhRates,
                  silverPricePerGramByCurrency: {
                    ...settings.fiqhRates.silverPricePerGramByCurrency,
                    COP: Number(e.target.value) || 0,
                  },
                },
              })
            }
          />
          <Field.Hint />
        </Field.Root>

        <Field.Root
          name="fitranaCop"
          hint={t(
            "settings.ui.mandatory_per_person_ramadan_charity_before_eid_",
            "Mandatory per-person Ramadan charity before Eid al-Fitr prayer."
          )}
        >
          <Field.Label>
            {t(
              "field.zakat_al_fitr_per_person_cop",
              "Zakat al-Fitr per Person (COP)"
            )}
          </Field.Label>
          <TextInput
            name="fitranaCop"
            placeholder={t("placeholder.e_g_35000", "e.g., 35000")}
            value={String(
              settings.fiqhRates.zakatAlFitrPerPersonByCurrency.COP
            )}
            onChange={(e: InputChangeEvent) =>
              setSettings({
                ...settings,
                fiqhRates: {
                  ...settings.fiqhRates,
                  zakatAlFitrPerPersonByCurrency: {
                    ...settings.fiqhRates.zakatAlFitrPerPersonByCurrency,
                    COP: Number(e.target.value) || 0,
                  },
                },
              })
            }
          />
          <Field.Hint />
        </Field.Root>

        <Field.Root
          name="fidyahCop"
          hint={t(
            "settings.ui.daily_meal_compensation_for_those_permanently_un",
            "Daily meal compensation for those permanently unable to fast."
          )}
        >
          <Field.Label>
            {t(
              "field.fidyah_per_missed_fast_day_cop",
              "Fidyah per Missed Fast Day (COP)"
            )}
          </Field.Label>
          <TextInput
            name="fidyahCop"
            placeholder={t("placeholder.e_g_25000", "e.g., 25000")}
            value={String(settings.fiqhRates.fidyahPerDayByCurrency.COP)}
            onChange={(e: InputChangeEvent) =>
              setSettings({
                ...settings,
                fiqhRates: {
                  ...settings.fiqhRates,
                  fidyahPerDayByCurrency: {
                    ...settings.fiqhRates.fidyahPerDayByCurrency,
                    COP: Number(e.target.value) || 0,
                  },
                },
              })
            }
          />
          <Field.Hint />
        </Field.Root>
      </Box>
    </Box>
  </Tabs.Content>
);
