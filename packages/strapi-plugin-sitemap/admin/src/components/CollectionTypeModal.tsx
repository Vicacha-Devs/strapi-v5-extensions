import {
  Modal,
  Button,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Field,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import React, { useState, useEffect } from "react";
import { useIntl } from "react-intl";

import getTrad from "../utils/getTrad";

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

interface AdminContentTypeItem {
  uid: string;
  singularName?: string;
  info?: {
    singularName?: string;
  };
}

interface CollectionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CollectionTypeConfig) => void;
  existingData?: CollectionTypeConfig | null;
}

const DEFAULT_CONFIG: CollectionTypeConfig = {
  type: "",
  langcode: "-",
  pattern: "",
  priority: 0.5,
  frequency: "monthly",
  lastModified: false,
  thumbnail: "",
  populateLinkedModels: false,
};

const getInitialConfig = (
  existingData?: CollectionTypeConfig | null
): CollectionTypeConfig => {
  if (!existingData) {
    return DEFAULT_CONFIG;
  }
  return {
    ...DEFAULT_CONFIG,
    ...existingData,
    populateLinkedModels: Boolean(existingData.populateLinkedModels),
  };
};

interface BooleanAndMediaFieldsSectionProps {
  type: string;
  lastModified: boolean;
  setLastModified: (val: boolean) => void;
  populateLinkedModels: boolean;
  setPopulateLinkedModels: (val: boolean) => void;
  thumbnail: string;
  setThumbnail: (val: string) => void;
  mediaFields: string[];
}

const BooleanAndMediaFieldsSection: React.FC<
  BooleanAndMediaFieldsSectionProps
> = ({
  type,
  lastModified,
  setLastModified,
  populateLinkedModels,
  setPopulateLinkedModels,
  thumbnail,
  setThumbnail,
  mediaFields,
}) => {
  const { formatMessage } = useIntl();
  const isTypeEmpty = !type;
  const isThumbnailDisabled = isTypeEmpty || mediaFields.length === 0;

  return (
    <>
      <Field.Root id="lastModified" style={{ marginBottom: 16 }}>
        <Field.Label>
          {formatMessage({
            id: getTrad("modal.collectionType.lastModified"),
            defaultMessage: "Add last modified?",
          })}
        </Field.Label>
        <SingleSelect
          value={lastModified.toString()}
          onChange={(value: string | number) =>
            setLastModified(String(value) === "true")
          }
          disabled={isTypeEmpty}
        >
          <SingleSelectOption value="false">
            {formatMessage({ id: getTrad("common.no"), defaultMessage: "No" })}
          </SingleSelectOption>
          <SingleSelectOption value="true">
            {formatMessage({
              id: getTrad("common.yes"),
              defaultMessage: "Yes",
            })}
          </SingleSelectOption>
        </SingleSelect>
      </Field.Root>

      <Field.Root id="populateLinkedModels" style={{ marginBottom: 16 }}>
        <Field.Label>
          {formatMessage({
            id: getTrad("modal.collectionType.populateLinkedModels"),
            defaultMessage:
              "Populate linked models? (Only checks one level deep)",
          })}
        </Field.Label>
        <SingleSelect
          value={populateLinkedModels.toString()}
          onChange={(value: string | number) =>
            setPopulateLinkedModels(String(value) === "true")
          }
          disabled={isTypeEmpty}
        >
          <SingleSelectOption value="false">
            {formatMessage({ id: getTrad("common.no"), defaultMessage: "No" })}
          </SingleSelectOption>
          <SingleSelectOption value="true">
            {formatMessage({
              id: getTrad("common.yes"),
              defaultMessage: "Yes",
            })}
          </SingleSelectOption>
        </SingleSelect>
      </Field.Root>

      <Field.Root id="thumbnail" style={{ marginBottom: 16 }}>
        <Field.Label>
          {formatMessage({
            id: getTrad("modal.collectionType.thumbnail"),
            defaultMessage: "Optional: Select a thumbnail field",
          })}
        </Field.Label>
        <SingleSelect
          value={thumbnail}
          onChange={(value: string | number) => setThumbnail(String(value))}
          disabled={isThumbnailDisabled}
        >
          <SingleSelectOption value="">
            {formatMessage({
              id: getTrad("common.none"),
              defaultMessage: "None",
            })}
          </SingleSelectOption>
          {mediaFields.map((field) => (
            <SingleSelectOption key={field} value={field}>
              {field}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
    </>
  );
};

const isConfigReadyToSave = (
  type: string,
  pattern: string,
  priority: number,
  frequency: string
): boolean =>
  Boolean(
    type.trim() && pattern.trim() && Number.isFinite(priority) && frequency
  );

const CollectionTypeModal: React.FC<CollectionTypeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingData,
}) => {
  const { get } = useFetchClient();
  const { formatMessage } = useIntl();
  const initial = getInitialConfig(existingData);

  const [collectionTypes, setCollectionTypes] = useState<string[]>([]);
  const [locales, setLocales] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [mediaFields, setMediaFields] = useState<string[]>([]);

  const [type, setType] = useState<string>(initial.type);
  const [langcode, setLangcode] = useState<string>(initial.langcode);
  const [pattern, setPattern] = useState<string>(initial.pattern);
  const [priority, setPriority] = useState<number>(initial.priority);
  const [frequency, setFrequency] = useState<string>(initial.frequency);
  const [lastModified, setLastModified] = useState<boolean>(
    initial.lastModified
  );
  const [thumbnail, setThumbnail] = useState<string>(initial.thumbnail);
  const [populateLinkedModels, setPopulateLinkedModels] = useState<boolean>(
    Boolean(initial.populateLinkedModels)
  );

  useEffect(() => {
    const fetchCollectionTypes = async () => {
      try {
        const response = await get<{
          collectionTypes?: AdminContentTypeItem[];
        }>("/sitemap/content-types");
        const list = response?.data?.collectionTypes ?? [];
        const types = list
          .map((ct) => ct.singularName ?? ct.info?.singularName ?? "")
          .filter((name): name is string => Boolean(name));
        setCollectionTypes(types);
      } catch (err) {
        console.error("Failed to fetch collection types:", err);
      }
    };
    void fetchCollectionTypes();
  }, [get]);

  useEffect(() => {
    const fetchLocales = async () => {
      try {
        const response = await get<{ locales?: string[] }>("/sitemap/locales");
        setLocales(response?.data?.locales ?? []);
      } catch (err) {
        console.error("Failed to fetch locales:", err);
      }
    };
    void fetchLocales();
  }, [get]);

  useEffect(() => {
    if (!type) {
      setFields([]);
      setMediaFields([]);
      return;
    }

    const fetchFields = async () => {
      try {
        const encodedType = encodeURIComponent(type);
        const query =
          `singularName=${encodedType}` +
          `&populateLinkedModels=${populateLinkedModels}`;
        const response = await get<{
          allowedFields?: string[];
          mediaFields?: string[];
        }>(`/sitemap/allowed-fields?${query}`);
        const nextMediaFields = response?.data?.mediaFields ?? [];
        setFields(response?.data?.allowedFields ?? []);
        setMediaFields(nextMediaFields);
        setThumbnail((prev) =>
          prev && nextMediaFields.includes(prev) ? prev : ""
        );
      } catch (err) {
        console.error("Failed to fetch fields:", err);
      }
    };

    void fetchFields();
  }, [type, populateLinkedModels, get]);

  useEffect(() => {
    const next = getInitialConfig(existingData);
    setType(next.type);
    setLangcode(next.langcode);
    setPattern(next.pattern);
    setPriority(next.priority);
    setFrequency(next.frequency);
    setLastModified(next.lastModified);
    setThumbnail(next.thumbnail);
    setPopulateLinkedModels(Boolean(next.populateLinkedModels));
  }, [existingData, isOpen]);

  const canSave = isConfigReadyToSave(type, pattern, priority, frequency);

  const handleSave = () => {
    if (!canSave) return;

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
              id: getTrad("modal.collectionType.title"),
              defaultMessage: "Collection Type Sitemap Entry",
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Field.Root id="collection_type" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad("modal.collectionType.selectType"),
                defaultMessage: "Select a collection type",
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
                id: getTrad("modal.collectionType.selectLang"),
                defaultMessage: "Select a language",
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
              id: getTrad("modal.collectionType.patternHint"),
              defaultMessage:
                "How will the URL formatted look like? Available fields:",
            })} ${fields.map((field) => `[${field}]`).join(", ")}`}
          >
            <Field.Label>
              {formatMessage({
                id: getTrad("modal.collectionType.pattern"),
                defaultMessage: "Pattern",
              })}
            </Field.Label>
            <TextInput
              placeholder="/articles/[slug]"
              value={pattern}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPattern(e.target.value)
              }
              disabled={!type}
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root id="priority" style={{ marginBottom: 16 }}>
            <Field.Label>
              {formatMessage({
                id: getTrad("modal.collectionType.priority"),
                defaultMessage: "Select a priority",
              })}
            </Field.Label>
            <SingleSelect
              value={priority.toString()}
              onChange={(value: string | number) =>
                setPriority(parseFloat(String(value)))
              }
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
                id: getTrad("modal.collectionType.frequency"),
                defaultMessage: "Select a change frequency",
              })}
            </Field.Label>
            <SingleSelect
              value={frequency}
              onChange={(value: string | number) => setFrequency(String(value))}
              disabled={!type}
            >
              {[
                "always",
                "hourly",
                "daily",
                "weekly",
                "monthly",
                "yearly",
                "never",
              ].map((freq) => (
                <SingleSelectOption key={freq} value={freq}>
                  {freq}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>

          <BooleanAndMediaFieldsSection
            type={type}
            lastModified={lastModified}
            setLastModified={setLastModified}
            populateLinkedModels={populateLinkedModels}
            setPopulateLinkedModels={setPopulateLinkedModels}
            thumbnail={thumbnail}
            setThumbnail={setThumbnail}
            mediaFields={mediaFields}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({
              id: getTrad("action.cancel"),
              defaultMessage: "Cancel",
            })}
          </Button>
          <Button onClick={handleSave} variant="default" disabled={!canSave}>
            {formatMessage({
              id: getTrad("action.save"),
              defaultMessage: "Save",
            })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default CollectionTypeModal;
