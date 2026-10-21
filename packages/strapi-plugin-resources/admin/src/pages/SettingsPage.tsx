import * as React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Main,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID, type ResourcesPluginSettings } from '../../../shared';

export const SettingsPage: React.FC = () => {
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
          <Typography>Loading Resources & Media Library settings...</Typography>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Typography variant="alpha" tag="h1">
          Resources & Media Library Settings
        </Typography>
        <Typography variant="epsilon" textColor="neutral600">
          Configure Strapi v5 Media Library folder defaults, Cloudinary responsive
          transforms, and secondary liturgical calendar formatting.
        </Typography>

        {savedNotice && (
          <Box padding={3} marginTop={4} background="success100" hasRadius>
            <Typography fontWeight="bold">{savedNotice}</Typography>
          </Box>
        )}

        <Box
          padding={6}
          marginTop={6}
          background="neutral0"
          hasRadius
          shadow="filterShadow"
        >
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Box>
              <Typography variant="pi" fontWeight="bold">
                Organization Name
              </Typography>
              <TextInput
                value={settings.organizationName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({ ...settings, organizationName: e.target.value })
                }
              />
            </Box>

            <Box>
              <Typography variant="pi" fontWeight="bold">
                Secondary Calendar (islamic-umalqura, islamic-civil, hebrew, etc.)
              </Typography>
              <TextInput
                value={settings.secondaryCalendar}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    secondaryCalendar: e.target.value,
                  })
                }
              />
            </Box>

            <Box>
              <Typography variant="pi" fontWeight="bold">
                Default Publications Media Folder Path
              </Typography>
              <TextInput
                value={settings.defaultPublicationsFolderPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    defaultPublicationsFolderPath: e.target.value,
                  })
                }
              />
            </Box>

            <Box>
              <Typography variant="pi" fontWeight="bold">
                Default Galleries Media Folder Path
              </Typography>
              <TextInput
                value={settings.defaultGalleriesFolderPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    defaultGalleriesFolderPath: e.target.value,
                  })
                }
              />
            </Box>

            <Checkbox
              checked={settings.enableCloudinaryOptimization}
              onCheckedChange={(checked: boolean) =>
                setSettings({
                  ...settings,
                  enableCloudinaryOptimization: Boolean(checked),
                })
              }
            >
              Enable automatic Cloudinary f_auto,q_auto optimization for Media
              Library URLs
            </Checkbox>

            <Checkbox
              checked={settings.autoSyncMediaFolders}
              onCheckedChange={(checked: boolean) =>
                setSettings({
                  ...settings,
                  autoSyncMediaFolders: Boolean(checked),
                })
              }
            >
              Enable one-click album synchronization from Strapi v5 Media Library
              folders (plugin::upload.folder)
            </Checkbox>

            <Box paddingTop={2}>
              <Button onClick={handleSave}>Save Settings</Button>
            </Box>
          </Flex>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
