import type {
  ComponentSchemasMap,
  ContentManagerFormValues,
  ContentTypeSchemaInfo,
  EmptyAltCount,
  EmptyAltOccurrence,
  KeywordDensityMap,
  RichTextAnalysisResult,
  RichTextBlockNode,
} from "../../../../../shared";
import { getRegularImageAltTexts } from "./getRegularImageAltTexts";
import {
  type FieldDescriptor,
  getRichTextAndBlocksFields,
} from "./getRichTextAndBlocksFields";

const extractTextFromBlocks = (blocks: RichTextBlockNode[]): string => {
  let textContent = "";

  blocks.forEach((block) => {
    if (!block || typeof block !== "object") return;
    if (block.type === "text" && typeof block.text === "string") {
      textContent += `${block.text} `;
    } else if (Array.isArray(block.children)) {
      textContent += `${extractTextFromBlocks(block.children)} `;
    } else if (Array.isArray(block.content)) {
      textContent += `${extractTextFromBlocks(block.content)} `;
    }
  });

  return textContent.trim();
};

const isImageElementMissingAlt = (element: RichTextBlockNode): boolean => {
  if (element.type !== "image" || !element.image) return false;
  const alt = element.image.alternativeText;
  return typeof alt !== "string" || alt.trim().length === 0;
};

const isMediaAttrElementMissingAlt = (element: RichTextBlockNode): boolean => {
  if (element.type === "image" && element.image) return false;
  const isMediaType =
    element.type === "image" || element.type === "mediaLibraryImage";
  if (!isMediaType || !element.attrs) return false;
  const alt = element.attrs.alt ?? element.attrs.alternativeText;
  return typeof alt !== "string" || alt.trim().length === 0;
};

const countMissingBlockImageAlts = (nodes: RichTextBlockNode[]): number => {
  let missingCount = 0;

  nodes.forEach((element) => {
    if (!element || typeof element !== "object") return;

    if (
      isImageElementMissingAlt(element) ||
      isMediaAttrElementMissingAlt(element)
    ) {
      missingCount += 1;
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

const extractNodesFromParsedObject = (
  value: unknown
): RichTextBlockNode[] | null => {
  if (Array.isArray(value)) {
    return value as RichTextBlockNode[];
  }
  if (value && typeof value === "object") {
    const obj = value as { content?: unknown };
    if (Array.isArray(obj.content)) {
      return obj.content as RichTextBlockNode[];
    }
  }
  return null;
};

const tryParseJsonStringNodes = (
  rawString: string
): RichTextBlockNode[] | null => {
  const trimmed = rawString.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    return extractNodesFromParsedObject(JSON.parse(trimmed));
  } catch {
    return null;
  }
};

const tryParseRichTextNodes = (
  rawValue: unknown
): RichTextBlockNode[] | null => {
  if (typeof rawValue === "string") {
    return tryParseJsonStringNodes(rawValue);
  }
  return extractNodesFromParsedObject(rawValue);
};

const formatAltFieldName = (field: string, name: string | null): string => {
  if (!name) return field;
  if (name.includes(".")) {
    return `[dynamic-zone].${name.split(".").pop()}.${field}`;
  }
  return `${name}.${field}`;
};

const HTML_ALT_PATTERNS = [
  /\balt\s*=\s*"[^"]*[^\s"][^"]*"/i,
  /\balt\s*=\s*'[^']*[^\s'][^']*'/i,
  /\balt\s*=\s*[^\s"'=<>`]+/i,
];

const hasNonEmptyHtmlAlt = (imgTag: string): boolean =>
  HTML_ALT_PATTERNS.some((pattern) => pattern.test(imgTag));

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
    blockOccurences = countMissingBlockImageAlts(
      richtext as RichTextBlockNode[]
    );
  } else if (typeof richtext === "string" && richtext) {
    const emptyMdImages = richtext.match(/!\[\s*\]\([^)]*\)/g);
    markdownOccurrences = emptyMdImages ? emptyMdImages.length : 0;

    const htmlImages = richtext.match(/<img\b[^>]*\/?>/gi) || [];
    htmlOccurrences = htmlImages.filter(
      (image) => !hasNonEmptyHtmlAlt(image)
    ).length;
  }

  return {
    field: formatAltFieldName(field, name),
    occurences: markdownOccurrences + htmlOccurrences + blockOccurences,
  };
};

const stripMarkdownAndHtmlToWords = (input: string, isPlainTree: boolean) => {
  const withoutMarkdown = isPlainTree
    ? input
    : input
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, " $1 ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ")
        .replace(/<[^>]+>/g, " ")
        .replace(/[#>*_`~-]+/g, " ");

  return withoutMarkdown
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter((entry) => entry.length > 0);
};

const increaseCounter = (
  base: Record<string, unknown>,
  field: string,
  isBlock = false,
  name: string | null = null
): { words: string[]; length: number; emptyAlts: EmptyAltOccurrence } => {
  let richtext: string;
  let emptyAlts: EmptyAltOccurrence;
  let parsedAsTree = isBlock;
  const rawValue = base?.[field];

  const treeNodes = tryParseRichTextNodes(rawValue);
  if (isBlock || treeNodes) {
    const blocks = treeNodes ?? [];
    richtext = extractTextFromBlocks(blocks);
    emptyAlts = getEmptyAltCount(blocks, field, name, true);
    parsedAsTree = true;
  } else {
    richtext = typeof rawValue === "string" ? rawValue : "";
    emptyAlts = getEmptyAltCount(richtext, field, name);
  }

  if (richtext) {
    const words = stripMarkdownAndHtmlToWords(richtext, parsedAsTree);
    return { words, length: words.length, emptyAlts };
  }

  return { words: [], length: 0, emptyAlts };
};

const buildKeywordDensityObject = (
  keywords: string[],
  words: string[],
  keywordsDensity: KeywordDensityMap
): KeywordDensityMap => {
  const tempKeywordsDensity: KeywordDensityMap = {};
  Object.keys(keywordsDensity).forEach((key) => {
    tempKeywordsDensity[key] = { count: keywordsDensity[key].count };
  });

  const joinedWords = words.join(" ");

  keywords.forEach((keyword) => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;

    const regex = new RegExp(
      trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "g"
    );
    const count = joinedWords ? (joinedWords.match(regex) || []).length : 0;

    if (
      !Object.prototype.hasOwnProperty.call(tempKeywordsDensity, trimmedKeyword)
    ) {
      tempKeywordsDensity[trimmedKeyword] = { count };
    } else {
      tempKeywordsDensity[trimmedKeyword] = {
        count: tempKeywordsDensity[trimmedKeyword].count + count,
      };
    }
  });

  return tempKeywordsDensity;
};

const adjustIntersections = (
  data: RichTextAnalysisResult
): RichTextAnalysisResult => {
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

interface AnalysisAccumulator {
  wordCount: number;
  keywords: string[];
  keywordsDensity: KeywordDensityMap;
  targetAlts: EmptyAltOccurrence[];
}

const recordIncrease = (
  acc: AnalysisAccumulator,
  base: Record<string, unknown>,
  field: string,
  isBlock: boolean,
  name: string | null = null
) => {
  const { words, length, emptyAlts } = increaseCounter(
    base,
    field,
    isBlock,
    name
  );
  acc.wordCount += length;
  acc.targetAlts.push(emptyAlts);
  acc.keywordsDensity = buildKeywordDensityObject(
    acc.keywords,
    words,
    acc.keywordsDensity
  );
};

const processComponentFieldItem = (
  acc: AnalysisAccumulator,
  item: unknown,
  fallbackBase: Record<string, unknown>,
  field: string,
  isBlock: boolean,
  name: string
) => {
  if (Array.isArray(item)) {
    item.forEach((entry) => {
      if (entry && typeof entry === "object") {
        recordIncrease(
          acc,
          entry as Record<string, unknown>,
          field,
          isBlock,
          name
        );
      }
    });
  } else {
    recordIncrease(acc, fallbackBase, field, isBlock, name);
  }
};

const processSingleFieldDescriptor = (
  acc: AnalysisAccumulator,
  modifiedData: ContentManagerFormValues,
  data: FieldDescriptor,
  isBlock: boolean
) => {
  if (data.field === null) {
    recordIncrease(acc, modifiedData, data.name, isBlock);
    return;
  }

  if (!data.inDz) {
    const compKey = data.name.split(".").pop() || "";
    const item = modifiedData?.[compKey] ?? modifiedData?.[data.name];
    if (item && typeof item === "object") {
      processComponentFieldItem(
        acc,
        item,
        item as Record<string, unknown>,
        data.field,
        isBlock,
        data.name
      );
    }
    return;
  }

  const rawDz = modifiedData?.[data.inDz];
  const dzComponents = Array.isArray(rawDz)
    ? (rawDz.filter(
        (x): x is Record<string, unknown> => Boolean(x) && typeof x === "object"
      ) as Array<Record<string, unknown>>)
    : [];
  if (dzComponents.length === 0) return;

  const matchingComponents = dzComponents.filter(
    (x) => x.__component === data.name
  );
  matchingComponents.forEach((component) => {
    const item = component?.[data.field!] ?? [];
    processComponentFieldItem(
      acc,
      item,
      component,
      data.field!,
      isBlock,
      data.name
    );
  });
};

export const getRichTextData = (
  modifiedData: ContentManagerFormValues,
  components: ComponentSchemasMap,
  contentType: ContentTypeSchemaInfo
): RichTextAnalysisResult => {
  const { richTextFields, blockFields } = getRichTextAndBlocksFields(
    contentType,
    components,
    modifiedData
  );

  const { intersections, altTexts } = getRegularImageAltTexts(
    contentType,
    modifiedData
  );

  const emptyAltCount: EmptyAltCount = {
    intersections,
    richTextAlts: [],
    blockTextAlts: [],
    altTexts,
  };

  const seoKeywords = modifiedData?.seo?.keywords ?? "";
  const keywords =
    typeof seoKeywords === "string" && seoKeywords.trim().length > 0
      ? seoKeywords
          .toLowerCase()
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0)
      : [];

  const initialKeywordsDensity: KeywordDensityMap = {};
  keywords.forEach((keyword) => {
    initialKeywordsDensity[keyword] = { count: 0 };
  });

  const richTextAcc: AnalysisAccumulator = {
    wordCount: 0,
    keywords,
    keywordsDensity: initialKeywordsDensity,
    targetAlts: emptyAltCount.richTextAlts,
  };

  richTextFields.forEach((data) => {
    processSingleFieldDescriptor(richTextAcc, modifiedData, data, false);
  });

  const blockAcc: AnalysisAccumulator = {
    wordCount: richTextAcc.wordCount,
    keywords,
    keywordsDensity: richTextAcc.keywordsDensity,
    targetAlts: emptyAltCount.blockTextAlts,
  };

  blockFields.forEach((data) => {
    processSingleFieldDescriptor(blockAcc, modifiedData, data, true);
  });

  return adjustIntersections({
    wordCount: blockAcc.wordCount,
    keywordsDensity: blockAcc.keywordsDensity,
    emptyAltCount,
  });
};
