import { useIntl } from "react-intl";

import { PLUGIN_ID, type MediaLibraryAsset } from "../../../../shared";

export const CARD_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid rgba(128, 128, 128, 0.22)",
};

export function useResourcesTranslation() {
  const { formatMessage, locale } = useIntl();
  const t = (id: string, defaultMessage: string, values?: Record<string, string | number>) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);
  return { t, locale };
}

export function getContentManagerUrl(uid: string, documentId?: string, locale?: string): string {
  if (!documentId) {
    return `/admin/content-manager/collection-types/${uid}`;
  }
  const base = `/admin/content-manager/collection-types/${uid}/${encodeURIComponent(documentId)}`;
  return locale ? `${base}?plugins[i18n][locale]=${encodeURIComponent(locale)}` : base;
}

function strVal(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

function mapUploadedAsset(raw: Record<string, unknown>): MediaLibraryAsset {
  const sizeKB = typeof raw.size === "number" ? raw.size : 0;
  const url = strVal(raw.url);
  return {
    id: (raw.id as number | string) ?? undefined,
    documentId: typeof raw.documentId === "string" ? raw.documentId : undefined,
    name: strVal(raw.name, "Uploaded file"),
    alternativeText: strVal(raw.alternativeText),
    caption: strVal(raw.caption),
    url,
    optimizedUrl: url,
    thumbnailUrl: url,
    mime: strVal(raw.mime, "application/octet-stream"),
    ext: strVal(raw.ext),
    sizeInKB: sizeKB,
    formattedSize:
      sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKB))} KB`,
  };
}

export async function uploadFilesToStrapiMediaLibrary(
  fileList: FileList | File[],
  post: (
    url: string,
    data?: unknown,
    config?: Record<string, unknown>
  ) => Promise<{ data?: unknown }>
): Promise<MediaLibraryAsset[]> {
  const files = Array.from(fileList);
  if (files.length === 0) return [];

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await post("/upload", formData);
  const nestedData = (res?.data as { data?: unknown })?.data;
  const rawList: Record<string, unknown>[] = Array.isArray(res?.data)
    ? (res.data as Record<string, unknown>[])
    : Array.isArray(nestedData)
      ? (nestedData as Record<string, unknown>[])
      : [];

  return rawList.map(mapUploadedAsset);
}
