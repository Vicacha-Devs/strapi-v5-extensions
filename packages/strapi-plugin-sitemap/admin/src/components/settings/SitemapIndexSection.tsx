import React from 'react';
import { Box, Button, Checkbox, Table, Tbody, Td, Thead, Tr, Typography } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { SitemapDefinition } from '../SitemapDefinitionModal';
import getTrad from '../../utils/getTrad';
import SectionCard from './SectionCard';
import { HeadCell, RowActions, SaveButton, useYesNo } from './TableParts';

interface SitemapIndexSectionProps {
  useSitemapIndex: boolean;
  sitemaps: SitemapDefinition[];
  isModified: boolean;
  onToggle: (value: boolean) => void;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onSave: () => void;
}

const SitemapIndexSection: React.FC<SitemapIndexSectionProps> = ({
  useSitemapIndex,
  sitemaps,
  isModified,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  onSave,
}) => {
  const { formatMessage } = useIntl();
  const yesNo = useYesNo();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  return (
    <SectionCard
      title={t('settings.index.title', 'Sitemap Settings')}
      description={t(
        'settings.index.description',
        'Use a single sitemap or a sitemap index with multiple sitemaps'
      )}
    >
      <Box paddingBottom={4}>
        <Checkbox
          checked={useSitemapIndex}
          onCheckedChange={(checked: boolean) => onToggle(checked === true)}
        >
          {t('settings.index.checkbox', 'Use sitemap index with multiple sitemaps')}
        </Checkbox>
      </Box>
      {useSitemapIndex && (
        <>
          <Box paddingBottom={2}>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.index.info',
                'Each sitemap is available at /api/sitemap/sitemap-[name].xml. The index at /api/sitemap/sitemap.xml lists all of them.'
              )}
            </Typography>
          </Box>
          <Table colCount={5} rowCount={sitemaps.length + 1}>
            <Thead>
              <Tr>
                <HeadCell label={t('settings.index.table.name', 'Name (slug)')} />
                <HeadCell label={t('settings.index.table.url', 'URL')} />
                <HeadCell label={t('settings.index.table.collectionTypes', 'Collection types')} />
                <HeadCell label={t('settings.index.table.customUrls', 'Include custom URLs')} />
                <HeadCell label={t('table.actions', 'Actions')} />
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
                    <Typography textColor="neutral800">{yesNo(def.includeCustomUrls)}</Typography>
                  </Td>
                  <Td>
                    <RowActions onEdit={() => onEdit(idx)} onDelete={() => onDelete(idx)} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Box paddingTop={4} paddingBottom={2}>
            <Button startIcon={<Plus />} variant="secondary" onClick={onAdd}>
              {t('settings.index.add', 'Add sitemap')}
            </Button>
          </Box>
        </>
      )}
      <Box paddingTop={4}>
        <SaveButton modified={isModified} onClick={onSave} />
      </Box>
    </SectionCard>
  );
};

export default SitemapIndexSection;
