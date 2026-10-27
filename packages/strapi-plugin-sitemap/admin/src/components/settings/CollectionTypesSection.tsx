import React from 'react';
import { Box, Button, Table, Tbody, Td, Thead, Tr, Typography } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { CollectionTypeConfig } from '../CollectionTypeModal';
import getTrad from '../../utils/getTrad';
import SectionCard from './SectionCard';
import { HeadCell, RowActions, useYesNo } from './TableParts';

interface CollectionTypesSectionProps {
  items: CollectionTypeConfig[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

const CollectionTypesSection: React.FC<CollectionTypesSectionProps> = ({
  items,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const { formatMessage } = useIntl();
  const yesNo = useYesNo();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  return (
    <SectionCard
      title={t('settings.collectionTypes.title', 'Collection Types')}
      description={t(
        'settings.collectionTypes.description',
        'Configure how your collection types are included in the sitemap'
      )}
    >
      <Table colCount={9} rowCount={items.length + 1}>
        <Thead>
          <Tr>
            <HeadCell label={t('table.id', 'ID')} />
            <HeadCell label={t('table.type', 'Type')} />
            <HeadCell label={t('table.langcode', 'Langcode')} />
            <HeadCell label={t('table.pattern', 'Pattern')} />
            <HeadCell label={t('table.priority', 'Priority')} />
            <HeadCell label={t('table.frequency', 'Frequency')} />
            <HeadCell label={t('table.lastModified', 'Last Modified')} />
            <HeadCell label={t('table.thumbnail', 'Thumbnail')} />
            <HeadCell label={t('table.actions', 'Actions')} />
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item, index) => (
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
                <Typography textColor="neutral800">{yesNo(item.lastModified)}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.thumbnail || '-'}</Typography>
              </Td>
              <Td>
                <RowActions onEdit={() => onEdit(index)} onDelete={() => onDelete(index)} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Box paddingTop={4}>
        <Button startIcon={<Plus />} variant="secondary" onClick={onAdd}>
          {t('settings.collectionTypes.add', 'Add another collection type')}
        </Button>
      </Box>
    </SectionCard>
  );
};

export default CollectionTypesSection;
