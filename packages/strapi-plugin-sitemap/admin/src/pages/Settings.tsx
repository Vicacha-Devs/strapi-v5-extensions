import React, { useState, useEffect } from 'react';
import { Main, Box, Button, Grid, Flex, Typography, TextInput } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import CollectionTypeModal, { CollectionTypeConfig } from '../components/CollectionTypeModal';
import CustomURLModal, { CustomURLConfig } from '../components/CustomURLModal';
import SitemapDefinitionModal, { SitemapDefinition } from '../components/SitemapDefinitionModal';
import { CollectionTypesSection } from '../components/settings/CollectionTypesSection';
import { CustomUrlsSection } from '../components/settings/CustomUrlsSection';
import { ExcludedUrlsSection } from '../components/settings/ExcludedUrlsSection';
import { SitemapIndexSection } from '../components/settings/SitemapIndexSection';
import getTrad from '../utils/getTrad';

interface SitemapSettingsPayload {
  baseUrl?: string;
  collectionTypes?: CollectionTypeConfig[];
  customURLs?: CustomURLConfig[];
  excludedUrls?: string[];
  useSitemapIndex?: boolean;
  sitemaps?: SitemapDefinition[];
}

interface NormalizedSitemapSettings {
  baseUrl: string;
  collectionTypes: CollectionTypeConfig[];
  customURLs: CustomURLConfig[];
  excludedUrls: string[];
  useSitemapIndex: boolean;
  sitemaps: SitemapDefinition[];
}

const normalizeFetchedSettings = (data?: SitemapSettingsPayload): NormalizedSitemapSettings => ({
  baseUrl: data?.baseUrl || '',
  collectionTypes: data?.collectionTypes || [],
  customURLs: data?.customURLs || [],
  excludedUrls: data?.excludedUrls || [],
  useSitemapIndex: Boolean(data?.useSitemapIndex),
  sitemaps: data?.sitemaps || [],
});

const upsertAtIndex = <T,>(items: T[], index: number | null, nextItem: T): T[] => {
  if (index === null) {
    return [...items, nextItem];
  }
  return items.map((item, i) => (i === index ? nextItem : item));
};

const Settings: React.FC = () => {
  const { get, put } = useFetchClient();
  const { formatMessage } = useIntl();

  const [baseUrl, setBaseUrl] = useState<string>('');
  const [initialBaseUrl, setInitialBaseUrl] = useState<string>('');
  const [collectionTypes, setCollectionTypes] = useState<CollectionTypeConfig[]>([]);
  const [customURLs, setCustomURLs] = useState<CustomURLConfig[]>([]);
  const [excludedUrls, setExcludedUrls] = useState<string[]>([]);
  const [initialExcludedUrls, setInitialExcludedUrls] = useState<string[]>([]);
  const [newExcludedPath, setNewExcludedPath] = useState<string>('');

  const [useSitemapIndex, setUseSitemapIndex] = useState<boolean>(false);
  const [sitemaps, setSitemaps] = useState<SitemapDefinition[]>([]);
  const [initialUseSitemapIndex, setInitialUseSitemapIndex] = useState<boolean>(false);
  const [initialSitemaps, setInitialSitemaps] = useState<SitemapDefinition[]>([]);
  const [isSitemapModalOpen, setIsSitemapModalOpen] = useState<boolean>(false);
  const [editingSitemapIndex, setEditingSitemapIndex] = useState<number | null>(null);

  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState<boolean>(false);
  const [editingCollectionIndex, setEditingCollectionIndex] = useState<number | null>(null);

  const [isCustomURLModalOpen, setIsCustomURLModalOpen] = useState<boolean>(false);
  const [editingCustomIndex, setEditingCustomIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await get<SitemapSettingsPayload>('/sitemap/settings');
        const normalized = normalizeFetchedSettings(data);
        setBaseUrl(normalized.baseUrl);
        setInitialBaseUrl(normalized.baseUrl);
        setCollectionTypes(normalized.collectionTypes);
        setCustomURLs(normalized.customURLs);
        setExcludedUrls(normalized.excludedUrls);
        setInitialExcludedUrls(normalized.excludedUrls);
        setUseSitemapIndex(normalized.useSitemapIndex);
        setSitemaps(normalized.sitemaps);
        setInitialUseSitemapIndex(normalized.useSitemapIndex);
        setInitialSitemaps(normalized.sitemaps);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    void fetchSettings();
  }, [get]);

  const isUrlModified = baseUrl !== initialBaseUrl;
  const isSitemapSettingsModified =
    useSitemapIndex !== initialUseSitemapIndex ||
    JSON.stringify(sitemaps) !== JSON.stringify(initialSitemaps);
  const isExcludedUrlsModified =
    JSON.stringify(excludedUrls) !== JSON.stringify(initialExcludedUrls);

  const persistSettings = async (overrides: Partial<NormalizedSitemapSettings> = {}) => {
    await put('/sitemap/settings', {
      baseUrl,
      collectionTypes,
      customURLs,
      excludedUrls,
      useSitemapIndex,
      sitemaps,
      ...overrides,
    });
  };

  const handleSaveBaseUrl = async () => {
    try {
      await persistSettings();
      setInitialBaseUrl(baseUrl);
    } catch (err) {
      console.error('Failed to update baseUrl:', err);
    }
  };

  const handleSaveSitemapSettings = async () => {
    try {
      await persistSettings();
      setInitialUseSitemapIndex(useSitemapIndex);
      setInitialSitemaps(sitemaps);
    } catch (err) {
      console.error('Failed to update sitemap settings:', err);
    }
  };

  const handleAddExcludedUrl = () => {
    const trimmed = newExcludedPath.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (!excludedUrls.includes(normalized)) {
      setExcludedUrls([...excludedUrls, normalized]);
      setNewExcludedPath('');
    }
  };

  const handleDeleteExcludedUrl = (index: number) => {
    setExcludedUrls(excludedUrls.filter((_, i) => i !== index));
  };

  const handleSaveExcludedUrls = async () => {
    try {
      await persistSettings();
      setInitialExcludedUrls(excludedUrls);
    } catch (err) {
      console.error('Failed to update excluded URLs:', err);
    }
  };

  const handleSaveSitemapDef = async (def: SitemapDefinition) => {
    const updated = upsertAtIndex(sitemaps, editingSitemapIndex, def);
    setSitemaps(updated);
    setIsSitemapModalOpen(false);
    setEditingSitemapIndex(null);
    try {
      await persistSettings({ sitemaps: updated });
      setInitialSitemaps(updated);
    } catch (err) {
      console.error('Failed to save sitemap definition:', err);
    }
  };

  const handleDeleteSitemapDef = async (index: number) => {
    const updated = sitemaps.filter((_, i) => i !== index);
    setSitemaps(updated);
    try {
      await persistSettings({ sitemaps: updated });
      setInitialSitemaps(updated);
    } catch (err) {
      console.error('Failed to delete sitemap definition:', err);
    }
  };

  const handleSaveCollectionType = async (data: CollectionTypeConfig) => {
    const updatedCollectionTypes = upsertAtIndex(collectionTypes, editingCollectionIndex, data);
    setCollectionTypes(updatedCollectionTypes);
    setIsCollectionModalOpen(false);
    setEditingCollectionIndex(null);

    try {
      await persistSettings({ collectionTypes: updatedCollectionTypes });
    } catch (err) {
      console.error('Failed to save collection types:', err);
    }
  };

  const handleDeleteCollectionType = async (index: number) => {
    const updatedCollectionTypes = collectionTypes.filter((_, i) => i !== index);
    setCollectionTypes(updatedCollectionTypes);

    try {
      await persistSettings({ collectionTypes: updatedCollectionTypes });
    } catch (err) {
      console.error('Failed to delete collection type:', err);
    }
  };

  const handleSaveCustomURL = async (data: CustomURLConfig) => {
    const updatedCustomURLs = upsertAtIndex(customURLs, editingCustomIndex, data);
    setCustomURLs(updatedCustomURLs);
    setIsCustomURLModalOpen(false);
    setEditingCustomIndex(null);

    try {
      await persistSettings({ customURLs: updatedCustomURLs });
    } catch (err) {
      console.error('Failed to save custom URLs:', err);
    }
  };

  const handleDeleteCustomURL = async (index: number) => {
    const updatedCustomURLs = customURLs.filter((_, i) => i !== index);
    setCustomURLs(updatedCustomURLs);

    try {
      await persistSettings({ customURLs: updatedCustomURLs });
    } catch (err) {
      console.error('Failed to delete custom URL:', err);
    }
  };

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Box paddingBottom={4}>
          <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={4}>
            <Box>
              <Typography variant="alpha" as="h1">
                {formatMessage({ id: getTrad('settings.title'), defaultMessage: 'Sitemap' })}
              </Typography>
              <Typography variant="epsilon" textColor="neutral600" as="p">
                {formatMessage({
                  id: getTrad('settings.subtitle'),
                  defaultMessage: 'Settings for the XML sitemap and sitemap index',
                })}
              </Typography>
            </Box>
            <Button
              variant="secondary"
              onClick={() => window.open('/api/sitemap/sitemap.xml', '_blank')}
            >
              {formatMessage({
                id: getTrad('settings.showSitemap'),
                defaultMessage: 'Show Sitemap',
              })}
            </Button>
          </Flex>
        </Box>

        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius marginBottom={6}>
          <Typography variant="delta" as="h2">
            {formatMessage({ id: getTrad('settings.baseUrl.title'), defaultMessage: 'Base URL' })}
          </Typography>
          <Box paddingBottom={4}>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTrad('settings.baseUrl.description'),
                defaultMessage: 'Enter the base URL used for all sitemap entries',
              })}
            </Typography>
          </Box>
          <Grid.Root gap={4}>
            <Grid.Item col={6} s={12}>
              <Box style={{ width: '100%' }}>
                <TextInput
                  placeholder={formatMessage({
                    id: getTrad('settings.baseUrl.placeholder'),
                    defaultMessage: 'https://example.com',
                  })}
                  value={baseUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)}
                />
              </Box>
            </Grid.Item>
          </Grid.Root>
          <Box paddingTop={4}>
            <Button
              startIcon={<Check />}
              onClick={handleSaveBaseUrl}
              disabled={!isUrlModified}
              variant={isUrlModified ? 'default' : 'tertiary'}
            >
              {formatMessage({ id: getTrad('settings.save'), defaultMessage: 'Save' })}
            </Button>
          </Box>
        </Box>

        <SitemapIndexSection
          useSitemapIndex={useSitemapIndex}
          setUseSitemapIndex={setUseSitemapIndex}
          sitemaps={sitemaps}
          isSitemapSettingsModified={isSitemapSettingsModified}
          onSaveSitemapSettings={handleSaveSitemapSettings}
          onAddSitemap={() => {
            setEditingSitemapIndex(null);
            setIsSitemapModalOpen(true);
          }}
          onEditSitemap={(idx) => {
            setEditingSitemapIndex(idx);
            setIsSitemapModalOpen(true);
          }}
          onDeleteSitemap={handleDeleteSitemapDef}
        />

        <CollectionTypesSection
          collectionTypes={collectionTypes}
          onAddCollectionType={() => {
            setEditingCollectionIndex(null);
            setIsCollectionModalOpen(true);
          }}
          onEditCollectionType={(idx) => {
            setEditingCollectionIndex(idx);
            setIsCollectionModalOpen(true);
          }}
          onDeleteCollectionType={handleDeleteCollectionType}
        />

        <CustomUrlsSection
          customURLs={customURLs}
          onAddCustomUrl={() => {
            setEditingCustomIndex(null);
            setIsCustomURLModalOpen(true);
          }}
          onEditCustomUrl={(idx) => {
            setEditingCustomIndex(idx);
            setIsCustomURLModalOpen(true);
          }}
          onDeleteCustomUrl={handleDeleteCustomURL}
        />

        <ExcludedUrlsSection
          excludedUrls={excludedUrls}
          newExcludedPath={newExcludedPath}
          setNewExcludedPath={setNewExcludedPath}
          isExcludedUrlsModified={isExcludedUrlsModified}
          onAddExcludedUrl={handleAddExcludedUrl}
          onDeleteExcludedUrl={handleDeleteExcludedUrl}
          onSaveExcludedUrls={handleSaveExcludedUrls}
        />
      </Box>

      <CollectionTypeModal
        isOpen={isCollectionModalOpen}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setEditingCollectionIndex(null);
        }}
        onSave={handleSaveCollectionType}
        existingData={
          editingCollectionIndex !== null ? collectionTypes[editingCollectionIndex] : null
        }
      />

      <CustomURLModal
        isOpen={isCustomURLModalOpen}
        onClose={() => {
          setIsCustomURLModalOpen(false);
          setEditingCustomIndex(null);
        }}
        onSave={handleSaveCustomURL}
        existingData={editingCustomIndex !== null ? customURLs[editingCustomIndex] : null}
      />

      <SitemapDefinitionModal
        isOpen={isSitemapModalOpen}
        onClose={() => {
          setIsSitemapModalOpen(false);
          setEditingSitemapIndex(null);
        }}
        onSave={handleSaveSitemapDef}
        existingDef={editingSitemapIndex !== null ? sitemaps[editingSitemapIndex] : null}
        collectionTypes={collectionTypes}
      />
    </Main>
  );
};

export default Settings;
