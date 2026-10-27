import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import showdown from 'showdown';
import type {
  EmptyAltCount,
  EmptyAltOccurrence,
  KeywordDensityMap,
  RichTextAnalysisResult,
} from '../../../../../shared';
import { getRegularImageAltTexts } from './getRegularImageAltTexts';
import { getRichTextAndBlocksFields } from './getRichTextAndBlocksFields';

const converter = new showdown.Converter();

const extractTextFromBlocks = (blocks: Array<Record<string, any>>): string => {
  let textContent = '';

  blocks.forEach((block) => {
    if (block.type === 'text' && typeof block.text === 'string') {
      textContent += `${block.text} `;
    } else if (block.children && isArray(block.children)) {
      textContent += `${extractTextFromBlocks(block.children)} `;
    } else if (block.content && isArray(block.content)) {
      textContent += `${extractTextFromBlocks(block.content)} `;
    }
  });

  return textContent.trim();
};

const countMissingBlockImageAlts = (nodes: Array<Record<string, any>>): number => {
  let missingCount = 0;

  nodes.forEach((element) => {
    if (!element || typeof element !== 'object') return;

    if (element.type === 'image' && element.image) {
      if (!element.image.alternativeText) {
        missingCount += 1;
      }
    } else if (
      (element.type === 'image' || element.type === 'mediaLibraryImage') &&
      element.attrs &&
      typeof element.attrs === 'object'
    ) {
      if (!element.attrs.alt && !element.attrs.alternativeText) {
        missingCount += 1;
      }
    }

    if (Array.isArray(element.children)) {
      missingCount += countMissingBlockImageAlts(element.children);
    }
    if (Array.isArray(element.content)) {
      missingCount += countMissingBlockImageAlts(element.content);
    }
  });

  return missingCount;
};

const tryParseRichTextNodes = (rawValue: unknown): Array<Record<string, any>> | null => {
  if (Array.isArray(rawValue)) {
    return rawValue as Array<Record<string, any>>;
  }
  if (rawValue && typeof rawValue === 'object') {
    const obj = rawValue as Record<string, any>;
    if (Array.isArray(obj.content)) {
      return obj.content;
    }
  }
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.content)) {
          return parsed.content;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
};

const getEmptyAltCount = (
  richtext: unknown,
  field: string,
  name: string | null,
  isBlock = false
): EmptyAltOccurrence => {
  let htmlOccurrences = 0;
  let markdownOccurrences = 0;
  let blockOccurences = 0;

  if (isBlock && Array.isArray(richtext)) {
    blockOccurences = countMissingBlockImageAlts(richtext);
  } else if (typeof richtext === 'string' && richtext) {
    markdownOccurrences = richtext.split('\n').filter((entry) => entry.includes('![](')).length;

    const htmlImages = richtext.match(/<img[^>]*\/?>/g) || [];
    htmlOccurrences = htmlImages.filter((image) => !image.includes('alt=')).length;
  }

  if (name) {
    if (name.includes('.')) {
      return {
        field: `[dynamic-zone].${name.split('.').pop()}.${field}`,
        occurences: markdownOccurrences + htmlOccurrences + blockOccurences,
      };
    }
    return {
      field: `${name}.${field}`,
      occurences: markdownOccurrences + htmlOccurrences + blockOccurences,
    };
  }
  return { field, occurences: markdownOccurrences + htmlOccurrences + blockOccurences };
};

const increaseCounter = (
  base: Record<string, any>,
  field: string,
  isBlock = false,
  name: string | null = null
): { words: string[]; length: number; emptyAlts: EmptyAltOccurrence } => {
  let richtext = '';
  let emptyAlts: EmptyAltOccurrence = { field, occurences: 0 };
  let parsedAsTree = isBlock;
  const rawValue = base?.[field];

  const treeNodes = tryParseRichTextNodes(rawValue);
  if (isBlock || treeNodes) {
    const blocks = treeNodes ?? [];
    richtext = extractTextFromBlocks(blocks);
    emptyAlts = getEmptyAltCount(blocks, field, name, true);
    parsedAsTree = true;
  } else {
    richtext = typeof rawValue === 'string' ? rawValue : '';
    emptyAlts = getEmptyAltCount(richtext, field, name);
  }

  if (richtext) {
    const html = parsedAsTree ? richtext : converter.makeHtml(richtext);
    const words = html
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/\n/g, ' ')
      .toLowerCase()
      .split(' ')
      .filter((entry) => entry !== '' && entry !== '\n');

    return { words, length: words.length, emptyAlts };
  }

  return { words: [], length: 0, emptyAlts };
};

const buildKeywordDensityObject = (
  keywords: string[],
  words: string[],
  keywordsDensity: KeywordDensityMap
): KeywordDensityMap => {
  const tempKeywordsDensity: KeywordDensityMap = { ...keywordsDensity };

  keywords.forEach((keyword) => {
    if (!isEmpty(keyword)) {
      const trimmedKeyword = keyword.trim();
      const regex = new RegExp(trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const count = (words.join(' ').match(regex) || []).length;

      if (!Object.prototype.hasOwnProperty.call(tempKeywordsDensity, trimmedKeyword)) {
        tempKeywordsDensity[trimmedKeyword] = { count };
      } else {
        tempKeywordsDensity[trimmedKeyword].count += count;
      }
    }
  });

  return tempKeywordsDensity;
};

const adjustIntersections = (data: RichTextAnalysisResult): RichTextAnalysisResult => {
  const { emptyAltCount } = data;
  let occurrences = 0;

  emptyAltCount.richTextAlts.forEach((alt) => {
    occurrences += alt.occurences;
  });

  emptyAltCount.blockTextAlts.forEach((alt) => {
    occurrences += alt.occurences;
  });

  emptyAltCount.intersections -= occurrences;
  return data;
};

export const getRichTextData = (
  modifiedData: Record<string, any>,
  components: Record<string, any>,
  contentType: Record<string, any>
): RichTextAnalysisResult => {
  const { richTextFields, blockFields } = getRichTextAndBlocksFields(
    contentType,
    components,
    modifiedData
  );

  const { intersections, altTexts } = getRegularImageAltTexts(contentType, modifiedData);

  const emptyAltCount: EmptyAltCount = {
    intersections,
    richTextAlts: [],
    blockTextAlts: [],
    altTexts,
  };

  let wordCount = 0;
  let keywords: string[] = [];
  let keywordsDensity: KeywordDensityMap = {};

  const seoKeywords = modifiedData?.seo?.keywords ?? '';
  if (typeof seoKeywords === 'string' && seoKeywords) {
    keywords = seoKeywords.toLowerCase().split(',');
  }

  richTextFields.forEach((data) => {
    if (isNull(data.field)) {
      const { words, length, emptyAlts } = increaseCounter(modifiedData, data.name);
      wordCount += length;
      emptyAltCount.richTextAlts.push(emptyAlts);
      keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
    } else if (!data.inDz) {
      const item = get<any>(modifiedData, data.name.split('.').pop() || '', '');
      if (item) {
        if (isArray(item)) {
          item.forEach((entry) => {
            const { words, length, emptyAlts } = increaseCounter(
              entry,
              data.field!,
              false,
              data.name
            );
            wordCount += length;
            emptyAltCount.richTextAlts.push(emptyAlts);
            keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
          });
        } else {
          const { words, length, emptyAlts } = increaseCounter(
            item,
            data.field!,
            false,
            data.name
          );
          wordCount += length;
          emptyAltCount.richTextAlts.push(emptyAlts);
          keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
        }
      }
    } else {
      const dzComponents = get<Array<Record<string, any>>>(modifiedData, data.inDz, []);
      if (!isEmpty(dzComponents)) {
        const richTextComponents = dzComponents.filter((x) => x.__component === data.name);

        richTextComponents.forEach((component) => {
          const item = get<any>(component, data.field!, []);
          if (isArray(item)) {
            item.forEach((entry) => {
              const { words, length, emptyAlts } = increaseCounter(
                entry,
                data.field!,
                false,
                data.name
              );
              wordCount += length;
              emptyAltCount.richTextAlts.push(emptyAlts);
              keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
            });
          } else {
            const { words, length, emptyAlts } = increaseCounter(
              component,
              data.field!,
              false,
              data.name
            );
            wordCount += length;
            emptyAltCount.richTextAlts.push(emptyAlts);
            keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
          }
        });
      }
    }
  });

  blockFields.forEach((data) => {
    if (isNull(data.field)) {
      const { words, length, emptyAlts } = increaseCounter(modifiedData, data.name, true);
      wordCount += length;
      emptyAltCount.blockTextAlts.push(emptyAlts);
      keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
    } else if (!data.inDz) {
      const item = get<any>(modifiedData, data.name.split('.').pop() || '', '');
      if (item) {
        if (isArray(item)) {
          item.forEach((entry) => {
            const { words, length, emptyAlts } = increaseCounter(
              entry,
              data.field!,
              true,
              data.name
            );
            wordCount += length;
            emptyAltCount.blockTextAlts.push(emptyAlts);
            keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
          });
        } else {
          const { words, length, emptyAlts } = increaseCounter(
            item,
            data.field!,
            true,
            data.name
          );
          wordCount += length;
          emptyAltCount.blockTextAlts.push(emptyAlts);
          keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
        }
      }
    } else {
      const dzComponents = get<Array<Record<string, any>>>(modifiedData, data.inDz, []);
      if (!isEmpty(dzComponents)) {
        const blockComponents = dzComponents.filter((x) => x.__component === data.name);

        blockComponents.forEach((component) => {
          const item = get<any>(component, data.field!, []);
          if (isArray(item)) {
            item.forEach((entry) => {
              const { words, length, emptyAlts } = increaseCounter(
                entry,
                data.field!,
                true,
                data.name
              );
              wordCount += length;
              emptyAltCount.blockTextAlts.push(emptyAlts);
              keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
            });
          } else {
            const { words, length, emptyAlts } = increaseCounter(
              component,
              data.field!,
              true,
              data.name
            );
            wordCount += length;
            emptyAltCount.blockTextAlts.push(emptyAlts);
            keywordsDensity = buildKeywordDensityObject(keywords, words, keywordsDensity);
          }
        });
      }
    }
  });

  return adjustIntersections({
    wordCount,
    keywordsDensity,
    emptyAltCount,
  });
};
