import {
  Box,
  Button,
  Divider,
  Flex,
  Main,
  Typography,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import * as React from "react";

import {
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
  const [statusMessage, setStatusMessage] = React.useState<string>("");

  const loadHub = React.useCallback(async () => {
    try {
      const res = await get(`/${PLUGIN_ID}/hub`);
      const payload = res?.data?.data;
      if (payload) {
        setPublications(payload.publications || []);
        setGalleries(payload.galleries || []);
        setGlossary(payload.glossary || []);
        setMediaFiles(payload.mediaFiles || []);
      }
    } catch {
      // Unmounted or test state
    }
  }, [get]);

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
          <Flex gap={2} wrap="wrap">
            <Button
              variant={activeTab === "publications" ? "default" : "tertiary"}
              onClick={() => setActiveTab("publications")}
            >
              {t("page.ui.tab_publications", "Publications")} (
              {publications.length})
            </Button>
            <Button
              variant={activeTab === "galleries" ? "default" : "tertiary"}
              onClick={() => setActiveTab("galleries")}
            >
              {t("page.ui.tab_photo_galleries", "Photo Galleries")} (
              {galleries.length})
            </Button>
            <Button
              variant={activeTab === "glossary" ? "default" : "tertiary"}
              onClick={() => setActiveTab("glossary")}
            >
              {t("page.ui.tab_glossary", "Glossary")} ({glossary.length})
            </Button>
          </Flex>
        </Flex>

        {statusMessage && (
          <Box padding={4} marginBottom={5} background="primary100" hasRadius>
            <Flex justifyContent="space-between" alignItems="center" gap={3}>
              <Typography variant="omega" fontWeight="bold">
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

        {activeTab === "publications" && (
          <PublicationsTab
            publications={publications}
            mediaFiles={mediaFiles}
            post={post}
            put={put}
            del={del}
            onStatusMessage={setStatusMessage}
            onReload={loadHub}
          />
        )}

        {activeTab === "galleries" && (
          <PhotoGalleriesTab
            galleries={galleries}
            mediaFiles={mediaFiles}
            post={post}
            put={put}
            del={del}
            onStatusMessage={setStatusMessage}
            onReload={loadHub}
          />
        )}

        {activeTab === "glossary" && (
          <GlossaryTab
            glossary={glossary}
            mediaFiles={mediaFiles}
            post={post}
            put={put}
            del={del}
            onStatusMessage={setStatusMessage}
            onReload={loadHub}
          />
        )}
      </Box>
    </Main>
  );
};

export default ResourcesHomePage;
