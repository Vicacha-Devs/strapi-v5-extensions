import * as React from 'react';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import {
  Box,
  EmptyStateLayout,
  Flex,
  LinkButton,
  Table,
  Tabs,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import type { ContentTypeSeoItem, ContentTypesResponse } from '../../../../../shared';
import { getTrad } from '../../../utils/getTrad';
import { Illo } from './EmptyComponentLayout/illo';
import { SettingsModal } from './SettingsModal';

interface MainProps {
  contentTypes?: ContentTypesResponse | null;
}

interface ContentTypeRowProps {
  item: ContentTypeSeoItem;
}

const ContentTypeRow = ({ item }: ContentTypeRowProps) => {
  const { formatMessage } = useIntl();

  return (
    <Tr key={item.uid}>
      <Td>
        <Typography textColor="neutral800">{item.globalId}</Typography>
      </Td>
      <Td>
        <Flex justifyContent="right" alignItems="right">
          {item.seo ? (
            <SettingsModal item={item} />
          ) : (
            <LinkButton
              startIcon={<Plus />}
              variant="secondary"
              href={`/admin/plugins/content-type-builder/content-types/${item.uid}`}
            >
              {formatMessage({
                id: getTrad('SEOPage.info.add'),
                defaultMessage: 'Add component',
              })}
            </LinkButton>
          )}
        </Flex>
      </Td>
    </Tr>
  );
};

interface ContentTypeTabTableProps {
  items?: ContentTypeSeoItem[];
  emptyMessageId: string;
  emptyDefaultMessage: string;
  createLinkTo?: string;
  createButtonId?: string;
  createButtonDefaultMessage?: string;
}

const ContentTypeTabTable = ({
  items,
  emptyMessageId,
  emptyDefaultMessage,
  createLinkTo,
  createButtonId,
  createButtonDefaultMessage,
}: ContentTypeTabTableProps) => {
  const { formatMessage } = useIntl();
  const safeItems = Array.isArray(items) ? items : [];

  const createAction =
    createLinkTo && createButtonId ? (
      <LinkButton tag={NavLink} to={createLinkTo} variant="secondary" startIcon={<Plus />}>
        {formatMessage({
          id: getTrad(createButtonId),
          defaultMessage: createButtonDefaultMessage,
        })}
      </LinkButton>
    ) : undefined;

  return (
    <Table colCount={2} rowCount={safeItems.length}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">
              {formatMessage({
                id: getTrad('SEOPage.tab-panel.column-name'),
                defaultMessage: 'Name',
              })}
            </Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {safeItems.length > 0 ? (
          safeItems.map((item) => <ContentTypeRow key={item.uid} item={item} />)
        ) : (
          <Box padding={8} background="neutral0">
            <EmptyStateLayout
              icon={<Illo />}
              content={formatMessage({
                id: getTrad(emptyMessageId),
                defaultMessage: emptyDefaultMessage,
              })}
              action={createAction}
            />
          </Box>
        )}
      </Tbody>
    </Table>
  );
};

export const Main = ({ contentTypes }: MainProps) => {
  const { formatMessage } = useIntl();

  const TabValues = {
    collectionTypes: 'collection-types',
    singleTypes: 'single-types',
    plugins: 'plugins',
  };

  return (
    <Box padding={8}>
      <Tabs.Root id="tabs" variant="simple" defaultValue={TabValues.collectionTypes}>
        <Tabs.List>
          <Tabs.Trigger value={TabValues.collectionTypes}>
            <Typography>
              {formatMessage({
                id: getTrad('SEOPage.tab.collection-type-title'),
                defaultMessage: 'Collection Types',
              })}
            </Typography>
          </Tabs.Trigger>
          <Tabs.Trigger value={TabValues.singleTypes}>
            <Typography variant="omega">
              {formatMessage({
                id: getTrad('SEOPage.tab.single-type-title'),
                defaultMessage: 'Single Types',
              })}
            </Typography>
          </Tabs.Trigger>
          <Tabs.Trigger value={TabValues.plugins}>
            <Typography variant="omega">
              {formatMessage({
                id: getTrad('SEOPage.tab.plugin-title'),
                defaultMessage: 'Plugins',
              })}
            </Typography>
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value={TabValues.collectionTypes}>
          <ContentTypeTabTable
            items={contentTypes?.collectionTypes}
            emptyMessageId="SEOPage.info.no-collection-types"
            emptyDefaultMessage="You don't have any collection-types yet..."
            createLinkTo="/plugins/content-type-builder"
            createButtonId="SEOPage.info.create-collection-type"
            createButtonDefaultMessage="Create your first collection-type"
          />
        </Tabs.Content>
        <Tabs.Content value={TabValues.singleTypes}>
          <ContentTypeTabTable
            items={contentTypes?.singleTypes}
            emptyMessageId="SEOPage.info.no-single-types"
            emptyDefaultMessage="You don't have any single-types yet..."
            createLinkTo="/admin/plugins/content-type-builder"
            createButtonId="SEOPage.info.create-single-type"
            createButtonDefaultMessage="Create your first single-type"
          />
        </Tabs.Content>
        <Tabs.Content value={TabValues.plugins}>
          <ContentTypeTabTable
            items={contentTypes?.plugins}
            emptyMessageId="SEOPage.info.no-plugin-content-type"
            emptyDefaultMessage="You don't have any plugin content-type yet..."
          />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};
