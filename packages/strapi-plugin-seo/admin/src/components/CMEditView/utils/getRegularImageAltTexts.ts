import type {
  ContentManagerFormValues,
  ContentTypeSchemaInfo,
} from "../../../../../shared";

const recursiveSearch = (
  obj: Record<string, unknown>,
  keyword: string,
  relations: string[],
  results: string[] = [],
  allImageNames: string[] = [],
  visited: WeakSet<object> = new WeakSet()
): { alternativeTexts: string[]; imageNames: string[] } => {
  const alternativeTexts = results;
  const imageNames = allImageNames;

  if (!obj || typeof obj !== "object" || visited.has(obj)) {
    return { alternativeTexts, imageNames };
  }
  visited.add(obj);

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (key === keyword && (value === null || typeof value !== "object")) {
      alternativeTexts.push(typeof value === "string" ? value : "");
      imageNames.push(typeof obj.name === "string" ? obj.name : "");
    } else if (
      value !== null &&
      typeof value === "object" &&
      !relations.includes(key)
    ) {
      recursiveSearch(
        value as Record<string, unknown>,
        keyword,
        relations,
        alternativeTexts,
        imageNames,
        visited
      );
    }
  });

  return { alternativeTexts, imageNames };
};

export const getRegularImageAltTexts = (
  contentType: ContentTypeSchemaInfo,
  modifiedData: ContentManagerFormValues
): { intersections: number; altTexts: string[] } => {
  const relations = ["localizations"];
  const attributes = contentType?.attributes ?? {};

  Object.keys(attributes).forEach((field) => {
    if (attributes[field]?.type === "relation") {
      relations.push(field);
    }
  });

  const { alternativeTexts, imageNames } = recursiveSearch(
    modifiedData ?? {},
    "alternativeText",
    relations
  );

  const alternativeTextCount = alternativeTexts.length;
  const intersections =
    alternativeTexts.filter((altText) => imageNames.includes(altText)).length -
    alternativeTextCount;

  return { intersections, altTexts: alternativeTexts };
};
