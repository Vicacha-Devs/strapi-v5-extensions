import {
  DEFAULT_RUNTIME_SETTINGS,
  type TiptapOutputFormat,
  type TiptapRuntimeSettings,
} from "../../../shared/src/types";

export function isStoredProseMirrorJson(value: unknown): boolean {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return (value as { type?: unknown }).type === "doc";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as { type?: unknown } | null;
        return Boolean(
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed) &&
          parsed.type === "doc"
        );
      } catch {
        return false;
      }
    }
  }
  return false;
}

export function resolveLinksSchemaContext(
  schemaAttributes?: Record<string, Record<string, unknown>>,
  components?: Record<
    string,
    { attributes?: Record<string, Record<string, unknown>> }
  >,
  linksComponentProp?: unknown
): {
  availableFields: string[] | undefined;
  targetUidToAttribute: Record<string, string>;
  linksComponentUid: string;
} {
  const fields = schemaAttributes ? Object.keys(schemaAttributes) : undefined;
  const componentUid =
    (typeof linksComponentProp === "string" && linksComponentProp) ||
    "links.links";
  const compAttrs = components?.[componentUid]?.attributes;
  const uidMap: Record<string, string> = {};
  if (compAttrs) {
    for (const [attrName, attrDef] of Object.entries(compAttrs)) {
      const targetUid = attrDef?.target ?? attrDef?.targetModel;
      if (attrDef?.type === "relation" && typeof targetUid === "string") {
        uidMap[targetUid] = attrName;
      }
    }
  }
  return {
    availableFields: fields,
    targetUidToAttribute: uidMap,
    linksComponentUid: componentUid,
  };
}

export function mergeSyncedLinksValue(
  fieldName: string,
  linksFieldName: string,
  linksFieldIsRepeatable: boolean,
  currentLinksValue: unknown,
  value: unknown
): unknown {
  if (
    fieldName !== linksFieldName ||
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }
  if (linksFieldIsRepeatable && Array.isArray(value)) {
    const currentArr = Array.isArray(currentLinksValue)
      ? currentLinksValue
      : [];
    const firstExisting =
      currentArr[0] &&
      typeof currentArr[0] === "object" &&
      !Array.isArray(currentArr[0])
        ? (currentArr[0] as Record<string, unknown>)
        : {};
    const firstIncoming =
      value[0] && typeof value[0] === "object" && !Array.isArray(value[0])
        ? (value[0] as Record<string, unknown>)
        : {};
    return [{ ...firstExisting, ...firstIncoming }, ...currentArr.slice(1)];
  }
  if (!linksFieldIsRepeatable && !Array.isArray(value)) {
    return {
      ...(currentLinksValue &&
      typeof currentLinksValue === "object" &&
      !Array.isArray(currentLinksValue)
        ? (currentLinksValue as Record<string, unknown>)
        : {}),
      ...(value as Record<string, unknown>),
    };
  }
  return value;
}

export function parseLoadedRuntimeSettings(data?: {
  defaultPreset?: string;
  enableRelationalSync?: boolean;
  defaultOutputFormat?: TiptapOutputFormat;
}): TiptapRuntimeSettings {
  return {
    ...DEFAULT_RUNTIME_SETTINGS,
    ...(typeof data?.defaultPreset === "string" &&
    data.defaultPreset.trim().length > 0
      ? { defaultPreset: data.defaultPreset.trim() }
      : {}),
    ...(typeof data?.enableRelationalSync === "boolean"
      ? { enableRelationalSync: data.enableRelationalSync }
      : {}),
    ...(data?.defaultOutputFormat === "json" ||
    data?.defaultOutputFormat === "html" ||
    data?.defaultOutputFormat === "markdown"
      ? { defaultOutputFormat: data.defaultOutputFormat }
      : {}),
  };
}
