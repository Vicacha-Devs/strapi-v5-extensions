import * as React from 'react';
import { useIntl } from 'react-intl';
import {
  Box,
  Checkbox,
  Field,
  Flex,
  Grid,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import {
  NOTE_CATEGORIES,
  NOTE_CATEGORY_META,
  type NoteCategory,
  type NotesSummaryStats,
} from '../../../shared';
import { getTrad } from '../utils';

export interface NotesHubFilterBarProps {
  summary: NotesSummaryStats;
  search: string;
  selectedCategory: NoteCategory | 'all';
  selectedSlug: string;
  pinnedOnly: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: NoteCategory | 'all') => void;
  onSlugChange: (value: string) => void;
  onPinnedOnlyChange: (value: boolean) => void;
}

export const NotesHubFilterBar: React.FC<NotesHubFilterBarProps> = ({
  summary,
  search,
  selectedCategory,
  selectedSlug,
  pinnedOnly,
  onSearchChange,
  onCategoryChange,
  onSlugChange,
  onPinnedOnlyChange,
}) => {
  const { formatMessage } = useIntl();

  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  return (
    <Flex direction="column" alignItems="stretch" gap={6}>
      {/* KPI Summary Cards */}
      <Grid.Root gap={4}>
        <Grid.Item col={3} s={6} xs={12}>
          <Box
            padding={4}
            background="neutral0"
            hasRadius
            shadow="tableShadow"
            style={{ width: '100%' }}
          >
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="sigma" textColor="neutral600">
                {t('hub.stats.total', 'Total Notes')}
              </Typography>
              <Typography variant="alpha" fontWeight="bold" textColor="neutral800">
                {summary.total}
              </Typography>
            </Flex>
          </Box>
        </Grid.Item>

        <Grid.Item col={3} s={6} xs={12}>
          <Box
            padding={4}
            background="neutral0"
            hasRadius
            shadow="tableShadow"
            style={{ width: '100%' }}
          >
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="sigma" textColor="primary600">
                {t('hub.stats.pinned', 'Pinned Notes')}
              </Typography>
              <Typography variant="alpha" fontWeight="bold" textColor="primary700">
                {summary.pinned}
              </Typography>
            </Flex>
          </Box>
        </Grid.Item>

        <Grid.Item col={3} s={6} xs={12}>
          <Box
            padding={4}
            background="neutral0"
            hasRadius
            shadow="tableShadow"
            style={{ width: '100%' }}
          >
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="sigma" textColor="danger600">
                {t('hub.stats.blockers', 'Blockers')}
              </Typography>
              <Typography variant="alpha" fontWeight="bold" textColor="danger700">
                {summary.byCategory.blocker}
              </Typography>
            </Flex>
          </Box>
        </Grid.Item>

        <Grid.Item col={3} s={6} xs={12}>
          <Box
            padding={4}
            background="neutral0"
            hasRadius
            shadow="tableShadow"
            style={{ width: '100%' }}
          >
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="sigma" textColor="neutral600">
                {t('hub.stats.todos', 'Open Todos')}
              </Typography>
              <Typography variant="alpha" fontWeight="bold" textColor="neutral800">
                {summary.byCategory.todo}
              </Typography>
            </Flex>
          </Box>
        </Grid.Item>
      </Grid.Root>

      {/* Filter Controls */}
      <Box padding={4} background="neutral0" hasRadius shadow="tableShadow">
        <Flex gap={4} wrap="wrap" alignItems="flex-end">
          <Box style={{ flex: '2 1 240px' }}>
            <Field.Root name="hubSearch">
              <Field.Label>
                {t('hub.filters.search', 'Search notes')}
              </Field.Label>
              <TextInput
                name="hubSearch"
                value={search}
                onChange={(e: { target: { value: string } }) =>
                  onSearchChange(e.target.value)
                }
                placeholder={t(
                  'hub.filters.search.placeholder',
                  'Search by title, content, content type, or author...'
                )}
              />
            </Field.Root>
          </Box>

          <Box style={{ flex: '1 1 180px' }}>
            <Field.Root name="hubCategory">
              <Field.Label>
                {t('note.modal.fields.category', 'Category')}
              </Field.Label>
              <SingleSelect
                value={selectedCategory}
                onChange={(val: string | number) =>
                  onCategoryChange(
                    (String(val) || 'all') as NoteCategory | 'all'
                  )
                }
              >
                <SingleSelectOption value="all">
                  {t('category.all', 'All categories')}
                </SingleSelectOption>
                {NOTE_CATEGORIES.map((cat) => (
                  <SingleSelectOption key={cat} value={cat}>
                    {t(
                      NOTE_CATEGORY_META[cat].labelKey,
                      NOTE_CATEGORY_META[cat].defaultLabel
                    )}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>
          </Box>

          <Box style={{ flex: '1 1 200px' }}>
            <Field.Root name="hubContentType">
              <Field.Label>
                {t('hub.filters.contentType', 'Content Type')}
              </Field.Label>
              <SingleSelect
                value={selectedSlug}
                onChange={(val: string | number) =>
                  onSlugChange(String(val) || 'all')
                }
              >
                <SingleSelectOption value="all">
                  {t('hub.filters.contentType.all', 'All content types')}
                </SingleSelectOption>
                {summary.entitySlugs.map((slug) => (
                  <SingleSelectOption key={slug} value={slug}>
                    {slug}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>
          </Box>

          <Box paddingBottom={2}>
            <Checkbox
              checked={pinnedOnly}
              onCheckedChange={(checked: boolean) =>
                onPinnedOnlyChange(Boolean(checked))
              }
            >
              {t('hub.filters.pinnedOnly', 'Pinned only')}
            </Checkbox>
          </Box>
        </Flex>
      </Box>
    </Flex>
  );
};
