import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Main,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import {
  PLUGIN_ID,
  type GalleryAlbumRecord,
  type GlossaryTermRecord,
  type MediaLibraryFolderSummary,
  type PublicationRecord,
} from '../../../shared';

type ActiveTab = 'publications' | 'galleries' | 'glossary';

export const ResourcesHomePage: React.FC = () => {
  const { get, post } = useFetchClient();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('publications');
  const [publications, setPublications] = React.useState<PublicationRecord[]>([]);
  const [galleries, setGalleries] = React.useState<GalleryAlbumRecord[]>([]);
  const [glossary, setGlossary] = React.useState<GlossaryTermRecord[]>([]);
  const [mediaFolders, setMediaFolders] = React.useState<MediaLibraryFolderSummary[]>([]);
  const [statusMessage, setStatusMessage] = React.useState<string>('');

  const [pubTitle, setPubTitle] = React.useState('');
  const [pubSummary, setPubSummary] = React.useState('');
  const [pubCategory, setPubCategory] = React.useState('guide');
  const [pubFolderPath, setPubFolderPath] = React.useState('/resources/publications');

  const [albumTitle, setAlbumTitle] = React.useState('');
  const [albumDesc, setAlbumDesc] = React.useState('');
  const [albumCategory, setAlbumCategory] = React.useState('architecture');
  const [albumFolderPath, setAlbumFolderPath] = React.useState('/resources/galleries/architecture');

  const [termName, setTermName] = React.useState('');
  const [termScript, setTermScript] = React.useState('');
  const [termTranslit, setTermTranslit] = React.useState('');
  const [termDefinition, setTermDefinition] = React.useState('');

  const loadHub = async () => {
    try {
      const res = await get(`/${PLUGIN_ID}/hub`);
      const payload = res?.data?.data;
      if (payload) {
        setPublications(payload.publications || []);
        setGalleries(payload.galleries || []);
        setGlossary(payload.glossary || []);
        setMediaFolders(payload.mediaFolders || []);
      }
    } catch {
      // Unmounted or test state
    }
  };

  React.useEffect(() => {
    void loadHub();
  }, []);

  const handleCreatePublication = async () => {
    if (!pubTitle.trim() || !pubSummary.trim()) {
      setStatusMessage('Title and summary are required to create a publication.');
      return;
    }
    try {
      await post(`/${PLUGIN_ID}/publications`, {
        title: pubTitle,
        summary: pubSummary,
        category: pubCategory,
        mediaFolderPath: pubFolderPath,
        featured: true,
        allowPublicDownload: true,
      });
      setPubTitle('');
      setPubSummary('');
      setStatusMessage('Publication created and linked to Strapi Media Library.');
      await loadHub();
    } catch (err) {
      setStatusMessage(`Failed to create publication: ${(err as Error).message}`);
    }
  };

  const handleCreateAlbum = async () => {
    if (!albumTitle.trim() || !albumDesc.trim()) {
      setStatusMessage('Album title and description are required.');
      return;
    }
    try {
      await post(`/${PLUGIN_ID}/galleries`, {
        title: albumTitle,
        description: albumDesc,
        category: albumCategory,
        mediaFolderPath: albumFolderPath,
        featured: true,
      });
      setAlbumTitle('');
      setAlbumDesc('');
      setStatusMessage('Gallery album created. Sync photos from its Strapi Media Library folder.');
      await loadHub();
    } catch (err) {
      setStatusMessage(`Failed to create album: ${(err as Error).message}`);
    }
  };

  const handleSyncAlbumFolder = async (documentId?: string) => {
    if (!documentId) return;
    try {
      const res = await post(
        `/${PLUGIN_ID}/galleries/${encodeURIComponent(documentId)}/sync-media-folder`,
        {}
      );
      const count = res?.data?.data?.photoCount ?? 0;
      setStatusMessage(`Synced ${count} image(s) from Strapi Media Library (plugin::upload.folder).`);
      await loadHub();
    } catch (err) {
      setStatusMessage(`Folder sync failed: ${(err as Error).message}`);
    }
  };

  const handleCreateTerm = async () => {
    if (!termName.trim() || !termDefinition.trim()) {
      setStatusMessage('Term and definition are required.');
      return;
    }
    try {
      await post(`/${PLUGIN_ID}/glossary`, {
        term: termName,
        nativeScript: termScript,
        transliteration: termTranslit,
        definition: termDefinition,
        category: 'worship',
        featured: true,
      });
      setTermName('');
      setTermScript('');
      setTermTranslit('');
      setTermDefinition('');
      setStatusMessage('Glossary term added.');
      await loadHub();
    } catch (err) {
      setStatusMessage(`Failed to create term: ${(err as Error).message}`);
    }
  };

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
          <Box>
            <Typography variant="alpha" tag="h1">
              Resources, Media Galleries & Glossary
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Powered by Strapi v5 Native Media Library (plugin::upload.file & plugin::upload.folder)
            </Typography>
          </Box>
          <Flex gap={2}>
            <Button
              variant={activeTab === 'publications' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('publications')}
            >
              Publications ({publications.length})
            </Button>
            <Button
              variant={activeTab === 'galleries' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('galleries')}
            >
              Photo Galleries ({galleries.length})
            </Button>
            <Button
              variant={activeTab === 'glossary' ? 'default' : 'tertiary'}
              onClick={() => setActiveTab('glossary')}
            >
              Glossary ({glossary.length})
            </Button>
          </Flex>
        </Flex>

        {statusMessage && (
          <Box padding={3} marginBottom={4} background="primary100" hasRadius>
            <Typography variant="omega" fontWeight="bold">
              {statusMessage}
            </Typography>
          </Box>
        )}

        <Divider />

        {activeTab === 'publications' && (
          <Box paddingTop={6}>
            <Box padding={4} marginBottom={6} background="neutral0" hasRadius shadow="filterShadow">
              <Typography variant="delta" tag="h2">
                Add Digital Library Publication (Media Library PDF / eBook)
              </Typography>
              <Flex gap={3} paddingTop={3} wrap="wrap">
                <TextInput
                  placeholder="Title"
                  value={pubTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPubTitle(e.target.value)}
                />
                <TextInput
                  placeholder="Category (guide, book, press_kit)"
                  value={pubCategory}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPubCategory(e.target.value)}
                />
                <TextInput
                  placeholder="Media Folder Path (/resources/publications)"
                  value={pubFolderPath}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPubFolderPath(e.target.value)}
                />
                <TextInput
                  placeholder="Summary"
                  value={pubSummary}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPubSummary(e.target.value)}
                />
                <Button onClick={handleCreatePublication}>Create Publication</Button>
              </Flex>
            </Box>

            <Table colCount={5} rowCount={publications.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Title</Typography></Th>
                  <Th><Typography variant="sigma">Category</Typography></Th>
                  <Th><Typography variant="sigma">Media Library Asset</Typography></Th>
                  <Th><Typography variant="sigma">Secondary Date</Typography></Th>
                  <Th><Typography variant="sigma">Downloads</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {publications.map((pub) => (
                  <Tr key={pub.slug}>
                    <Td><Typography fontWeight="bold">{pub.title}</Typography></Td>
                    <Td><Badge>{pub.category}</Badge></Td>
                    <Td>
                      <Typography variant="omega">
                        {pub.file?.name || pub.mediaFolderPath || 'Attach in Content Manager'}
                      </Typography>
                    </Td>
                    <Td><Typography variant="omega">{pub.secondaryDateFormatted || '—'}</Typography></Td>
                    <Td><Badge>{pub.downloadCount}</Badge></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {activeTab === 'galleries' && (
          <Box paddingTop={6}>
            <Box padding={4} marginBottom={6} background="neutral0" hasRadius shadow="filterShadow">
              <Typography variant="delta" tag="h2">
                Create Photo Gallery Album (Linked to plugin::upload.folder)
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                Detected Media Library Folders: {mediaFolders.length}
              </Typography>
              <Flex gap={3} paddingTop={3} wrap="wrap">
                <TextInput
                  placeholder="Album Title"
                  value={albumTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlbumTitle(e.target.value)}
                />
                <TextInput
                  placeholder="Category (architecture, ramadan_eid, community)"
                  value={albumCategory}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlbumCategory(e.target.value)}
                />
                <TextInput
                  placeholder="Media Folder Path (/resources/galleries/architecture)"
                  value={albumFolderPath}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlbumFolderPath(e.target.value)}
                />
                <TextInput
                  placeholder="Description"
                  value={albumDesc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlbumDesc(e.target.value)}
                />
                <Button onClick={handleCreateAlbum}>Create Album</Button>
              </Flex>
            </Box>

            <Table colCount={5} rowCount={galleries.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Album</Typography></Th>
                  <Th><Typography variant="sigma">Category</Typography></Th>
                  <Th><Typography variant="sigma">Media Folder Path</Typography></Th>
                  <Th><Typography variant="sigma">Photos</Typography></Th>
                  <Th><Typography variant="sigma">Sync Media Folder</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {galleries.map((album) => (
                  <Tr key={album.slug}>
                    <Td><Typography fontWeight="bold">{album.title}</Typography></Td>
                    <Td><Badge>{album.category}</Badge></Td>
                    <Td><Typography variant="omega">{album.mediaFolderPath || '/resources/galleries'}</Typography></Td>
                    <Td><Badge>{album.photoCount}</Badge></Td>
                    <Td>
                      <Button variant="secondary" size="S" onClick={() => handleSyncAlbumFolder(album.documentId)}>
                        Sync from Media Library
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {activeTab === 'glossary' && (
          <Box paddingTop={6}>
            <Box padding={4} marginBottom={6} background="neutral0" hasRadius shadow="filterShadow">
              <Typography variant="delta" tag="h2">
                Add Glossary Term (A-Z Index + Optional Audio Pronunciation)
              </Typography>
              <Flex gap={3} paddingTop={3} wrap="wrap">
                <TextInput
                  placeholder="Term (e.g., Mihrab)"
                  value={termName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermName(e.target.value)}
                />
                <TextInput
                  placeholder="Native Script (مِحْرَاب)"
                  value={termScript}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermScript(e.target.value)}
                />
                <TextInput
                  placeholder="Transliteration (Miḥrāb)"
                  value={termTranslit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermTranslit(e.target.value)}
                />
                <TextInput
                  placeholder="Definition"
                  value={termDefinition}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermDefinition(e.target.value)}
                />
                <Button onClick={handleCreateTerm}>Add Term</Button>
              </Flex>
            </Box>

            <Table colCount={4} rowCount={glossary.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Letter</Typography></Th>
                  <Th><Typography variant="sigma">Term</Typography></Th>
                  <Th><Typography variant="sigma">Native Script</Typography></Th>
                  <Th><Typography variant="sigma">Definition</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {glossary.map((item) => (
                  <Tr key={item.slug}>
                    <Td><Badge>{item.letterGroup}</Badge></Td>
                    <Td><Typography fontWeight="bold">{item.term}</Typography></Td>
                    <Td><Typography variant="omega">{item.nativeScript || '—'}</Typography></Td>
                    <Td><Typography variant="omega">{item.definition}</Typography></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </Main>
  );
};

export default ResourcesHomePage;
