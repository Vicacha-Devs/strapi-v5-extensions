import { Badge, Box, Flex } from "@strapi/design-system";
import * as React from "react";
import { useIntl } from "react-intl";

import type {
  KeywordDensityMap,
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

interface KeywordDensityCheckProps {
  keywordsDensity: KeywordDensityMap;
  checks: SeoChecksState;
}

export const KeywordDensityCheck = ({
  keywordsDensity,
  checks,
}: KeywordDensityCheckProps) => {
  const { formatMessage } = useIntl();
  const dispatch = React.useContext(SeoCheckerContext);

  React.useEffect(() => {
    let status: SeoCheckStatus = {
      message: formatMessage({
        id: getTrad("SEOChecks.keywordsDensityCheck.default"),
        defaultMessage: "Every keywords are used more than 2 times.",
      }),
      qualityVerdict: qualityVerdict.good,
    };

    if (isEmptyValue(keywordsDensity)) {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.keywordsDensityCheck.no-keywords"),
          defaultMessage: "No keywords were found in your SEO component.",
        }),
        qualityVerdict: qualityVerdict.improvements,
      };
    } else {
      let hasUnused = false;
      let hasUsedOnce = false;

      Object.keys(keywordsDensity).forEach((keyword) => {
        const count = keywordsDensity[keyword]?.count ?? 0;
        if (count === 0) {
          hasUnused = true;
        } else if (count <= 1) {
          hasUsedOnce = true;
        }
      });

      if (hasUsedOnce) {
        status = {
          message: formatMessage({
            id: getTrad("SEOChecks.keywordsDensityCheck.one-used-once"),
            defaultMessage: "One keyword is only used once in your content.",
          }),
          qualityVerdict: qualityVerdict.bad,
        };
      } else if (hasUnused) {
        status = {
          message: formatMessage({
            id: getTrad("SEOChecks.keywordsDensityCheck.one-not-used"),
            defaultMessage: "One keyword is not being used in your content.",
          }),
          qualityVerdict: qualityVerdict.improvements,
        };
      }
    }

    if (!isSameCheckStatus(status, checks.keywordsDensity) && dispatch) {
      dispatch({
        type: "UPDATE_PONCTUAL",
        value: { ...status, entity: "keywordsDensity" },
      });
    }
  }, [keywordsDensity]);

  return (
    <SEOAccordion
      title={formatMessage({
        id: getTrad("SEOModal.summary-title.word-densisty"),
        defaultMessage: "Keyword Density",
      })}
      status={checks.keywordsDensity}
      label={formatMessage({
        id: getTrad("SEOChecks.keywordsDensityCheck.label"),
        defaultMessage:
          "Define keywords you want to rank for in your SEO component. " +
          "This will analyse the density of your keywords in your 1st level " +
          "richtext editors.",
      })}
      component={
        keywordsDensity &&
        !isEmptyValue(keywordsDensity) && (
          <Box padding={2} background="neutral100">
            <Flex wrap="wrap">
              {Object.keys(keywordsDensity).map((keyword) => {
                const count = (keywordsDensity[keyword]?.count ?? 0).toString();
                return (
                  <Box padding={2} key={keyword}>
                    <Badge>{`${keyword}: ${count}`}</Badge>
                  </Box>
                );
              })}
            </Flex>
          </Box>
        )
      }
    />
  );
};
