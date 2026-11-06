import type {
  ContentManagerFormValues,
  EmptyAltCount,
  KeywordDensityMap,
  OpenGraphData,
  SeoCheckStatus,
  SeoQualityVerdict,
} from "../../../../../shared";

export const qualityVerdict: Record<SeoQualityVerdict, SeoQualityVerdict> = {
  good: "good",
  improvements: "improvements",
  bad: "bad",
};

export const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
};

export const isSameCheckStatus = (
  a?: SeoCheckStatus | null,
  b?: SeoCheckStatus | null
): boolean => {
  if (!a || !b) return false;
  return a.qualityVerdict === b.qualityVerdict && a.message === b.message;
};

export const getMetaTitleCheckPreview = (
  modifiedData: ContentManagerFormValues
): SeoCheckStatus => {
  const metaTitle = modifiedData?.seo?.metaTitle ?? null;

  if (typeof metaTitle !== "string" || isEmptyValue(metaTitle)) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.improvements,
    };
  }
  if (metaTitle.length > 60) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.bad,
    };
  }
  return {
    message: "",
    qualityVerdict: qualityVerdict.good,
  };
};

export const getMetaDescriptionPreview = (
  modifiedData: ContentManagerFormValues
): SeoCheckStatus => {
  const metaDescription = modifiedData?.seo?.metaDescription ?? null;

  if (typeof metaDescription !== "string" || isEmptyValue(metaDescription)) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.improvements,
    };
  }
  if (metaDescription.length > 160 || metaDescription.length < 50) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.bad,
    };
  }
  return {
    message: "",
    qualityVerdict: qualityVerdict.good,
  };
};

export const getAlternativeTextPreview = (
  emptyAltCount: EmptyAltCount
): SeoCheckStatus => {
  const intersections = emptyAltCount?.intersections ?? null;
  const richTextAlts = Array.isArray(emptyAltCount?.richTextAlts)
    ? emptyAltCount.richTextAlts
    : [];
  const blockTextAlts = Array.isArray(emptyAltCount?.blockTextAlts)
    ? emptyAltCount.blockTextAlts
    : [];
  const altTexts = Array.isArray(emptyAltCount?.altTexts)
    ? emptyAltCount.altTexts
    : [];

  const missingRichOrBlockAlt = [...richTextAlts, ...blockTextAlts].filter(
    (x) => x.occurences !== 0
  ).length;

  if (intersections === 0) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.bad,
    };
  }
  if (altTexts.includes("") || missingRichOrBlockAlt >= 1) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.improvements,
    };
  }
  return {
    message: "",
    qualityVerdict: qualityVerdict.good,
  };
};

export const getWordCountPreview = (
  wordCount: number | null
): SeoCheckStatus => {
  if (typeof wordCount !== "number" || wordCount < 300) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.improvements,
    };
  }
  return {
    message: "",
    qualityVerdict: qualityVerdict.good,
  };
};

export const getKeywordDensityPreview = (
  keywordsDensity: KeywordDensityMap
): SeoCheckStatus => {
  if (isEmptyValue(keywordsDensity)) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.improvements,
    };
  }

  let hasUnused = false;
  let hasUsedOnce = false;

  Object.keys(keywordsDensity).forEach((keyword) => {
    const count = keywordsDensity[keyword]?.count ?? 0;
    if (count === 0) {
      hasUnused = true;
    } else if (count <= 1) {
      hasUsedOnce = true;
    }
  });

  if (hasUsedOnce) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.bad,
    };
  }
  if (hasUnused) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.improvements,
    };
  }

  return {
    message: "",
    qualityVerdict: qualityVerdict.good,
  };
};

export const canonicalUrlPreview = (
  modifiedData: ContentManagerFormValues
): SeoCheckStatus => {
  const canonicalUrl = modifiedData?.seo?.canonicalURL ?? null;
  if (typeof canonicalUrl !== "string" || isEmptyValue(canonicalUrl)) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.bad,
    };
  }
  return {
    message: "",
    qualityVerdict: qualityVerdict.good,
  };
};

export const lastUpdatedAtPreview = (
  modifiedData: ContentManagerFormValues,
  fallbackUpdatedAt: string | null = null
): SeoCheckStatus => {
  const updatedAt = fallbackUpdatedAt ?? modifiedData?.updatedAt ?? null;

  if (typeof updatedAt !== "string" || isEmptyValue(updatedAt)) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.bad,
    };
  }

  const parsedUpdatedAt = Date.parse(updatedAt);
  if (Number.isNaN(parsedUpdatedAt)) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.bad,
    };
  }

  const oneYearAgoDate = new Date();
  oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);
  if (parsedUpdatedAt >= oneYearAgoDate.getTime()) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.good,
    };
  }

  return {
    message: "",
    qualityVerdict: qualityVerdict.improvements,
  };
};

export const metaRobotPreview = (
  modifiedData: ContentManagerFormValues
): SeoCheckStatus => {
  const metaRobots = modifiedData?.seo?.metaRobots ?? null;
  if (typeof metaRobots !== "string" || isEmptyValue(metaRobots)) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.good,
    };
  }
  return {
    message: "",
    qualityVerdict: qualityVerdict.good,
  };
};

export const openGraphPreview = (
  modifiedData: ContentManagerFormValues
): SeoCheckStatus => {
  const openGraph: OpenGraphData | null = modifiedData?.seo?.openGraph ?? null;

  if (!openGraph || typeof openGraph !== "object") {
    return {
      message: "",
      qualityVerdict: qualityVerdict.bad,
    };
  }
  if (
    isEmptyValue(openGraph.ogTitle) ||
    isEmptyValue(openGraph.ogDescription) ||
    !openGraph.ogImage
  ) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.improvements,
    };
  }
  return {
    message: "",
    qualityVerdict: qualityVerdict.good,
  };
};

export const structuredDataPreview = (
  modifiedData: ContentManagerFormValues
): SeoCheckStatus => {
  const structuredData = modifiedData?.seo?.structuredData ?? null;
  if (isEmptyValue(structuredData)) {
    return {
      message: "",
      qualityVerdict: qualityVerdict.bad,
    };
  }
  return {
    message: "",
    qualityVerdict: qualityVerdict.good,
  };
};
