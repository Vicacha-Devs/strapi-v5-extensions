import React from 'react';
import { Box, Button, Flex, Table, Tbody, Td, TextInput, Thead, Tr, Typography } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import getTrad from '../../utils/getTrad';
import SectionCard from './SectionCard';
import { HeadCell, RowActions, SaveButton } from './TableParts';

interface ExcludedUrlsSectionProps {
  paths: string[];
  newPath: string;
  isModified: boolean;
  onNewPathChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onSave: () => void;
}

const ExcludedUrlsSection: React.FC<ExcludedUrlsSectionProps> = ({
  paths,
  newPath,
  isModified,
  onNewPathChange,
  onAdd,
  onDelete,
  onSave,
}) => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  return (
    <SectionCard
      title={t('settings.excludedUrls.title', 'Excluded URLs')}
      description={t(
        'settings.excludedUrls.description',
        'Paths listed here will not be included in the sitemap (e.g. /admin or /private-page). Save using the Save button below.'
      )}
    >
      <Flex gap={2} paddingBottom={4}>
        <Box style={{ flex: 1, maxWidth: 400 }}>
          <TextInput
            placeholder={t('settings.excludedUrls.placeholder', '/path-to-exclude')}
            value={newPath}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNewPathChange(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) =>
              e.key === 'Enter' && (e.preventDefault(), onAdd())
            }
          />
        </Box>
        <Button
          startIcon={<Plus />}
          variant="secondary"
          onClick={onAdd}
          disabled={!newPath.trim()}
        >
          {t('settings.excludedUrls.add', 'Add')}
        </Button>
      </Flex>
      {paths.length > 0 && (
        <Table colCount={3} rowCount={paths.length + 1}>
          <Thead>
            <Tr>
              <HeadCell label={t('table.id', 'ID')} />
              <HeadCell label={t('settings.excludedUrls.table.path', 'Path')} />
              <HeadCell label={t('table.actions', 'Actions')} />
            </Tr>
          </Thead>
          <Tbody>
            {paths.map((path, index) => (
              <Tr key={index}>
                <Td>
                  <Typography textColor="neutral800">{index + 1}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{path}</Typography>
                </Td>
                <Td>
                  <RowActions onDelete={() => onDelete(index)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      <Box paddingTop={4}>
        <SaveButton modified={isModified} onClick={onSave} />
      </Box>
    </SectionCard>
  );
};

export default ExcludedUrlsSection;
