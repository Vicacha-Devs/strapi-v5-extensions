import type { Core } from "@strapi/strapi";

import { CONTENT_TYPE_UIDS, PLUGIN_ID } from "../../shared";

interface FieldMetaConfig {
  label: string;
  description: string;
  placeholder?: string;
}

const RESOURCE_FIELD_METADATA_BY_UID: Record<
  string,
  Record<string, FieldMetaConfig>
> = {
  [CONTENT_TYPE_UIDS.publication]: {
    title: {
      label: "Publication Title",
      description:
        "Public title displayed on the Digital Library card and download page",
      placeholder: "e.g., Mosque Visitor & Prayer Guide",
    },
    slug: {
      label: "URL Slug",
      description: "Unique URL-friendly identifier generated from the title",
      placeholder: "auto-generated-url-slug",
    },
    summary: {
      label: "Summary / Abstract",
      description:
        "Short summary or abstract displayed on the publication download card (optional)",
      placeholder: "Brief summary of this guide, book, or brochure...",
    },
    category: {
      label: "Category",
      description:
        "Thematic category used to filter publications in the Digital Library",
    },
    file: {
      label: "PDF / eBook File",
      description:
        "Upload a PDF, eBook (.epub), or audio file directly to the Strapi Media Library",
    },
    coverImage: {
      label: "Cover Image",
      description:
        "Optional cover thumbnail displayed on the Digital Library card",
    },
    authorProfile: {
      label: "Author Profile",
      description:
        "Optional relation to a scholar or staff profile in the directory",
    },
    authorName: {
      label: "Author Name",
      description:
        "Author, scholar, or committee name displayed on the publication",
      placeholder: "e.g., Department of Education",
    },
    authorSlug: {
      label: "Author Slug",
      description: "URL-friendly identifier for linking to an author profile",
      placeholder: "auto-generated-author-slug",
    },
    isbnOrReference: {
      label: "ISBN or Reference",
      description: "Optional ISBN or internal catalog reference code",
      placeholder: "e.g., ISBN-978-958-00-0102-4",
    },
    pageCount: {
      label: "Page Count",
      description: "Total number of pages in the publication (optional)",
      placeholder: "e.g., 24",
    },
    languageCode: {
      label: "Language Code",
      description: "Document language code (e.g., es, en, ar, tr)",
      placeholder: "e.g., es, en, ar, tr",
    },
    publishedAtDate: {
      label: "Published Date",
      description:
        "Publication release date (used to calculate the Hijri date label)",
      placeholder: "YYYY-MM-DD",
    },
    secondaryDateOverride: {
      label: "Secondary Date Override",
      description:
        "Optional Hijri date label override (automatically calculated if left blank)",
      placeholder: "e.g., 15 Ramadan 1447 AH",
    },
    mediaFolderPath: {
      label: "Media Folder Path",
      description:
        "Optional virtual Media Library folder path (leave default unless organizing folders manually)",
      placeholder: "e.g., /resources/publications",
    },
    externalDownloadUrl: {
      label: "External Download URL",
      description:
        "Optional external URL (e.g., https://...) used only when no PDF/eBook File is uploaded above",
      placeholder: "https://...",
    },
    downloadCount: {
      label: "Download Count",
      description: "Total number of public downloads",
    },
    featured: {
      label: "Featured",
      description:
        "Highlight this publication at the top of the Digital Library",
    },
    allowPublicDownload: {
      label: "Allow Public Download",
      description: "Allow website visitors to download this file directly",
    },
  },
  [CONTENT_TYPE_UIDS.galleryAlbum]: {
    title: {
      label: "Album Title",
      description: "Public title displayed on the photo gallery album",
      placeholder: "e.g., Mosque Architecture & Calligraphy",
    },
    slug: {
      label: "URL Slug",
      description:
        "Unique URL-friendly identifier generated from the album title",
      placeholder: "auto-generated-url-slug",
    },
    description: {
      label: "Description",
      description:
        "Optional caption or summary displayed beneath the album title",
      placeholder: "e.g., Main prayer hall, mihrab, and central dome...",
    },
    category: {
      label: "Category",
      description: "Thematic category used to filter photo gallery albums",
    },
    coverPhoto: {
      label: "Cover Photo",
      description:
        "Optional main cover image for the album card (uses first photo if left empty)",
    },
    photos: {
      label: "Album Photos",
      description: "Photos and videos included in this gallery album",
    },
    mediaFolderId: {
      label: "Media Folder ID",
      description:
        "Optional Strapi Media Library numeric folder ID for automated folder sync",
    },
    mediaFolderPath: {
      label: "Media Folder Path",
      description:
        "Optional virtual Media Library folder path (leave default unless organizing folders manually)",
      placeholder: "e.g., /resources/galleries",
    },
    eventDate: {
      label: "Event Date",
      description: "Date when the photos or event took place",
      placeholder: "YYYY-MM-DD",
    },
    secondaryDateOverride: {
      label: "Secondary Date Override",
      description:
        "Optional Hijri date label override (automatically calculated if left blank)",
      placeholder: "e.g., 15 Ramadan 1447 AH",
    },
    photographerCredit: {
      label: "Photographer Credit",
      description: "Optional photographer or archive credit line",
      placeholder: "e.g., Institutional Photo Archive",
    },
    framingNotes: {
      label: "Editorial / Framing Notes",
      description:
        "Optional internal or curatorial notes on photography framing and privacy",
      placeholder: "e.g., Privacy-respecting architectural framing...",
    },
    featured: {
      label: "Featured",
      description: "Highlight this album on the main gallery showcase",
    },
    sortOrder: {
      label: "Sort Order",
      description:
        "Display order in the gallery grid (lower numbers appear first)",
    },
  },
  [CONTENT_TYPE_UIDS.glossaryTerm]: {
    term: {
      label: "Term",
      description: "Primary glossary term indexed A–Z",
      placeholder: "e.g., Mihrab",
    },
    slug: {
      label: "URL Slug",
      description: "Unique URL-friendly identifier generated from the term",
      placeholder: "auto-generated-url-slug",
    },
    nativeScript: {
      label: "Native / Arabic Script",
      description: "Original term in Arabic script (e.g., مِحْرَاب)",
      placeholder: "e.g., مِحْرَاب",
    },
    transliteration: {
      label: "Transliteration",
      description: "Phonetic Latin transliteration (e.g., Miḥrāb)",
      placeholder: "e.g., Miḥrāb",
    },
    definition: {
      label: "Definition",
      description: "Clear explanation displayed in glossary cards and tooltips",
      placeholder:
        "e.g., Semicircular niche in the Qibla wall indicating the direction of Makkah.",
    },
    category: {
      label: "Category",
      description: "Thematic classification for filtering glossary terms",
    },
    letterGroup: {
      label: "Index Letter (A–Z)",
      description:
        "Alphabetical index letter (A–Z) for grouping in the glossary",
      placeholder: "e.g., M",
    },
    pronunciationAudio: {
      label: "Pronunciation Audio",
      description:
        "Optional audio recording (.mp3 / .wav) for pronouncing this glossary term",
    },
    relatedTerms: {
      label: "Related Terms",
      description: "Optional JSON list of related glossary terms",
    },
    featured: {
      label: "Featured",
      description: "Highlight this term in the featured glossary section",
    },
  },
};

interface ContentManagerFieldMetadata {
  edit?: {
    label?: string;
    description?: string;
    placeholder?: string;
  };
  list?: {
    label?: string;
  };
}

interface ContentManagerConfiguration {
  metadatas?: Record<string, ContentManagerFieldMetadata>;
  [key: string]: unknown;
}

interface DbStoreRow {
  id: number | string;
  value?: string;
}

type DbQueryChain = Promise<DbStoreRow[]> & {
  update: (data: { value: string }) => Promise<unknown>;
};

type DbConnectionFn = (table: string) => {
  where: (filter: Record<string, unknown>) => DbQueryChain;
};

function applyFieldMetaToEdit(
  edit: NonNullable<ContentManagerFieldMetadata["edit"]>,
  cfg: FieldMetaConfig
): boolean {
  let changed = false;
  if (cfg.label && edit.label !== cfg.label) {
    edit.label = cfg.label;
    changed = true;
  }
  if (cfg.description && edit.description !== cfg.description) {
    edit.description = cfg.description;
    changed = true;
  }
  if (cfg.placeholder && edit.placeholder !== cfg.placeholder) {
    edit.placeholder = cfg.placeholder;
    changed = true;
  }
  return changed;
}

function applyFieldsConfigToMetadatas(
  metadatas: Record<string, ContentManagerFieldMetadata>,
  fieldsConfig: Record<string, FieldMetaConfig>
): boolean {
  let changed = false;
  for (const [fieldName, cfg] of Object.entries(fieldsConfig)) {
    const meta = metadatas[fieldName];
    if (meta?.edit && applyFieldMetaToEdit(meta.edit, cfg)) {
      changed = true;
    }
    if (meta?.list && cfg.label && meta.list.label !== cfg.label) {
      meta.list.label = cfg.label;
      changed = true;
    }
  }
  return changed;
}

async function syncUidMetadataInStore(
  dbConn: DbConnectionFn,
  uid: string,
  fieldsConfig: Record<string, FieldMetaConfig>
): Promise<void> {
  const storeKey = `plugin_content_manager_configuration_content_types::${uid}`;
  const rows = await dbConn("strapi_core_store_settings").where({
    key: storeKey,
  });
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.value) return;

  let parsed: ContentManagerConfiguration;
  try {
    parsed = JSON.parse(row.value) as ContentManagerConfiguration;
  } catch {
    return;
  }
  if (!parsed?.metadatas || typeof parsed.metadatas !== "object") return;

  if (applyFieldsConfigToMetadatas(parsed.metadatas, fieldsConfig)) {
    await dbConn("strapi_core_store_settings")
      .where({ id: row.id })
      .update({ value: JSON.stringify(parsed) });
  }
}

async function enrichPluginContentManagerMetadata(strapi: Core.Strapi) {
  try {
    const dbConn = (
      strapi.db as unknown as {
        connection?: DbConnectionFn;
      }
    )?.connection;
    if (typeof dbConn !== "function") return;

    for (const [uid, fieldsConfig] of Object.entries(
      RESOURCE_FIELD_METADATA_BY_UID
    )) {
      await syncUidMetadataInStore(dbConn, uid, fieldsConfig);
    }
  } catch {
    // Ignore in environments without strapi_core_store_settings
  }
}

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const actions = [
      {
        section: "plugins",
        displayName: "Read resources & media catalogs",
        uid: "read",
        pluginName: PLUGIN_ID,
      },
      {
        section: "plugins",
        displayName: "Manage publications, galleries & glossary",
        uid: "manage",
        pluginName: PLUGIN_ID,
      },
      {
        section: "plugins",
        displayName: "Configure resources settings",
        uid: "settings",
        pluginName: PLUGIN_ID,
      },
    ];

    await strapi.admin?.services?.permission?.actionProvider?.registerMany(
      actions
    );

    const catalogService = strapi
      .plugin(PLUGIN_ID)
      .service("catalogService") as {
      seedDefaultResources: () => Promise<void>;
    };
    await catalogService.seedDefaultResources();
    await enrichPluginContentManagerMetadata(strapi);
  } catch (err) {
    strapi.log.warn(
      `[strapi-plugin-resources] Bootstrap warning: ${(err as Error).message}`
    );
  }
};

export default bootstrap;
