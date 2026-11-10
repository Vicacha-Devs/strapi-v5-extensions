import { DesignSystemProvider } from "@strapi/design-system";
import { useEffect, useState } from "react";

import useHotkey from "../hooks/useHotkey";
import { getActiveLocale } from "../utils/getTrad";
import { useAdminTheme } from "../utils/theme";
import { SearchOverlay } from "./SearchOverlay";

const hasToken = (storage: Storage | undefined): boolean => {
  if (!storage) return false;
  try {
    const raw = storage.getItem("jwtToken");
    if (!raw) return false;
    return Boolean(JSON.parse(raw));
  } catch {
    return Boolean(storage.getItem("jwtToken"));
  }
};

const hasCookieToken = (): boolean => {
  if (typeof document === "undefined" || !document.cookie) return false;
  return document.cookie.split(";").some((entry) => {
    const [key, val] = entry.trim().split("=");
    return key === "jwtToken" && Boolean(val);
  });
};

const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;
  const segments = (window.location?.pathname || "").split("/");
  if (segments.includes("auth")) return false;

  return (
    hasToken(window.localStorage) ||
    hasToken(window.sessionStorage) ||
    hasCookieToken()
  );
};

/**
 * Root of the always-available palette. This component owns its own React root
 * (mounted from `bootstrap()`) and therefore its own DesignSystemProvider, kept
 * in sync with the admin's light/dark setting.
 */
const GlobalSearchPortal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useAdminTheme();

  useHotkey(() => setIsOpen((open) => (open ? false : isAuthenticated())));

  useEffect(() => {
    const onOpen = () => {
      if (isAuthenticated()) setIsOpen(true);
    };
    window.addEventListener("global-search:open", onOpen);
    return () => window.removeEventListener("global-search:open", onOpen);
  }, []);

  return (
    <DesignSystemProvider theme={theme} locale={getActiveLocale()}>
      {isOpen ? <SearchOverlay onClose={() => setIsOpen(false)} /> : null}
    </DesignSystemProvider>
  );
};

export { GlobalSearchPortal };
