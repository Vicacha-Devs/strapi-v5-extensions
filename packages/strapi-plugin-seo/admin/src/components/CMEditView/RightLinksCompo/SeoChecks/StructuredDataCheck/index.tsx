import * as React from "react";
import { useIntl } from "react-intl";

import {
  type SeoChecksState,
  type SeoCheckStatus,
  validateStructuredData,
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
    const validation = validateStructuredData(structuredData);
    let status: SeoCheckStatus = {
      message: formatMessage({
        id: getTrad("SEOChecks.structuredDataCheck.default"),
        defaultMessage:
          "Valid JSON-LD structured data (@context and @type) has been found!",
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
    } else if (validation.reason === "invalid_json" || validation.reason === "not_object") {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.structuredDataCheck.invalid-json"),
          defaultMessage: "Structured Data is not valid JSON.",
        }),
        qualityVerdict: qualityVerdict.bad,
      };
    } else if (!validation.valid) {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.structuredDataCheck.missing-jsonld"),
          defaultMessage:
            "Structured Data JSON was found, but is missing @context or @type for JSON-LD.",
        }),
        qualityVerdict: qualityVerdict.improvements,
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
