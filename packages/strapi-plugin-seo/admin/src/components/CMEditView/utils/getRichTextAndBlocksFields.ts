import get from "lodash/get";
import isArray from "lodash/isArray";
import isEmpty from "lodash/isEmpty";
import isObject from "lodash/isObject";
import pull from "lodash/pull";

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

export const getRichTextAndBlocksFields = (
  contentType: ContentTypeSchemaInfo,
  components: ComponentSchemasMap,
  modifiedData: ContentManagerFormValues
): { richTextFields: FieldDescriptor[]; blockFields: FieldDescriptor[] } => {
  const dynamicZones: string[] = [];

  Object.entries(modifiedData ?? {}).forEach(([fieldName, fieldValue]) => {
    if (isArray(fieldValue)) {
      const isComponentField = fieldValue.some(
        (subField) => isObject(subField) && "__component" in subField
      );
      if (isComponentField) dynamicZones.push(fieldName);
    }
  });

  const richTextFields = collectFieldsByType(
    contentType,
    components,
    "richtext"
  );
  const blockFields = collectFieldsByType(contentType, components, "blocks");

  const filterFields = (fields: FieldDescriptor[]) => {
    dynamicZones.forEach((dz) => {
      const dynamicZoneData = get<Array<Record<string, unknown>>>(
        modifiedData,
        dz,
        []
      );

      fields.forEach((field, index) => {
        const componentExistsInDZ = dynamicZoneData.filter(
          (x) => x.__component === field.name
        );

        if (
          !isEmpty(componentExistsInDZ) &&
          !field.inDz &&
          field.field &&
          dynamicZoneData.find((x) =>
            Object.prototype.hasOwnProperty.call(x, field.field!)
          )
        ) {
          fields[index] = { ...field, inDz: dz };
        }

        if (isEmpty(componentExistsInDZ) && field.inDz) {
          pull(fields, field);
        }
      });
    });
  };

  filterFields(richTextFields);
  filterFields(blockFields);

  return { richTextFields, blockFields };
};
