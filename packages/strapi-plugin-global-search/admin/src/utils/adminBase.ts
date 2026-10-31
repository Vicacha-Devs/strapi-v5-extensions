/**
 * The Cmd+K palette is mounted outside the admin's React tree, so it has no
 * router to push to and must build absolute URLs itself. The admin path is
 * configurable (`config/admin.js` -> `url`).
 */
export const getAdminBase = (): string => {
  if (typeof window === 'undefined') return '/admin/';

  try {
    const pathname = window.location.pathname || '';
    const match = pathname.match(/^(.*\/admin)(?:\/|$)/);

    if (match) {
      return match[1].endsWith('/') ? match[1] : `${match[1]}/`;
    }
  } catch (error) {
    // Fall through to the default admin path.
  }

  return '/admin/';
};

export const toAdminUrl = (path: string): string =>
  `${getAdminBase()}${String(path).replace(/^\//, '')}`;
