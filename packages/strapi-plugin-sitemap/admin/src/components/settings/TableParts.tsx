import { Button, Flex, Th, Typography } from "@strapi/design-system";
import { Check, Pencil, Trash } from "@strapi/icons";
import React from "react";
import { useIntl } from "react-intl";

import getTrad from "../../utils/getTrad";

export const HeadCell: React.FC<{ label: string }> = ({ label }) => (
  <Th>
    <Typography variant="sigma">{label}</Typography>
  </Th>
);

export const useYesNo = () => {
  const { formatMessage } = useIntl();
  return (value: unknown) =>
    value
      ? formatMessage({ id: getTrad("common.yes"), defaultMessage: "Yes" })
      : formatMessage({ id: getTrad("common.no"), defaultMessage: "No" });
};

interface RowActionsProps {
  onEdit?: () => void;
  onDelete: () => void;
}

export const RowActions: React.FC<RowActionsProps> = ({ onEdit, onDelete }) => {
  const { formatMessage } = useIntl();
  return (
    <Flex gap={2}>
      {onEdit && (
        <Button variant="tertiary" startIcon={<Pencil />} onClick={onEdit}>
          {formatMessage({
            id: getTrad("action.edit"),
            defaultMessage: "Edit",
          })}
        </Button>
      )}
      <Button variant="danger-light" startIcon={<Trash />} onClick={onDelete}>
        {formatMessage({
          id: getTrad("action.delete"),
          defaultMessage: "Delete",
        })}
      </Button>
    </Flex>
  );
};

export const SaveButton: React.FC<{
  modified: boolean;
  onClick: () => void;
}> = ({ modified, onClick }) => {
  const { formatMessage } = useIntl();
  return (
    <Button
      startIcon={<Check />}
      onClick={onClick}
      disabled={!modified}
      variant={modified ? "default" : "tertiary"}
    >
      {formatMessage({ id: getTrad("settings.save"), defaultMessage: "Save" })}
    </Button>
  );
};
