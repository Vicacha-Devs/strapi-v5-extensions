import * as React from 'react';
import { useIntl } from 'react-intl';
import { Box, EmptyStateLayout, Modal, Typography } from '@strapi/design-system';
import type { SeoChecksState } from '../../../../../../shared';
import { getTrad } from '../../../../utils/getTrad';
import { Illo } from '../../../HomePage/Main/EmptyComponentLayout/illo';
import { getRichTextData } from '../../utils/getRichTextData';
import { AlternativeTextCheck } from './AlternativeTextCheck';
import { CanonicalUrlCheck } from './CanonicalUrlCheck';
import { KeywordDensityCheck } from './KeywordDensityCheck';
import { LastUpdatedAtCheck } from './LastUpdatedAtCheck';
import { MetaDescriptionCheck } from './MetaDescriptionCheck';
import { MetaRobotCheck } from './MetaRobotCheck';
import { MetaTitleCheck } from './MetaTitleCheck';
import { OpenGraphCheck } from './OpenGraphCheck';
import { StructuredDataCheck } from './StructuredDataCheck';
import { WordCountCheck } from './WordCountCheck';

interface SeoChecksProps {
  updatedAt: string | null;
  modifiedData: Record<string, any>;
  components: Record<string, any>;
  contentType: Record<string, any>;
  checks: SeoChecksState;
}

export const SeoChecks = ({
  updatedAt,
  modifiedData,
  components,
  contentType,
  checks,
}: SeoChecksProps) => {
  const { formatMessage } = useIntl();

  const { wordCount, keywordsDensity, emptyAltCount } = getRichTextData(
    modifiedData,
    components,
    contentType
  );

  const seo = modifiedData?.seo ?? null;
  const hasSeo = Boolean(seo && Object.keys(seo).length > 0);

  return (
    <Modal.Content labelledBy="title">
      <Modal.Header>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('Button.seo-analyze'),
            defaultMessage: 'SEO Analyze',
          })}
        </Typography>
      </Modal.Header>
      <Modal.Body>
        {hasSeo ? (
          <Box>
            {checks?.metaTitle && (
              <MetaTitleCheck metaTitle={seo?.metaTitle ?? null} checks={checks} />
            )}
            {checks?.metaDescription && (
              <MetaDescriptionCheck
                metaDescription={seo?.metaDescription ?? null}
                checks={checks}
              />
            )}
            {checks?.wordCount && <WordCountCheck wordCount={wordCount} checks={checks} />}
            {checks?.keywordsDensity && (
              <KeywordDensityCheck keywordsDensity={keywordsDensity} checks={checks} />
            )}
            {checks?.openGraph && (
              <OpenGraphCheck openGraph={seo?.openGraph ?? null} checks={checks} />
            )}
            {checks?.canonicalUrl && (
              <CanonicalUrlCheck canonicalUrl={seo?.canonicalURL ?? null} checks={checks} />
            )}
            {checks?.structuredData && (
              <StructuredDataCheck structuredData={seo?.structuredData ?? null} checks={checks} />
            )}
            {checks?.metaRobots && (
              <MetaRobotCheck metaRobots={seo?.metaRobots ?? null} checks={checks} />
            )}
            {checks?.alternativeText && (
              <AlternativeTextCheck
                intersections={emptyAltCount?.intersections ?? null}
                richTextAlts={emptyAltCount?.richTextAlts ?? []}
                altTexts={emptyAltCount?.altTexts ?? []}
                checks={checks}
              />
            )}
            {checks?.lastUpdatedAt && <LastUpdatedAtCheck updatedAt={updatedAt} checks={checks} />}
          </Box>
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
