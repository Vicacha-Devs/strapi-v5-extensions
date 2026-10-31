import type {
  GalleryAlbumCategory,
  GlossaryCategory,
  PublicationCategory,
  ResourcesPluginSettings,
} from "./types";

export const PLUGIN_ID = "resources";
export const SETTINGS_STORE_KEY = "settings";

export const CONTENT_TYPE_UIDS = {
  publication: "plugin::resources.publication",
  galleryAlbum: "plugin::resources.gallery-album",
  glossaryTerm: "plugin::resources.glossary-term",
} as const;

export const UPLOAD_MODEL_UIDS = {
  file: "plugin::upload.file",
  folder: "plugin::upload.folder",
} as const;

export const ALLOWED_PUBLICATION_CATEGORIES: PublicationCategory[] = [
  "guide",
  "book",
  "pamphlet",
  "press_kit",
  "academic",
  "general",
];

export const ALLOWED_GALLERY_CATEGORIES: GalleryAlbumCategory[] = [
  "architecture",
  "community",
  "events",
  "ramadan_eid",
  "heritage",
  "press",
];

export const ALLOWED_GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  "beliefs",
  "worship",
  "ethics",
  "history",
  "community",
  "general",
];

export const DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS: string[] = [
  ".pdf",
  ".epub",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".mp3",
  ".m4a",
  ".zip",
];

export const DEFAULT_ALLOWED_DOWNLOAD_MIME_TYPES: string[] = [
  "application/pdf",
  "application/epub+zip",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/mp4",
  "application/zip",
];

export const DEFAULT_RESOURCES_SETTINGS: ResourcesPluginSettings = {
  organizationName: "Community Center & Digital Library",
  defaultLocale: "es",
  supportedLocales: ["es", "en", "ar", "tr"],
  secondaryCalendar: "islamic-umalqura",
  enableCloudinaryOptimization: true,
  autoSyncMediaFolders: true,
  defaultPublicationsFolderPath: "/publications",
  defaultGalleriesFolderPath: "/galleries",
  allowedDownloadExtensions: DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS,
  allowedDownloadMimeTypes: DEFAULT_ALLOWED_DOWNLOAD_MIME_TYPES,
  maxPhotosPerAlbum: 60,
};
