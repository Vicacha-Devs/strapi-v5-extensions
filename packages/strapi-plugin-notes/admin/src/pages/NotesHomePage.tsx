import {
  Badge,
  Button,
  EmptyStateLayout,
  Flex,
  IconButton,
  Loader,
  Main,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { ExternalLink, Pencil, Pin, Trash } from "@strapi/icons";
import { Layouts } from "@strapi/strapi/admin";
import * as React from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import {
  buildContentManagerNoteLink,
  filterNotesList,
  formatNoteAuthorDisplay,
  formatNoteTimestamp,
  NOTE_CATEGORY_META,
  type NoteCategory,
  type NoteRecord,
  type NoteUpsertInput,
} from "../../../shared";
import { DeleteNoteDialog } from "../components/DeleteNoteDialog";
import { NoteModal } from "../components/NoteModal";
import { NotesHubFilterBar } from "../components/NotesHubFilterBar";
import { useNotes } from "../hooks/useNotes";
import { getTrad } from "../utils";

function formatNoteContentPreview(content: string): string {
  return content.length > 90 ? `${content.slice(0, 90)}…` : content;
}

interface NoteHubActionsCellProps {
  note: NoteRecord;
  deepLink: string | null;
  t: (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number>
  ) => string;
  onNavigate: (to: string) => void;
  onEdit: (note: NoteRecord) => void;
  onDelete: (note: NoteRecord) => void;
  onTogglePin: (note: NoteRecord) => void;
}

const NoteHubActionsCell: React.FC<NoteHubActionsCellProps> = ({
  note,
  deepLink,
  t,
  onNavigate,
  onEdit,
  onDelete,
  onTogglePin,
}) => {
  const pinVariant = note.isPinned ? "secondary" : "ghost";
  const pinLabel = note.isPinned
    ? t("note.actions.unpin", "Unpin note")
    : t("note.actions.pin", "Pin note");

  return (
    <Flex gap={1} alignItems="center">
      {deepLink && (
        <IconButton
          withTooltip={false}
          variant="ghost"
          label={t("hub.actions.openEntry", "Open Content Manager entry")}
          onClick={() => onNavigate(deepLink)}
        >
          <ExternalLink />
        </IconButton>
      )}
      <IconButton
        withTooltip={false}
        variant={pinVariant}
        label={pinLabel}
        onClick={() => onTogglePin(note)}
      >
        <Pin />
      </IconButton>
      <IconButton
        withTooltip={false}
        variant="ghost"
        label={t("note.actions.edit", "Edit")}
        onClick={() => onEdit(note)}
      >
        <Pencil />
      </IconButton>
      <IconButton
        withTooltip={false}
        variant="ghost"
        label={t("note.actions.delete", "Delete")}
        onClick={() => onDelete(note)}
      >
        <Trash />
      </IconButton>
    </Flex>
  );
};

interface NoteHubRowProps {
  note: NoteRecord;
  locale: string;
  t: (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number>
  ) => string;
  onNavigate: (to: string) => void;
  onEdit: (note: NoteRecord) => void;
  onDelete: (note: NoteRecord) => void;
  onTogglePin: (note: NoteRecord) => void;
}

const NoteHubRow: React.FC<NoteHubRowProps> = ({
  note,
  locale,
  t,
  onNavigate,
  onEdit,
  onDelete,
  onTogglePin,
}) => {
  const catMeta =
    NOTE_CATEGORY_META[note.category] ?? NOTE_CATEGORY_META.general;
  const deepLink = buildContentManagerNoteLink(note);
  const entityBadgeText = note.entityDocumentId || String(note.entityId ?? "");

  return (
    <Tr>
      <Td>
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Flex gap={2} alignItems="center">
            {note.isPinned && (
              <Badge backgroundColor="primary100" textColor="primary700">
                {t("hub.badge.pinned", "PINNED")}
              </Badge>
            )}
            <Typography
              fontWeight="bold"
              textColor="neutral800"
              style={{ cursor: "pointer" }}
              onClick={() => onEdit(note)}
            >
              {note.title}
            </Typography>
          </Flex>
          {note.content && (
            <Typography variant="pi" textColor="neutral600" ellipsis>
              {formatNoteContentPreview(note.content)}
            </Typography>
          )}
        </Flex>
      </Td>

      <Td>
        <Badge
          backgroundColor={catMeta.badgeBackground}
          textColor={catMeta.badgeTextColor}
        >
          {t(catMeta.labelKey, catMeta.defaultLabel)}
        </Badge>
      </Td>

      <Td>
        <Flex gap={2} alignItems="center">
          <Typography variant="pi" textColor="neutral800">
            {note.entitySlug}
          </Typography>
          <Badge backgroundColor="neutral100" textColor="neutral700">
            {entityBadgeText}
          </Badge>
          {note.entityLocale && (
            <Badge backgroundColor="secondary100" textColor="secondary700">
              {note.entityLocale.toUpperCase()}
            </Badge>
          )}
        </Flex>
      </Td>

      <Td>
        <Typography variant="pi" textColor="neutral800">
          {formatNoteAuthorDisplay(note.createdBy)}
        </Typography>
      </Td>

      <Td>
        <Flex direction="column" alignItems="flex-start" gap={0}>
          <Typography variant="pi" textColor="neutral800">
            {formatNoteTimestamp(note.updatedAt ?? note.createdAt, locale)}
          </Typography>
          {note.updatedBy && (
            <Typography variant="pi" textColor="neutral500">
              {formatNoteAuthorDisplay(note.updatedBy)}
            </Typography>
          )}
        </Flex>
      </Td>

      <Td>
        <NoteHubActionsCell
          note={note}
          deepLink={deepLink}
          t={t}
          onNavigate={onNavigate}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
        />
      </Td>
    </Tr>
  );
};

export const NotesHomePage: React.FC = () => {
  const { formatMessage, locale } = useIntl();
  const navigate = useNavigate();

  const {
    notes,
    summary,
    isLoading,
    isMutating,
    refetch,
    updateNote,
    deleteNote,
  } = useNotes({
    includeAllLocales: true,
  });

  const [search, setSearch] = React.useState<string>("");
  const [selectedCategory, setSelectedCategory] = React.useState<
    NoteCategory | "all"
  >("all");
  const [selectedSlug, setSelectedSlug] = React.useState<string>("all");
  const [pinnedOnly, setPinnedOnly] = React.useState<boolean>(false);

  const [editingNote, setEditingNote] = React.useState<NoteRecord | null>(null);
  const [deletingNote, setDeletingNote] = React.useState<NoteRecord | null>(
    null
  );

  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number>
  ) => formatMessage({ id: getTrad(id), defaultMessage }, values);

  const filteredNotes = React.useMemo(
    () =>
      filterNotesList(notes, {
        search,
        category: selectedCategory,
        entitySlug: selectedSlug === "all" ? undefined : selectedSlug,
        isPinned: pinnedOnly ? true : undefined,
        includeAllLocales: true,
        sort: "DESC",
      }),
    [notes, search, selectedCategory, selectedSlug, pinnedOnly]
  );

  const handleSaveEdit = async (
    payload: NoteUpsertInput,
    existingId?: string | number
  ) => {
    if (existingId !== undefined && existingId !== "") {
      await updateNote(existingId, payload);
    }
    setEditingNote(null);
  };

  const handleTogglePin = async (note: NoteRecord) => {
    const id = note.id || note.documentId;
    if (!id) return;
    await updateNote(id, { isPinned: !note.isPinned });
  };

  const handleConfirmDelete = async (note: NoteRecord) => {
    const id = note.id || note.documentId;
    if (!id) return;
    await deleteNote(id);
    setDeletingNote(null);
  };

  return (
    <Main>
      <Layouts.Header
        title={t("hub.title", "Editorial Notes Hub")}
        subtitle={t(
          "hub.subtitle",
          "Search, filter, and manage editorial notes across all Strapi v5 Content Manager entries."
        )}
        primaryAction={
          <Button
            variant="secondary"
            onClick={() => void refetch()}
            loading={isLoading}
          >
            {t("hub.actions.refresh", "Refresh")}
          </Button>
        }
      />

      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <NotesHubFilterBar
            summary={summary}
            search={search}
            selectedCategory={selectedCategory}
            selectedSlug={selectedSlug}
            pinnedOnly={pinnedOnly}
            onSearchChange={setSearch}
            onCategoryChange={setSelectedCategory}
            onSlugChange={setSelectedSlug}
            onPinnedOnlyChange={setPinnedOnly}
          />

          {/* Notes Table */}
          {isLoading ? (
            <Flex justifyContent="center" padding={8}>
              <Loader>{t("notes.loading", "Loading Content ...")}</Loader>
            </Flex>
          ) : filteredNotes.length === 0 ? (
            <EmptyStateLayout
              content={t(
                "hub.empty",
                "No editorial notes found matching your current filters."
              )}
            />
          ) : (
            <Table colCount={6} rowCount={filteredNotes.length + 1}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">
                      {t("note.modal.fields.title", "Title")}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t("note.modal.fields.category", "Category")}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t("hub.table.targetEntity", "Target Entry")}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t("note.modal.meta.createdBy", "Created By")}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t("note.modal.meta.updatedAt", "Updated At")}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {t("hub.table.actions", "Actions")}
                    </Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredNotes.map((note) => (
                  <NoteHubRow
                    key={String(note.id || note.documentId)}
                    note={note}
                    locale={locale}
                    t={t}
                    onNavigate={navigate}
                    onEdit={setEditingNote}
                    onDelete={setDeletingNote}
                    onTogglePin={(selected) => void handleTogglePin(selected)}
                  />
                ))}
              </Tbody>
            </Table>
          )}
        </Flex>

        {editingNote && (
          <NoteModal
            entity={{
              id: editingNote.entityId,
              documentId: editingNote.entityDocumentId,
              slug: editingNote.entitySlug,
              locale: editingNote.entityLocale,
            }}
            note={editingNote}
            isOpen={Boolean(editingNote)}
            isSubmitting={isMutating}
            onClose={() => setEditingNote(null)}
            onSubmit={handleSaveEdit}
          />
        )}

        <DeleteNoteDialog
          note={deletingNote}
          isSubmitting={isMutating}
          onCancel={() => setDeletingNote(null)}
          onConfirm={handleConfirmDelete}
        />
      </Layouts.Content>
    </Main>
  );
};

export default NotesHomePage;
