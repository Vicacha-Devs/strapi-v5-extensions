import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Field,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import getTrad from '../utils/getTrad';

export interface CollectionTypeConfig {
  type: string;
  langcode: string;
  pattern: string;
  priority: number;
  frequency: string;
  lastModified: boolean;
  thumbnail: string;
  populateLinkedModels?: boolean;
}

interface CollectionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CollectionTypeConfig) => void;
  existingData?: CollectionTypeConfig | null;
}

const CollectionTypeModal: React.FC<CollectionTypeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingData,
}) => {
  const { get } = useFetchClient();
  const { formatMessage } = useIntl();

  const [collectionTypes, setCollectionTypes] = useState<string[]>([]);
  const [locales, setLocales] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [mediaFields, setMediaFields] = useState<string[]>([]);

  const [type, setType] = useState<string>(existingData?.type || '');
  const [langcode, setLangcode] = useState<string>(existingData?.langcode || '-');
  const [pattern, setPattern] = useState<string>(existingData?.pattern || '');
  const [priority, setPriority] = useState<number>(existingData?.priority || 0.5);
  const [frequency, setFrequency] = useState<string>(existingData?.frequency || 'monthly');
  const [lastModified, setLastModified] = useState<boolean>(existingData?.lastModified || false);
  const [thumbnail, setThumbnail] = useState<string>(existingData?.thumbnail || '');
  const [populateLinkedModels, setPopulateLinkedModels] = useState<boolean>(
    existingData?.populateLinkedModels || false
  );

  useEffect(() => {
    const fetchCollectionTypes = async () => {
      try {
        const response = await get('/sitemap/admin-get-content-types');
        const types =
          response?.data?.collectionTypes
            ?.filter((ct: any) => ct.uid.startsWith('api::'))
            .map((ct: any) => ct.info.singularName) || [];
        setCollectionTypes(types);
      } catch (err) {
        console.error('Failed to fetch collection types:', err);
      }
    };
    fetchCollectionTypes();
  }, [get]);

  useEffect(() => {
    const fetchLocales = async () => {
      try {
        const response = await get('/sitemap/admin-get-locales');
        setLocales(response?.data?.locales || []);
      } catch (err) {
        console.error('Failed to fetch locales:', err);
      }
    };
    fetchLocales();
  }, [get]);

  useEffect(() => {
    if (!type) return;

    const fetchFields = async () => {
      try {
        const response = await get(
          `/sitemap/admin-allowed-fields?singularName=${type}&populateLinkedModels=${populateLinkedModels}`
        );
        setFields(response?.data?.allowedFields || []);
        setMediaFields(response?.data?.mediaFields || []);
      } catch (err) {
        console.error('Failed to fetch fields:', err);
      }
    };

    fetchFields();
  }, [type, populateLinkedModels, get]);

  useEffect(() => {
    if (existingData) {
      setType(existingData.type);
      setLangcode(existingData.langcode);
      setPattern(existingData.pattern);
      setPriority(existingData.priority);
      setFrequency(existingData.frequency);
      setLastModified(existingData.lastModified);
      setThumbnail(existingData.thumbnail);
      setPopulateLinkedModels(existingData.populateLinkedModels || false);
    }
  }, [existingData]);

  const handleSave = () => {
    if (!type || !pattern || !priority || !frequency) return;

    onSave({
      type,
      langcode,
      pattern,
      priority,
      frequency,
      lastModified,
      thumbnail,
      populateLinkedModels,
    });

    onClose();
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTrad('modal.collectionType.title'),
              defaultMessage: 'Collection Type Sitemap Entry',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Field.Root id="collection_type" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.selectType'),
                defaultMessage: 'Select a collection type',
              })}
            </Field.Label>
            <SingleSelect
              value={type}
              onChange={(value: string | number) => setType(String(value))}
            >
              {collectionTypes.map((ct) => (
                <SingleSelectOption key={ct} value={ct}>
                  {ct}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>

          <Field.Root id="langcode" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.selectLang'),
                defaultMessage: 'Select a language',
              })}
            </Field.Label>
            <SingleSelect
              value={langcode}
              onChange={(value: string | number) => setLangcode(String(value))}
              disabled={!type}
            >
              <SingleSelectOption key="-" value="-">
                -
              </SingleSelectOption>
              {locales.map((loc) => (
                <SingleSelectOption key={loc} value={loc}>
                  {loc}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>

          <Field.Root
            id="pattern"
            style={{ marginBottom: 16 }}
            hint={`${formatMessage({
              id: getTrad('modal.collectionType.patternHint'),
              defaultMessage: 'How will the URL formatted look like? Available fields:',
            })} ${fields.map((field) => `[${field}]`).join(', ')}`}
          >
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.pattern'),
                defaultMessage: 'Pattern',
              })}
            </Field.Label>
            <TextInput
              placeholder="/articles/[slug]"
              value={pattern}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPattern(e.target.value)}
              disabled={!type}
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root id="priority" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.priority'),
                defaultMessage: 'Select a priority',
              })}
            </Field.Label>
            <SingleSelect
              value={priority.toString()}
              onChange={(value: string | number) => setPriority(parseFloat(String(value)))}
              disabled={!type}
            >
              {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((p) => (
                <SingleSelectOption key={p} value={p.toString()}>
                  {p}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>

          <Field.Root id="frequency" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.frequency'),
                defaultMessage: 'Select a change frequency',
              })}
            </Field.Label>
            <SingleSelect
              value={frequency}
              onChange={(value: string | number) => setFrequency(String(value))}
              disabled={!type}
            >
              {['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].map((freq) => (
                <SingleSelectOption key={freq} value={freq}>
                  {freq}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>

          <Field.Root id="lastModified" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.lastModified'),
                defaultMessage: 'Add last modified?',
              })}
            </Field.Label>
            <SingleSelect
              value={lastModified.toString()}
              onChange={(value: string | number) => setLastModified(String(value) === 'true')}
              disabled={!type}
            >
              <SingleSelectOption value="false">
                {formatMessage({ id: getTrad('common.no'), defaultMessage: 'No' })}
              </SingleSelectOption>
              <SingleSelectOption value="true">
                {formatMessage({ id: getTrad('common.yes'), defaultMessage: 'Yes' })}
              </SingleSelectOption>
            </SingleSelect>
          </Field.Root>

          <Field.Root id="populateLinkedModels" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.populateLinkedModels'),
                defaultMessage: 'Populate linked models? (Only checks one level deep)',
              })}
            </Field.Label>
            <SingleSelect
              value={populateLinkedModels.toString()}
              onChange={(value: string | number) =>
                setPopulateLinkedModels(String(value) === 'true')
              }
              disabled={!type}
            >
              <SingleSelectOption value="false">
                {formatMessage({ id: getTrad('common.no'), defaultMessage: 'No' })}
              </SingleSelectOption>
              <SingleSelectOption value="true">
                {formatMessage({ id: getTrad('common.yes'), defaultMessage: 'Yes' })}
              </SingleSelectOption>
            </SingleSelect>
          </Field.Root>

          <Field.Root id="thumbnail" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.thumbnail'),
                defaultMessage: 'Optional: Select a thumbnail field',
              })}
            </Field.Label>
            <SingleSelect
              value={thumbnail}
              onChange={(value: string | number) => setThumbnail(String(value))}
              disabled={!type || mediaFields.length === 0}
            >
              <SingleSelectOption value="">
                {formatMessage({ id: getTrad('common.none'), defaultMessage: 'None' })}
              </SingleSelectOption>
              {mediaFields.map((field) => (
                <SingleSelectOption key={field} value={field}>
                  {field}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: getTrad('action.cancel'), defaultMessage: 'Cancel' })}
          </Button>
          <Button
            onClick={handleSave}
            variant="default"
            disabled={!type || !pattern || !priority || !frequency}
          >
            {formatMessage({ id: getTrad('action.save'), defaultMessage: 'Save' })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CollectionTypeModal;
