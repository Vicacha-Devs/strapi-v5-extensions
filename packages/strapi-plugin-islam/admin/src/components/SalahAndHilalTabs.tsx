import {
  Badge,
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import React from "react";
import { useIntl } from "react-intl";

import type { IslamicObservanceItem } from "../../../shared";
import { SalahCockpitTab } from "./SalahTab";
import { pickLocalizedText } from "./ScriptureHadithsAndDuas";
import type { TranslateFn } from "./SettingsTabs";

export { SalahCockpitTab };

interface InputChangeEvent {
  target: {
    value: string;
  };
}

export type HilalOccasionKey =
  | "ramadan"
  | "eid_al_fitr"
  | "dhul_hijjah_eid_al_adha";

export interface HilalCockpitTabProps {
  hilalOccasion: HilalOccasionKey;
  setHilalOccasion: (val: HilalOccasionKey) => void;
  hilalGregorianDate: string;
  setHilalGregorianDate: (val: string) => void;
  hilalShifting: string;
  setHilalShifting: (val: string) => void;
  hilalImamName: string;
  setHilalImamName: (val: string) => void;
  hilalActivateBanner: boolean;
  setHilalActivateBanner: (val: boolean) => void;
  savingAction: boolean;
  onConfirmHilal: () => void;
  observances: IslamicObservanceItem[];
  t: TranslateFn;
}

export const HilalCockpitTab: React.FC<HilalCockpitTabProps> = ({
  hilalOccasion,
  setHilalOccasion,
  hilalGregorianDate,
  setHilalGregorianDate,
  hilalShifting,
  setHilalShifting,
  hilalImamName,
  setHilalImamName,
  hilalActivateBanner,
  setHilalActivateBanner,
  savingAction,
  onConfirmHilal,
  observances,
  t,
}) => {
  const { locale } = useIntl();
  const lang = locale.split("-")[0] || "en";

  return (
    <Box>
      <Box
        marginBottom={6}
        background="neutral0"
        padding={5}
        hasRadius
        shadow="filterShadow"
        style={{ border: "1px solid rgba(128, 128, 128, 0.22)" }}
      >
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Box style={{ marginBottom: 4 }}>
            <Typography variant="delta" tag="h2">
              {t(
                "page.ui.imam_hilal_moon_sighting_confirmation_ecosystem_",
                "Imam Hilal Moon-Sighting Confirmation & Ecosystem Bridge"
              )}
            </Typography>
          </Box>
          <Flex gap={4} wrap="wrap" alignItems="flex-start">
            <Box style={{ flex: 1, minWidth: 220 }}>
              <Field.Root
                hint={t(
                  "page.ui.select_the_crescent_sighting_announcement_type",
                  "Select the crescent sighting announcement type."
                )}
              >
                <Field.Label>
                  {t("field.liturgical_occasion", "Liturgical Occasion")}
                </Field.Label>
                <SingleSelect
                  placeholder={t(
                    "placeholder.select_occasion",
                    "Select occasion"
                  )}
                  value={hilalOccasion}
                  onChange={(val: string | number) =>
                    setHilalOccasion(String(val) as HilalOccasionKey)
                  }
                >
                  <SingleSelectOption value="ramadan">
                    {t(
                      "page.ui.ramadan_start_of_ramadan_1st",
                      "ramadan (Start of Ramadan 1st)"
                    )}
                  </SingleSelectOption>
                  <SingleSelectOption value="eid_al_fitr">
                    {t(
                      "page.ui.eid_al_fitr_eid_al_fitr_1_shawwal",
                      "eid_al_fitr (Eid al-Fitr — 1 Shawwal)"
                    )}
                  </SingleSelectOption>
                  <SingleSelectOption value="dhul_hijjah_eid_al_adha">
                    {t(
                      "page.ui.dhul_hijjah_eid_al_adha_dhul_hijjah_eid_al_adha",
                      "dhul_hijjah_eid_al_adha (Dhul Hijjah & Eid al-Adha)"
                    )}
                  </SingleSelectOption>
                </SingleSelect>
                <Field.Hint />
              </Field.Root>
            </Box>
            <Box style={{ flex: 1, minWidth: 220 }}>
              <Field.Root
                hint={t(
                  "page.ui.official_gregorian_date_corresponding_to_the_1st",
                  "Official Gregorian date corresponding to the 1st of the Hijri month."
                )}
              >
                <Field.Label>
                  {t(
                    "field.confirmed_gregorian_date_yyyy_mm_dd",
                    "Confirmed Gregorian Date (YYYY-MM-DD)"
                  )}
                </Field.Label>
                <TextInput
                  name="hilalGregorianDate"
                  placeholder={t(
                    "placeholder.e_g_2026_02_18",
                    "e.g., 2026-02-18"
                  )}
                  value={hilalGregorianDate}
                  onChange={(e: InputChangeEvent) =>
                    setHilalGregorianDate(e.target.value)
                  }
                />
                <Field.Hint />
              </Field.Root>
            </Box>
            <Box style={{ flex: 1, minWidth: 220 }}>
              <Field.Root
                hint={t(
                  "page.ui.propagated_to_the_calendar_eventhub_plugins_if_e",
                  "Propagated to the Calendar & EventHub plugins if enabled below."
                )}
              >
                <Field.Label>
                  {t(
                    "field.hijri_moon_sighting_offset_2_to_2_days",
                    "Hijri Moon-Sighting Offset (-2 to +2 days)"
                  )}
                </Field.Label>
                <SingleSelect
                  placeholder={t(
                    "placeholder.select_day_offset",
                    "Select day offset"
                  )}
                  value={String(hilalShifting)}
                  onChange={(val: string | number) =>
                    setHilalShifting(String(val))
                  }
                >
                  <SingleSelectOption value="-2">
                    {t("page.ui.minus_2_days", "-2 days")}
                  </SingleSelectOption>
                  <SingleSelectOption value="-1">
                    {t("page.ui.minus_1_day", "-1 day")}
                  </SingleSelectOption>
                  <SingleSelectOption value="0">
                    {t(
                      "page.ui.0_days_astronomical_umm_al_qura",
                      "0 days (Astronomical / Umm al-Qura)"
                    )}
                  </SingleSelectOption>
                  <SingleSelectOption value="1">
                    {t("page.ui.1_day", "+1 day")}
                  </SingleSelectOption>
                  <SingleSelectOption value="2">
                    {t("page.ui.2_days", "+2 days")}
                  </SingleSelectOption>
                </SingleSelect>
                <Field.Hint />
              </Field.Root>
            </Box>
            <Box style={{ flex: 1, minWidth: 220 }}>
              <Field.Root
                hint={t(
                  "page.ui.signatory_recorded_on_the_public_hilal_announcem",
                  "Signatory recorded on the public Hilal announcement banner."
                )}
              >
                <Field.Label>
                  {t(
                    "field.approved_by_imam_religious_authority",
                    "Approved By (Imam / Religious Authority)"
                  )}
                </Field.Label>
                <TextInput
                  name="hilalImamName"
                  placeholder={t(
                    "placeholder.e_g_sheikh_principal_de_la_mezquita",
                    "e.g., Head Imam of the Mosque"
                  )}
                  value={hilalImamName}
                  onChange={(e: InputChangeEvent) =>
                    setHilalImamName(e.target.value)
                  }
                />
                <Field.Hint />
              </Field.Root>
            </Box>
          </Flex>
          <Flex justifyContent="space-between" alignItems="center">
            <Checkbox
              checked={hilalActivateBanner}
              onCheckedChange={(val: boolean) =>
                setHilalActivateBanner(Boolean(val))
              }
            >
              {t(
                "checkbox.activate_ramadan_eid_banner",
                "Activate Ramadan / Eid Banner & Sync Calendar Hijri Offset"
              )}
            </Checkbox>
            <Button onClick={onConfirmHilal} loading={savingAction}>
              {t(
                "page.ui.confirm_hilal_sighting_btn",
                "Confirm Hilal Sighting"
              )}
            </Button>
          </Flex>
        </Flex>
      </Box>

      <Box
        background="neutral0"
        padding={5}
        hasRadius
        shadow="filterShadow"
        style={{ border: "1px solid rgba(128, 128, 128, 0.22)" }}
      >
        <Box marginBottom={4} style={{ marginBottom: 16 }}>
          <Typography variant="delta" tag="h2">
            {t(
              "page.ui.upcoming_observances_title",
              "Upcoming Islamic Observances, Ramadan & Eid Dates ({count})",
              { count: observances.length }
            )}
          </Typography>
        </Box>
        <Table colCount={5} rowCount={observances.length}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.observance", "Observance")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.hijri_date", "Hijri Date")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.est_gregorian_date", "Est. Gregorian Date")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.countdown", "Countdown")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.fasting_ruling", "Fasting Ruling")}
                </Typography>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {observances.map((obs) => (
              <Tr key={obs.id}>
                <Td>
                  <Typography fontWeight="bold">
                    {pickLocalizedText(obs.titles, lang)}
                  </Typography>
                </Td>
                <Td>
                  <Typography>{obs.hijriFormatted}</Typography>
                </Td>
                <Td>
                  <Typography fontWeight="bold">
                    {obs.estimatedGregorianDate}
                  </Typography>
                </Td>
                <Td>
                  <Badge active={obs.daysUntil <= 30}>
                    {t("page.ui.days_until_badge", "{days} days", {
                      days: obs.daysUntil,
                    })}
                  </Badge>
                </Td>
                <Td>
                  <Badge>
                    {obs.fastingRecommendedOrObligatory.toUpperCase()}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};
