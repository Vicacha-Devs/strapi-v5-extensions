import { Box, Grid, TextInput } from "@strapi/design-system";
import React from "react";
import { useIntl } from "react-intl";

import getTrad from "../../utils/getTrad";
import SectionCard from "./SectionCard";
import { SaveButton } from "./TableParts";

interface BaseUrlSectionProps {
  baseUrl: string;
  isModified: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

const BaseUrlSection: React.FC<BaseUrlSectionProps> = ({
  baseUrl,
  isModified,
  onChange,
  onSave,
}) => {
  const { formatMessage } = useIntl();
  return (
    <SectionCard
      title={formatMessage({
        id: getTrad("settings.baseUrl.title"),
        defaultMessage: "Base URL",
      })}
      description={formatMessage({
        id: getTrad("settings.baseUrl.description"),
        defaultMessage: "Enter the base URL used for all sitemap entries",
      })}
    >
      <Grid.Root gap={4}>
        <Grid.Item col={6} s={12}>
          <Box style={{ width: "100%" }}>
            <TextInput
              placeholder={formatMessage({
                id: getTrad("settings.baseUrl.placeholder"),
                defaultMessage: "https://example.com",
              })}
              value={baseUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value)
              }
            />
          </Box>
        </Grid.Item>
      </Grid.Root>
      <Box paddingTop={4}>
        <SaveButton modified={isModified} onClick={onSave} />
      </Box>
    </SectionCard>
  );
};

export default BaseUrlSection;
