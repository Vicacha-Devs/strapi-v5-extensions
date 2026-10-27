import { useIntl } from 'react-intl';
import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Flex,
  Main,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID, type DonationsSettings } from '../../../shared';

const subCardStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.22)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

function parseCsvList(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const SettingsPage: React.FC = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string, values?: Record<string, any>) =>
    formatMessage({ id: `${PLUGIN_ID}.${id}`, defaultMessage }, values);
  const { get, put } = useFetchClient();
  const [settings, setSettings] = useState<DonationsSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

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
    try {
      const res = await put(`/${PLUGIN_ID}/settings`, { data: settings });
      if (res?.data?.data) {
        setSettings(res.data.data);
        setSavedNotice(
          t(
            'settings.saved_notice',
            'Donations, Assessment Calculator & Tax Certificate settings saved.'
          )
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <Main>
        <Box padding={8}>
          <Typography>
            {t('settings.loading', 'Loading donations & utility invoice settings...')}
          </Typography>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8}>
        <Flex
          justifyContent="space-between"
          alignItems="flex-start"
          paddingBottom={4}
          wrap="wrap"
          gap={4}
        >
          <Box>
            <Typography variant="alpha" as="h1">
              {t(
                'settings.page_title',
                'Donations, Assessment Calculator & Utility Invoices Settings'
              )}
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600">
                {t(
                  'settings.page_subtitle',
                  'Configure multi-currency conversion, Rich Text editor integration, and cryptographic tax certificates.'
                )}
              </Typography>
            </Box>
            <Flex gap={2} paddingTop={3} wrap="wrap">
              <Badge>
                {t('settings.badge.base_currency', 'Base Currency')}:{' '}
                {settings.baseCurrency || 'COP'}
              </Badge>
              <Badge>
                {t('settings.badge.currencies', 'Currencies')}:{' '}
                {(settings.supportedCurrencies || ['COP', 'USD', 'EUR']).join(', ')}
              </Badge>
              <Badge>
                {t('settings.badge.locales', 'Locales')}:{' '}
                {(settings.supportedLocales || ['es', 'en', 'ar', 'tr']).join(', ')}
              </Badge>
              <Badge>
                {t('settings.badge.tax_certificates', 'Tax Certificates')}:{' '}
                {settings.enableCertificatesBridge
                  ? t('common.enabled', 'Enabled')
                  : t('common.disabled', 'Disabled')}
              </Badge>
            </Flex>
          </Box>
          <Button onClick={() => void handleSave()} loading={saving}>
            {t('settings.save_button', 'Save Settings')}
          </Button>
        </Flex>

        {savedNotice ? (
          <Box padding={3} marginBottom={4} background="success100" hasRadius>
            <Typography textColor="success700" fontWeight="semiBold">
              {savedNotice}
            </Typography>
          </Box>
        ) : null}

        <Divider />

        <Box paddingTop={6}>
          <Tabs.Root defaultValue="currency">
            <Tabs.List aria-label={t('settings.page_title', 'Donations Settings')}>
              <Tabs.Trigger value="currency">
                {t('settings.tab.currency', 'Currency, Localization & Rich Text')}
              </Tabs.Trigger>
              <Tabs.Trigger value="certificates">
                {t('settings.tab.certificates', 'Cryptographic Tax Certificates Bridge')}
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="currency">
              <Box
                padding={6}
                background="neutral0"
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Typography variant="beta" as="h2">
                  {t(
                    'settings.section1.title',
                    'Currency, Multi-Language & Rich Text'
                  )}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    'settings.section1.subtitle',
                    'Configure base accounting currency, accepted donor currencies, supported languages, and Rich Text editor plugin.'
                  )}
                </Typography>

                <Box
                  paddingTop={4}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 20,
                  }}
                >
                  <Field.Root name="defaultLocale">
                    <Field.Label>{t('field.default_locale', 'Default Locale')}</Field.Label>
                    <SingleSelect
                      placeholder={t('placeholder.select_default_locale', 'Select default locale')}
                      value={settings.defaultLocale || 'es'}
                      onChange={(val: string | number) =>
                        setSettings({ ...settings, defaultLocale: String(val) })
                      }
                    >
                      <SingleSelectOption value="es">{t('settings.ui.es_espa_ol', 'es — Español')}</SingleSelectOption>
                      <SingleSelectOption value="en">{t('settings.ui.en_english', 'en — English')}</SingleSelectOption>
                      <SingleSelectOption value="ar">{t('settings.ui.ar', 'ar — العربية')}</SingleSelectOption>
                      <SingleSelectOption value="tr">{t('settings.ui.tr_t_rk_e', 'tr — Türkçe')}</SingleSelectOption>
                    </SingleSelect>
                    <Field.Hint>
                      {t(
                        'hint.default_locale',
                        'Default language for campaign descriptions and donor receipts.'
                      )}
                    </Field.Hint>
                  </Field.Root>

                  <Field.Root name="supportedLocales">
                    <Field.Label>
                      {t(
                        'field.supported_locales_comma_separated',
                        'Supported Locales (comma-separated)'
                      )}
                    </Field.Label>
                    <TextInput
                      name="supportedLocales"
                      placeholder={t('placeholder.e_g_es_en_ar_tr', 'e.g., es, en, ar, tr')}
                      value={(settings.supportedLocales || []).join(', ')}
                      onChange={(e: any) =>
                        setSettings({
                          ...settings,
                          supportedLocales: parseCsvList(e.target.value),
                        })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'hint.supported_locales',
                        'ISO language codes enabled for localized donation campaigns.'
                      )}
                    </Field.Hint>
                  </Field.Root>

                  <Field.Root name="baseCurrency">
                    <Field.Label>
                      {t(
                        'field.base_accounting_currency_iso_4217',
                        'Base Accounting Currency (ISO 4217)'
                      )}
                    </Field.Label>
                    <TextInput
                      name="baseCurrency"
                      placeholder={t('placeholder.e_g_cop', 'e.g., COP')}
                      value={settings.baseCurrency || 'COP'}
                      onChange={(e: any) =>
                        setSettings({ ...settings, baseCurrency: e.target.value.toUpperCase() })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'hint.base_currency',
                        'Primary ledger currency for campaign goals and utility bills.'
                      )}
                    </Field.Hint>
                  </Field.Root>

                  <Field.Root name="supportedCurrencies">
                    <Field.Label>
                      {t(
                        'field.supported_donor_currencies_comma_separated',
                        'Supported Donor Currencies (comma-separated)'
                      )}
                    </Field.Label>
                    <TextInput
                      name="supportedCurrencies"
                      placeholder={t('placeholder.e_g_cop_usd_eur', 'e.g., COP, USD, EUR')}
                      value={(settings.supportedCurrencies || []).join(', ')}
                      onChange={(e: any) =>
                        setSettings({
                          ...settings,
                          supportedCurrencies: parseCsvList(e.target.value).map((c) => c.toUpperCase()),
                        })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'hint.supported_currencies',
                        'Currencies accepted in pledge forms and assessment calculators.'
                      )}
                    </Field.Hint>
                  </Field.Root>

                  <Field.Root name="richTextCustomField">
                    <Field.Label>
                      {t(
                        'field.richtext_plugin_adapter',
                        'Rich Text Editor Plugin (Campaign Description & Body)'
                      )}
                    </Field.Label>
                    <SingleSelect
                      placeholder={t(
                        'settings.richtext.default_option',
                        'Default Strapi Rich Text (Standard Markdown)'
                      )}
                      value={settings.richTextCustomField || '__default__'}
                      onChange={(val: string | number) =>
                        setSettings({
                          ...settings,
                          richTextCustomField: String(val) === '__default__' ? '' : String(val),
                        })
                      }
                    >
                      <SingleSelectOption value="__default__">
                        {t(
                          'settings.richtext.default_option',
                          'Default Strapi Rich Text (Standard Markdown)'
                        )}
                      </SingleSelectOption>
                      <SingleSelectOption value="plugin::tiptap-editor.RichText">
                        {t(
                          'settings.richtext.tiptap_option',
                          'Tiptap Rich Text Editor (plugin::tiptap-editor.RichText)'
                        )}
                      </SingleSelectOption>
                      <SingleSelectOption value="plugin::ckeditor5.CKEditor">
                        {t(
                          'settings.richtext.ckeditor_option',
                          'CKEditor 5 (plugin::ckeditor5.CKEditor)'
                        )}
                      </SingleSelectOption>
                    </SingleSelect>
                    <Field.Hint>
                      {t(
                        'hint.richtext_plugin_adapter',
                        'Compatible with Strapi default richtext, @notum-cz/strapi-plugin-tiptap-editor, CKEditor, or any rich text plugin.'
                      )}
                    </Field.Hint>
                  </Field.Root>
                </Box>
              </Box>
            </Tabs.Content>

            <Tabs.Content value="certificates">
              <Box
                padding={6}
                background="neutral0"
                hasRadius
                shadow="filterShadow"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
              >
                <Typography variant="beta" as="h2">
                  {t(
                    'settings.section2.title',
                    'Cryptographic Tax Certificate Bridge & Verification Automation'
                  )}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {t(
                    'settings.section2.subtitle',
                    'Connect verified donor pledges with @vicacha-devs/strapi-plugin-certificates for Ed25519-signed tax deduction certificates.'
                  )}
                </Typography>

                <Box paddingTop={4} style={{ maxWidth: 420 }}>
                  <Field.Root name="taxCertificateTemplateSlug">
                    <Field.Label>
                      {t('field.tax_certificate_template_slug', 'Tax Certificate Template Slug')}
                    </Field.Label>
                    <TextInput
                      name="taxCertificateTemplateSlug"
                      placeholder={t(
                        'placeholder.e_g_certificado_donacion_fiscal',
                        'e.g., tax-donation-certificate'
                      )}
                      value={settings.taxCertificateTemplateSlug || ''}
                      onChange={(e: any) =>
                        setSettings({ ...settings, taxCertificateTemplateSlug: e.target.value })
                      }
                    />
                    <Field.Hint>
                      {t(
                        'hint.tax_certificate_template_slug',
                        'Template slug in @vicacha-devs/strapi-plugin-certificates used when issuing fiscal donation receipts.'
                      )}
                    </Field.Hint>
                  </Field.Root>
                </Box>

                <Box
                  paddingTop={4}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 16,
                  }}
                >
                  <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                        <Typography fontWeight="bold">
                          {t('settings.bridge.card_title', 'Certificates Authority Bridge')}
                        </Typography>
                        <Badge>
                          {settings.enableCertificatesBridge
                            ? t('common.enabled', 'Enabled')
                            : t('common.disabled', 'Disabled')}
                        </Badge>
                      </Flex>
                      <Typography variant="pi" textColor="neutral600">
                        {t(
                          'settings.bridge.card_desc',
                          'Allows issuing Ed25519-signed fiscal donation certificates via @vicacha-devs/strapi-plugin-certificates.'
                        )}
                      </Typography>
                    </Box>
                    <Box paddingTop={3}>
                      <Checkbox
                        checked={Boolean(settings.enableCertificatesBridge)}
                        onCheckedChange={(val: boolean) =>
                          setSettings({ ...settings, enableCertificatesBridge: Boolean(val) })
                        }
                      >
                        {t(
                          'checkbox.enable_cryptographic_tax_certificate_bridge',
                          'Enable Cryptographic Tax Certificate Bridge'
                        )}
                      </Checkbox>
                    </Box>
                  </Box>

                  <Box padding={4} background="neutral100" hasRadius style={subCardStyle}>
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                        <Typography fontWeight="bold">
                          {t('settings.auto_issue.card_title', 'Auto-Issue on Pledge Verification')}
                        </Typography>
                        <Badge>
                          {settings.autoIssueCertificateOnVerify
                            ? t('common.auto', 'Auto')
                            : t('common.manual', 'Manual')}
                        </Badge>
                      </Flex>
                      <Typography variant="pi" textColor="neutral600">
                        {t(
                          'settings.auto_issue.card_desc',
                          'Automatically generates and attaches a verifiable tax certificate serial number as soon as staff marks a pledge as verified.'
                        )}
                      </Typography>
                    </Box>
                    <Box paddingTop={3}>
                      <Checkbox
                        checked={Boolean(settings.autoIssueCertificateOnVerify)}
                        onCheckedChange={(val: boolean) =>
                          setSettings({ ...settings, autoIssueCertificateOnVerify: Boolean(val) })
                        }
                      >
                        {t(
                          'checkbox.auto_issue_tax_certificate_when_pledge_is_verifi',
                          'Auto-Issue Tax Certificate When Pledge is Verified'
                        )}
                      </Checkbox>
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
