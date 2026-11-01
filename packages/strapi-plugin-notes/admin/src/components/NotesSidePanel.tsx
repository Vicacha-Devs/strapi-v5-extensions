import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Loader,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { Plus } from "@strapi/icons";
import * as React from "react";
import { useIntl } from "react-intl";

import {
  filterNotesList,
  NOTE_CATEGORIES,
  NOTE_CATEGORY_META,
  type NoteCategory,
  type NoteRecord,
  type NoteUpsertInput,
} from "../../../shared";
import { useNotes } from "../hooks/useNotes";
import { getTrad } from "../utils";
import { DeleteNoteDialog } from "./DeleteNoteDialog";
import { NoteListItem } from "./NoteListItem";
import { NoteModal, type NoteEntityContext } from "./NoteModal";

export interface SidePanelProps {
  activeTab?: string;
  collectionType?: string;
  document?: Record<string, unknown>;
  documentId?: string;
  meta?: Record<string, unknown>;
  model?: string;
}

function detectDocumentLocale(props: SidePanelProps): string | null {
  if (typeof props.document?.locale === "string" && props.document.locale) {
    return props.document.locale;
  }
  if (typeof window !== "undefined") {
    const fromUrl = new URLSearchParams(window.location.search).get(
      "plugins[i18n][locale]"
    );
    if (fromUrl) {
      return fromUrl;
    }
  }
  return null;
}

interface GlobalCmI18nWindow {
  __CM_I18N_MESSAGES__?: Record<string, Record<string, string>>;
}

function interpolateTemplateValues(
  template: string,
  values?: Record<string, string | number>
): string {
  if (!values) return template;
  return Object.entries(values).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    template
  );
}

function formatNoteMessageWithLocale(
  id: string,
  defaultMessage: string,
  formatMessage: (
    descriptor: { id: string; defaultMessage: string },
    values?: Record<string, string | number>
  ) => string,
  locale?: string | null,
  values?: Record<string, string | number>
): string {
  const fullKey = getTrad(id);
  const activeLoc =
    locale ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("plugins[i18n][locale]")
      : null);
  const globalMessages = (globalThis as unknown as GlobalCmI18nWindow)
    .__CM_I18N_MESSAGES__;
  const override = activeLoc
    ? globalMessages?.[activeLoc]?.[fullKey]
    : undefined;
  if (override) {
    return interpolateTemplateValues(override, values);
  }
  return formatMessage({ id: fullKey, defaultMessage }, values);
}

interface NotesSidePanelContentProps {
  entity: NoteEntityContext;
}

const NotesSidePanelContent: React.FC<NotesSidePanelContentProps> = ({
  entity,
}) => {
  const { formatMessage } = useIntl();
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<
    NoteCategory | "all"
  >("all");
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [activeNote, setActiveNote] = React.useState<NoteRecord | null>(null);
  const [noteToDelete, setNoteToDelete] = React.useState<NoteRecord | null>(
    null
  );

  const { notes, isLoading, isMutating, createNote, updateNote, deleteNote } =
    useNotes({
      entitySlug: entity.slug,
      entityDocumentId: entity.documentId,
      entityId: entity.id,
      entityLocale: entity.locale,
    });

  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number>
  ) =>
    formatNoteMessageWithLocale(
      id,
      defaultMessage,
      formatMessage,
      entity.locale,
      values
    );

  const visibleNotes = React.useMemo(
    () =>
      filterNotesList(notes, {
        category: categoryFilter,
        search: searchQuery,
        sort: "DESC",
      }),
    [notes, categoryFilter, searchQuery]
  );

  const handleUpsert = async (
    payload: NoteUpsertInput,
    existingId?: string | number
  ) => {
    if (existingId !== undefined && existingId !== "") {
      await updateNote(existingId, payload);
    } else {
      await createNote(payload);
    }
    setIsModalOpen(false);
    setActiveNote(null);
  };

  const handleTogglePin = async (note: NoteRecord) => {
    const targetId = note.id || note.documentId;
    if (!targetId) return;
    await updateNote(targetId, { isPinned: !note.isPinned });
  };

  const handleConfirmDelete = async (note: NoteRecord) => {
    const targetId = note.id || note.documentId;
    if (!targetId) return;
    await deleteNote(targetId);
    setNoteToDelete(null);
  };

  return (
    <Box paddingTop={2} paddingBottom={2}>
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Flex justifyContent="space-between" alignItems="center">
          <Typography variant="pi" textColor="neutral600">
            {t("notes.sidePanel.count", "{count} note(s)", {
              count: notes.length,
            })}
          </Typography>
          {entity.locale && (
            <Badge backgroundColor="neutral150" textColor="neutral800">
              {entity.locale.toUpperCase()}
            </Badge>
          )}
        </Flex>

        {notes.length > 1 && (
          <Flex direction="column" alignItems="stretch" gap={2}>
            <TextInput
              name="noteSearch"
              size="S"
              value={searchQuery}
              onChange={(e: { target: { value: string } }) =>
                setSearchQuery(e.target.value)
              }
              placeholder={t(
                "notes.sidePanel.search.placeholder",
                "Filter notes..."
              )}
            />
            <SingleSelect
              size="S"
              value={categoryFilter}
              onChange={(val: string | number) =>
                setCategoryFilter(
                  (String(val) || "all") as NoteCategory | "all"
                )
              }
            >
              <SingleSelectOption value="all">
                {t("category.all", "All categories")}
              </SingleSelectOption>
              {NOTE_CATEGORIES.map((cat) => (
                <SingleSelectOption key={cat} value={cat}>
                  {t(
                    NOTE_CATEGORY_META[cat].labelKey,
                    NOTE_CATEGORY_META[cat].defaultLabel
                  )}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Flex>
        )}

        <Divider />

        {isLoading ? (
          <Flex justifyContent="center" paddingTop={3} paddingBottom={3}>
            <Loader small>{t("notes.loading", "Loading Content ...")}</Loader>
          </Flex>
        ) : visibleNotes.length === 0 ? (
          <Box padding={3} background="neutral100" hasRadius>
            <Typography variant="pi" textColor="neutral600">
              {notes.length === 0
                ? t(
                    "notes.sidePanel.empty",
                    "No editorial notes attached to this entry yet."
                  )
                : t(
                    "notes.sidePanel.noMatches",
                    "No notes match the current filter."
                  )}
            </Typography>
          </Box>
        ) : (
          <Flex
            direction="column"
            alignItems="stretch"
            gap={2}
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {visibleNotes.map((item) => (
              <NoteListItem
                key={String(item.id || item.documentId)}
                note={item}
                onEdit={(selected) => {
                  setActiveNote(selected);
                  setIsModalOpen(true);
                }}
                onRequestDelete={(selected) => setNoteToDelete(selected)}
                onTogglePin={handleTogglePin}
              />
            ))}
          </Flex>
        )}

        <Button
          fullWidth
          variant="secondary"
          startIcon={<Plus />}
          disabled={isLoading || isMutating}
          onClick={() => {
            setActiveNote(null);
            setIsModalOpen(true);
          }}
        >
          {t("note.modal.new.title", "Add a note")}
        </Button>

        <NoteModal
          entity={entity}
          note={activeNote}
          isOpen={isModalOpen}
          isSubmitting={isMutating}
          onClose={() => {
            setIsModalOpen(false);
            setActiveNote(null);
          }}
          onSubmit={handleUpsert}
        />

        <DeleteNoteDialog
          note={noteToDelete}
          isSubmitting={isMutating}
          onCancel={() => setNoteToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      </Flex>
    </Box>
  );
};

function resolveSidePanelDocumentId(props: SidePanelProps): string {
  if (props.documentId) return props.documentId;
  const docId = props.document?.documentId;
  return typeof docId === "string" ? docId : "";
}

function resolveSidePanelNumericId(
  props: SidePanelProps
): number | string | null {
  const id = props.document?.id;
  if (typeof id === "number" || typeof id === "string") {
    return id;
  }
  return null;
}

function resolveSidePanelEntity(
  props: SidePanelProps
): NoteEntityContext | null {
  const slug = props.model ?? "";
  const documentId = resolveSidePanelDocumentId(props);
  const numericId = resolveSidePanelNumericId(props);
  const hasIdentifier = Boolean(documentId || numericId !== null);
  if (!slug || !hasIdentifier) {
    return null;
  }

  return {
    id: numericId,
    documentId: documentId || String(numericId),
    slug,
    locale: detectDocumentLocale(props),
  };
}

export const NotesSidePanel = (props: SidePanelProps) => {
  const { formatMessage } = useIntl();
  const entity = resolveSidePanelEntity(props);
  if (!entity) {
    return null;
  }

  return {
    title: formatNoteMessageWithLocale(
      "plugin.name",
      "Notes",
      formatMessage,
      entity.locale
    ),
    content: <NotesSidePanelContent entity={entity} />,
  };
};

export default NotesSidePanel;
