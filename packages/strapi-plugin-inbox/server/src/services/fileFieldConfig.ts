import type { FormField } from "../../../shared";

const FILE_KEYS = ["accept", "maxSizeMb", "multiple", "maxFiles"] as const;

/**
 * Native file-upload settings of a field. Empty for non-file fields and for
 * settings that were never configured.
 */
export function fileFieldConfig(
  field: FormField,
  fallback?: FormField
): Partial<Pick<FormField, (typeof FILE_KEYS)[number]>> {
  if (field.type !== "file") return {};
  return Object.fromEntries(
    FILE_KEYS.map((k) => [k, field[k] ?? fallback?.[k]]).filter(
      ([, v]) => v !== undefined
    )
  );
}
