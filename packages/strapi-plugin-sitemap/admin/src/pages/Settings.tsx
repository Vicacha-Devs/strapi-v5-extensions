import React, { useState, useEffect } from 'react';
import { Main, Box, Button, Flex, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import CollectionTypeModal, { CollectionTypeConfig } from '../components/CollectionTypeModal';
import CustomURLModal, { CustomURLConfig } from '../components/CustomURLModal';
import SitemapDefinitionModal, { SitemapDefinition } from '../components/SitemapDefinitionModal';
import BaseUrlSection from '../components/settings/BaseUrlSection';
import CollectionTypesSection from '../components/settings/CollectionTypesSection';
import CustomUrlsSection from '../components/settings/CustomUrlsSection';
import ExcludedUrlsSection from '../components/settings/ExcludedUrlsSection';
import SitemapIndexSection from '../components/settings/SitemapIndexSection';
import getTrad from '../utils/getTrad';

interface SettingsPayload {
  baseUrl: string;
  collectionTypes: CollectionTypeConfig[];
  customURLs: CustomURLConfig[];
  excludedUrls: string[];
  useSitemapIndex: boolean;
  sitemaps: SitemapDefinition[];
}

const removeAt = <T,>(items: T[], index: number): T[] => items.filter((_, i) => i !== index);

const upsertAt = <T,>(items: T[], index: number | null, value: T): T[] =>
  index !== null ? items.map((item, i) => (i === index ? value : item)) : [...items, value];

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
        const { data } = await get('/sitemap/settings');
        setBaseUrl(data.baseUrl || '');
        setInitialBaseUrl(data.baseUrl || '');
        setCollectionTypes(data.collectionTypes || []);
        setCustomURLs(data.customURLs || []);
        setExcludedUrls(data.excludedUrls || []);
        setInitialExcludedUrls(data.excludedUrls || []);
        setUseSitemapIndex(data.useSitemapIndex ?? false);
        setSitemaps(data.sitemaps || []);
        setInitialUseSitemapIndex(data.useSitemapIndex ?? false);
        setInitialSitemaps(data.sitemaps || []);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    fetchSettings();
  }, [get]);

  const settings: SettingsPayload = {
    baseUrl,
    collectionTypes,
    customURLs,
    excludedUrls,
    useSitemapIndex,
    sitemaps,
  };

  const persist = async (next: Partial<SettingsPayload>, errorLabel: string): Promise<boolean> => {
    try {
      await put('/sitemap/settings', { ...settings, ...next });
      return true;
    } catch (err) {
      console.error(`Failed to ${errorLabel}:`, err);
      return false;
    }
  };

  const isUrlModified = baseUrl !== initialBaseUrl;
  const isSitemapSettingsModified =
    useSitemapIndex !== initialUseSitemapIndex ||
    JSON.stringify(sitemaps) !== JSON.stringify(initialSitemaps);
  const isExcludedUrlsModified =
    JSON.stringify(excludedUrls) !== JSON.stringify(initialExcludedUrls);

  const handleSaveBaseUrl = async () => {
    if (await persist({}, 'update baseUrl')) setInitialBaseUrl(baseUrl);
  };

  const handleSaveSitemapSettings = async () => {
    if (await persist({}, 'update sitemap settings')) {
      setInitialUseSitemapIndex(useSitemapIndex);
      setInitialSitemaps(sitemaps);
    }
  };

  const handleSaveExcludedUrls = async () => {
    if (await persist({}, 'update excluded URLs')) setInitialExcludedUrls(excludedUrls);
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

  const handleSaveSitemapDef = async (def: SitemapDefinition) => {
    const updated = upsertAt(sitemaps, editingSitemapIndex, def);
    setSitemaps(updated);
    setIsSitemapModalOpen(false);
    setEditingSitemapIndex(null);
    if (await persist({ sitemaps: updated }, 'save sitemap definition')) setInitialSitemaps(updated);
  };

  const handleDeleteSitemapDef = async (index: number) => {
    const updated = removeAt(sitemaps, index);
    setSitemaps(updated);
    if (await persist({ sitemaps: updated }, 'delete sitemap definition')) setInitialSitemaps(updated);
  };

  const handleSaveCollectionType = async (data: CollectionTypeConfig) => {
    const updated = upsertAt(collectionTypes, editingCollectionIndex, data);
    setCollectionTypes(updated);
    setIsCollectionModalOpen(false);
    setEditingCollectionIndex(null);
    await persist({ collectionTypes: updated }, 'save collection types');
  };

  const handleDeleteCollectionType = async (index: number) => {
    const updated = removeAt(collectionTypes, index);
    // Sitemap definitions reference collection types by position, so drop/shift them.
    const updatedSitemaps = sitemaps.map((def) => ({
      ...def,
      collectionTypeConfigIndices: (def.collectionTypeConfigIndices ?? [])
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i)),
    }));
    setCollectionTypes(updated);
    setSitemaps(updatedSitemaps);
    if (await persist({ collectionTypes: updated, sitemaps: updatedSitemaps }, 'delete collection type')) {
      setInitialSitemaps(updatedSitemaps);
    }
  };

  const handleSaveCustomURL = async (data: CustomURLConfig) => {
    const updated = upsertAt(customURLs, editingCustomIndex, data);
    setCustomURLs(updated);
    setIsCustomURLModalOpen(false);
    setEditingCustomIndex(null);
    await persist({ customURLs: updated }, 'save custom URLs');
  };

  const handleDeleteCustomURL = async (index: number) => {
    const updated = removeAt(customURLs, index);
    setCustomURLs(updated);
    await persist({ customURLs: updated }, 'delete custom URL');
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

        <BaseUrlSection
          baseUrl={baseUrl}
          isModified={isUrlModified}
          onChange={setBaseUrl}
          onSave={handleSaveBaseUrl}
        />

        <SitemapIndexSection
          useSitemapIndex={useSitemapIndex}
          sitemaps={sitemaps}
          isModified={isSitemapSettingsModified}
          onToggle={setUseSitemapIndex}
          onAdd={() => {
            setEditingSitemapIndex(null);
            setIsSitemapModalOpen(true);
          }}
          onEdit={(index) => {
            setEditingSitemapIndex(index);
            setIsSitemapModalOpen(true);
          }}
          onDelete={handleDeleteSitemapDef}
          onSave={handleSaveSitemapSettings}
        />

        <CollectionTypesSection
          items={collectionTypes}
          onAdd={() => {
            setEditingCollectionIndex(null);
            setIsCollectionModalOpen(true);
          }}
          onEdit={(index) => {
            setEditingCollectionIndex(index);
            setIsCollectionModalOpen(true);
          }}
          onDelete={handleDeleteCollectionType}
        />

        <CustomUrlsSection
          items={customURLs}
          onAdd={() => {
            setEditingCustomIndex(null);
            setIsCustomURLModalOpen(true);
          }}
          onEdit={(index) => {
            setEditingCustomIndex(index);
            setIsCustomURLModalOpen(true);
          }}
          onDelete={handleDeleteCustomURL}
        />

        <ExcludedUrlsSection
          paths={excludedUrls}
          newPath={newExcludedPath}
          isModified={isExcludedUrlsModified}
          onNewPathChange={setNewExcludedPath}
          onAdd={handleAddExcludedUrl}
          onDelete={(index) => setExcludedUrls(removeAt(excludedUrls, index))}
          onSave={handleSaveExcludedUrls}
        />
      </Box>

      {isCollectionModalOpen && (
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
      )}

      {isCustomURLModalOpen && (
        <CustomURLModal
          isOpen={isCustomURLModalOpen}
          onClose={() => {
            setIsCustomURLModalOpen(false);
            setEditingCustomIndex(null);
          }}
          onSave={handleSaveCustomURL}
          existingData={editingCustomIndex !== null ? customURLs[editingCustomIndex] : null}
        />
      )}

      {isSitemapModalOpen && (
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
      )}
    </Main>
  );
};

export default Settings;

