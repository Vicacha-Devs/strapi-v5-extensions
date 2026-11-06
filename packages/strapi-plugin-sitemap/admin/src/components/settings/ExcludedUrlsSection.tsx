import {
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  TextInput,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { Plus } from "@strapi/icons";
import React from "react";
import { useIntl } from "react-intl";

import getTrad from "../../utils/getTrad";
import SectionCard from "./SectionCard";
import { HeadCell, RowActions, SaveButton } from "./TableParts";

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
  const tr = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  return (
    <SectionCard
      title={tr("settings.excludedUrls.title", "Excluded URLs")}
      description={tr(
        "settings.excludedUrls.description",
        "Paths listed here will not be included in the sitemap " +
          "(e.g. /admin or /private-page). Save using the Save button below."
      )}
    >
      <Flex gap={2} paddingBottom={4}>
        <Box style={{ flex: 1, maxWidth: 400 }}>
          <TextInput
            placeholder={tr(
              "settings.excludedUrls.placeholder",
              "/path-to-exclude"
            )}
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
          {tr("settings.excludedUrls.add", "Add")}
        </Button>
      </Flex>
      {excludedUrls.length > 0 && (
        <Table colCount={3} rowCount={excludedUrls.length + 1}>
          <Thead>
            <Tr>
              <HeadCell label={tr("table.id", "ID")} />
              <HeadCell
                label={tr("settings.excludedUrls.table.path", "Path")}
              />
              <HeadCell label={tr("table.actions", "Actions")} />
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
                  <RowActions onDelete={() => onDeleteExcludedUrl(index)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      <Box paddingTop={4}>
        <SaveButton
          modified={isExcludedUrlsModified}
          onClick={onSaveExcludedUrls}
        />
      </Box>
    </SectionCard>
  );
};
