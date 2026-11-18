import {
  Badge,
  Box,
  Button,
  Flex,
  Modal,
  TextButton,
  Typography,
} from "@strapi/design-system";
import { ArrowRight, Eye, Pencil } from "@strapi/icons";
import {
  unstable_useContentManagerContext as useContentManagerContext,
  unstable_useDocument as useDocument,
  useFetchClient,
} from "@strapi/strapi/admin";
import * as React from "react";
import { useIntl } from "react-intl";

import {
  type ComponentSchemasMap,
  type ContentManagerFormValues,
  type ContentTypeSchemaInfo,
  DEFAULT_SEO_CHECKS,
  type GeneratedSeoMetadata,
  type SeoCheckerAction,
  type SeoChecksConfig,
  type SeoChecksState,
  type SeoComponentValues,
  hasNoIndexDirective,
} from "../../../../../../shared";
import { useSettingsApi } from "../../../../hooks/useSettingsApi";
import { getTrad } from "../../../../utils/getTrad";
import {
  canonicalUrlPreview,
  getAlternativeTextPreview,
  getKeywordDensityPreview,
  getMetaDescriptionPreview,
  getMetaTitleCheckPreview,
  getWordCountPreview,
  lastUpdatedAtPreview,
  metaRobotPreview,
  openGraphPreview,
  structuredDataPreview,
} from "../../utils/checks";
import { getRichTextData } from "../../utils/getRichTextData";
import { SeoChecks } from "../SeoChecks";
import { BrowserPreview } from "./BrowserPreview";
import { OpenGraphPreview } from "./OpenGraphPreview";
import { PreviewChecks } from "./PreviewChecks";
import { reducer } from "./reducer";

const initialState: SeoChecksState = {
  preview: true,
};

export const SeoCheckerContext =
  React.createContext<React.Dispatch<SeoCheckerAction> | null>(null);

const buildMetaChecksPreview = (
  seoChecks: SeoChecksConfig,
  currentModifiedData: ContentManagerFormValues,
  updatedAt: string | null
): SeoChecksState => ({
  ...(seoChecks.metaTitle && {
    metaTitle: getMetaTitleCheckPreview(currentModifiedData),
  }),
  ...(seoChecks.metaDescription && {
    metaDescription: getMetaDescriptionPreview(currentModifiedData),
  }),
  ...(seoChecks.metaRobots && {
    metaRobots: metaRobotPreview(currentModifiedData),
  }),
  ...(seoChecks.openGraph && {
    openGraph: openGraphPreview(currentModifiedData),
  }),
  ...(seoChecks.canonicalUrl && {
    canonicalUrl: canonicalUrlPreview(currentModifiedData),
  }),
  ...(seoChecks.structuredData && {
    structuredData: structuredDataPreview(currentModifiedData),
  }),
  ...(seoChecks.lastUpdatedAt && {
    lastUpdatedAt: lastUpdatedAtPreview(currentModifiedData, updatedAt),
  }),
});

const computeAllChecks = (
  seoChecks: SeoChecksConfig,
  currentModifiedData: ContentManagerFormValues,
  currentComponents: ComponentSchemasMap,
  currentContentType: ContentTypeSchemaInfo,
  updatedAt: string | null
): SeoChecksState => {
  const { wordCount, keywordsDensity, emptyAltCount } = getRichTextData(
    currentModifiedData,
    currentComponents,
    currentContentType
  );

  return {
    ...buildMetaChecksPreview(seoChecks, currentModifiedData, updatedAt),
    ...(seoChecks.wordCount && {
      wordCount: getWordCountPreview(wordCount),
    }),
    ...(seoChecks.alternativeText && {
      alternativeText: getAlternativeTextPreview(emptyAltCount),
    }),
    ...(seoChecks.keywordDensity && {
      keywordsDensity: getKeywordDensityPreview(keywordsDensity),
    }),
  };
};

interface SummaryProps {
  seoFieldName?: string;
}

export const Summary = ({ seoFieldName = "seo" }: SummaryProps) => {
  const { formatMessage } = useIntl();
  const { getSettings } = useSettingsApi();
  const { post } = useFetchClient();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const [seoChecksConfig, setSeoChecksConfig] =
    React.useState<SeoChecksConfig>(DEFAULT_SEO_CHECKS);
  const [checks, dispatch] = React.useReducer(reducer, initialState);

  const { model, collectionType, id, form, contentType, components } =
    useContentManagerContext();
  const { values: modifiedData, onChange } = form as {
    values: ContentManagerFormValues;
    onChange?: (name: string, value: unknown) => void;
  };

  const rawSeo = (modifiedData?.[seoFieldName] ?? null) as SeoComponentValues | null;
  const normalizedModifiedData = React.useMemo<ContentManagerFormValues>(
    () =>
      seoFieldName === "seo"
        ? modifiedData
        : { ...modifiedData, seo: rawSeo },
    [modifiedData, rawSeo, seoFieldName]
  );

  const { metaTitle, metaDescription, openGraph, metaRobots } = rawSeo ?? {};
  const isNoIndex = hasNoIndexDirective(metaRobots);

  const { document } = useDocument({
    model,
    collectionType,
    documentId: id,
  });

  const updatedAt = document?.updatedAt ?? modifiedData?.updatedAt ?? null;
  const uid = contentType?.uid ?? "";

  const handleAutoGenerate = React.useCallback(async () => {
    setIsGenerating(true);
    try {
      const locale =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get(
              "plugins[i18n][locale]"
            )
          : null;
      const { data } = await post<GeneratedSeoMetadata>("/seo/generate", {
        uid,
        doc: modifiedData,
        locale,
      });
      if (data) {
        const nextSeo: Record<string, unknown> = {
          ...(rawSeo ?? {}),
        };
        if (data.metaTitle) nextSeo.metaTitle = data.metaTitle;
        if (data.metaDescription)
          nextSeo.metaDescription = data.metaDescription;
        if (data.metaImage && !nextSeo.metaImage)
          nextSeo.metaImage = data.metaImage;
        if (data.canonicalURL && !nextSeo.canonicalURL)
          nextSeo.canonicalURL = data.canonicalURL;
        if (data.canonicalURL) setGeneratedUrl(data.canonicalURL);
        if (typeof onChange === "function") {
          onChange(seoFieldName, nextSeo);
        }
      }
    } catch {
      // Ignore generation errors in UI
    } finally {
      setIsGenerating(false);
    }
  }, [modifiedData, onChange, post, rawSeo, seoFieldName, uid]);

  React.useEffect(() => {
    let isMounted = true;
    void getSettings()
      .then(({ data: defaultSettings }) => {
        if (!isMounted) return;
        const resolved =
          defaultSettings?.[uid]?.seoChecks ?? DEFAULT_SEO_CHECKS;
        setSeoChecksConfig(resolved);
      })
      .catch(() => {
        if (!isMounted) return;
        setSeoChecksConfig(DEFAULT_SEO_CHECKS);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [uid]);

  React.useEffect(() => {
    const status = computeAllChecks(
      seoChecksConfig,
      normalizedModifiedData,
      components,
      contentType,
      updatedAt
    );
    dispatch({
      type: "UPDATE_FOR_PREVIEW",
      value: status,
    });
  }, [
    seoChecksConfig,
    normalizedModifiedData,
    components,
    contentType,
    updatedAt,
  ]);

  const titleLen = typeof metaTitle === "string" ? metaTitle.length : 0;
  const descLen =
    typeof metaDescription === "string" ? metaDescription.length : 0;

  return (
    <SeoCheckerContext.Provider value={dispatch}>
      <Box paddingTop={4} width="100%">
        <Flex justifyContent="space-between" alignItems="center" gap={2}>
          <Typography
            tag="h2"
            variant="sigma"
            textTransform="uppercase"
            textColor="neutral600"
          >
            {formatMessage({
              id: getTrad("Plugin.name"),
              defaultMessage: "SEO Plugin",
            })}
          </Typography>
          {isNoIndex && (
            <Badge active={false}>
              {formatMessage({
                id: getTrad("Badge.noindex"),
                defaultMessage: "noindex",
              })}
            </Badge>
          )}
        </Flex>

        <Box paddingTop={2}>
          <Button
            fullWidth
            variant="tertiary"
            startIcon={<Pencil />}
            loading={isGenerating}
            onClick={handleAutoGenerate}
          >
            {formatMessage({
              id: getTrad("Button.auto-generate"),
              defaultMessage: "Auto-generate SEO",
            })}
          </Button>
        </Box>

        <Box paddingTop={2}>
          <Flex justifyContent="space-between">
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTrad("Length.title"),
                defaultMessage: "Title",
              })}
            </Typography>
            <Typography
              variant="pi"
              textColor={
                titleLen === 0 || titleLen > 60 ? "danger600" : "success600"
              }
            >
              {titleLen}/60
            </Typography>
          </Flex>
          <Flex justifyContent="space-between" paddingTop={1}>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTrad("Length.description"),
                defaultMessage: "Description",
              })}
            </Typography>
            <Typography
              variant="pi"
              textColor={
                descLen < 50 || descLen > 160 ? "danger600" : "success600"
              }
            >
              {descLen}/160
            </Typography>
          </Flex>
        </Box>

        {metaTitle && metaDescription && (
          <Modal.Root>
            <Modal.Trigger>
              <Box paddingTop={2}>
                <Button fullWidth variant="secondary" startIcon={<Eye />}>
                  {formatMessage({
                    id: getTrad("Button.browser-preview"),
                    defaultMessage: "Browser Preview",
                  })}
                </Button>
              </Box>
            </Modal.Trigger>
            <BrowserPreview
              modifiedData={normalizedModifiedData}
              previewUrl={generatedUrl}
            />
          </Modal.Root>
        )}

        {openGraph && (
          <Modal.Root>
            <Modal.Trigger>
              <Box paddingTop={2}>
                <Button fullWidth variant="secondary" startIcon={<Eye />}>
                  {formatMessage({
                    id: getTrad("Button.open-graph-preview"),
                    defaultMessage: "Open Graph Preview",
                  })}
                </Button>
              </Box>
            </Modal.Trigger>
            <OpenGraphPreview modifiedData={normalizedModifiedData} />
          </Modal.Root>
        )}

        {!isLoading && <PreviewChecks checks={checks} />}

        <Modal.Root>
          <Modal.Trigger>
            <Box paddingTop={4}>
              <TextButton startIcon={<ArrowRight />}>
                {formatMessage({
                  id: getTrad("Button.see-details"),
                  defaultMessage: "SEE DETAILS",
                })}
              </TextButton>
            </Box>
          </Modal.Trigger>
          <SeoChecks
            updatedAt={document?.updatedAt ?? null}
            modifiedData={normalizedModifiedData}
            components={components}
            contentType={contentType}
            checks={checks}
          />
        </Modal.Root>
      </Box>
    </SeoCheckerContext.Provider>
  );
};
