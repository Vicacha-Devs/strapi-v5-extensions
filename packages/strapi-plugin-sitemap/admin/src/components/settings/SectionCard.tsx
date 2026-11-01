import { Box, Typography } from "@strapi/design-system";
import React from "react";

interface SectionCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  children,
}) => (
  <Box
    padding={6}
    background="neutral0"
    shadow="filterShadow"
    hasRadius
    marginBottom={6}
  >
    <Typography variant="delta" as="h2">
      {title}
    </Typography>
    <Box paddingBottom={4}>
      <Typography variant="pi" textColor="neutral600">
        {description}
      </Typography>
    </Box>
    {children}
  </Box>
);

export default SectionCard;
