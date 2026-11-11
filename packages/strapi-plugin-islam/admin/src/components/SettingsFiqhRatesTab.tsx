import {
  Box,
  Field,
  Flex,
  Tabs,
  TextInput,
  Typography,
} from "@strapi/design-system";
import React from "react";

import type {
  InputChangeEvent,
  SettingsTabProps,
} from "./SettingsCalculationAndFiqhTabs";

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
