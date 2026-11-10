import { useEffect, useState } from "react";

import { fetchSearchableTypes } from "../api/searchApi";
import type {
  ContentTypeSummary,
  PluginSettings,
  SchemaResponse,
} from "../types";

// The schema barely changes at runtime, and both the page and the palette ask
// for it — resolve it once per admin session.
let inFlight: Promise<SchemaResponse> | null = null;

const load = (): Promise<SchemaResponse> => {
  if (!inFlight) {
    inFlight = fetchSearchableTypes().catch((error) => {
      inFlight = null;
      throw error;
    });
  }

  return inFlight;
};

interface SearchableTypesState {
  status: "loading" | "success" | "error";
  contentTypes: ContentTypeSummary[];
  settings: Partial<PluginSettings>;
}

const INVALIDATE_EVENT = "global-search:schema-invalidated";

const useSearchableTypes = (): SearchableTypesState => {
  const [state, setState] = useState<SearchableTypesState>({
    status: "loading",
    contentTypes: [],
    settings: {},
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      load()
        .then((data) => {
          if (cancelled) return;
          setState({
            status: "success",
            contentTypes: data.contentTypes || [],
            settings: data.settings || {},
          });
        })
        .catch(() => {
          if (cancelled) return;
          setState({ status: "error", contentTypes: [], settings: {} });
        });
    };

    refresh();
    if (typeof window !== "undefined") {
      window.addEventListener(INVALIDATE_EVENT, refresh);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(INVALIDATE_EVENT, refresh);
      }
    };
  }, []);

  return state;
};

export const invalidateSearchableTypes = (): void => {
  inFlight = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INVALIDATE_EVENT));
  }
};

export default useSearchableTypes;
