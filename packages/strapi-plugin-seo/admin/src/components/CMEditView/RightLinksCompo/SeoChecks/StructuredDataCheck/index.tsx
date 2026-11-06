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

interface StructuredDataCheckProps {
  structuredData: unknown;
  checks: SeoChecksState;
}

export const StructuredDataCheck = ({
  structuredData,
  checks,
}: StructuredDataCheckProps) => {
  const { formatMessage } = useIntl();
  const dispatch = React.useContext(SeoCheckerContext);

  React.useEffect(() => {
    let status: SeoCheckStatus = {
      message: formatMessage({
        id: getTrad("SEOChecks.structuredDataCheck.default"),
        defaultMessage:
          "A Structured Data json has been found! However we can validate " +
          "the accuracy of its content.",
      }),
      qualityVerdict: qualityVerdict.good,
    };

    if (isEmptyValue(structuredData)) {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.structuredDataCheck.not-found"),
          defaultMessage: "No Structured Data json has been found.",
        }),
        qualityVerdict: qualityVerdict.bad,
      };
    }
    if (!isSameCheckStatus(status, checks.structuredData) && dispatch) {
      dispatch({
        type: "UPDATE_PONCTUAL",
        value: { ...status, entity: "structuredData" },
      });
    }
  }, [structuredData]);

  return (
    <SEOAccordion
      title={formatMessage({
        id: getTrad("SEOModal.summary-title.structured-data"),
        defaultMessage: "JSON Structured Data",
      })}
      status={checks.structuredData}
      label={formatMessage({
        id: getTrad("SEOChecks.structuredDataCheck.label"),
        defaultMessage:
          "Structured data is a standardized format for providing " +
          "information about a page and classifying the page content.",
      })}
    />
  );
};
