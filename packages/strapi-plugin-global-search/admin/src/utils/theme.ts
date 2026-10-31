import { useEffect, useState } from 'react';
import { darkTheme, lightTheme } from '@strapi/design-system';

const THEME_STORAGE_KEY = 'STRAPI_THEME';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const readStoredTheme = (): string => {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return 'system';

    return raw.replace(/^"|"$/g, '');
  } catch (error) {
    return 'system';
  }
};

const resolve = (preference: string) => {
  if (preference === 'dark') return darkTheme;
  if (preference === 'light') return lightTheme;

  const prefersDark = window.matchMedia && window.matchMedia(DARK_QUERY).matches;

  return prefersDark ? darkTheme : lightTheme;
};

/**
 * Mirrors the admin's own light/dark/system setting for UI rendered outside the
 * admin React tree, where the admin's DesignSystemProvider is out of reach.
 */
export const useAdminTheme = () => {
  const [theme, setTheme] = useState(() => resolve(readStoredTheme()));

  useEffect(() => {
    const sync = () => setTheme(resolve(readStoredTheme()));

    window.addEventListener('storage', sync);

    const media = window.matchMedia ? window.matchMedia(DARK_QUERY) : null;
    if (media && media.addEventListener) media.addEventListener('change', sync);

    const interval = window.setInterval(sync, 2000);

    return () => {
      window.removeEventListener('storage', sync);
      if (media && media.removeEventListener) media.removeEventListener('change', sync);
      window.clearInterval(interval);
    };
  }, []);

  return theme;
};
