import {
  Badge,
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import React, { useEffect, useMemo, useState } from "react";

import type { CalendarSourceMapping, DiscoveredContentType } from "../../../../shared/types";

export interface CollectionSourcesSectionProps {
  t: (id: string, defaultMessage: string) => string;
  sources: CalendarSourceMapping[];
  contentTypes: DiscoveredContentType[];
  onAddOrUpdateSource: (source: CalendarSourceMapping) => void;
  onToggleSourceEnabled: (sourceId: string, enabled: boolean) => void;
  onRemoveSource: (sourceId: string) => void;
}

const CARD_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.22)",
};

const SUB_CARD_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.18)",
};

export const CollectionSourcesSection: React.FC<CollectionSourcesSectionProps> = ({
  t,
  sources,
  contentTypes,
  onAddOrUpdateSource,
  onToggleSourceEnabled,
  onRemoveSource,
}) => {
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [newSourceUid, setNewSourceUid] = useState<string>("plugin::events.event");
  const [newSourceLabel, setNewSourceLabel] = useState<string>(() =>
    t("settings.defaultSourceLabel", "Mosque Events")
  );
  const [newSourceColor, setNewSourceColor] = useState<string>("#0284C7");
  const [newTitleField, setNewTitleField] = useState<string>("title");
  const [newStartField, setNewStartField] = useState<string>("startDate");
  const [newEndField, setNewEndField] = useState<string>("endDate");
  const [newRRuleField, setNewRRuleField] = useState<string>("recurrence");

  const selectCollectionDefaults = (ct: DiscoveredContentType) => {
    setNewSourceUid(ct.uid);
    setNewSourceLabel(ct.displayName || ct.uid);
    const fieldNames = ct.fields.map((f) => f.name);
    const bestTitle =
      fieldNames.find((n) =>
        [
          "title",
          "name",
          "customerName",
          "visitorName",
          "headline",
          "subject",
          "fullName",
          "slug",
        ].includes(n)
      ) ??
      ct.fields.find((f) => f.type === "string" || f.type === "text" || f.type === "uid")?.name ??
      ct.fields[0]?.name ??
      "title";
    const bestStart =
      fieldNames.find((n) =>
        [
          "startDate",
          "preferredDate",
          "date",
          "scheduledAt",
          "releasedAt",
          "publishedAt",
          "createdAt",
          "updatedAt",
        ].includes(n)
      ) ??
      ct.fields.find((f) => f.type === "datetime" || f.type === "date")?.name ??
      ct.fields[0]?.name ??
      "startDate";
    const bestEnd =
      fieldNames.find((n) => ["endDate", "finishDate", "expiresAt"].includes(n)) ?? "endDate";
    const bestRRule =
      fieldNames.find((n) => ["recurrence", "rrule", "recurrenceRule"].includes(n)) ?? "recurrence";

    setNewTitleField(bestTitle);
    setNewStartField(bestStart);
    setNewEndField(bestEnd);
    setNewRRuleField(bestRRule);
  };

  useEffect(() => {
    if (contentTypes.length > 0) {
      const currentExists = contentTypes.find((ct) => ct.uid === newSourceUid);
      if (currentExists) {
        selectCollectionDefaults(currentExists);
      } else {
        const preferred =
          contentTypes.find((ct) => ct.uid === "plugin::events.event") ??
          contentTypes.find((ct) => !sources.some((s) => s.uid === ct.uid)) ??
          contentTypes[0];
        if (preferred) {
          selectCollectionDefaults(preferred);
        }
      }
    }
  }, [contentTypes]);

  const selectedCtFields = useMemo(() => {
    const found = contentTypes.find((ct) => ct.uid === newSourceUid);
    const base = found?.fields ? [...found.fields] : [];
    const ensureField = (name: string, fallbackType: string) => {
      if (name && !base.some((f) => f.name === name)) {
        base.push({ name, type: fallbackType });
      }
    };
    ensureField(newTitleField || "title", "string");
    ensureField(newStartField || "startDate", "datetime");
    return base;
  }, [contentTypes, newSourceUid, newTitleField, newStartField]);

  const handleEditSource = (src: CalendarSourceMapping) => {
    setNewSourceUid(src.uid);
    setNewSourceLabel(src.label);
    setNewSourceColor(src.color || "#0284C7");
    setNewTitleField(src.fields.title || "title");
    setNewStartField(src.fields.startDate || "startDate");
    setNewEndField(src.fields.endDate || "endDate");
    setNewRRuleField(src.fields.rrule || "recurrence");
    setIsFormOpen(true);
  };

  const handleSaveSource = () => {
    if (!newSourceUid || !newTitleField || !newStartField) return;
    const idSlug = (newSourceLabel || newSourceUid)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const nextSource: CalendarSourceMapping = {
      id: idSlug || `source-${Date.now()}`,
      label: newSourceLabel.trim() || newSourceUid,
      uid: newSourceUid,
      color: newSourceColor.startsWith("#") ? newSourceColor : "#0284C7",
      enabled: true,
      fields: {
        title: newTitleField,
        startDate: newStartField,
        endDate: newEndField.trim() || undefined,
        rrule: newRRuleField.trim() || undefined,
      },
    };

    onAddOrUpdateSource(nextSource);
  };

  return (
    <Box padding={5} background="neutral0" hasRadius shadow="tableShadow" style={CARD_BORDER_STYLE}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap" gap={3}>
          <Box style={{ flex: 1, minWidth: 280 }}>
            <Typography variant="delta" fontWeight="bold" tag="h2">
              {t("settings.section.sources", "Mapped Collection Sources")}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="pi" textColor="neutral600">
                {t(
                  "settings.sourcesHint",
                  "Connects Strapi Collection Types (such as Events or Bookings) so their records are automatically plotted on the unified calendar. Each mapping defines which fields represent the item title, start/end dates, and optional recurrence rules."
                )}
              </Typography>
            </Box>
          </Box>
          <Flex gap={2} alignItems="center">
            <Badge active>
              {sources.length} {t("settings.mappedCount", "Mapped")}
            </Badge>
            <Button
              variant={isFormOpen ? "tertiary" : "secondary"}
              size="S"
              onClick={() => setIsFormOpen((prev) => !prev)}
            >
              {isFormOpen
                ? t("common.hideForm", "Hide Mapping Form")
                : `+ ${t("settings.addSourceToggle", "Map Collection Type")}`}
            </Button>
          </Flex>
        </Flex>

        {sources.length === 0 ? (
          <Box padding={4} background="neutral100" hasRadius style={SUB_CARD_BORDER_STYLE}>
            <Typography variant="omega" textColor="neutral600">
              {t(
                "settings.noSources",
                "No collection types are mapped yet. Use the form below to plot Events, Bookings, or Articles on the calendar."
              )}
            </Typography>
          </Box>
        ) : (
          <Flex direction="column" alignItems="stretch" gap={2}>
            {sources.map((src) => (
              <Box
                key={src.id}
                padding={4}
                background="neutral100"
                hasRadius
                style={{
                  ...SUB_CARD_BORDER_STYLE,
                  borderLeft: `4px solid ${src.color || "#0284C7"}`,
                }}
              >
                <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
                  <Flex gap={3} alignItems="center" wrap="wrap">
                    <span
                      style={{
                        display: "inline-block",
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: src.color,
                      }}
                    />
                    <Typography variant="omega" fontWeight="bold">
                      {src.label}
                    </Typography>
                    <Badge backgroundColor="neutral200" textColor="neutral800">
                      {src.uid}
                    </Badge>
                    <Badge backgroundColor="primary100" textColor="primary700">
                      {t("settings.badge.title", "Title")}: {src.fields.title} ·{" "}
                      {t("settings.badge.start", "Start")}: {src.fields.startDate}
                      {src.fields.endDate
                        ? ` · ${t("settings.badge.end", "End")}: ${src.fields.endDate}`
                        : ""}
                    </Badge>
                  </Flex>

                  <Flex gap={3} alignItems="center">
                    <Checkbox
                      checked={src.enabled}
                      onCheckedChange={(checked: boolean) =>
                        onToggleSourceEnabled(src.id, Boolean(checked))
                      }
                    >
                      {t("settings.sourceEnabled", "Enabled")}
                    </Checkbox>
                    <Button variant="tertiary" size="S" onClick={() => handleEditSource(src)}>
                      {t("common.edit", "Edit")}
                    </Button>
                    <Button variant="danger-light" size="S" onClick={() => onRemoveSource(src.id)}>
                      {t("common.remove", "Remove")}
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        )}

        {/* Add / Update Collection Source Form */}
        {isFormOpen && (
          <Box padding={5} background="neutral100" hasRadius style={SUB_CARD_BORDER_STYLE}>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography variant="sigma" textColor="neutral700">
                {t("settings.addSourceTitle", "Configure Collection Type Mapping")}
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
                    "settings.collectionTypeHint",
                    "Select which Strapi Collection Type provides the dated entries."
                  )}
                >
                  <Field.Label>
                    {t("settings.collectionType", "Strapi Collection Type")}
                  </Field.Label>
                  {contentTypes.length > 0 ? (
                    <SingleSelect
                      placeholder={t(
                        "settings.collectionType.placeholder",
                        "Select Strapi Collection Type"
                      )}
                      value={newSourceUid || contentTypes[0]?.uid || "plugin::events.event"}
                      onChange={(val: string | number) => {
                        const uid = String(val);
                        const found = contentTypes.find((c) => c.uid === uid);
                        if (found) {
                          selectCollectionDefaults(found);
                        } else {
                          setNewSourceUid(uid);
                        }
                      }}
                    >
                      {contentTypes.map((ct) => (
                        <SingleSelectOption key={ct.uid} value={ct.uid}>
                          {ct.displayName} ({ct.uid})
                        </SingleSelectOption>
                      ))}
                    </SingleSelect>
                  ) : (
                    <TextInput
                      value={newSourceUid}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewSourceUid(e.target.value)
                      }
                      placeholder={t(
                        "settings.collectionTypeUid.placeholder",
                        "e.g., plugin::events.event"
                      )}
                    />
                  )}
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  hint={t(
                    "settings.sourceLabelHint",
                    "Human-readable label shown on calendar filter chips."
                  )}
                >
                  <Field.Label>{t("settings.sourceLabel", "Calendar Filter Label")}</Field.Label>
                  <TextInput
                    value={newSourceLabel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewSourceLabel(e.target.value)
                    }
                    placeholder={t("settings.sourceLabel.placeholder", "e.g., Mosque Events")}
                  />
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  hint={t(
                    "settings.sourceColorHint",
                    "Hex color accent applied to calendar chips for this source."
                  )}
                >
                  <Field.Label>{t("settings.sourceColor", "Event Badge Color (Hex)")}</Field.Label>
                  <TextInput
                    value={newSourceColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewSourceColor(e.target.value)
                    }
                    placeholder={t("settings.sourceColor.placeholder", "e.g., #0284C7")}
                  />
                  <Field.Hint />
                </Field.Root>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <Field.Root
                  required
                  hint={t(
                    "settings.field.titleHint",
                    "Attribute displayed as the calendar event title."
                  )}
                >
                  <Field.Label>{t("settings.field.title", "Title Field")}</Field.Label>
                  <SingleSelect
                    placeholder={t("settings.field.title.placeholder", "Select title field")}
                    value={newTitleField || "title"}
                    onChange={(val: string | number) => setNewTitleField(String(val))}
                  >
                    {selectedCtFields.map((f) => (
                      <SingleSelectOption key={f.name} value={f.name}>
                        {f.name} ({f.type})
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  required
                  hint={t(
                    "settings.field.startDateHint",
                    "Date or DateTime field used to place the entry on the grid."
                  )}
                >
                  <Field.Label>{t("settings.field.startDate", "Start Date Field")}</Field.Label>
                  <SingleSelect
                    placeholder={t(
                      "settings.field.startDate.placeholder",
                      "Select start date field"
                    )}
                    value={newStartField || "startDate"}
                    onChange={(val: string | number) => setNewStartField(String(val))}
                  >
                    {selectedCtFields.map((f) => (
                      <SingleSelectOption key={f.name} value={f.name}>
                        {f.name} ({f.type})
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  hint={t(
                    "settings.field.endDateHint",
                    "Optional end Date/DateTime attribute for multi-hour or multi-day spans."
                  )}
                >
                  <Field.Label>
                    {t("settings.field.endDate", "End Date Field (Optional)")}
                  </Field.Label>
                  <TextInput
                    value={newEndField}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewEndField(e.target.value)
                    }
                    placeholder={t("settings.field.endDate.placeholder", "e.g., endDate")}
                  />
                  <Field.Hint />
                </Field.Root>

                <Field.Root
                  hint={t(
                    "settings.field.rruleHint",
                    "Optional RFC 5545 RRULE field for repeating schedules."
                  )}
                >
                  <Field.Label>
                    {t("settings.field.rrule", "Recurrence Field (Optional)")}
                  </Field.Label>
                  <TextInput
                    value={newRRuleField}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewRRuleField(e.target.value)
                    }
                    placeholder={t("settings.field.rrule.placeholder", "e.g., recurrence")}
                  />
                  <Field.Hint />
                </Field.Root>
              </div>

              <Flex justifyContent="flex-end" gap={2}>
                <Button variant="default" onClick={handleSaveSource}>
                  + {t("settings.addSourceButton", "Save Collection Source")}
                </Button>
              </Flex>
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default CollectionSourcesSection;
