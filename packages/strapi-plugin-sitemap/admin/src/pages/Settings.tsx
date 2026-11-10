import {
  Main,
  Box,
  Button,
  Flex,
  Typography,
  Tabs,
} from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import React, { useState, useEffect } from "react";
import { useIntl } from "react-intl";

import CollectionTypeModal, {
  type CollectionTypeConfig,
} from "../components/CollectionTypeModal";
import CustomURLModal, {
  type CustomURLConfig,
} from "../components/CustomURLModal";
import BaseUrlSection from "../components/settings/BaseUrlSection";
import { CollectionTypesSection } from "../components/settings/CollectionTypesSection";
import { CustomUrlsSection } from "../components/settings/CustomUrlsSection";
import { ExcludedUrlsSection } from "../components/settings/ExcludedUrlsSection";
import { SitemapIndexSection } from "../components/settings/SitemapIndexSection";
import SitemapDefinitionModal, {
  type SitemapDefinition,
} from "../components/SitemapDefinitionModal";
import getTrad from "../utils/getTrad";

interface SitemapSettingsPayload {
  baseUrl?: string;
  collectionTypes?: CollectionTypeConfig[];
  customURLs?: CustomURLConfig[];
  excludedUrls?: string[];
  useSitemapIndex?: boolean;
  sitemaps?: SitemapDefinition[];
}

interface NormalizedSitemapSettings {
  baseUrl: string;
  collectionTypes: CollectionTypeConfig[];
  customURLs: CustomURLConfig[];
  excludedUrls: string[];
  useSitemapIndex: boolean;
  sitemaps: SitemapDefinition[];
}

const normalizeFetchedSettings = (
  data?: SitemapSettingsPayload
): NormalizedSitemapSettings => ({
  baseUrl: data?.baseUrl || "",
  collectionTypes: data?.collectionTypes || [],
  customURLs: data?.customURLs || [],
  excludedUrls: data?.excludedUrls || [],
  useSitemapIndex: Boolean(data?.useSitemapIndex),
  sitemaps: data?.sitemaps || [],
});

const upsertAtIndex = <T,>(
  items: T[],
  index: number | null,
  nextItem: T
): T[] => {
  if (index === null) {
    return [...items, nextItem];
  }
  return items.map((item, i) => (i === index ? nextItem : item));
};

const remapSitemapIndicesAfterDelete = (
  sitemaps: SitemapDefinition[],
  deletedIndex: number
): SitemapDefinition[] =>
  sitemaps.map((def) => ({
    ...def,
    collectionTypeConfigIndices: (def.collectionTypeConfigIndices ?? [])
      .filter((idx) => idx !== deletedIndex)
      .map((idx) => (idx > deletedIndex ? idx - 1 : idx)),
  }));

const Settings: React.FC = () => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();

  const [baseUrl, setBaseUrl] = useState<string>("");
  const [initialBaseUrl, setInitialBaseUrl] = useState<string>("");
  const [collectionTypes, setCollectionTypes] = useState<
    CollectionTypeConfig[]
  >([]);
  const [customURLs, setCustomURLs] = useState<CustomURLConfig[]>([]);
  const [excludedUrls, setExcludedUrls] = useState<string[]>([]);
  const [initialExcludedUrls, setInitialExcludedUrls] = useState<string[]>([]);
  const [newExcludedPath, setNewExcludedPath] = useState<string>("");

  const [useSitemapIndex, setUseSitemapIndex] = useState<boolean>(false);
  const [sitemaps, setSitemaps] = useState<SitemapDefinition[]>([]);
  const [initialUseSitemapIndex, setInitialUseSitemapIndex] =
    useState<boolean>(false);
  const [initialSitemaps, setInitialSitemaps] = useState<SitemapDefinition[]>(
    []
  );
  const [isSitemapModalOpen, setIsSitemapModalOpen] = useState<boolean>(false);
  const [editingSitemapIndex, setEditingSitemapIndex] = useState<number | null>(
    null
  );

  const [isCollectionModalOpen, setIsCollectionModalOpen] =
    useState<boolean>(false);
  const [editingCollectionIndex, setEditingCollectionIndex] = useState<
    number | null
  >(null);

  const [isCustomURLModalOpen, setIsCustomURLModalOpen] =
    useState<boolean>(false);
  const [editingCustomIndex, setEditingCustomIndex] = useState<number | null>(
    null
  );

  const tr = (id: string, defaultMessage: string) =>
    formatMessage({ id: getTrad(id), defaultMessage });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await get<SitemapSettingsPayload>("/sitemap/settings");
        const normalized = normalizeFetchedSettings(data);
        setBaseUrl(normalized.baseUrl);
        setInitialBaseUrl(normalized.baseUrl);
        setCollectionTypes(normalized.collectionTypes);
        setCustomURLs(normalized.customURLs);
        setExcludedUrls(normalized.excludedUrls);
        setInitialExcludedUrls(normalized.excludedUrls);
        setUseSitemapIndex(normalized.useSitemapIndex);
        setSitemaps(normalized.sitemaps);
        setInitialUseSitemapIndex(normalized.useSitemapIndex);
        setInitialSitemaps(normalized.sitemaps);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    void fetchSettings();
  }, [get]);

  const isUrlModified = baseUrl !== initialBaseUrl;
  const isSitemapSettingsModified =
    useSitemapIndex !== initialUseSitemapIndex ||
    JSON.stringify(sitemaps) !== JSON.stringify(initialSitemaps);
  const isExcludedUrlsModified =
    JSON.stringify(excludedUrls) !== JSON.stringify(initialExcludedUrls);

  const notifyError = (defaultMessage: string) => {
    toggleNotification({
      type: "danger",
      message: tr("settings.notification.error", defaultMessage),
    });
  };

  const persistSettings = async (
    overrides: Partial<NormalizedSitemapSettings> = {}
  ) => {
    await put("/sitemap/settings", {
      baseUrl,
      collectionTypes,
      customURLs,
      excludedUrls,
      useSitemapIndex,
      sitemaps,
      ...overrides,
    });
  };

  const handleSaveBaseUrl = async () => {
    try {
      await persistSettings();
      setInitialBaseUrl(baseUrl);
    } catch (err) {
      console.error("Failed to update baseUrl:", err);
      notifyError("Failed to save sitemap settings");
    }
  };

  const handleSaveSitemapSettings = async () => {
    try {
      await persistSettings();
      setInitialUseSitemapIndex(useSitemapIndex);
      setInitialSitemaps(sitemaps);
    } catch (err) {
      console.error("Failed to update sitemap settings:", err);
      notifyError("Failed to save sitemap settings");
    }
  };

  const handleAddExcludedUrl = () => {
    const trimmed = newExcludedPath.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (!excludedUrls.includes(normalized)) {
      setExcludedUrls([...excludedUrls, normalized]);
      setNewExcludedPath("");
    }
  };

  const handleDeleteExcludedUrl = (index: number) => {
    setExcludedUrls(excludedUrls.filter((_, i) => i !== index));
  };

  const handleSaveExcludedUrls = async () => {
    try {
      await persistSettings();
      setInitialExcludedUrls(excludedUrls);
    } catch (err) {
      console.error("Failed to update excluded URLs:", err);
      notifyError("Failed to save excluded URLs");
    }
  };

  const handleSaveSitemapDef = async (def: SitemapDefinition) => {
    const updated = upsertAtIndex(sitemaps, editingSitemapIndex, def);
    setSitemaps(updated);
    setIsSitemapModalOpen(false);
    setEditingSitemapIndex(null);
    try {
      await persistSettings({ sitemaps: updated });
      setInitialSitemaps(updated);
    } catch (err) {
      console.error("Failed to save sitemap definition:", err);
      notifyError("Failed to save sitemap definition");
    }
  };

  const handleDeleteSitemapDef = async (index: number) => {
    const updated = sitemaps.filter((_, i) => i !== index);
    setSitemaps(updated);
    try {
      await persistSettings({ sitemaps: updated });
      setInitialSitemaps(updated);
    } catch (err) {
      console.error("Failed to delete sitemap definition:", err);
      notifyError("Failed to delete sitemap definition");
    }
  };

  const handleSaveCollectionType = async (data: CollectionTypeConfig) => {
    const updatedCollectionTypes = upsertAtIndex(
      collectionTypes,
      editingCollectionIndex,
      data
    );
    setCollectionTypes(updatedCollectionTypes);
    setIsCollectionModalOpen(false);
    setEditingCollectionIndex(null);

    try {
      await persistSettings({ collectionTypes: updatedCollectionTypes });
    } catch (err) {
      console.error("Failed to save collection types:", err);
      notifyError("Failed to save collection types");
    }
  };

  const handleDeleteCollectionType = async (index: number) => {
    const updatedCollectionTypes = collectionTypes.filter(
      (_, i) => i !== index
    );
    const updatedSitemaps = remapSitemapIndicesAfterDelete(sitemaps, index);
    setCollectionTypes(updatedCollectionTypes);
    setSitemaps(updatedSitemaps);

    try {
      await persistSettings({
        collectionTypes: updatedCollectionTypes,
        sitemaps: updatedSitemaps,
      });
      setInitialSitemaps(updatedSitemaps);
    } catch (err) {
      console.error("Failed to delete collection type:", err);
      notifyError("Failed to delete collection type");
    }
  };

  const handleSaveCustomURL = async (data: CustomURLConfig) => {
    const updatedCustomURLs = upsertAtIndex(
      customURLs,
      editingCustomIndex,
      data
    );
    setCustomURLs(updatedCustomURLs);
    setIsCustomURLModalOpen(false);
    setEditingCustomIndex(null);

    try {
      await persistSettings({ customURLs: updatedCustomURLs });
    } catch (err) {
      console.error("Failed to save custom URLs:", err);
      notifyError("Failed to save custom URLs");
    }
  };

  const handleDeleteCustomURL = async (index: number) => {
    const updatedCustomURLs = customURLs.filter((_, i) => i !== index);
    setCustomURLs(updatedCustomURLs);

    try {
      await persistSettings({ customURLs: updatedCustomURLs });
    } catch (err) {
      console.error("Failed to delete custom URL:", err);
      notifyError("Failed to delete custom URL");
    }
  };

  const tabCountLabel = (id: string, fallback: string, count: number) =>
    `${tr(id, fallback)} (${count})`;

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Box paddingBottom={4}>
          <Flex
            justifyContent="space-between"
            alignItems="center"
            wrap="wrap"
            gap={4}
          >
            <Box>
              <Typography variant="alpha" tag="h1">
                {tr("settings.title", "Sitemap")}
              </Typography>
              <Typography variant="epsilon" textColor="neutral600" tag="p">
                {tr(
                  "settings.subtitle",
                  "Settings for the XML sitemap and sitemap index"
                )}
              </Typography>
            </Box>
            <Button
              variant="secondary"
              onClick={() => window.open("/api/sitemap/sitemap.xml", "_blank")}
            >
              {tr("settings.showSitemap", "Show Sitemap")}
            </Button>
          </Flex>
        </Box>

        <Tabs.Root defaultValue="general">
          <Tabs.List aria-label={tr("settings.title", "Sitemap")}>
            <Tabs.Trigger value="general">
              {tr("settings.tabs.general", "General & Sitemap Index")}
            </Tabs.Trigger>
            <Tabs.Trigger value="collection-types">
              {tabCountLabel(
                "settings.collectionTypes.title",
                "Collection Types",
                collectionTypes.length
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="custom-urls">
              {tabCountLabel(
                "settings.customUrls.title",
                "Custom URLs",
                customURLs.length
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="excluded-urls">
              {tabCountLabel(
                "settings.excludedUrls.title",
                "Excluded URLs",
                excludedUrls.length
              )}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="general">
            <Box paddingTop={4}>
              <BaseUrlSection
                baseUrl={baseUrl}
                isModified={isUrlModified}
                onChange={setBaseUrl}
                onSave={handleSaveBaseUrl}
              />

              <SitemapIndexSection
                useSitemapIndex={useSitemapIndex}
                setUseSitemapIndex={setUseSitemapIndex}
                sitemaps={sitemaps}
                isSitemapSettingsModified={isSitemapSettingsModified}
                onSaveSitemapSettings={handleSaveSitemapSettings}
                onAddSitemap={() => {
                  setEditingSitemapIndex(null);
                  setIsSitemapModalOpen(true);
                }}
                onEditSitemap={(idx) => {
                  setEditingSitemapIndex(idx);
                  setIsSitemapModalOpen(true);
                }}
                onDeleteSitemap={handleDeleteSitemapDef}
              />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="collection-types">
            <Box paddingTop={4}>
              <CollectionTypesSection
                collectionTypes={collectionTypes}
                onAddCollectionType={() => {
                  setEditingCollectionIndex(null);
                  setIsCollectionModalOpen(true);
                }}
                onEditCollectionType={(idx) => {
                  setEditingCollectionIndex(idx);
                  setIsCollectionModalOpen(true);
                }}
                onDeleteCollectionType={handleDeleteCollectionType}
              />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="custom-urls">
            <Box paddingTop={4}>
              <CustomUrlsSection
                customURLs={customURLs}
                onAddCustomUrl={() => {
                  setEditingCustomIndex(null);
                  setIsCustomURLModalOpen(true);
                }}
                onEditCustomUrl={(idx) => {
                  setEditingCustomIndex(idx);
                  setIsCustomURLModalOpen(true);
                }}
                onDeleteCustomUrl={handleDeleteCustomURL}
              />
            </Box>
          </Tabs.Content>

          <Tabs.Content value="excluded-urls">
            <Box paddingTop={4}>
              <ExcludedUrlsSection
                excludedUrls={excludedUrls}
                newExcludedPath={newExcludedPath}
                setNewExcludedPath={setNewExcludedPath}
                isExcludedUrlsModified={isExcludedUrlsModified}
                onAddExcludedUrl={handleAddExcludedUrl}
                onDeleteExcludedUrl={handleDeleteExcludedUrl}
                onSaveExcludedUrls={handleSaveExcludedUrls}
              />
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Box>

      <CollectionTypeModal
        isOpen={isCollectionModalOpen}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setEditingCollectionIndex(null);
        }}
        onSave={handleSaveCollectionType}
        existingData={
          editingCollectionIndex !== null
            ? collectionTypes[editingCollectionIndex]
            : null
        }
      />

      <CustomURLModal
        isOpen={isCustomURLModalOpen}
        onClose={() => {
          setIsCustomURLModalOpen(false);
          setEditingCustomIndex(null);
        }}
        onSave={handleSaveCustomURL}
        existingData={
          editingCustomIndex !== null ? customURLs[editingCustomIndex] : null
        }
      />

      <SitemapDefinitionModal
        isOpen={isSitemapModalOpen}
        onClose={() => {
          setIsSitemapModalOpen(false);
          setEditingSitemapIndex(null);
        }}
        onSave={handleSaveSitemapDef}
        existingDef={
          editingSitemapIndex !== null ? sitemaps[editingSitemapIndex] : null
        }
        collectionTypes={collectionTypes}
      />
    </Main>
  );
};

export default Settings;
