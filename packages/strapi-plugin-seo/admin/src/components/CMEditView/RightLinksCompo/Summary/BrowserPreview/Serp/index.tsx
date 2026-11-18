import { Box, Flex, Typography } from "@strapi/design-system";
import * as React from "react";

interface SerpProps {
  metaTitle: string;
  metaDescription: string;
  url?: string | null;
}

export const Serp = ({ metaTitle, metaDescription, url }: SerpProps) => {
  const metaTitleToDisplay =
    metaTitle.length > 60 ? `${metaTitle.substring(0, 56)} ...` : metaTitle;
  const metaDescriptionToDisplay =
    metaDescription.length > 160
      ? `${metaDescription.substring(0, 156)} ...`
      : metaDescription;

  return (
    <Box padding={4} background="neutral100" width="100%" maxWidth="580px">
      {url && (
        <Box paddingBottom={1}>
          <Typography variant="pi" textColor="success700">
            {url}
          </Typography>
        </Box>
      )}
      <Typography variant="beta" textColor="primary600">
        {metaTitleToDisplay}
      </Typography>
      <Flex marginTop={1}>
        <Typography variant="pi" textColor="neutral600">
          {metaDescriptionToDisplay}
        </Typography>
      </Flex>
    </Box>
  );
};
