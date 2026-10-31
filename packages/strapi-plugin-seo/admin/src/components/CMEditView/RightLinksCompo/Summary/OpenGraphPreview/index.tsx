import { Badge, Box, EmptyStateLayout, Flex, Modal, Typography } from "@strapi/design-system";
import * as React from "react";
import { useIntl } from "react-intl";

import type { ContentManagerFormValues, OpenGraphData } from "../../../../../../../shared";
import { getTrad } from "../../../../../utils/getTrad";
import { Illo } from "../../../../HomePage/Main/EmptyComponentLayout/illo";
import { FacebookOGPreview } from "./Facebook";
import { LinkedInOGPreview } from "./LinkedIn";
import { TwitterOGPreview } from "./X";

interface OpenGraphPreviewProps {
  modifiedData: ContentManagerFormValues;
}

export const OpenGraphPreview = ({ modifiedData }: OpenGraphPreviewProps) => {
  const { formatMessage } = useIntl();
  const openGraph: OpenGraphData | null | undefined = modifiedData?.seo?.openGraph;

  return (
    <Modal.Content labelledBy="title">
      <Modal.Header>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad("Button.open-graph-preview"),
            defaultMessage: "Open Graph Preview",
          })}
        </Typography>
      </Modal.Header>
      <Modal.Body>
        {openGraph?.ogTitle && openGraph?.ogDescription && openGraph?.ogImage ? (
          <>
            <Flex alignItems="left" direction="column" gap={2}>
              <Flex gap={1}>
                <Badge backgroundColor="neutral150" textColor="neutral600">
                  {formatMessage({
                    id: getTrad("Social-network.platform.facebook"),
                    defaultMessage: "Facebook",
                  })}
                </Badge>
              </Flex>
            </Flex>
            <FacebookOGPreview
              title={openGraph.ogTitle}
              description={openGraph.ogDescription}
              image={openGraph.ogImage}
            />
            <Flex alignItems="left" direction="column" gap={2}>
              <Flex gap={1}>
                <Badge backgroundColor="neutral150" textColor="neutral600">
                  {formatMessage({
                    id: getTrad("Social-network.platform.twitter"),
                    defaultMessage: "X (Twitter)",
                  })}
                </Badge>
              </Flex>
            </Flex>
            <TwitterOGPreview
              title={openGraph.ogTitle}
              description={openGraph.ogDescription}
              image={openGraph.ogImage}
            />
            <Flex alignItems="left" direction="column" gap={2}>
              <Flex gap={1}>
                <Badge backgroundColor="neutral150" textColor="neutral600">
                  {formatMessage({
                    id: getTrad("Social-network.platform.linkedin"),
                    defaultMessage: "LinkedIn",
                  })}
                </Badge>
              </Flex>
            </Flex>
            <LinkedInOGPreview
              title={openGraph.ogTitle}
              description={openGraph.ogDescription}
              image={openGraph.ogImage}
            />
          </>
        ) : (
          <Box paddingLeft={4}>
            <EmptyStateLayout
              icon={<Illo />}
              content={formatMessage({
                id: getTrad("Modal.seo-component-empty-open-graph"),
                defaultMessage: "The Open Graph metadata is empty...",
              })}
            />
          </Box>
        )}
      </Modal.Body>
    </Modal.Content>
  );
};
