import {
  Badge,
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import React, { useState } from "react";

import { SUPPORTED_INTL_CALENDARS } from "../../../../shared/calendarSystems";
import type { CalendarSystemConfig } from "../../../../shared/types";

export interface SecondaryCalendarsSectionProps {
  t: (id: string, defaultMessage: string) => string;
  secondaryCalendars: CalendarSystemConfig[];
  onAddOrUpdateCalendar: (calendar: CalendarSystemConfig) => void;
  onToggleCalendarEnabled: (calId: string, enabled: boolean) => void;
  onRemoveCalendar: (calId: string) => void;
}

export const SecondaryCalendarsSection: React.FC<
  SecondaryCalendarsSectionProps
> = ({
  t,
  secondaryCalendars,
  onAddOrUpdateCalendar,
  onToggleCalendarEnabled,
  onRemoveCalendar,
}) => {
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [newCalPreset, setNewCalPreset] = useState<string>("islamic-umalqura");
  const [newCalId, setNewCalId] = useState<string>("hijri");
  const [newCalLabel, setNewCalLabel] = useState<string>("Hijri (Umm al-Qura)");
  const [newCalLocale, setNewCalLocale] = useState<string>("local");
  const [newCalOverrideField, setNewCalOverrideField] =
    useState<string>("hijriDate");
  const [newCalDayOffset, setNewCalDayOffset] = useState<number>(0);

  const handleEditCalendarSystem = (cal: CalendarSystemConfig) => {
    setNewCalPreset(cal.intlCalendar || "islamic-umalqura");
    setNewCalId(cal.id || "hijri");
    setNewCalLabel(cal.label || "Hijri (Umm al-Qura)");
    setNewCalLocale(cal.locale || "local");
    setNewCalOverrideField(cal.overrideField || "hijriDate");
    setNewCalDayOffset(cal.dayOffset ?? 0);
    setIsFormOpen(true);
  };

  const handleAddCalendarSystem = () => {
    if (!newCalId.trim() || !newCalPreset) return;
    const cleanId = newCalId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "");
    if (!cleanId) return;

    const nextEntry: CalendarSystemConfig = {
      id: cleanId,
      label: newCalLabel.trim() || cleanId,
      intlCalendar: newCalPreset,
      locale:
        newCalLocale && newCalLocale !== "local"
          ? newCalLocale.trim()
          : undefined,
      dayOffset: newCalDayOffset || 0,
      overrideField: newCalOverrideField.trim() || undefined,
      enabled: true,
    };

    onAddOrUpdateCalendar(nextEntry);
  };

  return (
    <Box
      padding={5}
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      style={{ border: "1px solid rgba(128, 128, 128, 0.22)" }}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          wrap="wrap"
          gap={3}
        >
          <Box style={{ flex: 1, minWidth: 280 }}>
            <Typography variant="delta" fontWeight="bold" tag="h2">
              {t(
                "settings.section.secondaryCalendars",
                "Secondary & Alternative Calendar Systems (Intl / Custom)"
              )}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "settings.secondaryCalendarsHint",
                  "Display optional secondary dates (such as Hijri Umm al-Qura) alongside Gregorian dates in day cells. Supports local language or Arabic script and moon-sighting day offsets (-2 to +2 days)."
                )}
              </Typography>
            </Box>
          </Box>
          <Flex gap={2} alignItems="center">
            <Badge active>
              {secondaryCalendars.length}{" "}
              {t("settings.configuredCount", "Configured")}
            </Badge>
            <Button
              variant={isFormOpen ? "tertiary" : "secondary"}
              size="S"
              onClick={() => setIsFormOpen((prev) => !prev)}
            >
              {isFormOpen
                ? t("common.hideForm", "Hide Form")
                : `+ ${t("settings.addCalendar", "Add Calendar System")}`}
            </Button>
          </Flex>
        </Flex>

        {secondaryCalendars.map((cal) => (
          <Box
            key={cal.id}
            padding={4}
            background="neutral100"
            hasRadius
            style={{
              border: "1px solid rgba(128, 128, 128, 0.18)",
              borderLeft: "4px solid #0284C7",
            }}
          >
            <Flex
              justifyContent="space-between"
              alignItems="center"
              wrap="wrap"
              gap={3}
            >
              <Flex gap={2} alignItems="center" wrap="wrap">
                <Typography variant="omega" fontWeight="bold">
                  {cal.label}
                </Typography>
                <Badge backgroundColor="secondary100" textColor="secondary700">
                  {cal.intlCalendar}
                </Badge>
                <Badge backgroundColor="primary100" textColor="primary700">
                  {cal.locale === "ar" || cal.locale === "ar-SA"
                    ? t(
                        "settings.badge.arabicScript",
                        "Arabic Script (العربية)"
                      )
                    : t("settings.badge.localLanguage", "Local Language")}
                </Badge>
                {cal.overrideField && (
                  <Badge backgroundColor="neutral200" textColor="neutral800">
                    {t("settings.badge.overrideField", "Override field")}:{" "}
                    {cal.overrideField}
                  </Badge>
                )}
                <Badge backgroundColor="warning100" textColor="warning700">
                  {t("settings.badge.offset", "Offset")}:{" "}
                  {(cal.dayOffset ?? 0) > 0
                    ? `+${cal.dayOffset}`
                    : (cal.dayOffset ?? 0)}
                  d
                </Badge>
              </Flex>

              <Flex gap={3} alignItems="center">
                <Checkbox
                  checked={cal.enabled}
                  onCheckedChange={(checked: boolean) =>
                    onToggleCalendarEnabled(cal.id, Boolean(checked))
                  }
                >
                  {t("settings.calendarEnabled", "Enabled")}
                </Checkbox>
                <Button
                  variant="tertiary"
                  size="S"
                  onClick={() => handleEditCalendarSystem(cal)}
                >
                  {t("common.edit", "Edit")}
                </Button>
                <Button
                  variant="danger-light"
                  size="S"
                  onClick={() => onRemoveCalendar(cal.id)}
                >
                  {t("common.remove", "Remove")}
                </Button>
              </Flex>
            </Flex>
          </Box>
        ))}

        {isFormOpen && (
          <Box
            padding={5}
            background="neutral100"
            hasRadius
            style={{ border: "1px solid rgba(128, 128, 128, 0.18)" }}
          >
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography variant="sigma" textColor="neutral700">
                {t(
                  "settings.configureCalendarTitle",
                  "Configure Secondary Calendar System"
                )}
              </Typography>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <Field.Root
                  hint={t(
                    "settings.calendarPresetHint",
                    "Unicode CLDR calendar identifier used by Intl.DateTimeFormat."
                  )}
                >
                  <Field.Label>
                    {t("settings.calendarPreset", "Calendar System (CLDR)")}
                  </Field.Label>
                  <SingleSelect
                    placeholder={t(
                      "settings.calendarPreset.placeholder",
                      "Select CLDR calendar system"
                    )}
                    value={newCalPreset || "islamic-umalqura"}
                    onChange={(val: string | number) => {
                      const strVal = String(val);
                      setNewCalPreset(strVal);
                      const match = SUPPORTED_INTL_CALENDARS.find(
                        (c) => c.intlCalendar === strVal
                      );
                      if (match) {
                        setNewCalId(match.id.split("-")[0]);
                        setNewCalLabel(match.defaultLabel);
                      }
                    }}
                  >
                    {SUPPORTED_INTL_CALENDARS.filter(
                      (c) => c.id !== "gregory"
                    ).map((cal) => (
                      <SingleSelectOption key={cal.id} value={cal.intlCalendar}>
                        {cal.defaultLabel} ({cal.intlCalendar})
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  hint={t(
                    "settings.calendarIdHint",
                    "Unique slug key for this calendar overlay."
                  )}
                >
                  <Field.Label>
                    {t("settings.calendarId", "ID Key")}
                  </Field.Label>
                  <TextInput
                    value={newCalId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCalId(e.target.value)
                    }
                    placeholder={t(
                      "settings.calendarId.placeholder",
                      "e.g., hijri"
                    )}
                  />
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  hint={t(
                    "settings.calendarLabelHint",
                    "Badge label displayed in calendar headers and tooltips."
                  )}
                >
                  <Field.Label>
                    {t("settings.calendarLabel", "Display Label")}
                  </Field.Label>
                  <TextInput
                    value={newCalLabel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCalLabel(e.target.value)
                    }
                    placeholder={t(
                      "settings.calendarLabel.placeholder",
                      "e.g., Hijri (Umm al-Qura)"
                    )}
                  />
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  hint={t(
                    "settings.calendarScriptHint",
                    "Locale used to render month names and numerals."
                  )}
                >
                  <Field.Label>
                    {t("settings.calendarScript", "Language / Script Override")}
                  </Field.Label>
                  <SingleSelect
                    placeholder={t(
                      "settings.calendarScript.placeholder",
                      "Select script override"
                    )}
                    value={newCalLocale || "local"}
                    onChange={(val: string | number) => {
                      setNewCalLocale(String(val));
                    }}
                  >
                    <SingleSelectOption value="local">
                      {t(
                        "settings.calendarScript.local",
                        "Follow Calendar Language (Local)"
                      )}
                    </SingleSelectOption>
                    <SingleSelectOption value="ar-SA">
                      {t(
                        "settings.calendarScript.ar",
                        "Arabic Script — العربية (ar-SA)"
                      )}
                    </SingleSelectOption>
                    <SingleSelectOption value="es">
                      {t("settings.calendarScript.es", "Español (es)")}
                    </SingleSelectOption>
                    <SingleSelectOption value="en">
                      {t("settings.calendarScript.en", "English (en)")}
                    </SingleSelectOption>
                  </SingleSelect>
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  hint={t(
                    "settings.overrideFieldHint",
                    "Optional entry field that overrides calculated dates."
                  )}
                >
                  <Field.Label>
                    {t("settings.overrideField", "Document Override Field")}
                  </Field.Label>
                  <TextInput
                    value={newCalOverrideField}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCalOverrideField(e.target.value)
                    }
                    placeholder={t(
                      "settings.overrideField.placeholder",
                      "e.g., hijriDate"
                    )}
                  />
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  hint={t(
                    "settings.dayOffsetHint",
                    "Moon-sighting adjustment in days (-2 to +2)."
                  )}
                >
                  <Field.Label>
                    {t("settings.dayOffset", "Lunar Day Offset (-2 to +2)")}
                  </Field.Label>
                  <NumberInput
                    placeholder={t("settings.dayOffset.placeholder", "e.g., 0")}
                    value={newCalDayOffset}
                    onValueChange={(val: number | undefined) =>
                      setNewCalDayOffset(typeof val === "number" ? val : 0)
                    }
                  />
                  <Field.Hint />
                </Field.Root>
              </div>

              <Flex justifyContent="flex-end" gap={2}>
                <Button variant="default" onClick={handleAddCalendarSystem}>
                  + {t("settings.saveCalendar", "Save Calendar System")}
                </Button>
              </Flex>
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default SecondaryCalendarsSection;
