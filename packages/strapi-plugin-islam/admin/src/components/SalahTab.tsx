import {
  Badge,
  Box,
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import React from "react";

import type {
  DailyFivePrayerId,
  DailyPrayerTimetable,
  IslamPluginSettings,
} from "../../../shared";
import type { TranslateFn } from "./SettingsTabs";

const ORDERED_PRAYERS: DailyFivePrayerId[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

const SalahPrayerRow: React.FC<{
  pKey: DailyFivePrayerId;
  timetable: DailyPrayerTimetable;
  settings: IslamPluginSettings | null;
  t: TranslateFn;
}> = ({ pKey, timetable, settings, t }) => {
  const p = timetable.prayers[pKey];
  const rule = Array.isArray(settings?.iqamahRules)
    ? settings.iqamahRules.find((r) => r.prayerName === pKey)
    : undefined;
  const noteText =
    rule?.notes ||
    t("page.ui.iqamah_offset_note", "+{minutes} min", {
      minutes: rule?.offsetMinutes ?? 15,
    });

  return (
    <Tr>
      <Td>
        <Typography fontWeight="bold">{p.label}</Typography>
      </Td>
      <Td>
        <Typography>{p.adhan}</Typography>
      </Td>
      <Td>
        <Typography fontWeight="bold">{p.iqamah}</Typography>
      </Td>
      <Td>
        {p.isActive ? (
          <Badge active>{t("page.ui.current_window", "CURRENT WINDOW")}</Badge>
        ) : p.isNext ? (
          <Badge>{t("page.ui.next_prayer", "NEXT PRAYER")}</Badge>
        ) : (
          <Typography variant="pi" textColor="neutral500">
            {t("page.ui.scheduled", "Scheduled")}
          </Typography>
        )}
      </Td>
      <Td>
        <Typography variant="pi" textColor="neutral600">
          {noteText}
        </Typography>
      </Td>
    </Tr>
  );
};

export const SalahCockpitTab: React.FC<{
  timetable: DailyPrayerTimetable;
  settings: IslamPluginSettings | null;
  t: TranslateFn;
}> = ({ timetable, settings, t }) => {
  const activePrayerLabel = (
    timetable.activePrayer || t("page.ui.none_label", "None")
  ).toUpperCase();

  return (
    <Box>
      <Box
        marginBottom={6}
        background="neutral0"
        padding={5}
        hasRadius
        shadow="filterShadow"
      >
        <Flex
          justifyContent="space-between"
          alignItems="center"
          marginBottom={4}
          style={{ marginBottom: 16 }}
        >
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="delta" tag="h2">
              {t(
                "page.ui.todays_salah_schedule_title",
                "Today’s Salah, Adhan & Iqamah Schedule ({date})",
                { date: timetable.dateGregorian }
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "page.ui.todays_salah_subtitle",
                "Method: {method} • Asr: {school} • Sunrise: {sunrise} • Imsak: {imsak}",
                {
                  method: timetable.calculation.methodName,
                  school: timetable.calculation.schoolName,
                  sunrise: timetable.times.sunrise,
                  imsak: timetable.times.imsak,
                }
              )}
            </Typography>
          </Flex>
          <Flex gap={2}>
            <Badge active={!timetable.prohibitedTimes.isCurrentlyProhibited}>
              {t("page.ui.badge_active_prayer", "Active: {prayer}", {
                prayer: activePrayerLabel,
              })}
            </Badge>
            <Badge>
              {t(
                "page.ui.badge_next_prayer",
                "Next: {prayer} (in {minutes} min)",
                {
                  prayer: timetable.nextPrayer.toUpperCase(),
                  minutes: timetable.minutesUntilNextAdhan,
                }
              )}
            </Badge>
          </Flex>
        </Flex>

        <Table colCount={5} rowCount={ORDERED_PRAYERS.length}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.prayer_salah", "Prayer (Salah)")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.adhan_time", "Adhan Time")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.congregation_iqamah", "Congregation (Iqamah)")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.window_status", "Window Status")}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {t("page.ui.notes", "Notes")}
                </Typography>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {ORDERED_PRAYERS.map((pKey) => (
              <SalahPrayerRow
                key={pKey}
                pKey={pKey}
                timetable={timetable}
                settings={settings}
                t={t}
              />
            ))}
          </Tbody>
        </Table>
      </Box>

      <Box background="neutral0" padding={5} hasRadius shadow="filterShadow">
        <Box marginBottom={4} style={{ marginBottom: 16 }}>
          <Typography variant="delta" tag="h2">
            {t(
              "page.ui.jumu_ah_congregation_prohibited_makruh_windows",
              "Jumu’ah Congregation & Prohibited (Makruh) Windows"
            )}
          </Typography>
        </Box>
        <Flex gap={4} wrap="wrap" alignItems="stretch">
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={1}
            padding={3}
            background="neutral100"
            hasRadius
            style={{ flex: 1, minWidth: 200 }}
          >
            <Typography fontWeight="bold">
              {t("page.ui.jumu_ah_khutbah_salah", "Jumu’ah Khutbah & Salah")}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "page.ui.jumuah_times_summary",
                "Khutbah: {khutbah} • Salah: {prayer}",
                {
                  khutbah: timetable.jumuah.primaryKhutbahTime,
                  prayer: timetable.jumuah.primaryPrayerTime,
                }
              )}
            </Typography>
          </Flex>
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={1}
            padding={3}
            background="neutral100"
            hasRadius
            style={{ flex: 1, minWidth: 200 }}
          >
            <Typography fontWeight="bold">
              {t("page.ui.sunrise_window_ishraq", "Sunrise Window (Ishraq)")}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {timetable.prohibitedTimes.sunrise.start} –{" "}
              {timetable.prohibitedTimes.sunrise.end}
            </Typography>
          </Flex>
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={1}
            padding={3}
            background="neutral100"
            hasRadius
            style={{ flex: 1, minWidth: 200 }}
          >
            <Typography fontWeight="bold">
              {t("page.ui.zawal_solar_zenith", "Zawal (Solar Zenith)")}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {timetable.prohibitedTimes.zawal.start} –{" "}
              {timetable.prohibitedTimes.zawal.end}
            </Typography>
          </Flex>
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={1}
            padding={3}
            background="neutral100"
            hasRadius
            style={{ flex: 1, minWidth: 200 }}
          >
            <Typography fontWeight="bold">
              {t("page.ui.sunset_window_ghurub", "Sunset Window (Ghurub)")}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {timetable.prohibitedTimes.sunset.start} –{" "}
              {timetable.prohibitedTimes.sunset.end}
            </Typography>
          </Flex>
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={1}
            padding={3}
            background="neutral100"
            hasRadius
            style={{ flex: 1, minWidth: 200 }}
          >
            <Typography fontWeight="bold">
              {t(
                "page.ui.last_third_of_the_night_tahajjud",
                "Last Third of the Night (Tahajjud)"
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {t(
                "page.ui.last_third_summary",
                "Starts at {lastThird} (Midnight: {midnight})",
                {
                  lastThird: timetable.times.lastThird,
                  midnight: timetable.times.midnight,
                }
              )}
            </Typography>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
};
