/**
 * The Cmd+K palette is mounted outside the admin's React tree, so it has no
 * router to push to and must build absolute URLs itself. The admin path is
 * configurable (`config/admin.js` -> `url`).
 */
export const getAdminBase = (): string => {
  if (typeof window === "undefined") return "/admin/";

  try {
    const pathname = window.location.pathname || "";
    const marker = "/admin";
    let idx = pathname.lastIndexOf(marker);

    while (idx !== -1) {
      const end = idx + marker.length;
      if (end === pathname.length || pathname[end] === "/") {
        return `${pathname.slice(0, end)}/`;
      }
      idx = pathname.lastIndexOf(marker, idx - 1);
    }
  } catch {
    // Fall through to the default admin path.
  }

  return "/admin/";
};

export const toAdminUrl = (path: string): string =>
  `${getAdminBase()}${String(path).replace(/^\//, "")}`;
