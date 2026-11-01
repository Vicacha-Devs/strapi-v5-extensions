import {
  Badge,
  Box,
  Flex,
  IconButton,
  Typography,
} from "@strapi/design-system";
import { Pencil, Pin, Trash } from "@strapi/icons";
import * as React from "react";
import { useIntl } from "react-intl";

import {
  formatNoteAuthorDisplay,
  formatNoteTimestamp,
  NOTE_CATEGORY_META,
  type NoteRecord,
} from "../../../shared";
import { getTrad } from "../utils";

export interface NoteListItemProps {
  note: NoteRecord;
  onEdit: (note: NoteRecord) => void;
  onRequestDelete: (note: NoteRecord) => void;
  onTogglePin: (note: NoteRecord) => void;
}

export const NoteListItem: React.FC<NoteListItemProps> = ({
  note,
  onEdit,
  onRequestDelete,
  onTogglePin,
}) => {
  const { formatMessage, locale } = useIntl();

  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  const categoryMeta =
    NOTE_CATEGORY_META[note.category] ?? NOTE_CATEGORY_META.general;
  const authorLabel = formatNoteAuthorDisplay(
    note.updatedBy ?? note.createdBy,
    ""
  );
  const timestampLabel = formatNoteTimestamp(
    note.updatedAt ?? note.createdAt,
    locale,
    ""
  );

  return (
    <Box
      tabIndex={0}
      hasRadius
      padding={3}
      background="neutral0"
      borderStyle="solid"
      borderWidth="1px"
      borderColor={note.isPinned ? "primary600" : "neutral150"}
      shadow="tableShadow"
      tag="article"
    >
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Flex gap={2} justifyContent="space-between" alignItems="center">
          <Flex gap={2} alignItems="center" style={{ minWidth: 0, flex: 1 }}>
            <Badge
              backgroundColor={categoryMeta.badgeBackground}
              textColor={categoryMeta.badgeTextColor}
            >
              {t(categoryMeta.labelKey, categoryMeta.defaultLabel)}
            </Badge>
            {note.entityLocale && (
              <Badge backgroundColor="neutral100" textColor="neutral700">
                {note.entityLocale.toUpperCase()}
              </Badge>
            )}
            <Typography
              variant="pi"
              textColor="neutral800"
              fontWeight="bold"
              ellipsis
              style={{ cursor: "pointer" }}
              onClick={() => onEdit(note)}
            >
              {note.title}
            </Typography>
          </Flex>

          <Flex gap={1} alignItems="center">
            <IconButton
              withTooltip={false}
              variant={note.isPinned ? "secondary" : "ghost"}
              onClick={() => onTogglePin(note)}
              label={
                note.isPinned
                  ? t("note.actions.unpin", "Unpin note")
                  : t("note.actions.pin", "Pin note")
              }
            >
              <Pin />
            </IconButton>
            <IconButton
              withTooltip={false}
              variant="ghost"
              onClick={() => onEdit(note)}
              label={t("note.actions.edit", "Edit")}
            >
              <Pencil />
            </IconButton>
            <IconButton
              withTooltip={false}
              variant="ghost"
              onClick={() => onRequestDelete(note)}
              label={t("note.actions.delete", "Delete")}
            >
              <Trash />
            </IconButton>
          </Flex>
        </Flex>

        {(authorLabel || timestampLabel) && (
          <Typography variant="pi" textColor="neutral500" ellipsis>
            {[authorLabel, timestampLabel].filter(Boolean).join(" • ")}
          </Typography>
        )}
      </Flex>
    </Box>
  );
};

export default NoteListItem;
