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
import type { ContentTypesResponse } from '../../../../../shared';
import { getTrad } from '../../../utils/getTrad';
import { Illo } from './EmptyComponentLayout/illo';
import { SettingsModal } from './SettingsModal';

interface MainProps {
  contentTypes?: ContentTypesResponse | null;
}

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
          <Table colCount={2} rowCount={contentTypes?.collectionTypes?.length ?? 0}>
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
              {contentTypes &&
              contentTypes.collectionTypes &&
              Array.isArray(contentTypes.collectionTypes) &&
              contentTypes.collectionTypes.length > 0 ? (
                contentTypes.collectionTypes.map((item) => (
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
                ))
              ) : (
                <Box padding={8} background="neutral0">
                  <EmptyStateLayout
                    icon={<Illo />}
                    content={formatMessage({
                      id: getTrad('SEOPage.info.no-collection-types'),
                      defaultMessage: "You don't have any collection-types yet...",
                    })}
                    action={
                      <LinkButton
                        tag={NavLink}
                        to="/plugins/content-type-builder"
                        variant="secondary"
                        startIcon={<Plus />}
                      >
                        {formatMessage({
                          id: getTrad('SEOPage.info.create-collection-type'),
                          defaultMessage: 'Create your first collection-type',
                        })}
                      </LinkButton>
                    }
                  />
                </Box>
              )}
            </Tbody>
          </Table>
        </Tabs.Content>
        <Tabs.Content value={TabValues.singleTypes}>
          <Table colCount={2} rowCount={contentTypes?.singleTypes?.length ?? 0}>
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
              {contentTypes &&
              contentTypes.singleTypes &&
              Array.isArray(contentTypes.singleTypes) &&
              contentTypes.singleTypes.length > 0 ? (
                contentTypes.singleTypes.map((item) => (
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
                ))
              ) : (
                <Box padding={8} background="neutral0">
                  <EmptyStateLayout
                    icon={<Illo />}
                    content={formatMessage({
                      id: getTrad('SEOPage.info.no-single-types'),
                      defaultMessage: "You don't have any single-types yet...",
                    })}
                    action={
                      <LinkButton
                        tag={NavLink}
                        to="/admin/plugins/content-type-builder"
                        variant="secondary"
                        startIcon={<Plus />}
                      >
                        {formatMessage({
                          id: getTrad('SEOPage.info.create-single-type'),
                          defaultMessage: 'Create your first single-type',
                        })}
                      </LinkButton>
                    }
                  />
                </Box>
              )}
            </Tbody>
          </Table>
        </Tabs.Content>
        <Tabs.Content value={TabValues.plugins}>
          <Table colCount={2} rowCount={contentTypes?.plugins?.length ?? 0}>
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
              {contentTypes &&
              contentTypes.plugins &&
              Array.isArray(contentTypes.plugins) &&
              contentTypes.plugins.length > 0 ? (
                contentTypes.plugins.map((item) => (
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
                ))
              ) : (
                <Box padding={8} background="neutral0">
                  <EmptyStateLayout
                    icon={<Illo />}
                    content={formatMessage({
                      id: getTrad('SEOPage.info.no-plugin-content-type'),
                      defaultMessage: "You don't have any plugin content-type yet...",
                    })}
                  />
                </Box>
              )}
            </Tbody>
          </Table>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};
