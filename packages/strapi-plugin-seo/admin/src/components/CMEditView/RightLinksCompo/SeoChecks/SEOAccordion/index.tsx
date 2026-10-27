import * as React from 'react';
import { Accordion, Box, IconButton, Typography } from '@strapi/design-system';
import { CheckCircle, CrossCircle, Information, WarningCircle } from '@strapi/icons';
import type { SeoCheckStatus } from '../../../../../../../shared';
import { qualityVerdict } from '../../../utils/checks';

interface SEOAccordionProps {
  title: string;
  status?: SeoCheckStatus;
  component?: React.ReactNode;
  label: string;
}

export const SEOAccordion = ({ title, status, component, label }: SEOAccordionProps) => {
  const getIcon = () => {
    switch (status?.qualityVerdict) {
      case qualityVerdict.good:
        return CheckCircle;
      case qualityVerdict.improvements:
        return WarningCircle;
      case qualityVerdict.bad:
        return CrossCircle;
      default:
        return WarningCircle;
    }
  };

  return (
    <Accordion.Root>
      <Accordion.Item value="acc-01">
        <Accordion.Header>
          <Accordion.Trigger icon={getIcon()}>{title}</Accordion.Trigger>
          <Accordion.Actions>
            <IconButton label={label}>
              <Information />
            </IconButton>
          </Accordion.Actions>
        </Accordion.Header>
        <Accordion.Content>
          <Box paddingTop={4} paddingLeft={4} paddingBottom={4}>
            <Typography variant="omega">{status?.message}</Typography>
          </Box>
          {component && component}
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
};
