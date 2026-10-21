import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import type {
  CalendarSourceMapping,
  DiscoveredContentType,
} from '../../../../shared/types';

export interface CollectionSourcesSectionProps {
  t: (id: string, defaultMessage: string) => string;
  sources: CalendarSourceMapping[];
  contentTypes: DiscoveredContentType[];
  onAddOrUpdateSource: (source: CalendarSourceMapping) => void;
  onToggleSourceEnabled: (sourceId: string, enabled: boolean) => void;
  onRemoveSource: (sourceId: string) => void;
}

export const CollectionSourcesSection: React.FC<CollectionSourcesSectionProps> = ({
  t,
  sources,
  contentTypes,
  onAddOrUpdateSource,
  onToggleSourceEnabled,
  onRemoveSource,
}) => {
  const [newSourceUid, setNewSourceUid] = useState<string>(
    () => contentTypes[0]?.uid ?? ''
  );
  const [newSourceLabel, setNewSourceLabel] = useState<string>(
    () => contentTypes[0]?.displayName ?? ''
  );
  const [newSourceColor, setNewSourceColor] = useState<string>('#0D9488');
  const [newTitleField, setNewTitleField] = useState<string>('title');
  const [newStartField, setNewStartField] = useState<string>('startDate');
  const [newEndField, setNewEndField] = useState<string>('');
  const [newRRuleField, setNewRRuleField] = useState<string>('');

  const selectedCtFields = useMemo(() => {
    const found = contentTypes.find((ct) => ct.uid === newSourceUid);
    return found?.fields ?? [];
  }, [contentTypes, newSourceUid]);

  const handleSaveSource = () => {
    if (!newSourceUid || !newTitleField || !newStartField) return;
    const idSlug = (newSourceLabel || newSourceUid)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const nextSource: CalendarSourceMapping = {
      id: idSlug || `source-${Date.now()}`,
      label: newSourceLabel.trim() || newSourceUid,
      uid: newSourceUid,
      color: newSourceColor.startsWith('#') ? newSourceColor : '#0D9488',
      enabled: true,
      fields: {
        title: newTitleField,
        startDate: newStartField,
        endDate: newEndField || undefined,
        rrule: newRRuleField || undefined,
      },
    };

    onAddOrUpdateSource(nextSource);
  };

  return (
    <Box padding={5} background="neutral0" hasRadius shadow="tableShadow">
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Box>
          <Typography variant="delta" fontWeight="bold">
            {t('settings.section.sources', 'Mapped Collection Sources')}
          </Typography>
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="neutral600">
              {t(
                'settings.sourcesHint',
                'Map any Strapi v5 Collection Type onto the unified calendar by selecting its title, start/end date, and recurrence fields.'
              )}
            </Typography>
          </Box>
        </Box>

        {sources.map((src) => (
          <Box key={src.id} padding={3} background="neutral100" hasRadius>
            <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
              <Flex gap={2} alignItems="center" wrap="wrap">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: src.color,
                  }}
                />
                <Typography variant="omega" fontWeight="bold">
                  {src.label}
                </Typography>
                <Badge backgroundColor="neutral200" textColor="neutral800">
                  {src.uid}
                </Badge>
                <Badge backgroundColor="primary100" textColor="primary700">
                  {src.fields.title} / {src.fields.startDate}
                </Badge>
              </Flex>

              <Flex gap={3} alignItems="center">
                <Checkbox
                  checked={src.enabled}
                  onCheckedChange={(checked: boolean) =>
                    onToggleSourceEnabled(src.id, Boolean(checked))
                  }
                >
                  {t('settings.sourceEnabled', 'Enabled')}
                </Checkbox>
                <Button
                  variant="danger-light"
                  size="S"
                  onClick={() => onRemoveSource(src.id)}
                >
                  {t('common.remove', 'Remove')}
                </Button>
              </Flex>
            </Flex>
          </Box>
        ))}

        {/* Add / Update Collection Source Form */}
        <Box padding={4} background="neutral100" hasRadius>
          <Flex direction="column" alignItems="stretch" gap={3}>
            <Typography variant="sigma" textColor="neutral700">
              {t('settings.addSourceTitle', 'Map Collection Type to Calendar')}
            </Typography>

            <Flex gap={3} wrap="wrap">
              <Box style={{ flex: 1, minWidth: 220 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.collectionType', 'Collection Type')}
                </Typography>
                {contentTypes.length > 0 ? (
                  <SingleSelect
                    value={newSourceUid}
                    onChange={(val: string) => {
                      setNewSourceUid(val);
                      const found = contentTypes.find((c) => c.uid === val);
                      if (found) setNewSourceLabel(found.displayName);
                    }}
                  >
                    {contentTypes.map((ct) => (
                      <SingleSelectOption key={ct.uid} value={ct.uid}>
                        {ct.displayName} ({ct.uid})
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                ) : (
                  <TextInput
                    value={newSourceUid}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewSourceUid(e.target.value)
                    }
                    placeholder="api::event.event"
                  />
                )}
              </Box>

              <Box style={{ flex: 1, minWidth: 180 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.sourceLabel', 'Display Label')}
                </Typography>
                <TextInput
                  value={newSourceLabel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewSourceLabel(e.target.value)
                  }
                  placeholder="Events"
                />
              </Box>

              <Box style={{ width: 130 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.sourceColor', 'Badge Color')}
                </Typography>
                <TextInput
                  value={newSourceColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewSourceColor(e.target.value)
                  }
                  placeholder="#0D9488"
                />
              </Box>
            </Flex>

            <Flex gap={3} wrap="wrap" alignItems="flex-end">
              <Box style={{ flex: 1, minWidth: 150 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.field.title', 'Title Field')}
                </Typography>
                {selectedCtFields.length > 0 ? (
                  <SingleSelect
                    value={newTitleField}
                    onChange={(val: string) => setNewTitleField(val)}
                  >
                    {selectedCtFields.map((f) => (
                      <SingleSelectOption key={f.name} value={f.name}>
                        {f.name} ({f.type})
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                ) : (
                  <TextInput
                    value={newTitleField}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewTitleField(e.target.value)
                    }
                  />
                )}
              </Box>

              <Box style={{ flex: 1, minWidth: 150 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.field.startDate', 'Start Date Field')}
                </Typography>
                {selectedCtFields.length > 0 ? (
                  <SingleSelect
                    value={newStartField}
                    onChange={(val: string) => setNewStartField(val)}
                  >
                    {selectedCtFields.map((f) => (
                      <SingleSelectOption key={f.name} value={f.name}>
                        {f.name} ({f.type})
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                ) : (
                  <TextInput
                    value={newStartField}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewStartField(e.target.value)
                    }
                  />
                )}
              </Box>

              <Box style={{ flex: 1, minWidth: 150 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.field.endDate', 'End Date Field (Optional)')}
                </Typography>
                <TextInput
                  value={newEndField}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewEndField(e.target.value)
                  }
                  placeholder="endDate"
                />
              </Box>

              <Box style={{ flex: 1, minWidth: 150 }}>
                <Typography variant="pi" fontWeight="bold">
                  {t('settings.field.rrule', 'Recurrence Field (Optional)')}
                </Typography>
                <TextInput
                  value={newRRuleField}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewRRuleField(e.target.value)
                  }
                  placeholder="recurrence"
                />
              </Box>

              <Button variant="secondary" onClick={handleSaveSource}>
                + {t('settings.addSourceButton', 'Save Collection Source')}
              </Button>
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

export default CollectionSourcesSection;
