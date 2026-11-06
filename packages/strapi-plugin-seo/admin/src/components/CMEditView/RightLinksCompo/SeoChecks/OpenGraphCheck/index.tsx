import * as React from "react";
import { useIntl } from "react-intl";

import type {
  OpenGraphData,
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

interface OpenGraphCheckProps {
  openGraph: OpenGraphData | null;
  checks: SeoChecksState;
}

export const OpenGraphCheck = ({ openGraph, checks }: OpenGraphCheckProps) => {
  const { formatMessage } = useIntl();
  const dispatch = React.useContext(SeoCheckerContext);

  React.useEffect(() => {
    let status: SeoCheckStatus;

    if (!openGraph || typeof openGraph !== "object") {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.openGraphCheck.not-found"),
          defaultMessage: "No OpenGraph tags have been found.",
        }),
        qualityVerdict: qualityVerdict.bad,
      };
    } else if (
      isEmptyValue(openGraph.ogTitle) ||
      isEmptyValue(openGraph.ogDescription) ||
      !openGraph.ogImage
    ) {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.openGraphCheck.not-configured"),
          defaultMessage: "OpenGraph minimum required tags are not configured.",
        }),
        qualityVerdict: qualityVerdict.improvements,
      };
    } else {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.openGraphCheck.configured"),
          defaultMessage: "OpenGraph tags are configured",
        }),
        qualityVerdict: qualityVerdict.good,
      };
    }

    if (!isSameCheckStatus(status, checks.openGraph) && dispatch) {
      dispatch({
        type: "UPDATE_PONCTUAL",
        value: { ...status, entity: "openGraph" },
      });
    }
  }, [openGraph]);

  return (
    <SEOAccordion
      title={formatMessage({
        id: getTrad("SEOModal.summary-title.open-graph"),
        defaultMessage: "OpenGraph Tags",
      })}
      status={checks.openGraph}
      label={formatMessage({
        id: getTrad("SEOChecks.openGraphCheck.label"),
        defaultMessage:
          "OpenGraph tags allow you to manage the title, description & " +
          "image of your posts.",
      })}
    />
  );
};
