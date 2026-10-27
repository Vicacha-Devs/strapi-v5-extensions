import isNull from 'lodash/isNull';

const recursiveSearch = (
  obj: Record<string, any>,
  keyword: string,
  relations: string[],
  results: string[] = [],
  allImageNames: string[] = []
): { alternativeTexts: string[]; imageNames: string[] } => {
  const alternativeTexts = results;
  const imageNames = allImageNames;

  if (!obj || typeof obj !== 'object') {
    return { alternativeTexts, imageNames };
  }

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (key === keyword && typeof value !== 'object') {
      alternativeTexts.push(typeof value === 'string' ? value : '');
      imageNames.push(typeof obj.name === 'string' ? obj.name : '');
    } else if (typeof value === 'object' && !relations.includes(key) && !isNull(value)) {
      recursiveSearch(value as Record<string, any>, keyword, relations, alternativeTexts, imageNames);
    }
  });

  return { alternativeTexts, imageNames };
};

export const getRegularImageAltTexts = (
  contentType: Record<string, any>,
  modifiedData: Record<string, any>
): { intersections: number; altTexts: string[] } => {
  const relations = ['localizations'];
  const attributes = contentType?.attributes ?? {};

  Object.keys(attributes).forEach((field) => {
    if (attributes[field]?.type === 'relation') {
      relations.push(field);
    }
  });

  const { alternativeTexts, imageNames } = recursiveSearch(
    modifiedData ?? {},
    'alternativeText',
    relations
  );

  const alternativeTextCount = alternativeTexts.length;
  const intersections =
    alternativeTexts.filter((altText) => imageNames.includes(altText)).length -
    alternativeTextCount;

  return { intersections, altTexts: alternativeTexts };
};
