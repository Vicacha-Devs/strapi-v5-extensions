import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { Check, Pencil, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import type { SitemapDefinition } from '../SitemapDefinitionModal';
import getTrad from '../../utils/getTrad';

interface SitemapIndexSectionProps {
  useSitemapIndex: boolean;
  setUseSitemapIndex: (val: boolean) => void;
  sitemaps: SitemapDefinition[];
  isSitemapSettingsModified: boolean;
  onSaveSitemapSettings: () => void;
  onAddSitemap: () => void;
  onEditSitemap: (index: number) => void;
  onDeleteSitemap: (index: number) => void;
}

export const SitemapIndexSection: React.FC<SitemapIndexSectionProps> = ({
  useSitemapIndex,
  setUseSitemapIndex,
  sitemaps,
  isSitemapSettingsModified,
  onSaveSitemapSettings,
  onAddSitemap,
  onEditSitemap,
  onDeleteSitemap,
}) => {
  const { formatMessage } = useIntl();

  return (
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
                      {formatMessage(
                        {
                          id: getTrad('settings.index.table.configsCount'),
                          defaultMessage: '{count} config(s)',
                        },
                        { count: def.collectionTypeConfigIndices?.length ?? 0 }
                      )}
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
                        onClick={() => onEditSitemap(idx)}
                      >
                        {formatMessage({ id: getTrad('action.edit'), defaultMessage: 'Edit' })}
                      </Button>
                      <Button
                        variant="danger-light"
                        startIcon={<Trash />}
                        onClick={() => onDeleteSitemap(idx)}
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
            <Button startIcon={<Plus />} variant="secondary" onClick={onAddSitemap}>
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
          onClick={onSaveSitemapSettings}
          disabled={!isSitemapSettingsModified}
          variant={isSitemapSettingsModified ? 'default' : 'tertiary'}
        >
          {formatMessage({ id: getTrad('settings.save'), defaultMessage: 'Save' })}
        </Button>
      </Box>
    </Box>
  );
};
