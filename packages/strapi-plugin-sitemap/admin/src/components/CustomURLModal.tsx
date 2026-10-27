import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Field,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import getTrad from '../utils/getTrad';

export interface CustomURLConfig {
  url: string;
  priority: number;
  frequency: string;
}

interface CustomURLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CustomURLConfig) => void;
  existingData?: CustomURLConfig | null;
}

const CustomURLModal: React.FC<CustomURLModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingData,
}) => {
  const { formatMessage } = useIntl();
  const [url, setUrl] = useState<string>(existingData?.url || '');
  const [priority, setPriority] = useState<number>(existingData?.priority || 0.5);
  const [frequency, setFrequency] = useState<string>(existingData?.frequency || 'monthly');

  useEffect(() => {
    if (existingData) {
      setUrl(existingData.url);
      setPriority(existingData.priority);
      setFrequency(existingData.frequency);
    }
  }, [existingData]);

  const handleSave = () => {
    if (!priority || !frequency) return;

    onSave({
      url: url.replace(/^\/+/, ''),
      priority,
      frequency,
    });

    onClose();
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTrad('modal.customUrl.title'),
              defaultMessage: 'Custom Sitemap URL',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Field.Root id="custom_url" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.customUrl.slug'),
                defaultMessage: 'Enter the slug (without trailing or starting slash)',
              })}
            </Field.Label>
            <TextInput
              placeholder="about-us"
              value={url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            />
          </Field.Root>

          <Field.Root id="custom_priority" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.priority'),
                defaultMessage: 'Select a priority',
              })}
            </Field.Label>
            <SingleSelect
              value={priority.toString()}
              onChange={(value: string | number) => setPriority(parseFloat(String(value)))}
            >
              {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((p) => (
                <SingleSelectOption key={p} value={p.toString()}>
                  {p}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>

          <Field.Root id="custom_frequency" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad('modal.collectionType.frequency'),
                defaultMessage: 'Select a change frequency',
              })}
            </Field.Label>
            <SingleSelect
              value={frequency}
              onChange={(value: string | number) => setFrequency(String(value))}
            >
              {['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].map((freq) => (
                <SingleSelectOption key={freq} value={freq}>
                  {freq}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: getTrad('action.cancel'), defaultMessage: 'Cancel' })}
          </Button>
          <Button onClick={handleSave} variant="default" disabled={!priority || !frequency}>
            {formatMessage({ id: getTrad('action.save'), defaultMessage: 'Save' })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CustomURLModal;
