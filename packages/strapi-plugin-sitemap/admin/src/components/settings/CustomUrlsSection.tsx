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
import type { CustomURLConfig } from "../CustomURLModal";

interface CustomUrlsSectionProps {
  customURLs: CustomURLConfig[];
  onAddCustomUrl: () => void;
  onEditCustomUrl: (index: number) => void;
  onDeleteCustomUrl: (index: number) => void;
}

export const CustomUrlsSection: React.FC<CustomUrlsSectionProps> = ({
  customURLs,
  onAddCustomUrl,
  onEditCustomUrl,
  onDeleteCustomUrl,
}) => {
  const { formatMessage } = useIntl();

  return (
    <Box
      padding={6}
      background="neutral0"
      shadow="filterShadow"
      hasRadius
      marginBottom={6}
    >
      <Typography variant="delta" tag="h2">
        {formatMessage({
          id: getTrad("settings.customUrls.title"),
          defaultMessage: "Custom URLs",
        })}
      </Typography>
      <Box paddingBottom={4}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTrad("settings.customUrls.description"),
            defaultMessage: "Add custom static URLs to your sitemap",
          })}
        </Typography>
      </Box>
      <Table colCount={5} rowCount={customURLs.length + 1}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">
                {formatMessage({
                  id: getTrad("table.id"),
                  defaultMessage: "ID",
                })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({
                  id: getTrad("table.url"),
                  defaultMessage: "URL",
                })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({
                  id: getTrad("table.priority"),
                  defaultMessage: "Priority",
                })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({
                  id: getTrad("table.frequency"),
                  defaultMessage: "Frequency",
                })}
              </Typography>
            </Th>
            <Th>
              <Typography variant="sigma">
                {formatMessage({
                  id: getTrad("table.actions"),
                  defaultMessage: "Actions",
                })}
              </Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {customURLs.map((item, index) => (
            <Tr key={index}>
              <Td>
                <Typography textColor="neutral800">{index + 1}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">/{item.url}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.priority}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.frequency}</Typography>
              </Td>
              <Td>
                <Flex gap={2}>
                  <Button
                    variant="tertiary"
                    startIcon={<Pencil />}
                    onClick={() => onEditCustomUrl(index)}
                  >
                    {formatMessage({
                      id: getTrad("action.edit"),
                      defaultMessage: "Edit",
                    })}
                  </Button>
                  <Button
                    variant="danger-light"
                    startIcon={<Trash />}
                    onClick={() => onDeleteCustomUrl(index)}
                  >
                    {formatMessage({
                      id: getTrad("action.delete"),
                      defaultMessage: "Delete",
                    })}
                  </Button>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Box paddingTop={4}>
        <Button
          startIcon={<Plus />}
          variant="secondary"
          onClick={onAddCustomUrl}
        >
          {formatMessage({
            id: getTrad("settings.customUrls.add"),
            defaultMessage: "Add another URL",
          })}
        </Button>
      </Box>
    </Box>
  );
};
