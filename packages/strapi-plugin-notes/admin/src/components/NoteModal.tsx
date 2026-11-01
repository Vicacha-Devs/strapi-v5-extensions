import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Grid,
  Modal,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { Check } from "@strapi/icons";
import * as React from "react";
import { useIntl } from "react-intl";

import {
  formatNoteAuthorDisplay,
  formatNoteTimestamp,
  NOTE_CATEGORIES,
  NOTE_CATEGORY_META,
  normalizeNoteCategory,
  normalizeNoteRecord,
  type NoteCategory,
  type NoteRecord,
  type NoteUpsertInput,
} from "../../../shared";
import { getTrad } from "../utils";

export interface NoteEntityContext {
  id?: number | string | null;
  documentId?: string;
  slug: string;
  locale?: string | null;
}

export interface NoteModalProps {
  entity: NoteEntityContext;
  note?: Partial<NoteRecord> | null;
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (
    payload: NoteUpsertInput,
    existingId?: string | number
  ) => Promise<void>;
}

function resolveNormalizedExisting(
  note?: Partial<NoteRecord> | null
): NoteRecord | null {
  if (!note) return null;
  const hasId = Boolean(note.id || note.documentId);
  return hasId ? normalizeNoteRecord(note) : null;
}

function resolveEntityDocumentId(
  existingDocId: string | undefined,
  entity: NoteEntityContext
): string {
  if (existingDocId) return existingDocId;
  if (entity.documentId) return entity.documentId;
  if (entity.id !== null && entity.id !== undefined) return String(entity.id);
  return "";
}

function buildNoteSavePayload(params: {
  trimmedTitle: string;
  content: string;
  category: NoteCategory;
  isPinned: boolean;
  scopeToLocale: boolean;
  effectiveLocale: string | null;
  normalizedExisting: NoteRecord | null;
  entity: NoteEntityContext;
}): NoteUpsertInput {
  const {
    trimmedTitle,
    content,
    category,
    isPinned,
    scopeToLocale,
    effectiveLocale,
    normalizedExisting,
    entity,
  } = params;
  return {
    title: trimmedTitle,
    content: content.trim(),
    category: normalizeNoteCategory(category),
    isPinned,
    entitySlug: normalizedExisting?.entitySlug || entity.slug,
    entityId: normalizedExisting?.entityId ?? entity.id ?? null,
    entityDocumentId: resolveEntityDocumentId(
      normalizedExisting?.entityDocumentId,
      entity
    ),
    entityLocale: scopeToLocale ? effectiveLocale : null,
  };
}

interface NoteMetadataBoxProps {
  note: NoteRecord;
  uiLocale: string;
  t: (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number>
  ) => string;
}

const NoteMetadataBox: React.FC<NoteMetadataBoxProps> = ({
  note,
  uiLocale,
  t,
}) => (
  <Box
    padding={4}
    background="neutral100"
    hasRadius
    data-testid="note-modal-meta-box"
  >
    <Grid.Root gap={4}>
      <Grid.Item col={6} s={12} direction="column" alignItems="flex-start">
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="sigma" textColor="neutral600">
            {t("note.modal.meta.createdAt", "Created At")}
          </Typography>
          <Typography variant="pi" textColor="neutral800">
            {formatNoteTimestamp(note.createdAt, uiLocale)}
          </Typography>
        </Flex>
      </Grid.Item>

      <Grid.Item col={6} s={12} direction="column" alignItems="flex-start">
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="sigma" textColor="neutral600">
            {t("note.modal.meta.createdBy", "Created By")}
          </Typography>
          <Typography variant="pi" textColor="neutral800">
            {formatNoteAuthorDisplay(note.createdBy)}
          </Typography>
        </Flex>
      </Grid.Item>

      <Grid.Item col={6} s={12} direction="column" alignItems="flex-start">
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="sigma" textColor="neutral600">
            {t("note.modal.meta.updatedAt", "Updated At")}
          </Typography>
          <Typography variant="pi" textColor="neutral800">
            {formatNoteTimestamp(note.updatedAt, uiLocale)}
          </Typography>
        </Flex>
      </Grid.Item>

      <Grid.Item col={6} s={12} direction="column" alignItems="flex-start">
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="sigma" textColor="neutral600">
            {t("note.modal.meta.updatedBy", "Updated By")}
          </Typography>
          <Typography variant="pi" textColor="neutral800">
            {formatNoteAuthorDisplay(note.updatedBy)}
          </Typography>
        </Flex>
      </Grid.Item>
    </Grid.Root>
  </Box>
);

export const NoteModal: React.FC<NoteModalProps> = ({
  entity,
  note,
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const { formatMessage, locale: uiLocale } = useIntl();

  const normalizedExisting = React.useMemo(
    () => resolveNormalizedExisting(note),
    [note]
  );

  const isExistingNote = Boolean(normalizedExisting);

  const [title, setTitle] = React.useState<string>("");
  const [content, setContent] = React.useState<string>("");
  const [category, setCategory] = React.useState<NoteCategory>("general");
  const [isPinned, setIsPinned] = React.useState<boolean>(false);
  const [scopeToLocale, setScopeToLocale] = React.useState<boolean>(false);
  const [titleError, setTitleError] = React.useState<string>("");

  React.useEffect(() => {
    setTitle(normalizedExisting?.title ?? "");
    setContent(normalizedExisting?.content ?? "");
    setCategory(normalizedExisting?.category ?? "general");
    setIsPinned(Boolean(normalizedExisting?.isPinned));
    setScopeToLocale(Boolean(normalizedExisting?.entityLocale));
    setTitleError("");
  }, [normalizedExisting, isOpen]);

  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number>
  ) => formatMessage({ id: getTrad(id), defaultMessage }, values);

  const effectiveLocale =
    normalizedExisting?.entityLocale || entity.locale || null;

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(
        t("note.modal.validation.titleRequired", "Title is required.")
      );
      return;
    }

    setTitleError("");
    const payload = buildNoteSavePayload({
      trimmedTitle,
      content,
      category,
      isPinned,
      scopeToLocale,
      effectiveLocale,
      normalizedExisting,
      entity,
    });

    const targetId = normalizedExisting?.id || normalizedExisting?.documentId;
    await onSubmit(payload, targetId);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal.Root
      open={isOpen}
      onOpenChange={(open: boolean) => !open && onClose()}
    >
      <Modal.Content>
        <Modal.Header closeLabel={t("note.modal.actions.close", "Close modal")}>
          <Modal.Title>
            {isExistingNote
              ? t("note.modal.existing.title", "Edit a note")
              : t("note.modal.new.title", "Add a note")}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            {normalizedExisting && (
              <NoteMetadataBox
                note={normalizedExisting}
                uiLocale={uiLocale}
                t={t}
              />
            )}

            <Field.Root name="title" required error={titleError || undefined}>
              <Field.Label>{t("note.modal.fields.title", "Title")}</Field.Label>
              <TextInput
                name="title"
                value={title}
                onChange={(e: { target: { value: string } }) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError("");
                }}
                placeholder={t(
                  "note.modal.fields.title.placeholder",
                  "Short summary of this note..."
                )}
              />
              {titleError && <Field.Error />}
            </Field.Root>

            <Field.Root name="category">
              <Field.Label>
                {t("note.modal.fields.category", "Category")}
              </Field.Label>
              <SingleSelect
                value={category}
                onChange={(val: string | number) =>
                  setCategory(normalizeNoteCategory(val))
                }
              >
                {NOTE_CATEGORIES.map((cat) => (
                  <SingleSelectOption key={cat} value={cat}>
                    {t(
                      NOTE_CATEGORY_META[cat].labelKey,
                      NOTE_CATEGORY_META[cat].defaultLabel
                    )}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>

            <Field.Root name="content">
              <Field.Label>
                {t("note.modal.fields.content", "Content")}
              </Field.Label>
              <Textarea
                name="content"
                value={content}
                onChange={(e: { target: { value: string } }) =>
                  setContent(e.target.value)
                }
                placeholder={t(
                  "note.modal.fields.content.placeholder",
                  "Write detailed editorial context, review feedback, or follow-up steps..."
                )}
              />
            </Field.Root>

            <Flex gap={4} wrap="wrap" paddingTop={1}>
              <Checkbox
                checked={isPinned}
                onCheckedChange={(checked: boolean) =>
                  setIsPinned(Boolean(checked))
                }
              >
                {t("note.modal.fields.isPinned", "Pin note to top")}
              </Checkbox>

              {effectiveLocale && (
                <Checkbox
                  checked={scopeToLocale}
                  onCheckedChange={(checked: boolean) =>
                    setScopeToLocale(Boolean(checked))
                  }
                >
                  {t(
                    "note.modal.fields.scopeToLocale",
                    "Scope only to locale ({locale})",
                    {
                      locale: effectiveLocale,
                    }
                  )}
                </Checkbox>
              )}
            </Flex>
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Modal.Close>
            <Button onClick={onClose} variant="tertiary">
              {t("note.modal.actions.cancel", "Cancel")}
            </Button>
          </Modal.Close>
          <Button
            onClick={handleSave}
            startIcon={<Check />}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {t("note.modal.actions.save", "Save")}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default NoteModal;
