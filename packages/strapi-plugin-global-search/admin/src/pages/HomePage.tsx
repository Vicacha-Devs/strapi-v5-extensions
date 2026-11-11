import {
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
  Typography,
} from "@strapi/design-system";
import { Layouts } from "@strapi/strapi/admin";
import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

import { fetchLocales } from "../api/searchApi";
import { ResultsTable } from "../components/ResultsTable";
import useGlobalSearch from "../hooks/useGlobalSearch";
import useSearchableTypes from "../hooks/useSearchableTypes";
import type { ContentTypeSummary, LocaleOption, SearchHit } from "../types";
import { toAdminUrl } from "../utils/adminBase";
import { t } from "../utils/getTrad";

const PAGE_SIZES = [10, 20, 50];

const renderMessageCard = (heading: string, subtitle: string) => (
  <Box padding={8} background="neutral0" hasRadius>
    <Typography variant="delta" textColor="neutral600">
      {heading}
    </Typography>
    <Box paddingTop={2}>
      <Typography textColor="neutral500">{subtitle}</Typography>
    </Box>
  </Box>
);

interface SearchResultsSectionProps {
  status: string;
  isBelowMinChars: boolean;
  minChars: number;
  trimmedQuery: string;
  hasTypeFilters: boolean;
  results: SearchHit[];
  onSelectHit: (adminUrl: string, newTab?: boolean) => void;
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
  if (status === "error") {
    return (
      <Box padding={8} background="neutral0" hasRadius>
        <Typography textColor="danger600">
          {t(
            "page.error",
            "Search failed. Check that you have permission to read " +
              "content, and see the server logs for details."
          )}
        </Typography>
      </Box>
    );
  }

  if (isBelowMinChars || (status === "idle" && !trimmedQuery)) {
    const headingText = isBelowMinChars
      ? t("palette.min_chars", "Type at least {count} characters to search.", {
          count: minChars,
        })
      : t(
          "page.idle_title",
          "Search every collection type and single type in this project."
        );
    return renderMessageCard(
      headingText,
      t(
        "page.idle_subtitle",
        "Results are ordered by id, then name, then any other field — " +
          "including fields nested inside components. Press Ctrl/Cmd + K " +
          "anywhere in the admin to open the quick palette."
      )
    );
  }

  if (status === "loading" && !results.length) {
    return (
      <Flex justifyContent="center" padding={8}>
        <Loader>{t("common.searching", "Searching…")}</Loader>
      </Flex>
    );
  }

  if (!results.length) {
    const emptyHint = hasTypeFilters
      ? t(
          "page.no_results_clear_filters",
          "Try clearing the content type filters."
        )
      : t("page.no_results_try_different", "Try a shorter or different term.");
    return renderMessageCard(
      t("common.no_results", "No results for “{query}”.", {
        query: trimmedQuery,
      }),
      emptyHint
    );
  }

  return (
    <ResultsTable
      results={results}
      trimmedQuery={trimmedQuery}
      onSelectHit={onSelectHit}
    />
  );
};

interface SearchFiltersBarProps {
  search: ReturnType<typeof useGlobalSearch>;
  contentTypes: ContentTypeSummary[];
  locales: LocaleOption[];
}

const SearchFiltersBar = ({
  search,
  contentTypes,
  locales,
}: SearchFiltersBarProps) => {
  const { groups } = search.data;
  return (
    <Flex gap={2} alignItems="flex-end" wrap="wrap">
      <Box grow={1} minWidth="16rem">
        <SearchForm>
          <Searchbar
            name="global-search"
            value={search.query}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              search.setQuery(event.target.value)
            }
            onClear={() => search.setQuery("")}
            clearLabel={t("page.clear_search", "Clear search")}
            placeholder={t(
              "page.search_placeholder",
              "Search by id, name, or any text field…"
            )}
          >
            {t("page.search_label", "Search all content")}
          </Searchbar>
        </SearchForm>
      </Box>

      {contentTypes.length ? (
        <Box minWidth="18rem" maxWidth="28rem">
          <MultiSelect
            aria-label={t("page.content_types_aria", "Content types")}
            placeholder={t("page.all_content_types", "All content types")}
            value={search.selectedTypes}
            onChange={search.setSelectedTypes}
            onClear={search.clearTypes}
            clearLabel={t(
              "page.clear_type_filters",
              "Clear content type filters"
            )}
            withTags
            size="S"
          >
            {contentTypes.map((type) => {
              const group = groups.find((item) => item.uid === type.uid);
              const countLabel = group
                ? ` (${group.count}${group.truncated ? "+" : ""})`
                : "";
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
            aria-label={t("table.locale", "Locale")}
            value={search.locale}
            onChange={(val: string | number) => search.setLocale(String(val))}
            size="S"
          >
            <SingleSelectOption value="all">
              {t("page.all_locales", "All locales")}
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
};

interface SearchPaginationBarProps {
  search: ReturnType<typeof useGlobalSearch>;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

const SearchPaginationBar = ({
  search,
  pageSize,
  onPageSizeChange,
}: SearchPaginationBarProps) => {
  const { pagination, groups, meta } = search.data;
  const totalLabel = `${pagination.total}${meta.capped ? "+" : ""}`;
  const truncatedNotice = meta.truncatedTypes?.length
    ? t(
        "page.truncated_notice",
        " · some types returned more than the per-type limit"
      )
    : "";

  return (
    <Flex justifyContent="space-between" alignItems="center">
      <Flex gap={2} alignItems="center">
        <Typography textColor="neutral600" variant="pi">
          {t(
            "page.results_summary",
            "{total} results across {groups} content types",
            { total: totalLabel, groups: groups.length }
          )}
          {truncatedNotice}
        </Typography>
        <Box minWidth="7rem">
          <SingleSelect
            aria-label={t("page.results_per_page", "Results per page")}
            value={String(pageSize)}
            onChange={(value: string | number) =>
              onPageSizeChange(Number(value))
            }
            size="S"
          >
            {PAGE_SIZES.map((size) => (
              <SingleSelectOption key={size} value={String(size)}>
                {t("page.per_page_option", "{size} / page", { size })}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Box>
      </Flex>

      <Flex gap={2} alignItems="center">
        <Button
          variant="tertiary"
          disabled={pagination.page <= 1}
          onClick={() => search.setPage(pagination.page - 1)}
        >
          {t("page.previous", "Previous")}
        </Button>
        <Typography variant="pi" textColor="neutral600">
          {t("page.page_of", "Page {page} of {pageCount}", {
            page: pagination.page,
            pageCount: pagination.pageCount || 1,
          })}
        </Typography>
        <Button
          variant="tertiary"
          disabled={pagination.page >= pagination.pageCount}
          onClick={() => search.setPage(pagination.page + 1)}
        >
          {t("page.next", "Next")}
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

  const { results } = search.data;
  const headerSubtitle =
    schemaStatus === "success"
      ? t(
          "page.subtitle_ready",
          "Searching {count} content types · press Ctrl/Cmd + K anywhere",
          { count: contentTypes.length }
        )
      : t("page.subtitle_loading", "Discovering content types…");

  return (
    <Main aria-busy={search.status === "loading"}>
      <Layouts.Header
        title={t("plugin.name", "Global Search")}
        subtitle={headerSubtitle}
        primaryAction={
          <Button
            variant="secondary"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("global-search:open"))
            }
          >
            {t("page.open_palette", "Open Palette (⌘K)")}
          </Button>
        }
      />

      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <SearchFiltersBar
            search={search}
            contentTypes={contentTypes}
            locales={locales}
          />

          <SearchResultsSection
            status={search.status}
            isBelowMinChars={search.isBelowMinChars}
            minChars={minChars}
            trimmedQuery={search.query.trim()}
            hasTypeFilters={search.selectedTypes.length > 0}
            results={results}
            onSelectHit={(url, newTab) =>
              newTab
                ? window.open(toAdminUrl(url), "_blank", "noopener")
                : navigate(url)
            }
          />

          {results.length ? (
            <SearchPaginationBar
              search={search}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          ) : null}
        </Flex>
      </Layouts.Content>
    </Main>
  );
};

export { HomePage };
export default HomePage;
