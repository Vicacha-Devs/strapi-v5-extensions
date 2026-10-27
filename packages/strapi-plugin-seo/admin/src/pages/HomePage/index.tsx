import * as React from 'react';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system';
import { Information } from '@strapi/icons';
import {
  ContentBox,
  Page,
  private_useAutoReloadOverlayBlocker as useAutoReloadOverlayBlocker,
  useFetchClient,
} from '@strapi/strapi/admin';
import type { ContentTypesResponse } from '../../../../shared';
import { Header } from '../../components/HomePage/Header';
import { Main } from '../../components/HomePage/Main';
import { pluginId } from '../../pluginId';
import { getTrad } from '../../utils/getTrad';

export const HomePage = React.memo(() => {
  const { get, post } = useFetchClient();
  const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();

  const { formatMessage } = useIntl();
  const [isLoading, setIsLoading] = React.useState(true);
  const [shouldEffect, setShouldEffect] = React.useState(false);

  const seoComponent = React.useRef<Record<string, unknown> | null>(null);
  const contentTypes = React.useRef<ContentTypesResponse | null>(null);

  const fetchSeoComponent = async () => {
    try {
      const { data } = await get<Record<string, unknown> | null>(`/${pluginId}/component`);
      return data;
    } catch {
      return null;
    }
  };

  const fetchContentTypes = async () => {
    try {
      const { data } = await get<ContentTypesResponse>(`/${pluginId}/content-types`);
      return data;
    } catch {
      return null;
    }
  };

  const createSeoComponent = async () => {
    try {
      const { data } = await post<Record<string, unknown> | null>(`/${pluginId}/component`);
      return data;
    } catch {
      return null;
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      seoComponent.current = await fetchSeoComponent();
      contentTypes.current = await fetchContentTypes();

      const hasNoSeoComponent =
        !seoComponent.current || Object.keys(seoComponent.current).length === 0;
      if (hasNoSeoComponent) {
        try {
          lockAppWithAutoreload();
          await createSeoComponent();
        } catch (error) {
          console.log(error);
        } finally {
          unlockAppWithAutoreload();
          setShouldEffect(true);
        }
      }
    };
    void fetchData().then(() => {
      setIsLoading(false);
    });
  }, [shouldEffect]);

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <React.Fragment>
      <Header seoComponent={seoComponent.current} />
      <Box paddingLeft={8} paddingRight={8}>
        <ContentBox
          title={formatMessage({
            id: getTrad('Information'),
            defaultMessage: 'Information',
          })}
          subtitle={formatMessage({
            id: getTrad('SEOPage.info.information'),
            defaultMessage:
              "When adding your SEO component, make sure to name it 'seo' and to include it in the root of your Content-Type.",
          })}
          icon={<Information />}
          iconBackground="primary100"
        />
      </Box>
      <Main contentTypes={contentTypes.current} />
    </React.Fragment>
  );
});
