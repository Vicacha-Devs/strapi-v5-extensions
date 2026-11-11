import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  TextInput,
  Typography,
} from "@strapi/design-system";
import * as React from "react";

const subCardStyle: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.2)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

export interface CaptchaProviderCardProps {
  t: (id: string, defaultMessage: string) => string;
  title: string;
  isDefaultActive: boolean;
  testButtonLabel: string;
  onTestSecret: () => void;
  siteKeyName: string;
  siteKeyLabel: string;
  siteKeyPlaceholder: string;
  siteKeyValue: string;
  siteKeyHint: string;
  onSiteKeyChange: (val: string) => void;
  secretKeyName: string;
  secretKeyLabel: string;
  secretKeyPlaceholder: string;
  secretKeyValue: string;
  secretKeyHint: string;
  onSecretKeyChange: (val: string) => void;
}

export const CaptchaProviderCard: React.FC<CaptchaProviderCardProps> = ({
  t,
  title,
  isDefaultActive,
  testButtonLabel,
  onTestSecret,
  siteKeyName,
  siteKeyLabel,
  siteKeyPlaceholder,
  siteKeyValue,
  siteKeyHint,
  onSiteKeyChange,
  secretKeyName,
  secretKeyLabel,
  secretKeyPlaceholder,
  secretKeyValue,
  secretKeyHint,
  onSecretKeyChange,
}) => (
  <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
    <Box>
      <Flex
        justifyContent="space-between"
        alignItems="center"
        paddingBottom={3}
        wrap="wrap"
        gap={2}
      >
        <Flex gap={2} alignItems="center">
          <Typography variant="delta" tag="h3" fontWeight="bold">
            {title}
          </Typography>
          <Badge>
            {isDefaultActive
              ? t("settings.ui.default_active", "Default Active")
              : t("settings.ui.standby", "Standby")}
          </Badge>
        </Flex>
        <Button variant="secondary" size="S" onClick={onTestSecret}>
          {testButtonLabel}
        </Button>
      </Flex>

      <Flex direction="column" alignItems="stretch" gap={3}>
        <Field.Root name={siteKeyName} hint={siteKeyHint}>
          <Field.Label>{siteKeyLabel}</Field.Label>
          <TextInput
            name={siteKeyName}
            placeholder={siteKeyPlaceholder}
            value={siteKeyValue}
            onChange={(e: { target: { value: string } }) =>
              onSiteKeyChange(e.target.value)
            }
          />
          <Field.Hint />
        </Field.Root>

        <Field.Root name={secretKeyName} hint={secretKeyHint}>
          <Field.Label>{secretKeyLabel}</Field.Label>
          <TextInput
            name={secretKeyName}
            type="password"
            placeholder={secretKeyPlaceholder}
            value={secretKeyValue}
            onChange={(e: { target: { value: string } }) =>
              onSecretKeyChange(e.target.value)
            }
          />
          <Field.Hint />
        </Field.Root>
      </Flex>
    </Box>
  </Box>
);
