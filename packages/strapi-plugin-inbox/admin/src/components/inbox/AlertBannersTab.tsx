import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  NumberInput,
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
import {
  ALERT_SEVERITIES,
  PLUGIN_ID,
  type AlertBannerRecord,
  type AlertSeverity,
} from '../../../../shared';

const cardBorderStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.2)',
};

export interface AlertBannersTabProps {
  t: (id: string, defaultMessage: string) => string;
  alerts: AlertBannerRecord[];
  post: (url: string, body?: unknown) => Promise<unknown>;
  onStatusMessage: (msg: string) => void;
  onReload: () => Promise<void>;
}

export const AlertBannersTab: React.FC<AlertBannersTabProps> = ({
  t,
  alerts,
  post,
  onStatusMessage,
  onReload,
}) => {
  const [showCreateForm, setShowCreateForm] = React.useState<boolean>(false);
  const [newAlertCode, setNewAlertCode] = React.useState<string>('');
  const [newAlertSeverity, setNewAlertSeverity] =
    React.useState<AlertSeverity>('urgent');
  const [newAlertPriority, setNewAlertPriority] = React.useState<number>(100);
  const [newAlertTitle, setNewAlertTitle] = React.useState<string>('');
  const [newAlertMessage, setNewAlertMessage] = React.useState<string>('');
  const [newAlertCtaLabel, setNewAlertCtaLabel] = React.useState<string>('');
  const [newAlertCtaUrl, setNewAlertCtaUrl] = React.useState<string>('');

  const handleCreateAlert = async () => {
    if (!newAlertCode || !newAlertTitle || !newAlertMessage) return;
    await post(`/${PLUGIN_ID}/alerts`, {
      code: newAlertCode,
      title: newAlertTitle,
      message: newAlertMessage,
      severity: newAlertSeverity,
      active: true,
      priority: newAlertPriority,
      ctaLabel: newAlertCtaLabel || undefined,
      ctaUrl: newAlertCtaUrl || undefined,
    });
    setNewAlertCode('');
    setNewAlertTitle('');
    setNewAlertMessage('');
    setNewAlertCtaLabel('');
    setNewAlertCtaUrl('');
    setShowCreateForm(false);
    onStatusMessage('Site-wide alert banner saved');
    await onReload();
  };

  return (
    <Box paddingTop={5}>
      <Flex
        justifyContent="space-between"
        alignItems="center"
        paddingBottom={4}
        wrap="wrap"
        gap={3}
      >
        <Typography variant="beta" tag="h2">
          {t('page.ui.alert_banners_list', 'Site-Wide Alert Banners')}
        </Typography>
        <Button
          size="S"
          variant={showCreateForm ? 'tertiary' : 'default'}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm
            ? t('page.ui.cancel', 'Cancel')
            : t('page.ui.new_alert_banner', '+ New Alert Banner')}
        </Button>
      </Flex>

      {showCreateForm ? (
        <Box
          padding={5}
          marginBottom={5}
          background="neutral0"
          hasRadius
          shadow="filterShadow"
          style={cardBorderStyle}
        >
          <Flex
            justifyContent="space-between"
            alignItems="center"
            paddingBottom={3}
            wrap="wrap"
            gap={2}
          >
            <Typography variant="delta" tag="h3" fontWeight="bold">
              {t(
                'page.ui.publish_urgent_site_wide_alert_banner',
                'Publish Site-Wide Alert Banner'
              )}
            </Typography>
            <Button size="S" onClick={handleCreateAlert}>
              {t('page.ui.save_alert_banner', 'Save Alert Banner')}
            </Button>
          </Flex>

          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            <Field.Root name="code" required>
              <Field.Label>{t('field.alert_code', 'Alert Code')}</Field.Label>
              <TextInput
                name="code"
                placeholder={t('placeholder.alert_code', 'RAMADAN-1448-HILAL')}
                value={newAlertCode}
                onChange={(e: { target: { value: string } }) =>
                  setNewAlertCode(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root name="severity" required>
              <Field.Label>{t('field.severity_level', 'Severity')}</Field.Label>
              <SingleSelect
                value={newAlertSeverity}
                onChange={(val: string | number) =>
                  setNewAlertSeverity(String(val) as AlertSeverity)
                }
              >
                {ALERT_SEVERITIES.map((sev) => (
                  <SingleSelectOption key={sev} value={sev}>
                    {sev.toUpperCase()}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>

            <Field.Root name="priority">
              <Field.Label>{t('field.display_priority', 'Priority')}</Field.Label>
              <NumberInput
                name="priority"
                value={newAlertPriority}
                onValueChange={(val: number | undefined) =>
                  setNewAlertPriority(typeof val === 'number' ? val : 100)
                }
              />
            </Field.Root>

            <Field.Root name="title" required>
              <Field.Label>{t('field.headline_title', 'Headline')}</Field.Label>
              <TextInput
                name="title"
                placeholder={t('placeholder.alert_headline', 'Moon-Sighting Announcement')}
                value={newAlertTitle}
                onChange={(e: { target: { value: string } }) =>
                  setNewAlertTitle(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root name="message" required>
              <Field.Label>{t('field.ticker_message', 'Message')}</Field.Label>
              <TextInput
                name="message"
                placeholder={t(
                  'placeholder.alert_message',
                  'The first day of Ramadan will be...'
                )}
                value={newAlertMessage}
                onChange={(e: { target: { value: string } }) =>
                  setNewAlertMessage(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root name="ctaLabel">
              <Field.Label>{t('field.cta_button_label_optional', 'CTA Label')}</Field.Label>
              <TextInput
                name="ctaLabel"
                placeholder={t('placeholder.alert_cta_label', 'View Schedule')}
                value={newAlertCtaLabel}
                onChange={(e: { target: { value: string } }) =>
                  setNewAlertCtaLabel(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root name="ctaUrl">
              <Field.Label>{t('field.cta_target_url_optional', 'CTA URL')}</Field.Label>
              <TextInput
                name="ctaUrl"
                placeholder={t('placeholder.alert_cta_url', '/es/ramadan')}
                value={newAlertCtaUrl}
                onChange={(e: { target: { value: string } }) =>
                  setNewAlertCtaUrl(e.target.value)
                }
              />
            </Field.Root>
          </Box>
        </Box>
      ) : null}

      <Table colCount={5} rowCount={alerts.length + 1}>
        <Thead>
          <Tr>
            <Th><Typography variant="sigma">{t('page.ui.code', 'Code')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.severity', 'Severity')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.title', 'Headline')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.message', 'Message')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.secondary_calendar', 'Hijri Date')}</Typography></Th>
          </Tr>
        </Thead>
        <Tbody>
          {alerts.map((banner) => (
            <Tr key={banner.code}>
              <Td><Typography fontWeight="bold">{banner.code}</Typography></Td>
              <Td><Badge>{banner.severity}</Badge></Td>
              <Td><Typography>{banner.title}</Typography></Td>
              <Td><Typography>{banner.message}</Typography></Td>
              <Td><Typography>{banner.secondaryDateLabel || '-'}</Typography></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
