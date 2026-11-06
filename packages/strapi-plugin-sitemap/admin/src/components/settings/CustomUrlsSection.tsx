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
import type { CustomURLConfig } from "../CustomURLModal";
import SectionCard from "./SectionCard";
import { HeadCell, RowActions } from "./TableParts";

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
  const tr = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  return (
    <SectionCard
      title={tr("settings.customUrls.title", "Custom URLs")}
      description={tr(
        "settings.customUrls.description",
        "Add custom static URLs to your sitemap"
      )}
    >
      <Table colCount={5} rowCount={customURLs.length + 1}>
        <Thead>
          <Tr>
            <HeadCell label={tr("table.id", "ID")} />
            <HeadCell label={tr("table.url", "URL")} />
            <HeadCell label={tr("table.priority", "Priority")} />
            <HeadCell label={tr("table.frequency", "Frequency")} />
            <HeadCell label={tr("table.actions", "Actions")} />
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
                <RowActions
                  onEdit={() => onEditCustomUrl(index)}
                  onDelete={() => onDeleteCustomUrl(index)}
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
          onClick={onAddCustomUrl}
        >
          {tr("settings.customUrls.add", "Add another URL")}
        </Button>
      </Box>
    </SectionCard>
  );
};
