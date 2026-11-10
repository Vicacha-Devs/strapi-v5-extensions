import { Box, Flex, ProgressBar, Typography } from "@strapi/design-system";
import * as React from "react";
import { useIntl } from "react-intl";

import type {
  SeoChecksState,
  SeoCheckStatus,
} from "../../../../../../../shared";
import { getTrad } from "../../../../../utils/getTrad";
import {
  isEmptyValue,
  isSameCheckStatus,
  qualityVerdict,
} from "../../../utils/checks";
import { SeoCheckerContext } from "../../Summary";
import { SEOAccordion } from "../SEOAccordion";

interface MetaDescriptionCheckProps {
  metaDescription: string | null;
  checks: SeoChecksState;
}

export const MetaDescriptionCheck = ({
  metaDescription,
  checks,
}: MetaDescriptionCheckProps) => {
  const { formatMessage } = useIntl();
  const dispatch = React.useContext(SeoCheckerContext);

  const maxLength = 160;
  const minimumLength = 50;

  React.useEffect(() => {
    let status: SeoCheckStatus = {
      message: formatMessage({
        id: getTrad("SEOChecks.metaDescriptionCheck.default"),
        defaultMessage: "A Meta Description has been found!",
      }),
      qualityVerdict: qualityVerdict.good,
    };

    if (typeof metaDescription !== "string" || isEmptyValue(metaDescription)) {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.metaDescriptionCheck.not-found"),
          defaultMessage: "No Meta Description has been found.",
        }),
        qualityVerdict: qualityVerdict.improvements,
      };
    } else if (metaDescription.length > maxLength) {
      status = {
        message: formatMessage({
          id: getTrad("Title-settings.metaDescription-too-long"),
          defaultMessage: "Meta Description is too long",
        }),
        qualityVerdict: qualityVerdict.bad,
      };
    } else if (metaDescription.length < minimumLength) {
      status = {
        message: formatMessage({
          id: getTrad("Title-settings.metaDescription-too-short"),
          defaultMessage: "Meta Description is too short",
        }),
        qualityVerdict: qualityVerdict.bad,
      };
    }
    if (!isSameCheckStatus(status, checks.metaDescription) && dispatch) {
      dispatch({
        type: "UPDATE_PONCTUAL",
        value: { ...status, entity: "metaDescription" },
      });
    }
  }, [metaDescription]);

  return (
    <SEOAccordion
      title={formatMessage({
        id: getTrad("SEOModal.summary-title.meta-description"),
        defaultMessage: "Meta description",
      })}
      status={checks.metaDescription}
      label={formatMessage({
        id: getTrad("Title-settings.metaDescription-tooltip"),
        defaultMessage:
          "A meta description is an HTML tag used to describe the content " +
          "of a web page.\n This description appears below the title and " +
          "URL of your page as it appears in search engine results.\n For " +
          "it to remain visible in Google, it must not exceed " +
          `140-${maxLength} characters.`,
      })}
      component={
        metaDescription && (
          <Box padding={4} background="neutral100">
            <Typography variant="omega" fontWeight="semiBold">
              {metaDescription}
            </Typography>
            <Box paddingTop={2}>
              <Flex horizontal spacing={2}>
                <ProgressBar
                  value={
                    (metaDescription.length * 100) / maxLength > 100
                      ? 100
                      : (metaDescription.length * 100) / maxLength
                  }
                />
                <Typography variant="pi" padding={2}>
                  ({metaDescription.length}/{maxLength})
                </Typography>
              </Flex>
            </Box>
          </Box>
        )
      }
    />
  );
};
