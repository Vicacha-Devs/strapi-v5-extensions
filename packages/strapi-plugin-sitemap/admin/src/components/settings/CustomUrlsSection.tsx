import React from 'react';
import { Box, Button, Table, Tbody, Td, Thead, Tr, Typography } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { CustomURLConfig } from '../CustomURLModal';
import getTrad from '../../utils/getTrad';
import SectionCard from './SectionCard';
import { HeadCell, RowActions } from './TableParts';

interface CustomUrlsSectionProps {
  items: CustomURLConfig[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

const CustomUrlsSection: React.FC<CustomUrlsSectionProps> = ({
  items,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  return (
    <SectionCard
      title={t('settings.customUrls.title', 'Custom URLs')}
      description={t('settings.customUrls.description', 'Add custom static URLs to your sitemap')}
    >
      <Table colCount={5} rowCount={items.length + 1}>
        <Thead>
          <Tr>
            <HeadCell label={t('table.id', 'ID')} />
            <HeadCell label={t('table.url', 'URL')} />
            <HeadCell label={t('table.priority', 'Priority')} />
            <HeadCell label={t('table.frequency', 'Frequency')} />
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
                <Typography textColor="neutral800">/{item.url}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.priority}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">{item.frequency}</Typography>
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
          {t('settings.customUrls.add', 'Add another URL')}
        </Button>
      </Box>
    </SectionCard>
  );
};

export default CustomUrlsSection;
