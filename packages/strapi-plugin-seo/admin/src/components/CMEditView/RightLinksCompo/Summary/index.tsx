import * as React from 'react';
import { useIntl } from 'react-intl';
import { Box, Button, Modal, TextButton, Typography } from '@strapi/design-system';
import { ArrowRight, Eye } from '@strapi/icons';
import {
  unstable_useContentManagerContext as useContentManagerContext,
  unstable_useDocument as useDocument,
} from '@strapi/strapi/admin';
import {
  type ComponentSchemasMap,
  type ContentManagerFormValues,
  type ContentTypeSchemaInfo,
  DEFAULT_SEO_CHECKS,
  type SeoCheckerAction,
  type SeoChecksConfig,
  type SeoChecksState,
} from '../../../../../../shared';
import { useSettingsApi } from '../../../../hooks/useSettingsApi';
import { getTrad } from '../../../../utils/getTrad';
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
} from '../../utils/checks';
import { getRichTextData } from '../../utils/getRichTextData';
import { SeoChecks } from '../SeoChecks';
import { BrowserPreview } from './BrowserPreview';
import { OpenGraphPreview } from './OpenGraphPreview';
import { PreviewChecks } from './PreviewChecks';
import { reducer } from './reducer';

const initialState: SeoChecksState = {
  preview: true,
};

export const SeoCheckerContext = React.createContext<React.Dispatch<SeoCheckerAction> | null>(null);

const buildMetaChecksPreview = (
  seoChecks: SeoChecksConfig,
  currentModifiedData: ContentManagerFormValues
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
    lastUpdatedAt: lastUpdatedAtPreview(currentModifiedData),
  }),
});

export const Summary = () => {
  const { formatMessage } = useIntl();
  const { getSettings } = useSettingsApi();

  const [isLoading, setIsLoading] = React.useState(true);
  const [localChecks, setLocalChecks] = React.useState<SeoChecksState>({});
  const [checks, dispatch] = React.useReducer(reducer, initialState);

  const { model, collectionType, id, form, contentType, components } = useContentManagerContext();
  const { values: modifiedData } = form;

  const { metaTitle, metaDescription, openGraph } = modifiedData.seo ?? {};

  const { document } = useDocument({
    model,
    collectionType,
    documentId: id,
  });

  const getAllChecks = async (
    currentModifiedData: ContentManagerFormValues,
    currentComponents: ComponentSchemasMap,
    currentContentType: ContentTypeSchemaInfo
  ): Promise<SeoChecksState> => {
    const { data: defaultSettings } = await getSettings();
    const uid = currentContentType?.uid ?? '';
    const seoChecks = defaultSettings?.[uid]?.seoChecks ?? DEFAULT_SEO_CHECKS;

    const { wordCount, keywordsDensity, emptyAltCount } = getRichTextData(
      currentModifiedData,
      currentComponents,
      currentContentType
    );

    return {
      ...buildMetaChecksPreview(seoChecks, currentModifiedData),
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

  React.useEffect(() => {
    const fetchChecks = async () => {
      if (!(JSON.stringify(localChecks) === JSON.stringify(checks))) {
        if (checks?.preview) {
          const status = await getAllChecks(modifiedData, components, contentType);

          dispatch({
            type: 'UPDATE_FOR_PREVIEW',
            value: status,
          });
        } else {
          dispatch({
            type: 'UPDATE_FOR_PREVIEW',
            value: checks,
          });
        }
        setLocalChecks(checks);
      }
    };

    void fetchChecks().then(() => {
      setIsLoading(false);
    });
  }, [checks]);

  return (
    <SeoCheckerContext.Provider value={dispatch}>
      <Box paddingTop={4} width="100%">
        <Typography tag="h2" variant="sigma" textTransform="uppercase" textColor="neutral600">
          {formatMessage({
            id: getTrad('Plugin.name'),
            defaultMessage: 'SEO Plugin',
          })}
        </Typography>

        {metaTitle && metaDescription && (
          <Modal.Root>
            <Modal.Trigger>
              <Box paddingTop={1}>
                <Button fullWidth variant="secondary" startIcon={<Eye />}>
                  {formatMessage({
                    id: getTrad('Button.browser-preview'),
                    defaultMessage: 'Browser Preview',
                  })}
                </Button>
              </Box>
            </Modal.Trigger>
            <BrowserPreview modifiedData={modifiedData} />
          </Modal.Root>
        )}

        {openGraph && (
          <Modal.Root>
            <Modal.Trigger>
              <Box paddingTop={2}>
                <Button fullWidth variant="secondary" startIcon={<Eye />}>
                  {formatMessage({
                    id: getTrad('Button.open-graph-preview'),
                    defaultMessage: 'Open Graph Preview',
                  })}
                </Button>
              </Box>
            </Modal.Trigger>
            <OpenGraphPreview modifiedData={modifiedData} />
          </Modal.Root>
        )}

        {!isLoading && <PreviewChecks checks={checks} />}

        <Modal.Root>
          <Modal.Trigger>
            <Box paddingTop={4}>
              <TextButton startIcon={<ArrowRight />}>
                {formatMessage({
                  id: getTrad('Button.see-details'),
                  defaultMessage: 'SEE DETAILS',
                })}
              </TextButton>
            </Box>
          </Modal.Trigger>
          <SeoChecks
            updatedAt={document?.updatedAt ?? null}
            modifiedData={modifiedData}
            components={components}
            contentType={contentType}
            checks={checks}
          />
        </Modal.Root>
      </Box>
    </SeoCheckerContext.Provider>
  );
};
