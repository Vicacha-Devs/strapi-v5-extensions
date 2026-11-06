import type {
  ComponentSchemasMap,
  ContentManagerFormValues,
  ContentTypeSchemaInfo,
  SchemaAttribute,
} from "../../../../../shared";

export interface FieldDescriptor {
  name: string;
  field: string | null;
  inDz?: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const matchesFieldType = (
  fieldProperties: SchemaAttribute | undefined,
  fieldType: "richtext" | "blocks"
): boolean => {
  if (!fieldProperties) return false;
  if (fieldProperties.type === fieldType) return true;
  if (
    fieldType === "richtext" &&
    fieldProperties.type === "customField" &&
    typeof fieldProperties.customField === "string" &&
    fieldProperties.customField.toLowerCase().includes("richtext")
  ) {
    return true;
  }
  return false;
};

const collectFieldsByType = (
  contentType: ContentTypeSchemaInfo,
  components: ComponentSchemasMap,
  fieldType: "richtext" | "blocks"
): FieldDescriptor[] => {
  const fields: FieldDescriptor[] = [];
  const attributes: Record<string, SchemaAttribute> =
    contentType?.attributes ?? {};
  const safeComponents: ComponentSchemasMap = components ?? {};

  Object.entries(attributes).forEach(([field, fieldProperties]) => {
    if (matchesFieldType(fieldProperties, fieldType)) {
      fields.push({ name: field, field: null });
    } else if (
      fieldProperties?.type === "component" &&
      fieldProperties.component
    ) {
      const compAttrs: Record<string, SchemaAttribute> =
        safeComponents[fieldProperties.component]?.attributes ?? {};
      Object.entries(compAttrs).forEach(([field2, fieldProperties2]) => {
        if (matchesFieldType(fieldProperties2, fieldType)) {
          fields.push({ name: field, field: field2 });
        }
      });
    }
  });

  Object.entries(safeComponents).forEach(([componentName, componentData]) => {
    const compAttrs: Record<string, SchemaAttribute> =
      componentData?.attributes ?? {};
    Object.entries(compAttrs).forEach(([field, fieldProperties]) => {
      if (matchesFieldType(fieldProperties, fieldType)) {
        fields.push({ name: componentName, field });
      }
    });
  });

  return fields;
};

const resolveAndDeduplicateFields = (
  fields: FieldDescriptor[],
  dynamicZones: string[],
  modifiedData: ContentManagerFormValues
): FieldDescriptor[] => {
  const updated = fields.map((entry) => ({ ...entry }));
  const removedIndices = new Set<number>();

  dynamicZones.forEach((dz) => {
    const rawDz = modifiedData?.[dz];
    const dynamicZoneData = Array.isArray(rawDz)
      ? rawDz.filter(isPlainObject)
      : [];

    updated.forEach((field, index) => {
      if (removedIndices.has(index)) return;

      const componentExistsInDZ = dynamicZoneData.filter(
        (x) => x.__component === field.name
      );

      if (
        componentExistsInDZ.length > 0 &&
        !field.inDz &&
        field.field &&
        dynamicZoneData.some((x) =>
          Object.prototype.hasOwnProperty.call(x, field.field!)
        )
      ) {
        updated[index] = { ...field, inDz: dz };
      } else if (componentExistsInDZ.length === 0 && field.inDz === dz) {
        removedIndices.add(index);
      }
    });
  });

  const seenKeys = new Set<string>();
  const deduplicated: FieldDescriptor[] = [];

  updated.forEach((field, index) => {
    if (removedIndices.has(index)) return;
    if (field.field === null) {
      const key = `root:${field.name}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        deduplicated.push(field);
      }
      return;
    }

    if (field.inDz) {
      const key = `dz:${field.inDz}:${field.name}:${field.field}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        deduplicated.push(field);
      }
      return;
    }

    const compKey = field.name.split(".").pop() || field.name;
    if (
      field.name.includes(".") &&
      modifiedData?.[compKey] === undefined &&
      modifiedData?.[field.name] === undefined
    ) {
      return;
    }
    const key = `comp:${compKey}:${field.field}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicated.push(field);
    }
  });

  return deduplicated;
};

export const getRichTextAndBlocksFields = (
  contentType: ContentTypeSchemaInfo,
  components: ComponentSchemasMap,
  modifiedData: ContentManagerFormValues
): { richTextFields: FieldDescriptor[]; blockFields: FieldDescriptor[] } => {
  const dynamicZones: string[] = [];

  Object.entries(modifiedData ?? {}).forEach(([fieldName, fieldValue]) => {
    if (Array.isArray(fieldValue)) {
      const isComponentField = fieldValue.some(
        (subField) => isPlainObject(subField) && "__component" in subField
      );
      if (isComponentField) dynamicZones.push(fieldName);
    }
  });

  const rawRichTextFields = collectFieldsByType(
    contentType,
    components,
    "richtext"
  );
  const rawBlockFields = collectFieldsByType(contentType, components, "blocks");

  return {
    richTextFields: resolveAndDeduplicateFields(
      rawRichTextFields,
      dynamicZones,
      modifiedData
    ),
    blockFields: resolveAndDeduplicateFields(
      rawBlockFields,
      dynamicZones,
      modifiedData
    ),
  };
};
