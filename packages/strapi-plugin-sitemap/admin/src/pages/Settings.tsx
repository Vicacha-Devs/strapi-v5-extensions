import React, { useState, useEffect } from 'react';
import {
  Main,
  Box,
  Button,
  Grid,
  Flex,
  Typography,
  TextInput,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Checkbox,
} from '@strapi/design-system';
import { Plus, Trash, Check, Pencil } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import CollectionTypeModal, { CollectionTypeConfig } from '../components/CollectionTypeModal';
import CustomURLModal, { CustomURLConfig } from '../components/CustomURLModal';
import SitemapDefinitionModal, { SitemapDefinition } from '../components/SitemapDefinitionModal';
import getTrad from '../utils/getTrad';

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

  const isUrlModified = baseUrl !== initialBaseUrl;
  const isSitemapSettingsModified =
    useSitemapIndex !== initialUseSitemapIndex ||
    JSON.stringify(sitemaps) !== JSON.stringify(initialSitemaps);
  const isExcludedUrlsModified =
    JSON.stringify(excludedUrls) !== JSON.stringify(initialExcludedUrls);

  const handleSaveBaseUrl = async () => {
    try {
      await put('/sitemap/settings', {
        baseUrl,
        collectionTypes,
        customURLs,
        excludedUrls,
        useSitemapIndex,
        sitemaps,
      });
      setInitialBaseUrl(baseUrl);
    } catch (err) {
      console.error('Failed to update baseUrl:', err);
    }
  };

  const handleSaveSitemapSettings = async () => {
    try {
      await put('/sitemap/settings', {
        baseUrl,
        collectionTypes,
        customURLs,
        excludedUrls,
        useSitemapIndex,
        sitemaps,
      });
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
      await put('/sitemap/settings', {
        baseUrl,
        collectionTypes,
        customURLs,
        excludedUrls,
        useSitemapIndex,
        sitemaps,
      });
      setInitialExcludedUrls(excludedUrls);
    } catch (err) {
      console.error('Failed to update excluded URLs:', err);
    }
  };

  const handleSaveSitemapDef = async (def: SitemapDefinition) => {
    const updated =
      editingSitemapIndex !== null
        ? sitemaps.map((item, i) => (i === editingSitemapIndex ? def : item))
        : [...sitemaps, def];
    setSitemaps(updated);
    setIsSitemapModalOpen(false);
    setEditingSitemapIndex(null);
    try {
      await put('/sitemap/settings', {
        baseUrl,
        collectionTypes,
        customURLs,
        excludedUrls,
        useSitemapIndex,
        sitemaps: updated,
      });
      setInitialSitemaps(updated);
    } catch (err) {
      console.error('Failed to save sitemap definition:', err);
    }
  };

  const handleDeleteSitemapDef = async (index: number) => {
    const updated = sitemaps.filter((_, i) => i !== index);
    setSitemaps(updated);
    try {
      await put('/sitemap/settings', {
        baseUrl,
        collectionTypes,
        customURLs,
        excludedUrls,
        useSitemapIndex,
        sitemaps: updated,
      });
      setInitialSitemaps(updated);
    } catch (err) {
      console.error('Failed to delete sitemap definition:', err);
    }
  };

  const handleSaveCollectionType = async (data: CollectionTypeConfig) => {
    let updatedCollectionTypes: CollectionTypeConfig[];
    if (editingCollectionIndex !== null) {
      updatedCollectionTypes = collectionTypes.map((item, index) =>
        index === editingCollectionIndex ? data : item
      );
    } else {
      updatedCollectionTypes = [...collectionTypes, data];
    }

    setCollectionTypes(updatedCollectionTypes);
    setIsCollectionModalOpen(false);
    setEditingCollectionIndex(null);

    try {
      await put('/sitemap/settings', {
        baseUrl,
        collectionTypes: updatedCollectionTypes,
        customURLs,
        excludedUrls,
        useSitemapIndex,
        sitemaps,
      });
    } catch (err) {
      console.error('Failed to save collection types:', err);
    }
  };

  const handleDeleteCollectionType = async (index: number) => {
    const updatedCollectionTypes = collectionTypes.filter((_, i) => i !== index);
    setCollectionTypes(updatedCollectionTypes);

    try {
      await put('/sitemap/settings', {
        baseUrl,
        collectionTypes: updatedCollectionTypes,
        customURLs,
        excludedUrls,
        useSitemapIndex,
        sitemaps,
      });
    } catch (err) {
      console.error('Failed to delete collection type:', err);
    }
  };

  const handleSaveCustomURL = async (data: CustomURLConfig) => {
    let updatedCustomURLs: CustomURLConfig[];
    if (editingCustomIndex !== null) {
      updatedCustomURLs = customURLs.map((item, index) =>
        index === editingCustomIndex ? data : item
      );
    } else {
      updatedCustomURLs = [...customURLs, data];
    }

    setCustomURLs(updatedCustomURLs);
    setIsCustomURLModalOpen(false);
    setEditingCustomIndex(null);

    try {
      await put('/sitemap/settings', {
        baseUrl,
        collectionTypes,
        customURLs: updatedCustomURLs,
        excludedUrls,
        useSitemapIndex,
        sitemaps,
      });
    } catch (err) {
      console.error('Failed to save custom URLs:', err);
    }
  };

  const handleDeleteCustomURL = async (index: number) => {
    const updatedCustomURLs = customURLs.filter((_, i) => i !== index);
    setCustomURLs(updatedCustomURLs);

    try {
      await put('/sitemap/settings', {
        baseUrl,
        collectionTypes,
        customURLs: updatedCustomURLs,
        excludedUrls,
        useSitemapIndex,
        sitemaps,
      });
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

        {/* Base URL Section */}
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

        {/* Sitemap Settings (Index / Multiple sitemaps) */}
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius marginBottom={6}>
          <Typography variant="delta" as="h2">
            {formatMessage({
              id: getTrad('settings.index.title'),
              defaultMessage: 'Sitemap Settings',
            })}
          </Typography>
          <Box paddingBottom={4}>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTrad('settings.index.description'),
                defaultMessage: 'Use a single sitemap or a sitemap index with multiple sitemaps',
              })}
            </Typography>
          </Box>
          <Box paddingBottom={4}>
            <Checkbox
              checked={useSitemapIndex}
              onCheckedChange={(checked: boolean) => setUseSitemapIndex(checked === true)}
            >
              {formatMessage({
                id: getTrad('settings.index.checkbox'),
                defaultMessage: 'Use sitemap index with multiple sitemaps',
              })}
            </Checkbox>
          </Box>
          {useSitemapIndex && (
            <>
              <Box paddingBottom={2}>
                <Typography variant="pi" textColor="neutral600">
                  {formatMessage({
                    id: getTrad('settings.index.info'),
                    defaultMessage:
                      'Each sitemap is available at /api/sitemap/sitemap-[name].xml. The index at /api/sitemap/sitemap.xml lists all of them.',
                  })}
                </Typography>
              </Box>
              <Table colCount={5} rowCount={sitemaps.length + 1}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({
                          id: getTrad('settings.index.table.name'),
                          defaultMessage: 'Name (slug)',
                        })}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({
                          id: getTrad('settings.index.table.url'),
                          defaultMessage: 'URL',
                        })}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({
                          id: getTrad('settings.index.table.collectionTypes'),
                          defaultMessage: 'Collection types',
                        })}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({
                          id: getTrad('settings.index.table.customUrls'),
                          defaultMessage: 'Include custom URLs',
                        })}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({ id: getTrad('table.actions'), defaultMessage: 'Actions' })}
                      </Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sitemaps.map((def, idx) => (
                    <Tr key={idx}>
                      <Td>
                        <Typography textColor="neutral800">{def.name}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral600" variant="pi">
                          /api/sitemap/sitemap-{def.name}.xml
                        </Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">
                          {def.collectionTypeConfigIndices?.length ?? 0} config(s)
                        </Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">
                          {def.includeCustomUrls
                            ? formatMessage({ id: getTrad('common.yes'), defaultMessage: 'Yes' })
                            : formatMessage({ id: getTrad('common.no'), defaultMessage: 'No' })}
                        </Typography>
                      </Td>
                      <Td>
                        <Flex gap={2}>
                          <Button
                            variant="tertiary"
                            startIcon={<Pencil />}
                            onClick={() => {
                              setEditingSitemapIndex(idx);
                              setIsSitemapModalOpen(true);
                            }}
                          >
                            {formatMessage({ id: getTrad('action.edit'), defaultMessage: 'Edit' })}
                          </Button>
                          <Button
                            variant="danger-light"
                            startIcon={<Trash />}
                            onClick={() => handleDeleteSitemapDef(idx)}
                          >
                            {formatMessage({
                              id: getTrad('action.delete'),
                              defaultMessage: 'Delete',
                            })}
                          </Button>
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              <Box paddingTop={4} paddingBottom={2}>
                <Button
                  startIcon={<Plus />}
                  variant="secondary"
                  onClick={() => {
                    setEditingSitemapIndex(null);
                    setIsSitemapModalOpen(true);
                  }}
                >
                  {formatMessage({
                    id: getTrad('settings.index.add'),
                    defaultMessage: 'Add sitemap',
                  })}
                </Button>
              </Box>
            </>
          )}
          <Box paddingTop={4}>
            <Button
              startIcon={<Check />}
              onClick={handleSaveSitemapSettings}
              disabled={!isSitemapSettingsModified}
              variant={isSitemapSettingsModified ? 'default' : 'tertiary'}
            >
              {formatMessage({ id: getTrad('settings.save'), defaultMessage: 'Save' })}
            </Button>
          </Box>
        </Box>

        {/* Collection Types Section */}
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius marginBottom={6}>
          <Typography variant="delta" as="h2">
            {formatMessage({
              id: getTrad('settings.collectionTypes.title'),
              defaultMessage: 'Collection Types',
            })}
          </Typography>
          <Box paddingBottom={4}>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTrad('settings.collectionTypes.description'),
                defaultMessage: 'Configure how your collection types are included in the sitemap',
              })}
            </Typography>
          </Box>
          <Table colCount={9} rowCount={collectionTypes.length + 1}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.id'), defaultMessage: 'ID' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.type'), defaultMessage: 'Type' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.langcode'), defaultMessage: 'Langcode' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.pattern'), defaultMessage: 'Pattern' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.priority'), defaultMessage: 'Priority' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.frequency'), defaultMessage: 'Frequency' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTrad('table.lastModified'),
                      defaultMessage: 'Last Modified',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.thumbnail'), defaultMessage: 'Thumbnail' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.actions'), defaultMessage: 'Actions' })}
                  </Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {collectionTypes.map((item, index) => (
                <Tr key={index}>
                  <Td>
                    <Typography textColor="neutral800">{index + 1}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{item.type}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{item.langcode}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{item.pattern}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{item.priority}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{item.frequency}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">
                      {item.lastModified
                        ? formatMessage({ id: getTrad('common.yes'), defaultMessage: 'Yes' })
                        : formatMessage({ id: getTrad('common.no'), defaultMessage: 'No' })}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{item.thumbnail || '-'}</Typography>
                  </Td>
                  <Td>
                    <Flex gap={2}>
                      <Button
                        variant="tertiary"
                        startIcon={<Pencil />}
                        onClick={() => {
                          setEditingCollectionIndex(index);
                          setIsCollectionModalOpen(true);
                        }}
                      >
                        {formatMessage({ id: getTrad('action.edit'), defaultMessage: 'Edit' })}
                      </Button>
                      <Button
                        variant="danger-light"
                        startIcon={<Trash />}
                        onClick={() => handleDeleteCollectionType(index)}
                      >
                        {formatMessage({ id: getTrad('action.delete'), defaultMessage: 'Delete' })}
                      </Button>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Box paddingTop={4}>
            <Button
              startIcon={<Plus />}
              variant="secondary"
              onClick={() => {
                setEditingCollectionIndex(null);
                setIsCollectionModalOpen(true);
              }}
            >
              {formatMessage({
                id: getTrad('settings.collectionTypes.add'),
                defaultMessage: 'Add another collection type',
              })}
            </Button>
          </Box>
        </Box>

        {/* Custom URLs Section */}
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius marginBottom={6}>
          <Typography variant="delta" as="h2">
            {formatMessage({
              id: getTrad('settings.customUrls.title'),
              defaultMessage: 'Custom URLs',
            })}
          </Typography>
          <Box paddingBottom={4}>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTrad('settings.customUrls.description'),
                defaultMessage: 'Add custom static URLs to your sitemap',
              })}
            </Typography>
          </Box>
          <Table colCount={5} rowCount={customURLs.length + 1}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.id'), defaultMessage: 'ID' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.url'), defaultMessage: 'URL' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.priority'), defaultMessage: 'Priority' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.frequency'), defaultMessage: 'Frequency' })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: getTrad('table.actions'), defaultMessage: 'Actions' })}
                  </Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {customURLs.map((item, index) => (
                <Tr key={index}>
                  <Td>
                    <Typography textColor="neutral800">{index + 1}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">/{item.url}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{item.priority}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{item.frequency}</Typography>
                  </Td>
                  <Td>
                    <Flex gap={2}>
                      <Button
                        variant="tertiary"
                        startIcon={<Pencil />}
                        onClick={() => {
                          setEditingCustomIndex(index);
                          setIsCustomURLModalOpen(true);
                        }}
                      >
                        {formatMessage({ id: getTrad('action.edit'), defaultMessage: 'Edit' })}
                      </Button>
                      <Button
                        variant="danger-light"
                        startIcon={<Trash />}
                        onClick={() => handleDeleteCustomURL(index)}
                      >
                        {formatMessage({ id: getTrad('action.delete'), defaultMessage: 'Delete' })}
                      </Button>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Box paddingTop={4}>
            <Button
              startIcon={<Plus />}
              variant="secondary"
              onClick={() => {
                setEditingCustomIndex(null);
                setIsCustomURLModalOpen(true);
              }}
            >
              {formatMessage({
                id: getTrad('settings.customUrls.add'),
                defaultMessage: 'Add another URL',
              })}
            </Button>
          </Box>
        </Box>

        {/* Excluded URLs Section */}
        <Box padding={6} background="neutral0" shadow="filterShadow" hasRadius marginBottom={6}>
          <Typography variant="delta" as="h2">
            {formatMessage({
              id: getTrad('settings.excludedUrls.title'),
              defaultMessage: 'Excluded URLs',
            })}
          </Typography>
          <Box paddingBottom={4}>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTrad('settings.excludedUrls.description'),
                defaultMessage:
                  'Paths listed here will not be included in the sitemap (e.g. /admin or /private-page). Save using the Save button below.',
              })}
            </Typography>
          </Box>
          <Flex gap={2} paddingBottom={4}>
            <Box style={{ flex: 1, maxWidth: 400 }}>
              <TextInput
                placeholder={formatMessage({
                  id: getTrad('settings.excludedUrls.placeholder'),
                  defaultMessage: '/path-to-exclude',
                })}
                value={newExcludedPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewExcludedPath(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent) =>
                  e.key === 'Enter' && (e.preventDefault(), handleAddExcludedUrl())
                }
              />
            </Box>
            <Button
              startIcon={<Plus />}
              variant="secondary"
              onClick={handleAddExcludedUrl}
              disabled={!newExcludedPath.trim()}
            >
              {formatMessage({ id: getTrad('settings.excludedUrls.add'), defaultMessage: 'Add' })}
            </Button>
          </Flex>
          {excludedUrls.length > 0 && (
            <Table colCount={3} rowCount={excludedUrls.length + 1}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">
                      {formatMessage({ id: getTrad('table.id'), defaultMessage: 'ID' })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {formatMessage({
                        id: getTrad('settings.excludedUrls.table.path'),
                        defaultMessage: 'Path',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {formatMessage({ id: getTrad('table.actions'), defaultMessage: 'Actions' })}
                    </Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {excludedUrls.map((path, index) => (
                  <Tr key={index}>
                    <Td>
                      <Typography textColor="neutral800">{index + 1}</Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral800">{path}</Typography>
                    </Td>
                    <Td>
                      <Button
                        variant="danger-light"
                        startIcon={<Trash />}
                        onClick={() => handleDeleteExcludedUrl(index)}
                      >
                        {formatMessage({ id: getTrad('action.delete'), defaultMessage: 'Delete' })}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          <Box paddingTop={4}>
            <Button
              startIcon={<Check />}
              onClick={handleSaveExcludedUrls}
              disabled={!isExcludedUrlsModified}
              variant={isExcludedUrlsModified ? 'default' : 'tertiary'}
            >
              {formatMessage({ id: getTrad('settings.save'), defaultMessage: 'Save' })}
            </Button>
          </Box>
        </Box>
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
