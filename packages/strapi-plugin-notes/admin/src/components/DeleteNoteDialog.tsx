import { Button, Dialog } from "@strapi/design-system";
import { Trash, WarningCircle } from "@strapi/icons";
import * as React from "react";
import { useIntl } from "react-intl";

import type { NoteRecord } from "../../../shared";
import { getTrad } from "../utils";

export interface DeleteNoteDialogProps {
  note: NoteRecord | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (note: NoteRecord) => Promise<void>;
}

export const DeleteNoteDialog: React.FC<DeleteNoteDialogProps> = ({
  note,
  isSubmitting = false,
  onCancel,
  onConfirm,
}) => {
  const { formatMessage } = useIntl();

  if (!note) {
    return null;
  }

  const t = (
    id: string,
    defaultMessage: string,
    values?: Record<string, string | number>
  ) => formatMessage({ id: getTrad(id), defaultMessage }, values);

  return (
    <Dialog.Root
      open={Boolean(note)}
      onOpenChange={(open: boolean) => !open && onCancel()}
    >
      <Dialog.Content>
        <Dialog.Header>
          {t("note.delete.dialog.title", "Confirmation")}
        </Dialog.Header>
        <Dialog.Body icon={<WarningCircle />}>
          {t(
            "note.delete.dialog.description",
            'Are you sure you want to delete the note "{title}"?',
            { title: note.title }
          )}
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button fullWidth variant="tertiary" onClick={onCancel}>
              {t("note.modal.actions.cancel", "Cancel")}
            </Button>
          </Dialog.Cancel>
          <Dialog.Action>
            <Button
              fullWidth
              variant="danger-light"
              startIcon={<Trash />}
              loading={isSubmitting}
              disabled={isSubmitting}
              onClick={() => onConfirm(note)}
            >
              {t("note.delete.dialog.confirm", "Confirm")}
            </Button>
          </Dialog.Action>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default DeleteNoteDialog;
