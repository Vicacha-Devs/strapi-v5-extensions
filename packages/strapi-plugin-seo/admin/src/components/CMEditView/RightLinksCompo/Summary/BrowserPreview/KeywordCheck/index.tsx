import { Flex, Typography } from "@strapi/design-system";
import { CheckCircle, WarningCircle } from "@strapi/icons";
import * as React from "react";
import { useIntl } from "react-intl";

import { getTrad } from "../../../../../../utils/getTrad";

interface KeywordCheckProps {
  item: string;
  keywords: string;
  label: string;
}

export const KeywordCheck = ({ item, keywords, label }: KeywordCheckProps) => {
  const { formatMessage } = useIntl();
  const normalizedKeywords = keywords
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  const matches = normalizedKeywords.filter((x) =>
    item.toLowerCase().includes(x.toLowerCase())
  );

  const getIcon = () => {
    if (matches.length === 0) {
      return <WarningCircle aria-hidden={true} fill="warning600" />;
    }
    return <CheckCircle aria-hidden={true} fill="success600" />;
  };

  return (
    <Flex spacing={1} horizontal>
      {getIcon()}
      <Typography>
        {formatMessage(
          {
            id: getTrad("SEOSocialPreview.keyword-check"),
            defaultMessage:
              "You use {count} keyword(s) in your {label} ({matches})",
          },
          {
            count: matches.length,
            label,
            matches: matches.join(", ").trim(),
          }
        )}
      </Typography>
    </Flex>
  );
};
