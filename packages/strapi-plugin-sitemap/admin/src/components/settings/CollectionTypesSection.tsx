import {
  Box,
  Button,
  Table,
  Tbody,
  Td,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { Plus } from "@strapi/icons";
import React from "react";
import { useIntl } from "react-intl";

import getTrad from "../../utils/getTrad";
import type { CollectionTypeConfig } from "../CollectionTypeModal";
import SectionCard from "./SectionCard";
import { HeadCell, RowActions, useYesNo } from "./TableParts";

interface CollectionTypesSectionProps {
  collectionTypes: CollectionTypeConfig[];
  onAddCollectionType: () => void;
  onEditCollectionType: (index: number) => void;
  onDeleteCollectionType: (index: number) => void;
}

export const CollectionTypesSection: React.FC<CollectionTypesSectionProps> = ({
  collectionTypes,
  onAddCollectionType,
  onEditCollectionType,
  onDeleteCollectionType,
}) => {
  const { formatMessage } = useIntl();
  const yesNo = useYesNo();
  const tr = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  return (
    <SectionCard
      title={tr("settings.collectionTypes.title", "Collection Types")}
      description={tr(
        "settings.collectionTypes.description",
        "Configure how your collection types are included in the sitemap"
      )}
    >
      <Table colCount={9} rowCount={collectionTypes.length + 1}>
        <Thead>
          <Tr>
            <HeadCell label={tr("table.id", "ID")} />
            <HeadCell label={tr("table.type", "Type")} />
            <HeadCell label={tr("table.langcode", "Langcode")} />
            <HeadCell label={tr("table.pattern", "Pattern")} />
            <HeadCell label={tr("table.priority", "Priority")} />
            <HeadCell label={tr("table.frequency", "Frequency")} />
            <HeadCell label={tr("table.lastModified", "Last Modified")} />
            <HeadCell label={tr("table.thumbnail", "Thumbnail")} />
            <HeadCell label={tr("table.actions", "Actions")} />
          </Tr>
        </Thead>
        <Tbody>
          {collectionTypes.map((item, index) => (
            <Tr key={index}>
              <Td>
                <Typography textColor="neutral800">{index + 1}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.type}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.langcode}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.pattern}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.priority}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.frequency}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">
                  {yesNo(item.lastModified)}
                </Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">
                  {item.thumbnail || "-"}
                </Typography>
              </Td>
              <Td>
                <RowActions
                  onEdit={() => onEditCollectionType(index)}
                  onDelete={() => onDeleteCollectionType(index)}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Box paddingTop={4}>
        <Button
          startIcon={<Plus />}
          variant="secondary"
          onClick={onAddCollectionType}
        >
          {tr("settings.collectionTypes.add", "Add another collection type")}
        </Button>
      </Box>
    </SectionCard>
  );
};
