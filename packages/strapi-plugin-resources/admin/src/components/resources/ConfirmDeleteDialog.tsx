import { Button, Dialog } from "@strapi/design-system";
import { Trash, WarningCircle } from "@strapi/icons";
import * as React from "react";

import { useResourcesTranslation } from "./uploadHelper";

export interface ConfirmDeleteDialogProps {
  open: boolean;
  itemLabel: string;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  open,
  itemLabel,
  isDeleting = false,
  onCancel,
  onConfirm,
}) => {
  const { t } = useResourcesTranslation();

  if (!open) {
    return null;
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <Dialog.Content>
        <Dialog.Header>
          {t("dialog.delete.title", "Confirm Deletion")}
        </Dialog.Header>
        <Dialog.Body icon={<WarningCircle />}>
          {t(
            "dialog.delete.confirm_message",
            'Are you sure you want to delete "{title}"?',
            { title: itemLabel }
          )}
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button
              fullWidth
              variant="tertiary"
              disabled={isDeleting}
              onClick={onCancel}
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </Dialog.Cancel>
          <Dialog.Action>
            <Button
              fullWidth
              variant="danger-light"
              startIcon={<Trash />}
              loading={isDeleting}
              disabled={isDeleting}
              onClick={() => void onConfirm()}
            >
              {t("common.confirm", "Confirm")}
            </Button>
          </Dialog.Action>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
};
