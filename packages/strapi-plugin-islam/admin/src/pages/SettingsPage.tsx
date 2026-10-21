import React, { useEffect, useState } from 'react';
import {
  Main,
  Box,
  Flex,
  Typography,
  Button,
  TextInput,
  Checkbox,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID, type IslamPluginSettings } from '../../../shared';

export const SettingsPage: React.FC = () => {
  const { get, put } = useFetchClient();
  const [settings, setSettings] = useState<IslamPluginSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await get(`/${PLUGIN_ID}/settings`);
      if (res?.data?.data) {
        setSettings(res.data.data);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSavedBanner(false);
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, settings);
      if (res?.data?.data) {
        setSettings(res.data.data);
        setSavedBanner(true);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <Main>
        <Box padding={8}>
          <Typography>Loading Islam Suite settings...</Typography>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8}>
        <Flex justifyContent="space-between" alignItems="center" marginBottom={6}>
          <Box>
            <Typography variant="alpha" as="h1">
              Islam Suite — Calculation, Nisab & Ecosystem Bridges
            </Typography>
            <Typography variant="epsilon" textColor="neutral600">
              Configure astronomical calculation parameters, mosque coordinates, Gold/Silver Nisab rates, and cross-plugin bridges.
            </Typography>
          </Box>
          <Button onClick={() => void handleSave()} loading={saving}>
            Save Settings
          </Button>
        </Flex>

        {savedBanner && (
          <Box marginBottom={4} padding={3} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="bold">
              Settings saved and synchronized with mapped collections.
            </Typography>
          </Box>
        )}

        <Box background="neutral0" padding={6} hasRadius shadow="filterShadow" marginBottom={6}>
          <Typography variant="delta" as="h2" marginBottom={4}>
            1. Mosque Coordinates & Astronomical Calculation Parameters
          </Typography>
          <Flex gap={4} direction="column">
            <TextInput
              label="Mosque Name"
              name="mosqueName"
              value={settings.mosqueName}
              onChange={(e: any) =>
                setSettings({ ...settings, mosqueName: e.target.value })
              }
            />
            <Flex gap={4} wrap="wrap">
              <TextInput
                label="Latitude"
                name="defaultLat"
                value={String(settings.defaultLat)}
                onChange={(e: any) =>
                  setSettings({
                    ...settings,
                    defaultLat: Number(e.target.value) || 0,
                  })
                }
              />
              <TextInput
                label="Longitude"
                name="defaultLon"
                value={String(settings.defaultLon)}
                onChange={(e: any) =>
                  setSettings({
                    ...settings,
                    defaultLon: Number(e.target.value) || 0,
                  })
                }
              />
              <TextInput
                label="Calculation Method ID (0–23, 3 = MWL, 2 = ISNA, 4 = Makkah)"
                name="method"
                value={settings.method}
                onChange={(e: any) =>
                  setSettings({ ...settings, method: e.target.value })
                }
              />
              <TextInput
                label="Asr Juristic School (1 = Shafi'i/Standard, 2 = Hanafi)"
                name="school"
                value={settings.school}
                onChange={(e: any) =>
                  setSettings({
                    ...settings,
                    school: e.target.value === '2' ? '2' : '1',
                  })
                }
              />
              <TextInput
                label="Hijri Moon-Sighting Offset (-2, -1, 0, 1, 2)"
                name="shifting"
                value={settings.shifting}
                onChange={(e: any) =>
                  setSettings({
                    ...settings,
                    shifting: e.target.value as any,
                  })
                }
              />
            </Flex>
          </Flex>
        </Box>

        <Box background="neutral0" padding={6} hasRadius shadow="filterShadow" marginBottom={6}>
          <Typography variant="delta" as="h2" marginBottom={4}>
            2. Fiqh Financial Rates (Gold/Silver Nisab, Zakat al-Fitr & Fidyah in COP)
          </Typography>
          <Flex gap={4} wrap="wrap">
            <TextInput
              label="24K Gold Price per Gram (COP)"
              name="goldCop"
              value={String(settings.fiqhRates.goldPricePerGramByCurrency.COP)}
              onChange={(e: any) =>
                setSettings({
                  ...settings,
                  fiqhRates: {
                    ...settings.fiqhRates,
                    goldPricePerGramByCurrency: {
                      ...settings.fiqhRates.goldPricePerGramByCurrency,
                      COP: Number(e.target.value) || 0,
                    },
                  },
                })
              }
            />
            <TextInput
              label="Silver Price per Gram (COP)"
              name="silverCop"
              value={String(settings.fiqhRates.silverPricePerGramByCurrency.COP)}
              onChange={(e: any) =>
                setSettings({
                  ...settings,
                  fiqhRates: {
                    ...settings.fiqhRates,
                    silverPricePerGramByCurrency: {
                      ...settings.fiqhRates.silverPricePerGramByCurrency,
                      COP: Number(e.target.value) || 0,
                    },
                  },
                })
              }
            />
            <TextInput
              label="Zakat al-Fitr per Person (COP)"
              name="fitranaCop"
              value={String(settings.fiqhRates.zakatAlFitrPerPersonByCurrency.COP)}
              onChange={(e: any) =>
                setSettings({
                  ...settings,
                  fiqhRates: {
                    ...settings.fiqhRates,
                    zakatAlFitrPerPersonByCurrency: {
                      ...settings.fiqhRates.zakatAlFitrPerPersonByCurrency,
                      COP: Number(e.target.value) || 0,
                    },
                  },
                })
              }
            />
            <TextInput
              label="Fidyah per Day (COP)"
              name="fidyahCop"
              value={String(settings.fiqhRates.fidyahPerDayByCurrency.COP)}
              onChange={(e: any) =>
                setSettings({
                  ...settings,
                  fiqhRates: {
                    ...settings.fiqhRates,
                    fidyahPerDayByCurrency: {
                      ...settings.fiqhRates.fidyahPerDayByCurrency,
                      COP: Number(e.target.value) || 0,
                    },
                  },
                })
              }
            />
          </Flex>
        </Box>

        <Box background="neutral0" padding={6} hasRadius shadow="filterShadow" marginBottom={6}>
          <Typography variant="delta" as="h2" marginBottom={4}>
            3. Quran Foundation Content API v4.0.0 (OAuth2 Client Credentials & Script Settings)
          </Typography>
          <Flex gap={4} direction="column">
            <Flex gap={4} wrap="wrap">
              <TextInput
                label="Environment (production | prelive)"
                name="qfEnvironment"
                value={settings.quranFoundation?.environment || 'production'}
                onChange={(e: any) =>
                  setSettings({
                    ...settings,
                    quranFoundation: {
                      ...settings.quranFoundation,
                      environment:
                        e.target.value === 'prelive' ? 'prelive' : 'production',
                    },
                  })
                }
              />
              <TextInput
                label="Default Arabic Script (uthmani | uthmani_tajweed | imlaei | indopak_nastaleeq)"
                name="qfScript"
                value={settings.quranFoundation?.defaultScript || 'uthmani'}
                onChange={(e: any) =>
                  setSettings({
                    ...settings,
                    quranFoundation: {
                      ...settings.quranFoundation,
                      defaultScript: e.target.value as any,
                    },
                  })
                }
              />
              <TextInput
                label="Default Reciter ID (7 = Mishary Rashid Alafasy)"
                name="qfReciter"
                value={String(settings.quranFoundation?.defaultReciterId ?? 7)}
                onChange={(e: any) =>
                  setSettings({
                    ...settings,
                    quranFoundation: {
                      ...settings.quranFoundation,
                      defaultReciterId: Number(e.target.value) || 7,
                    },
                  })
                }
              />
            </Flex>
            <Checkbox
              checked={Boolean(settings.quranFoundation?.enabled ?? true)}
              onCheckedChange={(val: boolean) =>
                setSettings({
                  ...settings,
                  quranFoundation: {
                    ...settings.quranFoundation,
                    enabled: Boolean(val),
                  },
                })
              }
            >
              Enable Quran Foundation Content API v4.0.0 Gateway (Chapters, Ayat, Audio Segments, Tafsirs & Ayah-Linked Hadiths)
            </Checkbox>
            <Checkbox
              checked={Boolean(
                settings.quranFoundation?.disableBrowserAutoTranslate ?? true
              )}
              onCheckedChange={(val: boolean) =>
                setSettings({
                  ...settings,
                  quranFoundation: {
                    ...settings.quranFoundation,
                    disableBrowserAutoTranslate: Boolean(val),
                  },
                })
              }
            >
              Enforce Translation Integrity Policy (translate=&quot;no&quot; / class=&quot;notranslate&quot; on Quranic text & verified translations)
            </Checkbox>
          </Flex>
        </Box>

        <Box background="neutral0" padding={6} hasRadius shadow="filterShadow">
          <Typography variant="delta" as="h2" marginBottom={4}>
            4. Cross-Plugin Ecosystem Bridges
          </Typography>
          <Flex gap={4} direction="column">
            <Checkbox
              checked={settings.enableCalendarBridge}
              onCheckedChange={(val: boolean) =>
                setSettings({ ...settings, enableCalendarBridge: Boolean(val) })
              }
            >
              Propagate Hijri Moon-Sighting Offset to @vicacha-devs/strapi-plugin-calendar
            </Checkbox>
            <Checkbox
              checked={settings.enableDonationsBridge}
              onCheckedChange={(val: boolean) =>
                setSettings({ ...settings, enableDonationsBridge: Boolean(val) })
              }
            >
              Bridge Gold & Silver Nisab Benchmarks with @vicacha-devs/strapi-plugin-donations
            </Checkbox>
            <Checkbox
              checked={settings.enableInboxAlertBridge}
              onCheckedChange={(val: boolean) =>
                setSettings({ ...settings, enableInboxAlertBridge: Boolean(val) })
              }
            >
              Auto-publish Ramadan & Eid Hilal Announcements to @vicacha-devs/strapi-plugin-inbox Alert Banners
            </Checkbox>
          </Flex>
        </Box>
      </Box>
    </Main>
  );
};

export default SettingsPage;
