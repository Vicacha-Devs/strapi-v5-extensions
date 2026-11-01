import {
  Box,
  Divider,
  Flex,
  Loader,
  Modal,
  TextInput,
  Typography,
  VisuallyHidden,
} from "@strapi/design-system";
import { Search } from "@strapi/icons";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { styled } from "styled-components";

import useGlobalSearch from "../hooks/useGlobalSearch";
import useSearchableTypes from "../hooks/useSearchableTypes";
import type { SearchHit } from "../types";
import { toAdminUrl } from "../utils/adminBase";
import { t } from "../utils/getTrad";
import { ResultItem } from "./ResultItem";

const ResultsScroller = styled(Box)`
  max-height: 45vh;
  overflow-y: auto;
`;

const PALETTE_PAGE_SIZE = 30;

interface SearchOverlayProps {
  onClose: () => void;
}

const navigateToHit = (
  hit: SearchHit,
  newTab: boolean,
  onClose: () => void
) => {
  const url = toAdminUrl(hit.adminUrl);

  if (newTab) {
    window.open(url, "_blank", "noopener");
    return;
  }

  onClose();

  try {
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch {
    window.location.assign(url);
  }
};

interface OverlayBodyProps {
  isBelowMinChars: boolean;
  minChars: number;
  status: string;
  query: string;
  results: SearchHit[];
  activeIndex: number;
  onSelect: (hit: SearchHit, newTab?: boolean) => void;
  onHoverIndex: (index: number) => void;
}

const OverlayBody = ({
  isBelowMinChars,
  minChars,
  status,
  query,
  results,
  activeIndex,
  onSelect,
  onHoverIndex,
}: OverlayBodyProps) => {
  if (isBelowMinChars) {
    return (
      <Box padding={6}>
        <Typography textColor="neutral500">
          {t(
            "palette.min_chars",
            "Type at least {count} characters to search.",
            {
              count: minChars,
            }
          )}
        </Typography>
      </Box>
    );
  }

  if (status === "idle") {
    return (
      <Box padding={6}>
        <Typography textColor="neutral500">
          {t(
            "palette.idle_hint",
            "Search every collection type and single type by id, name, or any text field."
          )}
        </Typography>
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box padding={6}>
        <Typography textColor="danger600">
          {t(
            "palette.error",
            "Search failed. Check that you have permission to read content, and see the server logs."
          )}
        </Typography>
      </Box>
    );
  }

  if (status === "loading" && !results.length) {
    return (
      <Flex justifyContent="center" padding={6}>
        <Loader>{t("common.searching", "Searching…")}</Loader>
      </Flex>
    );
  }

  if (!results.length) {
    return (
      <Box padding={6}>
        <Typography textColor="neutral500">
          {t("common.no_results", "No results for “{query}”.", { query })}
        </Typography>
      </Box>
    );
  }

  return (
    <ResultsScroller
      role="listbox"
      aria-label={t("palette.results_aria", "Search results")}
    >
      {results.map((hit, index) => (
        <ResultItem
          key={`${hit.contentTypeUid}-${hit.documentId || hit.id}-${hit.locale || ""}`}
          hit={hit}
          query={query.trim()}
          isActive={index === activeIndex}
          onSelect={onSelect}
          onHover={() => onHoverIndex(index)}
        />
      ))}
    </ResultsScroller>
  );
};

/**
 * Spotlight-style command palette. It is rendered outside the admin's React
 * tree, so navigation is a full URL assignment rather than a router push.
 */
const SearchOverlay = ({ onClose }: SearchOverlayProps) => {
  const { settings } = useSearchableTypes();
  const minChars = settings.minChars || 2;
  const search = useGlobalSearch({
    debounce: settings.debounce || 250,
    minChars,
    pageSize: PALETTE_PAGE_SIZE,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const results = useMemo(() => search.data.results || [], [search.data]);

  useEffect(() => {
    const timer = setTimeout(
      () => inputRef.current && inputRef.current.focus(),
      0
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [search.query, results.length]);

  const open = (hit: SearchHit, newTab = false) => {
    if (hit) navigateToHit(hit, newTab, onClose);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length ? (index + 1) % results.length : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length ? (index - 1 + results.length) % results.length : 0
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = results[activeIndex];
      if (hit) open(hit, event.metaKey || event.ctrlKey);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  const countSuffix = search.data.meta.capped ? "+" : "";
  const totalCount = `${search.data.pagination.total}${countSuffix}`;

  return (
    <Modal.Root open onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <Modal.Content>
        <Box onKeyDown={onKeyDown}>
          <VisuallyHidden>
            <Typography id="global-search-palette-title">
              {t("palette.title", "Global search")}
            </Typography>
          </VisuallyHidden>

          <Box
            paddingLeft={4}
            paddingRight={4}
            paddingTop={4}
            paddingBottom={3}
          >
            <TextInput
              ref={inputRef}
              name="global-search-palette"
              aria-label={t("palette.title", "Global search")}
              placeholder={t("palette.placeholder", "Search all content…")}
              startIcon={<Search />}
              value={search.query}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                search.setQuery(event.target.value)
              }
              autoComplete="off"
            />
          </Box>

          <Divider />

          <Modal.Body>
            <OverlayBody
              isBelowMinChars={search.isBelowMinChars}
              minChars={minChars}
              status={search.status}
              query={search.query}
              results={results}
              activeIndex={activeIndex}
              onSelect={open}
              onHoverIndex={setActiveIndex}
            />
          </Modal.Body>

          <Divider />

          <Flex
            justifyContent="space-between"
            padding={3}
            paddingLeft={4}
            paddingRight={4}
          >
            <Typography variant="pi" textColor="neutral500">
              {t(
                "palette.shortcuts_hint",
                "↑ ↓ navigate · ↵ open · ⌘/Ctrl + ↵ new tab · esc close"
              )}
            </Typography>
            {search.status === "success" && search.data.pagination.total > 0 ? (
              <Typography variant="pi" textColor="neutral500">
                {t("palette.result_count", "{count} results", {
                  count: totalCount,
                })}
              </Typography>
            ) : null}
          </Flex>
        </Box>
      </Modal.Content>
    </Modal.Root>
  );
};

export { SearchOverlay };
