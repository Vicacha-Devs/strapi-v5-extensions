import {
  Badge,
  Box,
  Button,
  Checkbox,
  DatePicker,
  Field,
  Flex,
  Typography,
} from "@strapi/design-system";
import React from "react";
import { NavLink } from "react-router-dom";

import { describeRRule } from "../../../../shared/rruleEngine";
import type { ExpandedCalendarOccurrence } from "../../../../shared/types";
import {
  formatCategoryLabel,
  formatLocalYmd,
  parseDateTimePickerValue,
} from "./calendarPageHelpers";

export interface OccurrenceDetailDrawerProps {
  t: (id: string, defaultMessage: string) => string;
  occurrence: ExpandedCalendarOccurrence;
  rescheduleDate: string;
  onRescheduleDateChange: (date: string) => void;
  applyToSeries: boolean;
  onApplyToSeriesChange: (apply: boolean) => void;
  onSaveReschedule: () => void;
  onCancelOccurrence: () => void;
  onClose: () => void;
}

export const OccurrenceDetailDrawer: React.FC<OccurrenceDetailDrawerProps> = ({
  t,
  occurrence,
  rescheduleDate,
  onRescheduleDateChange,
  applyToSeries,
  onApplyToSeriesChange,
  onSaveReschedule,
  onCancelOccurrence,
  onClose,
}) => {
  return (
    <Box
      padding={4}
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      style={{ borderLeft: `4px solid ${occurrence.color}` }}
    >
      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        wrap="wrap"
        gap={4}
      >
        <Box style={{ flex: 2, minWidth: 260 }}>
          <Flex gap={2} alignItems="center" wrap="wrap">
            <Badge backgroundColor="neutral150" textColor="neutral800">
              {occurrence.sourceLabel}
            </Badge>
            {occurrence.category && (
              <Badge backgroundColor="primary100" textColor="primary700">
                {formatCategoryLabel(occurrence.category)}
              </Badge>
            )}
            {occurrence.isRecurring && (
              <Badge backgroundColor="secondary100" textColor="secondary700">
                {describeRRule(occurrence.rrule)}
              </Badge>
            )}
            {occurrence.alternateDates &&
              Object.values(occurrence.alternateDates).map((alt) => (
                <Badge
                  key={alt.calendarId}
                  backgroundColor="warning100"
                  textColor="warning700"
                >
                  {alt.label}: {alt.formatted}
                </Badge>
              ))}
          </Flex>

          <Box paddingTop={2}>
            <Typography variant="delta" fontWeight="bold">
              {occurrence.title}
            </Typography>
          </Box>
          <Box paddingTop={1}>
            <Typography variant="omega" textColor="neutral600">
              {occurrence.occurrenceDate}
              {occurrence.location ? ` • ${occurrence.location}` : ""}
            </Typography>
          </Box>
          {occurrence.customFields &&
            Object.keys(occurrence.customFields).length > 0 && (
              <Box paddingTop={2}>
                <Flex gap={2} wrap="wrap">
                  {Object.entries(occurrence.customFields).map(([k, v]) =>
                    v !== null && v !== undefined && String(v).trim() !== "" ? (
                      <Badge
                        key={k}
                        backgroundColor="neutral100"
                        textColor="neutral700"
                      >
                        {k}: {String(v)}
                      </Badge>
                    ) : null
                  )}
                </Flex>
              </Box>
            )}
        </Box>

        <Flex
          direction="column"
          alignItems="flex-end"
          gap={2}
          style={{ flex: "1 1 320px", minWidth: 260 }}
        >
          <Flex
            gap={2}
            alignItems="flex-end"
            wrap="wrap"
            justifyContent="flex-end"
          >
            <Box style={{ minWidth: 180, maxWidth: 220 }}>
              <Field.Root>
                <Field.Label>
                  {t("calendar.rescheduleTo", "Reschedule Date")}
                </Field.Label>
                <DatePicker
                  size="S"
                  value={parseDateTimePickerValue(rescheduleDate)}
                  clearLabel={t("common.clear", "Clear")}
                  onChange={(date: Date | undefined) =>
                    onRescheduleDateChange(date ? formatLocalYmd(date) : "")
                  }
                  onClear={() => onRescheduleDateChange("")}
                />
              </Field.Root>
            </Box>
            <Button size="S" variant="secondary" onClick={onSaveReschedule}>
              {t("calendar.rescheduleAction", "Reschedule")}
            </Button>
          </Flex>

          {occurrence.isRecurring && (
            <Checkbox
              checked={applyToSeries}
              onCheckedChange={(checked: boolean) =>
                onApplyToSeriesChange(Boolean(checked))
              }
            >
              {t("calendar.applyToSeries", "Apply to entire recurring series")}
            </Checkbox>
          )}

          <Flex gap={2} wrap="wrap" justifyContent="flex-end" paddingTop={1}>
            <Button
              size="S"
              variant="tertiary"
              tag={NavLink}
              to={`/content-manager/collection-types/${occurrence.uid}/${occurrence.documentId}${
                occurrence.locale
                  ? `?plugins[i18n][locale]=${encodeURIComponent(occurrence.locale)}`
                  : ""
              }`}
            >
              {t("calendar.editInContentManager", "Open in Content Manager")}
            </Button>
            <Button
              size="S"
              variant="tertiary"
              tag="a"
              href={occurrence.calendarLinks.icsPath}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("calendar.downloadIcs", ".ICS")}
            </Button>
            <Button
              size="S"
              variant="danger-light"
              onClick={onCancelOccurrence}
            >
              {t("calendar.cancelInstance", "Cancel Occurrence")}
            </Button>
            <Button size="S" variant="tertiary" onClick={onClose}>
              {t("common.close", "Close")}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

export default OccurrenceDetailDrawer;
