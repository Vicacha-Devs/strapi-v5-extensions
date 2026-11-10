import {
  Box,
  Button,
  Divider,
  Flex,
  Main,
  Tabs,
  Typography,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import * as React from "react";

import {
  DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS,
  PLUGIN_ID,
  type GalleryAlbumRecord,
  type GlossaryTermRecord,
  type MediaLibraryAsset,
  type PublicationRecord,
} from "../../../shared";
import { GlossaryTab } from "../components/resources/GlossaryTab";
import { PhotoGalleriesTab } from "../components/resources/PhotoGalleriesTab";
import { PublicationsTab } from "../components/resources/PublicationsTab";
import { useResourcesTranslation } from "../components/resources/uploadHelper";

type ActiveTab = "publications" | "galleries" | "glossary";

export const ResourcesHomePage: React.FC = () => {
  const { t } = useResourcesTranslation();
  const { get, post, put, del } = useFetchClient();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("publications");
  const [publications, setPublications] = React.useState<PublicationRecord[]>(
    []
  );
  const [galleries, setGalleries] = React.useState<GalleryAlbumRecord[]>([]);
  const [glossary, setGlossary] = React.useState<GlossaryTermRecord[]>([]);
  const [mediaFiles, setMediaFiles] = React.useState<MediaLibraryAsset[]>([]);
  const [allowedDownloadExtensions, setAllowedDownloadExtensions] =
    React.useState<string[]>(DEFAULT_ALLOWED_DOWNLOAD_EXTENSIONS);
  const [autoSyncMediaFolders, setAutoSyncMediaFolders] =
    React.useState<boolean>(true);
  const [statusMessage, setStatusMessage] = React.useState<string>("");
  const [statusIsError, setStatusIsError] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<string>("");

  const isMountedRef = React.useRef(true);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleStatusMessage = React.useCallback(
    (msg: string, isError = false) => {
      if (!isMountedRef.current) return;
      setStatusMessage(msg);
      setStatusIsError(isError);
    },
    []
  );

  const loadHub = React.useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await get(`/${PLUGIN_ID}/hub`, {
        signal: controller.signal,
      });
      if (!isMountedRef.current || controller.signal.aborted) return;

      const payload = res?.data?.data;
      setLoadError("");
      if (payload) {
        setPublications(payload.publications || []);
        setGalleries(payload.galleries || []);
        setGlossary(payload.glossary || []);
        setMediaFiles(payload.mediaFiles || []);
        const cfgExts = payload.settings?.allowedDownloadExtensions;
        if (Array.isArray(cfgExts) && cfgExts.length > 0) {
          setAllowedDownloadExtensions(cfgExts);
        }
        if (typeof payload.settings?.autoSyncMediaFolders === "boolean") {
          setAutoSyncMediaFolders(payload.settings.autoSyncMediaFolders);
        }
      }
    } catch (err) {
      if (!isMountedRef.current || controller.signal.aborted) return;
      const errMsg =
        err instanceof Error && err.message
          ? err.message
          : t("common.load_failed", "Failed to load catalog data.");
      setLoadError(errMsg);
    }
  }, [get, t]);

  React.useEffect(() => {
    void loadHub();
  }, [loadHub]);

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Flex
          justifyContent="space-between"
          alignItems="center"
          paddingBottom={5}
          wrap="wrap"
          gap={4}
        >
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="alpha" tag="h1">
              {t(
                "page.ui.resources_media_galleries_glossary",
                "Resources, Media Galleries & Glossary"
              )}
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              {t(
                "page.ui.hub_subtitle",
                "Manage downloadable PDFs, photo albums, and glossary terms — or click Edit to open any entry in Content Manager."
              )}
            </Typography>
          </Flex>
        </Flex>

        {loadError && (
          <Box
            padding={4}
            marginBottom={5}
            background="danger100"
            hasRadius
            role="alert"
          >
            <Flex justifyContent="space-between" alignItems="center" gap={3}>
              <Typography
                variant="omega"
                fontWeight="bold"
                textColor="danger700"
              >
                {loadError}
              </Typography>
              <Button
                size="S"
                variant="secondary"
                onClick={() => void loadHub()}
              >
                {t("common.retry", "Retry")}
              </Button>
            </Flex>
          </Box>
        )}

        {statusMessage && (
          <Box
            padding={4}
            marginBottom={5}
            background={statusIsError ? "danger100" : "primary100"}
            hasRadius
            role={statusIsError ? "alert" : "status"}
          >
            <Flex justifyContent="space-between" alignItems="center" gap={3}>
              <Typography
                variant="omega"
                fontWeight="bold"
                textColor={statusIsError ? "danger700" : undefined}
              >
                {statusMessage}
              </Typography>
              <Button
                size="S"
                variant="tertiary"
                onClick={() => setStatusMessage("")}
              >
                {t("page.ui.dismiss", "Dismiss")}
              </Button>
            </Flex>
          </Box>
        )}

        <Divider />

        <Box paddingTop={4}>
          <Tabs.Root
            value={activeTab}
            onValueChange={(nextTab: string) =>
              setActiveTab(nextTab as ActiveTab)
            }
            variant="simple"
          >
            <Tabs.List
              aria-label={t(
                "page.ui.resources_media_galleries_glossary",
                "Resources, Media Galleries & Glossary"
              )}
            >
              <Tabs.Trigger value="publications">
                {t("page.ui.tab_publications", "Publications")} (
                {publications.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="galleries">
                {t("page.ui.tab_photo_galleries", "Photo Galleries")} (
                {galleries.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="glossary">
                {t("page.ui.tab_glossary", "Glossary")} ({glossary.length})
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="publications">
              <PublicationsTab
                publications={publications}
                mediaFiles={mediaFiles}
                allowedDownloadExtensions={allowedDownloadExtensions}
                post={post}
                put={put}
                del={del}
                onStatusMessage={handleStatusMessage}
                onReload={loadHub}
              />
            </Tabs.Content>

            <Tabs.Content value="galleries">
              <PhotoGalleriesTab
                galleries={galleries}
                mediaFiles={mediaFiles}
                autoSyncMediaFolders={autoSyncMediaFolders}
                post={post}
                put={put}
                del={del}
                onStatusMessage={handleStatusMessage}
                onReload={loadHub}
              />
            </Tabs.Content>

            <Tabs.Content value="glossary">
              <GlossaryTab
                glossary={glossary}
                mediaFiles={mediaFiles}
                post={post}
                put={put}
                del={del}
                onStatusMessage={handleStatusMessage}
                onReload={loadHub}
              />
            </Tabs.Content>
          </Tabs.Root>
        </Box>
      </Box>
    </Main>
  );
};

export default ResourcesHomePage;
