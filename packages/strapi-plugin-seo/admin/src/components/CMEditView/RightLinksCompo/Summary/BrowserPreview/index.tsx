import * as React from 'react';
import { useIntl } from 'react-intl';
import { Box, Divider, EmptyStateLayout, Flex, Modal, Typography } from '@strapi/design-system';
import get from 'lodash/get';
import type { ContentManagerFormValues, SeoComponentValues } from '../../../../../../../shared';
import { getTrad } from '../../../../../utils/getTrad';
import { Illo } from '../../../../HomePage/Main/EmptyComponentLayout/illo';
import { KeywordCheck } from './KeywordCheck';
import { MetaChecks } from './MetaChecks';
import { Serp } from './Serp';

interface BrowserPreviewProps {
  modifiedData: ContentManagerFormValues;
}

export const BrowserPreview = ({ modifiedData }: BrowserPreviewProps) => {
  const { formatMessage } = useIntl();

  const seo = get<SeoComponentValues | null>(modifiedData, 'seo', null);
  const metaTitle = get<string | null>(seo, 'metaTitle', null);
  const metaDescription = get<string | null>(seo, 'metaDescription', null);
  const keywords = get<string | null>(seo, 'keywords', null);

  return (
    <Modal.Content labelledBy="title">
      <Modal.Header>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('Button.browser-preview'),
            defaultMessage: 'Browser Preview',
          })}
        </Typography>
      </Modal.Header>
      <Modal.Body>
        {seo ? (
          <Flex direction="column" gap={2} alignItems="flex-start">
            {metaTitle && metaDescription && (
              <Box paddingBottom={6}>
                <Serp metaTitle={metaTitle} metaDescription={metaDescription} />
              </Box>
            )}

            <Divider marginBottom={4} width="100%" />

            {metaTitle && <MetaChecks item={metaTitle} max={60} label="title" />}
            {metaDescription && (
              <MetaChecks item={metaDescription} max={160} label="description" minLimit={true} />
            )}
            {keywords && (
              <React.Fragment>
                {metaTitle && <KeywordCheck item={metaTitle} keywords={keywords} label="title" />}
                {metaDescription && (
                  <KeywordCheck item={metaDescription} keywords={keywords} label="description" />
                )}
              </React.Fragment>
            )}
          </Flex>
        ) : (
          <Box paddingLeft={4}>
            <EmptyStateLayout
              icon={<Illo />}
              content={formatMessage({
                id: getTrad('Modal.seo-component-empty'),
                defaultMessage: 'Your SEO component is empty...',
              })}
            />
          </Box>
        )}
      </Modal.Body>
    </Modal.Content>
  );
};
