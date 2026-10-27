import * as React from 'react';
import { useIntl } from 'react-intl';
import { Box, Typography } from '@strapi/design-system';
import isEqual from 'lodash/isEqual';
import isNull from 'lodash/isNull';
import type { SeoChecksState, SeoCheckStatus } from '../../../../../../../shared';
import { getTrad } from '../../../../../utils/getTrad';
import { qualityVerdict } from '../../../utils/checks';
import { SeoCheckerContext } from '../../Summary';
import { SEOAccordion } from '../SEOAccordion';

interface CanonicalUrlCheckProps {
  canonicalUrl: string | null;
  checks: SeoChecksState;
}

export const CanonicalUrlCheck = ({ canonicalUrl, checks }: CanonicalUrlCheckProps) => {
  const { formatMessage } = useIntl();
  const dispatch = React.useContext(SeoCheckerContext);

  let status: SeoCheckStatus = {
    message: formatMessage({
      id: getTrad('SEOChecks.canonicalUrlCheck.found'),
      defaultMessage: 'A canonical URL has been found.',
    }),
    qualityVerdict: qualityVerdict.good,
  };

  React.useEffect(() => {
    if (isNull(canonicalUrl)) {
      status = {
        message: formatMessage({
          id: getTrad('SEOChecks.canonicalUrlCheck.default'),
          defaultMessage: 'No Canonical URL has been found.',
        }),
        qualityVerdict: qualityVerdict.bad,
      };
    }
    if (!isEqual(status, checks.canonicalUrl) && dispatch) {
      dispatch({
        type: 'UPDATE_PONCTUAL',
        value: { ...status, entity: 'canonicalUrl' },
      });
    }
  }, []);

  return (
    <SEOAccordion
      title={formatMessage({
        id: getTrad('SEOModal.summary-title.canonical-url'),
        defaultMessage: 'Canonical URL',
      })}
      status={checks.canonicalUrl}
      label={formatMessage({
        id: getTrad('SEOChecks.canonicalUrlCheck.label'),
        defaultMessage: 'This will check if you have a canonical URL.',
      })}
      component={
        <Box padding={canonicalUrl ? 4 : 0} background="neutral100">
          {canonicalUrl && (
            <Typography variant="omega" fontWeight="bold">
              {canonicalUrl}
            </Typography>
          )}
        </Box>
      }
    />
  );
};
