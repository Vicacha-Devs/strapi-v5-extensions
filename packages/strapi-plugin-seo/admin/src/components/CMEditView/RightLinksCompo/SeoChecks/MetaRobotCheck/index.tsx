import { Box, Flex, Status, Typography } from "@strapi/design-system";
import { CheckCircle, WarningCircle } from "@strapi/icons";
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

const robotTags = [
  { name: "noindex", message: "Search engines will index this page." },
  {
    name: "nofollow",
    message: "Search engines will follow links from this page",
  },
  { name: "noarchive", message: "Search engines will cache your page." },
  {
    name: "nosnippet",
    message:
      "Search engines will show a snippet of this page in search results.",
  },
  {
    name: "noimageindex",
    message: "Google will index the images on this page.",
  },
  {
    name: "nositelinkssearchbox",
    message: "Google will show the search box in search results.",
  },
];

interface MetaRobotCheckProps {
  metaRobots: string | null;
  checks: SeoChecksState;
}

export const MetaRobotCheck = ({ metaRobots, checks }: MetaRobotCheckProps) => {
  const { formatMessage } = useIntl();
  const dispatch = React.useContext(SeoCheckerContext);
  const [tags, setTags] = React.useState<string[]>([]);

  React.useEffect(() => {
    let status: SeoCheckStatus = {
      message: formatMessage({
        id: getTrad("SEOChecks.metaRobotsCheck.default"),
        defaultMessage: "Robot meta tags have been found!",
      }),
      qualityVerdict: qualityVerdict.good,
    };

    if (typeof metaRobots !== "string" || isEmptyValue(metaRobots)) {
      status = {
        message: formatMessage({
          id: getTrad("SEOChecks.metaRobotsCheck.not-found"),
          defaultMessage: "No Robot meta tags have been found.",
        }),
        qualityVerdict: qualityVerdict.good,
      };
      setTags([]);
    } else {
      setTags(metaRobots.split(","));
    }
    if (!isSameCheckStatus(status, checks.metaRobots) && dispatch) {
      dispatch({
        type: "UPDATE_PONCTUAL",
        value: { ...status, entity: "metaRobots" },
      });
    }
  }, [metaRobots]);

  return (
    <SEOAccordion
      title={formatMessage({
        id: getTrad("SEOModal.summary-title.meta-robots"),
        defaultMessage: "Meta Robots",
      })}
      status={checks.metaRobots}
      label={formatMessage({
        id: getTrad("SEOChecks.metaRobotsCheck.label"),
        defaultMessage:
          "The robots meta tag informs search engines which pages on your " +
          "site should be indexed and more.",
      })}
      component={
        <Box padding={2} background="neutral100">
          {robotTags.map((tag, index) => (
            <Flex spacing={2} key={index} horizontal padding={2}>
              {tags.find((x) => x.trim() === tag.name) ? (
                <CheckCircle aria-hidden={true} fill="success600" />
              ) : (
                <WarningCircle aria-hidden={true} fill="warning600" />
              )}

              <Typography paddingLeft={1}>
                {tags.find((x) => x.trim() === tag.name)
                  ? formatMessage(
                      {
                        id: getTrad("SEOChecks.metaRobotsCheck.activated"),
                        defaultMessage: "{tag} is activated: {message}",
                      },
                      {
                        tag: tag.name,
                        message: tag.message.replace("will", "will not"),
                      }
                    )
                  : formatMessage(
                      {
                        id: getTrad("SEOChecks.metaRobotsCheck.disabled"),
                        defaultMessage: "{tag} is disabled: {message}",
                      },
                      {
                        tag: tag.name,
                        message: tag.message,
                      }
                    )}
              </Typography>
            </Flex>
          ))}
          <Flex
            spacing={2}
            paddingTop={4}
            paddingLeft={2}
            paddingRight={2}
            paddingBottom={4}
          >
            <Status variant="secondary" showBullet={false}>
              <Typography>
                <Typography fontWeight="bold">
                  {formatMessage({
                    id: getTrad("SEOChecks.metaRobotsCheck.notice-label"),
                    defaultMessage: "Notice:",
                  })}{" "}
                </Typography>
                {formatMessage({
                  id: getTrad("SEOChecks.metaRobotsCheck.notice-before"),
                  defaultMessage:
                    "In order to not index your entry and no follow, your " +
                    "MetaRobots field should contain the following:",
                })}{" "}
                <Typography fontWeight="bold">
                  {formatMessage({
                    id: getTrad("SEOChecks.metaRobotsCheck.notice-value"),
                    defaultMessage: "noindex, nofollow",
                  })}
                </Typography>
                {formatMessage({
                  id: getTrad("SEOChecks.metaRobotsCheck.notice-after"),
                  defaultMessage:
                    ". The rest should be handled by your front-end code " +
                    'logic. "If the field contains noindex, then you need ' +
                    'to create the corresponding meta tag etc..."',
                })}
              </Typography>
            </Status>
          </Flex>
        </Box>
      }
    />
  );
};
