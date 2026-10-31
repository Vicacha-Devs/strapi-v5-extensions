import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Badge,
  Box,
  Button,
  Flex,
  Loader,
  Main,
  MultiSelect,
  MultiSelectOption,
  Searchbar,
  SearchForm,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { Layouts } from '@strapi/strapi/admin';
import useGlobalSearch from '../hooks/useGlobalSearch';
import useSearchableTypes from '../hooks/useSearchableTypes';
import { fetchLocales } from '../api/searchApi';
import { Highlight } from '../components/Highlight';
import { t } from '../utils/getTrad';
import type { ContentTypeSummary, LocaleOption, SearchHit, SearchResponse } from '../types';

const ClickableRow = styled(Tr)`
  cursor: pointer;

  &:hover {
    background: ${({ theme }: { theme: { colors: Record<string, string> } }) =>
      theme.colors.neutral100};
  }
`;

const PAGE_SIZES = [10, 20, 50];

interface ResultsTableProps {
  results: SearchHit[];
  trimmedQuery: string;
  onSelectHit: (adminUrl: string) => void;
}

const ResultsTable = ({ results, trimmedQuery, onSelectHit }: ResultsTableProps) => (
  <Table colCount={7} rowCount={results.length}>
    <Thead>
      <Tr>
        <Th>
          <Typography variant="sigma">{t('table.type', 'Type')}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t('table.id', 'Id')}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t('table.name', 'Name')}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t('table.matched', 'Matched')}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t('table.locale', 'Locale')}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t('table.status', 'Status')}</Typography>
        </Th>
        <Th>
          <Typography variant="sigma">{t('table.updated', 'Updated')}</Typography>
        </Th>
      </Tr>
    </Thead>
    <Tbody>
      {results.map((hit) => (
        <ClickableRow
          key={`${hit.contentTypeUid}-${hit.documentId || hit.id}-${hit.locale || ''}`}
          onClick={() => onSelectHit(hit.adminUrl)}
        >
          <Td>
            <Typography textColor="neutral800">{hit.contentTypeLabel}</Typography>
          </Td>
          <Td>
            <Typography textColor="neutral600">{hit.documentId || hit.id}</Typography>
          </Td>
          <Td>
            <Typography fontWeight="semiBold" textColor="neutral800">
              <Highlight text={String(hit.title)} query={trimmedQuery} textColor="neutral800" />
            </Typography>
          </Td>
          <Td>
            {hit.matchedField ? (
              <Box maxWidth="32rem">
                <Typography variant="pi" textColor="neutral500">
                  {hit.matchedFieldLabel}
                </Typography>
                <Box>
                  <Typography variant="pi">
                    <Highlight text={hit.matchedSnippet || ''} query={trimmedQuery} />
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography textColor="neutral400">—</Typography>
            )}
          </Td>
          <Td>
            <Typography textColor="neutral600">{hit.locale || '—'}</Typography>
          </Td>
          <Td>
            {hit.status ? (
              <Badge>{hit.status}</Badge>
            ) : (
              <Typography textColor="neutral400">—</Typography>
            )}
          </Td>
          <Td>
            <Typography textColor="neutral600">
              {hit.updatedAt ? new Date(hit.updatedAt).toLocaleDateString() : '—'}
            </Typography>
          </Td>
        </ClickableRow>
      ))}
    </Tbody>
  </Table>
);

interface SearchResultsSectionProps {
  status: string;
  isBelowMinChars: boolean;
  minChars: number;
  trimmedQuery: string;
  hasTypeFilters: boolean;
  results: SearchHit[];
  onSelectHit: (adminUrl: string) => void;
}

const SearchResultsSection = ({
  status,
  isBelowMinChars,
  minChars,
  trimmedQuery,
  hasTypeFilters,
  results,
  onSelectHit,
}: SearchResultsSectionProps) => {
  if (status === 'error') {
    return (
      <Box padding={8} background="neutral0" hasRadius>
        <Typography textColor="danger600">
          {t(
            'page.error',
            'Search failed. Check that you have permission to read content, and see the server logs for details.'
          )}
        </Typography>
      </Box>
    );
  }

  if (isBelowMinChars || (status === 'idle' && !trimmedQuery)) {
    const headingText = isBelowMinChars
      ? t('palette.min_chars', 'Type at least {count} characters to search.', { count: minChars })
      : t('page.idle_title', 'Search every collection type and single type in this project.');

    return (
      <Box padding={8} background="neutral0" hasRadius>
        <Typography variant="delta" textColor="neutral600">
          {headingText}
        </Typography>
        <Box paddingTop={2}>
          <Typography textColor="neutral500">
            {t(
              'page.idle_subtitle',
              'Results are ordered by id, then name, then any other field — including fields nested inside components. Press Ctrl/Cmd + K anywhere in the admin to open the quick palette.'
            )}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (status === 'loading' && !results.length) {
    return (
      <Flex justifyContent="center" padding={8}>
        <Loader>{t('common.searching', 'Searching…')}</Loader>
      </Flex>
    );
  }

  if (!results.length) {
    const emptyHint = hasTypeFilters
      ? t('page.no_results_clear_filters', 'Try clearing the content type filters.')
      : t('page.no_results_try_different', 'Try a shorter or different term.');

    return (
      <Box padding={8} background="neutral0" hasRadius>
        <Typography variant="delta" textColor="neutral600">
          {t('common.no_results', 'No results for “{query}”.', { query: trimmedQuery })}
        </Typography>
        <Box paddingTop={2}>
          <Typography textColor="neutral500">{emptyHint}</Typography>
        </Box>
      </Box>
    );
  }

  return <ResultsTable results={results} trimmedQuery={trimmedQuery} onSelectHit={onSelectHit} />;
};

interface SearchFiltersBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  contentTypes: ContentTypeSummary[];
  groups: SearchResponse['groups'];
  selectedTypes: string[];
  onSelectedTypesChange: (value: string[]) => void;
  onClearTypes: () => void;
  locales: LocaleOption[];
  locale: string;
  onLocaleChange: (value: string) => void;
}

const SearchFiltersBar = ({
  query,
  onQueryChange,
  contentTypes,
  groups,
  selectedTypes,
  onSelectedTypesChange,
  onClearTypes,
  locales,
  locale,
  onLocaleChange,
}: SearchFiltersBarProps) => (
  <Flex gap={2} alignItems="flex-end" wrap="wrap">
    <Box grow={1} minWidth="16rem">
      <SearchForm>
        <Searchbar
          name="global-search"
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
          onClear={() => onQueryChange('')}
          clearLabel={t('page.clear_search', 'Clear search')}
          placeholder={t('page.search_placeholder', 'Search by id, name, or any text field…')}
        >
          {t('page.search_label', 'Search all content')}
        </Searchbar>
      </SearchForm>
    </Box>

    {contentTypes.length ? (
      <Box minWidth="18rem" maxWidth="28rem">
        <MultiSelect
          aria-label={t('page.content_types_aria', 'Content types')}
          placeholder={t('page.all_content_types', 'All content types')}
          value={selectedTypes}
          onChange={(value: string[]) => onSelectedTypesChange(value)}
          onClear={onClearTypes}
          clearLabel={t('page.clear_type_filters', 'Clear content type filters')}
          withTags
          size="S"
        >
          {contentTypes.map((type) => {
            const group = groups.find((item) => item.uid === type.uid);
            const countLabel = group ? ` (${group.count}${group.truncated ? '+' : ''})` : '';

            return (
              <MultiSelectOption key={type.uid} value={type.uid}>
                {type.displayName}
                {countLabel}
              </MultiSelectOption>
            );
          })}
        </MultiSelect>
      </Box>
    ) : null}

    {locales.length > 1 ? (
      <Box minWidth="16rem">
        <SingleSelect
          aria-label={t('table.locale', 'Locale')}
          value={locale}
          onChange={(val: string | number) => onLocaleChange(String(val))}
          size="S"
        >
          <SingleSelectOption value="all">
            {t('page.all_locales', 'All locales')}
          </SingleSelectOption>
          {locales.map((loc) => (
            <SingleSelectOption key={loc.code} value={loc.code}>
              {loc.name || loc.code}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Box>
    ) : null}
  </Flex>
);

interface SearchPaginationBarProps {
  pagination: SearchResponse['pagination'];
  groupsCount: number;
  meta: SearchResponse['meta'];
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
}

const SearchPaginationBar = ({
  pagination,
  groupsCount,
  meta,
  pageSize,
  onPageSizeChange,
  onPageChange,
}: SearchPaginationBarProps) => {
  const totalLabel = `${pagination.total}${meta.capped ? '+' : ''}`;
  const truncatedNotice =
    meta.truncatedTypes && meta.truncatedTypes.length
      ? t('page.truncated_notice', ' · some types returned more than the per-type limit')
      : '';

  return (
    <Flex justifyContent="space-between" alignItems="center">
      <Flex gap={2} alignItems="center">
        <Typography textColor="neutral600" variant="pi">
          {t('page.results_summary', '{total} results across {groups} content types', {
            total: totalLabel,
            groups: groupsCount,
          })}
          {truncatedNotice}
        </Typography>
        <Box minWidth="7rem">
          <SingleSelect
            aria-label={t('page.results_per_page', 'Results per page')}
            value={String(pageSize)}
            onChange={(value: string | number) => onPageSizeChange(Number(value))}
            size="S"
          >
            {PAGE_SIZES.map((size) => (
              <SingleSelectOption key={size} value={String(size)}>
                {t('page.per_page_option', '{size} / page', { size })}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Box>
      </Flex>

      <Flex gap={2} alignItems="center">
        <Button
          variant="tertiary"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          {t('page.previous', 'Previous')}
        </Button>
        <Typography variant="pi" textColor="neutral600">
          {t('page.page_of', 'Page {page} of {pageCount}', {
            page: pagination.page,
            pageCount: pagination.pageCount || 1,
          })}
        </Typography>
        <Button
          variant="tertiary"
          disabled={pagination.page >= pagination.pageCount}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          {t('page.next', 'Next')}
        </Button>
      </Flex>
    </Flex>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { contentTypes, settings, status: schemaStatus } = useSearchableTypes();
  const [pageSize, setPageSize] = useState(20);
  const [locales, setLocales] = useState<LocaleOption[]>([]);
  const minChars = settings.minChars || 2;

  const search = useGlobalSearch({
    debounce: settings.debounce || 250,
    minChars,
    pageSize,
  });

  useEffect(() => {
    let cancelled = false;
    fetchLocales().then((data) => {
      if (!cancelled) setLocales(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { results, groups, pagination, meta } = search.data;
  const headerSubtitle =
    schemaStatus === 'success'
      ? t('page.subtitle_ready', 'Searching {count} content types · press Ctrl/Cmd + K anywhere', {
          count: contentTypes.length,
        })
      : t('page.subtitle_loading', 'Discovering content types…');

  return (
    <Main aria-busy={search.status === 'loading'}>
      <Layouts.Header
        title={t('plugin.name', 'Global Search')}
        subtitle={headerSubtitle}
        primaryAction={
          <Button
            variant="secondary"
            onClick={() => window.dispatchEvent(new CustomEvent('global-search:open'))}
          >
            {t('page.open_palette', 'Open Palette (⌘K)')}
          </Button>
        }
      />

      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <SearchFiltersBar
            query={search.query}
            onQueryChange={search.setQuery}
            contentTypes={contentTypes}
            groups={groups}
            selectedTypes={search.selectedTypes}
            onSelectedTypesChange={search.setSelectedTypes}
            onClearTypes={search.clearTypes}
            locales={locales}
            locale={search.locale}
            onLocaleChange={search.setLocale}
          />

          <SearchResultsSection
            status={search.status}
            isBelowMinChars={search.isBelowMinChars}
            minChars={minChars}
            trimmedQuery={search.query.trim()}
            hasTypeFilters={search.selectedTypes.length > 0}
            results={results}
            onSelectHit={(adminUrl) => navigate(adminUrl)}
          />

          {results.length ? (
            <SearchPaginationBar
              pagination={pagination}
              groupsCount={groups.length}
              meta={meta}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              onPageChange={search.setPage}
            />
          ) : null}
        </Flex>
      </Layouts.Content>
    </Main>
  );
};

export { HomePage };
export default HomePage;
