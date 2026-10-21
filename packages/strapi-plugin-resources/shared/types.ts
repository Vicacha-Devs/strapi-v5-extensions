export type PublicationCategory =
  | 'guide'
  | 'book'
  | 'pamphlet'
  | 'press_kit'
  | 'academic'
  | 'general';

export type GalleryAlbumCategory =
  | 'architecture'
  | 'community'
  | 'events'
  | 'ramadan_eid'
  | 'heritage'
  | 'press';

export type GlossaryCategory =
  | 'beliefs'
  | 'worship'
  | 'ethics'
  | 'history'
  | 'community'
  | 'general';

export interface MediaLibraryFormatVariant {
  url: string;
  width?: number;
  height?: number;
  mime?: string;
  sizeInKB?: number;
}

export interface MediaLibraryAsset {
  id?: number | string;
  documentId?: string;
  name: string;
  alternativeText: string;
  caption: string;
  url: string;
  optimizedUrl: string;
  thumbnailUrl: string;
  mime: string;
  ext: string;
  sizeInKB: number;
  formattedSize: string;
  width?: number;
  height?: number;
  folderPath?: string;
  formats?: Record<string, MediaLibraryFormatVariant>;
}

export interface MediaLibraryFolderSummary {
  id: number | string;
  documentId?: string;
  name: string;
  path: string;
  pathId?: number;
  filesCount?: number;
}

export interface PublicationRecord {
  documentId?: string;
  title: string;
  slug: string;
  summary: string;
  category: PublicationCategory;
  authorName?: string;
  isbnOrReference?: string;
  pageCount?: number;
  languageCode: string;
  publishedAtDate?: string;
  secondaryDateOverride?: string;
  secondaryDateFormatted?: string;
  mediaFolderPath?: string;
  downloadCount: number;
  featured: boolean;
  allowPublicDownload: boolean;
  externalDownloadUrl?: string;
  file?: MediaLibraryAsset | null;
  coverImage?: MediaLibraryAsset | null;
  locale?: string;
}

export interface GalleryAlbumRecord {
  documentId?: string;
  title: string;
  slug: string;
  description: string;
  category: GalleryAlbumCategory;
  eventDate?: string;
  secondaryDateOverride?: string;
  secondaryDateFormatted?: string;
  mediaFolderId?: number | null;
  mediaFolderPath?: string;
  photographerCredit?: string;
  framingNotes?: string;
  featured: boolean;
  sortOrder: number;
  photoCount: number;
  coverPhoto?: MediaLibraryAsset | null;
  photos: MediaLibraryAsset[];
  locale?: string;
}

export interface GlossaryTermRecord {
  documentId?: string;
  term: string;
  slug: string;
  nativeScript?: string;
  transliteration?: string;
  definition: string;
  category: GlossaryCategory;
  letterGroup: string;
  relatedTerms?: string[];
  featured: boolean;
  pronunciationAudio?: MediaLibraryAsset | null;
  locale?: string;
}

export interface DownloadTicketResult {
  slug: string;
  title: string;
  fileName: string;
  downloadUrl: string;
  mime: string;
  formattedSize: string;
  downloadCount: number;
  headers: Record<string, string>;
}

export interface ResourcesPluginSettings {
  organizationName: string;
  defaultLocale: string;
  supportedLocales: string[];
  secondaryCalendar: string;
  enableCloudinaryOptimization: boolean;
  autoSyncMediaFolders: boolean;
  defaultPublicationsFolderPath: string;
  defaultGalleriesFolderPath: string;
  allowedDownloadExtensions: string[];
  allowedDownloadMimeTypes: string[];
  maxPhotosPerAlbum: number;
}
