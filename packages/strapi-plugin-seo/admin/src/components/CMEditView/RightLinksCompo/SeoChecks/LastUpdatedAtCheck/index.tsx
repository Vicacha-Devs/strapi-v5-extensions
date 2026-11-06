import { Box, Typography } from "@strapi/design-system";
import { formatDistance } from "date-fns";
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

interface LastUpdatedAtCheckProps {
  updatedAt: string | null;
  checks: SeoChecksState;
}

export const LastUpdatedAtCheck = ({
  updatedAt,
  checks,
}: LastUpdatedAtCheckProps) => {
  const { formatMessage } = useIntl();
  const dispatch = React.useContext(SeoCheckerContext);
  const parsedTimestamp =
    typeof updatedAt === "string" && !isEmptyValue(updatedAt)
      ? Date.parse(updatedAt)
      : Number.NaN;
  const isValidUpdatedAt = !Number.isNaN(parsedTimestamp);

  React.useEffect(() => {
    let status: SeoCheckStatus = {
      message: formatMessage({
        id: getTrad("SEOChecks.lastUpdatedAtCheck.default"),
        defaultMessage:
          "This content was modified over a year ago! Search engines love " +
          "fresh content.",
      }),
      qualityVerdict: qualityVerdict.improvements,
    };

    if (!isValidUpdatedAt) {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.lastUpdatedAtCheck.save-content"),
          defaultMessage: "You must save this entry first.",
        }),
        qualityVerdict: qualityVerdict.bad,
      };
    } else {
      const oneYearAgoDate = new Date();
      oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);
      if (parsedTimestamp >= oneYearAgoDate.getTime()) {
        status = {
          message: formatMessage({
            id: getTrad("SEOChecks.lastUpdatedAtCheck.success"),
            defaultMessage:
              "Awesome! This content was last modified in less than an year " +
              "ago!",
          }),
          qualityVerdict: qualityVerdict.good,
        };
      }
    }
    if (!isSameCheckStatus(status, checks.lastUpdatedAt) && dispatch) {
      dispatch({
        type: "UPDATE_PONCTUAL",
        value: { ...status, entity: "lastUpdatedAt" },
      });
    }
  }, [updatedAt, isValidUpdatedAt, parsedTimestamp]);

  return (
    <SEOAccordion
      title={formatMessage({
        id: getTrad("SEOModal.summary-title.last-updated-at"),
        defaultMessage: "Last updated at",
      })}
      label={formatMessage({
        id: getTrad("SEOChecks.lastUpdatedAtCheck.label"),
        defaultMessage:
          "Search engines love fresh content. This will check if your entry " +
          "was last modified in less than an year ago.",
      })}
      status={checks.lastUpdatedAt}
      component={
        isValidUpdatedAt &&
        updatedAt && (
          <Box padding={4} background="neutral100">
            <Typography variant="omega">
              {formatMessage({
                id: getTrad("SEOChecks.lastUpdatedAtCheck.last"),
                defaultMessage: "Last updated at:",
              })}{" "}
              <Typography variant="omega" fontWeight="bold">
                {" "}
                {formatDistance(new Date(updatedAt), new Date(), {
                  addSuffix: true,
                })}
              </Typography>
            </Typography>
          </Box>
        )
      }
    />
  );
};
