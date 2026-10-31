import {
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { Pencil, Plus, Trash } from "@strapi/icons";
import React from "react";
import { useIntl } from "react-intl";

import getTrad from "../../utils/getTrad";
import type { CollectionTypeConfig } from "../CollectionTypeModal";

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

  return (
    <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius marginBottom={6}>
      <Typography variant="delta" tag="h2">
        {formatMessage({
          id: getTrad("settings.collectionTypes.title"),
          defaultMessage: "Collection Types",
        })}
      </Typography>
      <Box paddingBottom={4}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTrad("settings.collectionTypes.description"),
            defaultMessage: "Configure how your collection types are included in the sitemap",
          })}
        </Typography>
      </Box>
      <Table colCount={9} rowCount={collectionTypes.length + 1}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">
                {formatMessage({ id: getTrad("table.id"), defaultMessage: "ID" })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({ id: getTrad("table.type"), defaultMessage: "Type" })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({ id: getTrad("table.langcode"), defaultMessage: "Langcode" })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({ id: getTrad("table.pattern"), defaultMessage: "Pattern" })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({ id: getTrad("table.priority"), defaultMessage: "Priority" })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({ id: getTrad("table.frequency"), defaultMessage: "Frequency" })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({
                  id: getTrad("table.lastModified"),
                  defaultMessage: "Last Modified",
                })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({ id: getTrad("table.thumbnail"), defaultMessage: "Thumbnail" })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({ id: getTrad("table.actions"), defaultMessage: "Actions" })}
              </Typography>
            </Th>
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
                  {item.lastModified
                    ? formatMessage({ id: getTrad("common.yes"), defaultMessage: "Yes" })
                    : formatMessage({ id: getTrad("common.no"), defaultMessage: "No" })}
                </Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.thumbnail || "-"}</Typography>
              </Td>
              <Td>
                <Flex gap={2}>
                  <Button
                    variant="tertiary"
                    startIcon={<Pencil />}
                    onClick={() => onEditCollectionType(index)}
                  >
                    {formatMessage({ id: getTrad("action.edit"), defaultMessage: "Edit" })}
                  </Button>
                  <Button
                    variant="danger-light"
                    startIcon={<Trash />}
                    onClick={() => onDeleteCollectionType(index)}
                  >
                    {formatMessage({ id: getTrad("action.delete"), defaultMessage: "Delete" })}
                  </Button>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Box paddingTop={4}>
        <Button startIcon={<Plus />} variant="secondary" onClick={onAddCollectionType}>
          {formatMessage({
            id: getTrad("settings.collectionTypes.add"),
            defaultMessage: "Add another collection type",
          })}
        </Button>
      </Box>
    </Box>
  );
};
