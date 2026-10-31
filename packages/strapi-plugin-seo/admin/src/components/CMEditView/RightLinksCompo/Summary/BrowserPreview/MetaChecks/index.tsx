import { Flex, Typography } from "@strapi/design-system";
import { CheckCircle, WarningCircle } from "@strapi/icons";
import * as React from "react";
import { useIntl } from "react-intl";

import { getTrad } from "../../../../../../utils/getTrad";

interface MetaChecksProps {
  item: string;
  max: number;
  label: string;
  minLimit?: boolean;
}

export const MetaChecks = ({ item, max, label, minLimit = false }: MetaChecksProps) => {
  const { formatMessage } = useIntl();

  const getIcon = () => {
    if (
      item.length >= max ||
      (label === "title" && item.length === 0) ||
      (minLimit && label === "description" && item.length <= 50)
    ) {
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
            id: getTrad("SEOSocialPreview.meta-length-check"),
            defaultMessage: "Your {label} is {length} characters long (max {max})",
          },
          {
            label,
            length: item.length || 0,
            max,
          }
        )}
      </Typography>
    </Flex>
  );
};
