import * as React from 'react';
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
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
import { PLUGIN_ID, type SubscriberRecord } from '../../../../shared';

const cardBorderStyle: React.CSSProperties = {
  border: '1px solid rgba(128, 128, 128, 0.2)',
};

export interface SubscribersTabProps {
  t: (id: string, defaultMessage: string) => string;
  subscribers: SubscriberRecord[];
  post: (url: string, body?: unknown) => Promise<unknown>;
  onStatusMessage: (msg: string) => void;
  onReload: () => Promise<void>;
}

export const SubscribersTab: React.FC<SubscribersTabProps> = ({
  t,
  subscribers,
  post,
  onStatusMessage,
  onReload,
}) => {
  const [showAddForm, setShowAddForm] = React.useState<boolean>(false);
  const [newSubEmail, setNewSubEmail] = React.useState<string>('');
  const [newSubName, setNewSubName] = React.useState<string>('');
  const [newSubLocale, setNewSubLocale] = React.useState<string>('es');
  const [newSubTopics, setNewSubTopics] = React.useState<string>(
    'announcements, events'
  );

  const handleAddSubscriber = async () => {
    if (!newSubEmail.trim()) return;
    await post(`/api/${PLUGIN_ID}/subscribers`, {
      email: newSubEmail.trim(),
      fullName: newSubName.trim(),
      locale: newSubLocale,
      topics: newSubTopics
        .split(',')
        .map((topic) => topic.trim())
        .filter(Boolean),
    });
    setNewSubEmail('');
    setNewSubName('');
    setShowAddForm(false);
    onStatusMessage(`Subscriber "${newSubEmail.trim()}" added`);
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
          {t('page.ui.subscribers_list', 'Community Subscribers')}
        </Typography>
        <Button
          size="S"
          variant={showAddForm ? 'tertiary' : 'default'}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm
            ? t('page.ui.cancel', 'Cancel')
            : t('page.ui.add_subscriber', '+ Add Subscriber')}
        </Button>
      </Flex>

      {showAddForm ? (
        <Box
          padding={5}
          marginBottom={5}
          background="neutral0"
          hasRadius
          shadow="filterShadow"
          style={cardBorderStyle}
        >
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              alignItems: 'end',
            }}
          >
            <Field.Root name="newSubEmail" required>
              <Field.Label>
                {t('field.subscriber_email', 'Email')}
              </Field.Label>
              <TextInput
                name="newSubEmail"
                type="email"
                placeholder={t('placeholder.subscriber_email', 'fatima@example.org')}
                value={newSubEmail}
                onChange={(e: { target: { value: string } }) =>
                  setNewSubEmail(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root name="newSubName">
              <Field.Label>{t('field.full_name', 'Full Name')}</Field.Label>
              <TextInput
                name="newSubName"
                placeholder={t('placeholder.subscriber_name', 'Fatima Zahra')}
                value={newSubName}
                onChange={(e: { target: { value: string } }) =>
                  setNewSubName(e.target.value)
                }
              />
            </Field.Root>

            <Field.Root name="newSubLocale">
              <Field.Label>{t('field.preferred_locale', 'Locale')}</Field.Label>
              <SingleSelect
                value={newSubLocale}
                onChange={(val: string | number) => setNewSubLocale(String(val))}
              >
                <SingleSelectOption value="es">
                  {t('locale.es', 'es — Español')}
                </SingleSelectOption>
                <SingleSelectOption value="en">
                  {t('locale.en', 'en — English')}
                </SingleSelectOption>
                <SingleSelectOption value="ar">
                  {t('locale.ar', 'ar — العربية')}
                </SingleSelectOption>
                <SingleSelectOption value="tr">
                  {t('locale.tr', 'tr — Türkçe')}
                </SingleSelectOption>
              </SingleSelect>
            </Field.Root>

            <Field.Root name="newSubTopics">
              <Field.Label>
                {t('field.topics_comma_separated', 'Topics')}
              </Field.Label>
              <TextInput
                name="newSubTopics"
                placeholder={t(
                  'placeholder.subscriber_topics',
                  'announcements, events'
                )}
                value={newSubTopics}
                onChange={(e: { target: { value: string } }) =>
                  setNewSubTopics(e.target.value)
                }
              />
            </Field.Root>

            <Box>
              <Button onClick={handleAddSubscriber}>
                {t('page.ui.save_subscriber', 'Save Subscriber')}
              </Button>
            </Box>
          </Box>
        </Box>
      ) : null}

      <Table colCount={5} rowCount={subscribers.length + 1}>
        <Thead>
          <Tr>
            <Th><Typography variant="sigma">{t('page.ui.email', 'Email')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.name', 'Name')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.locale', 'Locale')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.topics', 'Topics')}</Typography></Th>
            <Th><Typography variant="sigma">{t('page.ui.status', 'Status')}</Typography></Th>
          </Tr>
        </Thead>
        <Tbody>
          {subscribers.map((sub) => (
            <Tr key={sub.email}>
              <Td><Typography fontWeight="bold">{sub.email}</Typography></Td>
              <Td><Typography>{sub.fullName || '-'}</Typography></Td>
              <Td><Badge>{sub.locale}</Badge></Td>
              <Td><Typography>{(sub.topics || []).join(', ')}</Typography></Td>
              <Td><Badge>{sub.status}</Badge></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
