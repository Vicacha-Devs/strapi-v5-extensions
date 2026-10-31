import {
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { Check, Plus, Trash } from "@strapi/icons";
import React from "react";
import { useIntl } from "react-intl";

import getTrad from "../../utils/getTrad";

interface ExcludedUrlsSectionProps {
  excludedUrls: string[];
  newExcludedPath: string;
  setNewExcludedPath: (val: string) => void;
  isExcludedUrlsModified: boolean;
  onAddExcludedUrl: () => void;
  onDeleteExcludedUrl: (index: number) => void;
  onSaveExcludedUrls: () => void;
}

export const ExcludedUrlsSection: React.FC<ExcludedUrlsSectionProps> = ({
  excludedUrls,
  newExcludedPath,
  setNewExcludedPath,
  isExcludedUrlsModified,
  onAddExcludedUrl,
  onDeleteExcludedUrl,
  onSaveExcludedUrls,
}) => {
  const { formatMessage } = useIntl();

  return (
    <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius marginBottom={6}>
      <Typography variant="delta" tag="h2">
        {formatMessage({
          id: getTrad("settings.excludedUrls.title"),
          defaultMessage: "Excluded URLs",
        })}
      </Typography>
      <Box paddingBottom={4}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTrad("settings.excludedUrls.description"),
            defaultMessage:
              "Paths listed here will not be included in the sitemap (e.g. /admin or /private-page). Save using the Save button below.",
          })}
        </Typography>
      </Box>
      <Flex gap={2} paddingBottom={4}>
        <Box style={{ flex: 1, maxWidth: 400 }}>
          <TextInput
            placeholder={formatMessage({
              id: getTrad("settings.excludedUrls.placeholder"),
              defaultMessage: "/path-to-exclude",
            })}
            value={newExcludedPath}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewExcludedPath(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddExcludedUrl();
              }
            }}
          />
        </Box>
        <Button
          startIcon={<Plus />}
          variant="secondary"
          onClick={onAddExcludedUrl}
          disabled={!newExcludedPath.trim()}
        >
          {formatMessage({ id: getTrad("settings.excludedUrls.add"), defaultMessage: "Add" })}
        </Button>
      </Flex>
      {excludedUrls.length > 0 && (
        <Table colCount={3} rowCount={excludedUrls.length + 1}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({ id: getTrad("table.id"), defaultMessage: "ID" })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({
                    id: getTrad("settings.excludedUrls.table.path"),
                    defaultMessage: "Path",
                  })}
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
            {excludedUrls.map((path, index) => (
              <Tr key={index}>
                <Td>
                  <Typography textColor="neutral800">{index + 1}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{path}</Typography>
                </Td>
                <Td>
                  <Button
                    variant="danger-light"
                    startIcon={<Trash />}
                    onClick={() => onDeleteExcludedUrl(index)}
                  >
                    {formatMessage({ id: getTrad("action.delete"), defaultMessage: "Delete" })}
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      <Box paddingTop={4}>
        <Button
          startIcon={<Check />}
          onClick={onSaveExcludedUrls}
          disabled={!isExcludedUrlsModified}
          variant={isExcludedUrlsModified ? "default" : "tertiary"}
        >
          {formatMessage({ id: getTrad("settings.save"), defaultMessage: "Save" })}
        </Button>
      </Box>
    </Box>
  );
};
