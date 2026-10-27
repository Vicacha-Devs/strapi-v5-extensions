import { useIntl } from 'react-intl';
import * as React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  Main,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID, type ResourcesPluginSettings } from '../../../shared';

const SUB_CARD_BORDER_STYLE: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.18)',
};

const INLINE_CODE_STYLE: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '0.88em',
  padding: '2px 6px',
  borderRadius: 4,
  background: 'rgba(128, 128, 128, 0.16)',
  border: '1px solid rgba(128, 128, 128, 0.25)',
};

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage });
  const { get, put } = useFetchClient();
  const [settings, setSettings] =
    React.useState<ResourcesPluginSettings | null>(null);
  const [savedNotice, setSavedNotice] = React.useState<string>('');

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await get(`/${PLUGIN_ID}/settings`);
        if (res?.data?.data) {
          setSettings(res.data.data);
        }
      } catch {
        // Ignore in unmounted mode
      }
    };
    void fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, settings);
      if (res?.data?.data) {
        setSettings(res.data.data);
        setSavedNotice('Resources & Media Library settings saved.');
      }
    } catch (err) {
      setSavedNotice(`Error saving settings: ${(err as Error).message}`);
    }
  };

  if (!settings) {
    return (
      <Main>
        <Box padding={8}>
          <Typography>{t('settings.ui.loading_resources_media_library_settings', 'Loading Resources & Media Library settings...')}</Typography>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4} wrap="wrap" gap={4}>
          <Box>
            <Typography variant="alpha" tag="h1">{t('settings.ui.resources_media_library_settings', 'Resources & Media Library Settings')}</Typography>
            <Typography variant="epsilon" textColor="neutral600">{t('settings.ui.configure_strapi_v5_media_library_folder_default', 'Configure Strapi v5 Media Library folder defaults and responsive CDN transforms.')}</Typography>
          </Box>
          <Button onClick={handleSave}>{t('settings.ui.save_settings', 'Save Settings')}</Button>
        </Flex>

        {savedNotice && (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography fontWeight="bold" textColor="success700">
              {savedNotice}
            </Typography>
          </Box>
        )}

        <Divider />

        <Box paddingTop={6}>
          <Tabs.Root defaultValue="folders">
            <Tabs.List aria-label={t('settings.ui.resources_media_library_settings', 'Resources Settings')}>
              <Tabs.Trigger value="folders">
                {t('settings.tab.folders', 'Media Library Folders & Organization')}
              </Tabs.Trigger>
              <Tabs.Trigger value="optimization">
                {t('settings.tab.optimization', 'CDN Optimization & Folder Sync')}
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="folders">
              <Box
                padding={6}
                background="neutral0"
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Box marginBottom={4}>
                  <Typography variant="delta" tag="h2" fontWeight="bold">
                    {t('settings.ui.1_media_library_folders_calendar_formatting', 'Media Library Folders & Organization')}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Default folder hierarchy in Strapi Media Library (
                    <code style={INLINE_CODE_STYLE}>plugin::upload.folder</code>).
                  </Typography>
                </Box>

                <Box
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 20,
                  }}
                >
                  <Field.Root>
                    <Field.Label>{t('field.organization_name', 'Organization Name')}</Field.Label>
                    <TextInput
                      placeholder={t('placeholder.e_g_mezquita_central_al_qurtubi_de_bogot', 'e.g., Central Mosque of Bogotá')}
                      value={settings.organizationName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({ ...settings, organizationName: e.target.value })
                      }
                    />
                    <Field.Hint>{t('settings.ui.displayed_on_downloadable_pdf_covers_press_kits_', 'Displayed on downloadable PDF covers, press kits, and gallery metadata.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>{t('field.default_publications_media_folder_path', 'Default Publications Media Folder Path')}</Field.Label>
                    <TextInput
                      placeholder={t('placeholder.e_g_resources_publications', 'e.g., /resources/publications')}
                      value={settings.defaultPublicationsFolderPath}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({
                          ...settings,
                          defaultPublicationsFolderPath: e.target.value,
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.default_strapi_media_library_folder_where_pdf_gu', 'Default Strapi Media Library folder where PDF guides and eBooks are organized.')}</Field.Hint>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>{t('field.default_galleries_media_folder_path', 'Default Galleries Media Folder Path')}</Field.Label>
                    <TextInput
                      placeholder={t('placeholder.e_g_resources_galleries', 'e.g., /resources/galleries')}
                      value={settings.defaultGalleriesFolderPath}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettings({
                          ...settings,
                          defaultGalleriesFolderPath: e.target.value,
                        })
                      }
                    />
                    <Field.Hint>{t('settings.ui.root_strapi_media_library_folder_scanned_when_sy', 'Root Strapi Media Library folder scanned when syncing photo gallery albums.')}</Field.Hint>
                  </Field.Root>
                </Box>
              </Box>
            </Tabs.Content>

            <Tabs.Content value="optimization">
              <Box
                padding={6}
                background="neutral0"
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Box marginBottom={4}>
                  <Typography variant="delta" tag="h2" fontWeight="bold">
                    {t('settings.tab.optimization', 'CDN Optimization & Folder Sync')}
                  </Typography>
                </Box>

                <Box
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 16,
                  }}
                >
                  <Box
                    padding={4}
                    background="neutral100"
                    hasRadius
                    style={SUB_CARD_BORDER_STYLE}
                  >
                    <Checkbox
                      checked={settings.enableCloudinaryOptimization}
                      onCheckedChange={(checked: boolean) =>
                        setSettings({
                          ...settings,
                          enableCloudinaryOptimization: Boolean(checked),
                        })
                      }
                    >
                      {t(
                        'checkbox.enable_automatic_cloudinary_prefix',
                        'Enable automatic Cloudinary'
                      )}{' '}
                      <code style={INLINE_CODE_STYLE}>f_auto</code>,{' '}
                      <code style={INLINE_CODE_STYLE}>q_auto</code>{' '}
                      {t(
                        'checkbox.optimization_for_media_library_urls',
                        'optimization for Media Library URLs'
                      )}
                    </Checkbox>
                    <Box paddingTop={2}>
                      <Typography variant="pi" textColor="neutral600">
                        Automatically rewrites Cloudinary (
                        <code style={INLINE_CODE_STYLE}>f_auto</code>,{' '}
                        <code style={INLINE_CODE_STYLE}>q_auto</code>) and Strapi
                        responsive image formats for gallery thumbnails.
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    padding={4}
                    background="neutral100"
                    hasRadius
                    style={SUB_CARD_BORDER_STYLE}
                  >
                    <Checkbox
                      checked={settings.autoSyncMediaFolders}
                      onCheckedChange={(checked: boolean) =>
                        setSettings({
                          ...settings,
                          autoSyncMediaFolders: Boolean(checked),
                        })
                      }
                    >
                      One-Click Media Folder Sync (
                      <code style={INLINE_CODE_STYLE}>plugin::upload.folder</code>)
                    </Checkbox>
                    <Box paddingTop={2}>
                      <Typography variant="pi" textColor="neutral600">{t('settings.ui.allows_editors_to_synchronize_all_photos_inside_', 'Allows editors to synchronize all photos inside a Strapi v5 Media Library folder directly into an album.')}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
