import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  TextInput,
  Field,
  Checkbox,
  Box,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import type { CollectionTypeConfig } from './CollectionTypeModal';
import getTrad from '../utils/getTrad';

export interface SitemapDefinition {
  name: string;
  collectionTypeConfigIndices: number[];
  includeCustomUrls: boolean;
}

interface SitemapDefinitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (def: SitemapDefinition) => void;
  existingDef?: SitemapDefinition | null;
  collectionTypes: CollectionTypeConfig[];
}

const SLUG_REGEX = /^[a-z0-9_-]+$/i;

const SitemapDefinitionModal: React.FC<SitemapDefinitionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingDef,
  collectionTypes,
}) => {
  const { formatMessage } = useIntl();
  const [name, setName] = useState(existingDef?.name || '');
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    existingDef?.collectionTypeConfigIndices ?? []
  );
  const [includeCustomUrls, setIncludeCustomUrls] = useState(
    existingDef?.includeCustomUrls ?? false
  );

  useEffect(() => {
    if (existingDef) {
      setName(existingDef.name);
      setSelectedIndices(existingDef.collectionTypeConfigIndices ?? []);
      setIncludeCustomUrls(existingDef.includeCustomUrls ?? false);
    } else {
      setName('');
      setSelectedIndices([]);
      setIncludeCustomUrls(false);
    }
  }, [existingDef, isOpen]);

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
  const isValidSlug = slug.length > 0 && SLUG_REGEX.test(slug);

  const toggleIndex = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSave = () => {
    if (!isValidSlug) return;
    onSave({
      name: slug,
      collectionTypeConfigIndices: selectedIndices,
      includeCustomUrls,
    });
    onClose();
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {existingDef
              ? formatMessage({
                  id: getTrad('modal.sitemapDef.editTitle'),
                  defaultMessage: 'Edit Sitemap',
                })
              : formatMessage({
                  id: getTrad('modal.sitemapDef.addTitle'),
                  defaultMessage: 'Add Sitemap',
                })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Field.Root
            id="sitemap_name"
            style={{ marginBottom: 16 }}
            hint={formatMessage({
              id: getTrad('modal.sitemapDef.nameHint'),
              defaultMessage:
                'Used in URL: /api/sitemap/sitemap-[name].xml (letters, numbers, hyphens, underscores only)',
            })}
          >
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.sitemapDef.nameLabel'),
                defaultMessage: 'Sitemap name (slug)',
              })}
            </Field.Label>
            <TextInput
              placeholder={formatMessage({
                id: getTrad('modal.sitemapDef.namePlaceholder'),
                defaultMessage: 'e.g. articles or pages',
              })}
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root id="collection_types" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.sitemapDef.collectionTypesLabel'),
                defaultMessage: 'Collection type configs to include',
              })}
            </Field.Label>
            {collectionTypes.length === 0 ? (
              <Typography variant="pi" textColor="neutral600">
                {formatMessage({
                  id: getTrad('modal.sitemapDef.noCollectionTypes'),
                  defaultMessage:
                    'No collection type configs yet. Add some in the Collection Types section first.',
                })}
              </Typography>
            ) : (
              <Box paddingTop={2}>
                {collectionTypes.map((ct, idx) => (
                  <Box key={idx} paddingBottom={2}>
                    <Checkbox
                      checked={selectedIndices.includes(idx)}
                      onCheckedChange={() => toggleIndex(idx)}
                    >
                      {ct.type} ({ct.langcode}) – {ct.pattern}
                    </Checkbox>
                  </Box>
                ))}
              </Box>
            )}
          </Field.Root>

          <Field.Root id="include_custom" style={{ marginBottom: 16 }}>
            <Checkbox
              checked={includeCustomUrls}
              onCheckedChange={(checked: boolean) => setIncludeCustomUrls(checked === true)}
            >
              {formatMessage({
                id: getTrad('modal.sitemapDef.includeCustomUrls'),
                defaultMessage: 'Include custom URLs in this sitemap',
              })}
            </Checkbox>
          </Field.Root>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: getTrad('action.cancel'), defaultMessage: 'Cancel' })}
          </Button>
          <Button onClick={handleSave} variant="default" disabled={!isValidSlug}>
            {formatMessage({ id: getTrad('action.save'), defaultMessage: 'Save' })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default SitemapDefinitionModal;
