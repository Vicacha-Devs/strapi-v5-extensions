import { Box } from "@strapi/design-system";
import { Information } from "@strapi/icons";
import {
  ContentBox,
  Page,
  private_useAutoReloadOverlayBlocker as useAutoReloadOverlayBlocker,
  useFetchClient,
} from "@strapi/strapi/admin";
import * as React from "react";
import { useIntl } from "react-intl";

import type { ContentTypesResponse } from "../../../../shared";
import { Header } from "../../components/HomePage/Header";
import { Main } from "../../components/HomePage/Main";
import { pluginId } from "../../pluginId";
import { getTrad } from "../../utils/getTrad";

export const HomePage = React.memo(() => {
  const { get, post } = useFetchClient();
  const { lockAppWithAutoreload, unlockAppWithAutoreload } =
    useAutoReloadOverlayBlocker();

  const { formatMessage } = useIntl();
  const [isLoading, setIsLoading] = React.useState(true);
  const [seoComponent, setSeoComponent] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [contentTypes, setContentTypes] =
    React.useState<ContentTypesResponse | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const fetchSeoComponent = async () => {
      try {
        const { data } = await get<Record<string, unknown> | null>(
          `/${pluginId}/component`
        );
        return data;
      } catch {
        return null;
      }
    };

    const fetchContentTypes = async () => {
      try {
        const { data } = await get<ContentTypesResponse>(
          `/${pluginId}/content-types`
        );
        return data;
      } catch {
        return null;
      }
    };

    const createSeoComponent = async () => {
      try {
        const { data } = await post<Record<string, unknown> | null>(
          `/${pluginId}/component`
        );
        return data;
      } catch {
        return null;
      }
    };

    const fetchData = async () => {
      let currentComponent = await fetchSeoComponent();
      let currentContentTypes = await fetchContentTypes();

      const hasNoSeoComponent =
        !currentComponent || Object.keys(currentComponent).length === 0;
      if (hasNoSeoComponent) {
        try {
          lockAppWithAutoreload();
          await createSeoComponent();
        } catch {
          // Ignore component creation error during auto-reload
        } finally {
          unlockAppWithAutoreload();
        }
        currentComponent = await fetchSeoComponent();
        currentContentTypes = await fetchContentTypes();
      }

      if (isMounted) {
        setSeoComponent(currentComponent);
        setContentTypes(currentContentTypes);
        setIsLoading(false);
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <React.Fragment>
      <Header seoComponent={seoComponent} />
      <Box paddingLeft={8} paddingRight={8}>
        <ContentBox
          title={formatMessage({
            id: getTrad("Information"),
            defaultMessage: "Information",
          })}
          subtitle={formatMessage({
            id: getTrad("SEOPage.info.information"),
            defaultMessage:
              "When adding your SEO component, make sure to name it 'seo' " +
              "and to include it in the root of your Content-Type.",
          })}
          icon={<Information />}
          iconBackground="primary100"
        />
      </Box>
      <Main contentTypes={contentTypes} />
    </React.Fragment>
  );
});
