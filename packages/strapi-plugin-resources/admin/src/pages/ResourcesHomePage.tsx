import { useIntl } from 'react-intl';
import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Field,
  Flex,
  Main,
  SingleSelect,
  SingleSelectOption,
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

const CARD_BORDER_STYLE: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
};

const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '0.88em',
  padding: '2px 6px',
  borderRadius: 4,
  background: 'rgba(128, 128, 128, 0.16)',
  border: '1px solid rgba(128, 128, 128, 0.25)',
};

export const ResourcesHomePage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
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
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          paddingBottom={4}
          wrap="wrap"
          gap={4}
        >
          <Box>
            <Typography variant="alpha" tag="h1">{t('page.ui.resources_media_galleries_glossary', 'Resources, Media Galleries & Glossary')}</Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Powered by Strapi v5 Native Media Library (
              <code style={INLINE_CODE_STYLE}>plugin::upload.file</code> &amp;{' '}
              <code style={INLINE_CODE_STYLE}>plugin::upload.folder</code>)
            </Typography>
          </Box>
          <Flex gap={2} wrap="wrap">
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
            <Box
              padding={5}
              marginBottom={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={CARD_BORDER_STYLE}
            >
              <Typography variant="delta" tag="h2" fontWeight="bold">{t('page.ui.add_digital_library_publication_media_library_pd', 'Add Digital Library Publication (Media Library PDF / eBook)')}</Typography>
              <Box
                paddingTop={3}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 14,
                  alignItems: 'end',
                }}
              >
                <Field.Root required>
                  <Field.Label>{t('field.publication_title', 'Publication Title')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_gu_a_de_bienvenida_a_la_mezquita_pdf', 'e.g., Mosque Welcome Guide (PDF)')}
                    value={pubTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPubTitle(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.display_title_shown_in_the_public_digital_librar', 'Display title shown in the public Digital Library.')}</Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.publication_category', 'Publication Category')}</Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.select_category', 'Select category')}
                    value={pubCategory}
                    onChange={(val: string | number) => setPubCategory(String(val))}
                  >
                    <SingleSelectOption value="guide">{t('page.ui.guide_visitor_prayer_guide', 'guide (Visitor & Prayer Guide)')}</SingleSelectOption>
                    <SingleSelectOption value="book">{t('page.ui.book_ebook_treatise', 'book (eBook / Treatise)')}</SingleSelectOption>
                    <SingleSelectOption value="press_kit">{t('page.ui.press_kit_press_media_kit', 'press_kit (Press & Media Kit)')}</SingleSelectOption>
                  </SingleSelect>
                  <Field.Hint>{t('page.ui.used_for_filtering_publications_on_the_public_po', 'Used for filtering publications on the public portal.')}</Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.media_folder_path', 'Media Folder Path')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_resources_publications', 'e.g., /resources/publications')}
                    value={pubFolderPath}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPubFolderPath(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.target_folder_path_in_strapi_media_library', 'Target folder path in Strapi Media Library.')}</Field.Hint>
                </Field.Root>
                <Field.Root required>
                  <Field.Label>{t('field.summary_abstract', 'Summary / Abstract')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_introducci_n_a_la_historia_horarios_y_etique', 'e.g., Introduction to mosque history, schedule, and visitor etiquette...')}
                    value={pubSummary}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPubSummary(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.short_description_displayed_on_the_download_card', 'Short description displayed on the download card.')}</Field.Hint>
                </Field.Root>
                <Button onClick={handleCreatePublication}>{t('page.ui.create_publication', 'Create Publication')}</Button>
              </Box>
            </Box>

            <Table colCount={5} rowCount={publications.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('page.ui.title', 'Title')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.category', 'Category')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.media_library_asset', 'Media Library Asset')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.secondary_date', 'Secondary Date')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.downloads', 'Downloads')}</Typography></Th>
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
            <Box
              padding={5}
              marginBottom={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={CARD_BORDER_STYLE}
            >
              <Typography variant="delta" tag="h2" fontWeight="bold">
                Create Photo Gallery Album (Linked to{' '}
                <code style={INLINE_CODE_STYLE}>plugin::upload.folder</code>)
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                Detected Media Library Folders: {mediaFolders.length}
              </Typography>
              <Box
                paddingTop={3}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 14,
                  alignItems: 'end',
                }}
              >
                <Field.Root required>
                  <Field.Label>{t('field.album_title', 'Album Title')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_arquitectura_y_caligraf_a_de_la_mezquita', 'e.g., Mosque Architecture & Calligraphy')}
                    value={albumTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlbumTitle(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.public_album_title_displayed_in_the_gallery_grid', 'Public album title displayed in the gallery grid.')}</Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.gallery_category', 'Gallery Category')}</Field.Label>
                  <SingleSelect
                    placeholder={t('placeholder.select_category', 'Select category')}
                    value={albumCategory}
                    onChange={(val: string | number) => setAlbumCategory(String(val))}
                  >
                    <SingleSelectOption value="architecture">{t('page.ui.architecture_architecture_calligraphy', 'architecture (Architecture & Calligraphy)')}</SingleSelectOption>
                    <SingleSelectOption value="ramadan_eid">{t('page.ui.ramadan_eid_ramadan_eid_gatherings', 'ramadan_eid (Ramadan & Eid Gatherings)')}</SingleSelectOption>
                    <SingleSelectOption value="community">{t('page.ui.community_community_education', 'community (Community & Education)')}</SingleSelectOption>
                  </SingleSelect>
                  <Field.Hint>{t('page.ui.thematic_classification_for_the_gallery_album', 'Thematic classification for the gallery album.')}</Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.media_folder_path', 'Media Folder Path')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_resources_galleries_architecture', 'e.g., /resources/galleries/architecture')}
                    value={albumFolderPath}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlbumFolderPath(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.strapi_media_library_folder_synced_into_this_alb', 'Strapi Media Library folder synced into this album.')}</Field.Hint>
                </Field.Root>
                <Field.Root required>
                  <Field.Label>{t('field.album_description', 'Album Description')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_recorrido_fotogr_fico_por_el_sal_n_de_oraci_', 'e.g., Photo tour of the main prayer hall and mihrab...')}
                    value={albumDesc}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlbumDesc(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.caption_summary_shown_beneath_the_album_header', 'Caption summary shown beneath the album header.')}</Field.Hint>
                </Field.Root>
                <Button onClick={handleCreateAlbum}>{t('page.ui.create_album', 'Create Album')}</Button>
              </Box>
            </Box>

            <Table colCount={5} rowCount={galleries.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('page.ui.album', 'Album')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.category', 'Category')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.media_folder_path', 'Media Folder Path')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.photos', 'Photos')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.sync_media_folder', 'Sync Media Folder')}</Typography></Th>
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
                      <Button variant="secondary" size="S" onClick={() => handleSyncAlbumFolder(album.documentId)}>{t('page.ui.sync_from_media_library', 'Sync from Media Library')}</Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {activeTab === 'glossary' && (
          <Box paddingTop={6}>
            <Box
              padding={5}
              marginBottom={6}
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              style={CARD_BORDER_STYLE}
            >
              <Typography variant="delta" tag="h2" fontWeight="bold">{t('page.ui.add_glossary_term_a_z_index_optional_audio_pronu', 'Add Glossary Term (A-Z Index + Optional Audio Pronunciation)')}</Typography>
              <Box
                paddingTop={3}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 14,
                  alignItems: 'end',
                }}
              >
                <Field.Root required>
                  <Field.Label>{t('field.term', 'Term')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_mihrab', 'e.g., Mihrab')}
                    value={termName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermName(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.primary_term_indexed_a_z_in_the_public_glossary', 'Primary term indexed A–Z in the public glossary.')}</Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.native_script_arabic', 'Native Script (Arabic)')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g', 'e.g., مِحْرَاب')}
                    value={termScript}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermScript(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.original_arabic_script_with_optional_tashkeel', 'Original Arabic script with optional tashkeel.')}</Field.Hint>
                </Field.Root>
                <Field.Root>
                  <Field.Label>{t('field.transliteration', 'Transliteration')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_mi_r_b', 'e.g., Miḥrāb')}
                    value={termTranslit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermTranslit(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.phonetic_latin_transliteration_for_pronunciation', 'Phonetic Latin transliteration for pronunciation.')}</Field.Hint>
                </Field.Root>
                <Field.Root required>
                  <Field.Label>{t('field.definition', 'Definition')}</Field.Label>
                  <TextInput
                    placeholder={t('placeholder.e_g_nicho_semicircular_en_el_muro_de_la_qibla_qu', 'e.g., Semicircular niche in the Qibla wall indicating the direction of Makkah.')}
                    value={termDefinition}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermDefinition(e.target.value)}
                  />
                  <Field.Hint>{t('page.ui.clear_explanation_displayed_in_glossary_tooltips', 'Clear explanation displayed in glossary tooltips and cards.')}</Field.Hint>
                </Field.Root>
                <Button onClick={handleCreateTerm}>{t('page.ui.add_term', 'Add Term')}</Button>
              </Box>
            </Box>

            <Table colCount={4} rowCount={glossary.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('page.ui.letter', 'Letter')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.term', 'Term')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.native_script', 'Native Script')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('page.ui.definition', 'Definition')}</Typography></Th>
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
