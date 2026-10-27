import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import type {
  EmptyAltCount,
  KeywordDensityMap,
  OpenGraphData,
  SeoCheckStatus,
  SeoQualityVerdict,
} from '../../../../../shared';

export const qualityVerdict: Record<SeoQualityVerdict, SeoQualityVerdict> = {
  good: 'good',
  improvements: 'improvements',
  bad: 'bad',
};

export const getMetaTitleCheckPreview = (modifiedData: Record<string, any>): SeoCheckStatus => {
  const metaTitle = get<string | null>(modifiedData, 'seo.metaTitle', null);

  let status: SeoCheckStatus = {
    message: '',
    qualityVerdict: qualityVerdict.good,
  };

  if (isNull(metaTitle) || isEmpty(metaTitle)) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.improvements,
    };
  } else if (metaTitle.length > 60) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.bad,
    };
  }
  return status;
};

export const getMetaDescriptionPreview = (modifiedData: Record<string, any>): SeoCheckStatus => {
  const metaDescription = get<string | null>(modifiedData, 'seo.metaDescription', null);

  let status: SeoCheckStatus = {
    message: '',
    qualityVerdict: qualityVerdict.good,
  };

  if (isNull(metaDescription) || isEmpty(metaDescription)) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.improvements,
    };
  } else if (metaDescription.length > 160) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.bad,
    };
  } else if (metaDescription.length < 50) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.bad,
    };
  }
  return status;
};

export const getAlternativeTextPreview = (emptyAltCount: EmptyAltCount): SeoCheckStatus => {
  const intersections = get<number | null>(emptyAltCount, 'intersections', null);
  const richTextAlts = get<EmptyAltCount['richTextAlts']>(emptyAltCount, 'richTextAlts', []);
  const altTexts = get<string[]>(emptyAltCount, 'altTexts', []);

  let status: SeoCheckStatus = {
    message: '',
    qualityVerdict: qualityVerdict.good,
  };

  const missingRichTextAlt = richTextAlts.filter((x) => x.occurences !== 0).length;
  if (intersections === 0) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.bad,
    };
  } else if (altTexts.includes('')) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.improvements,
    };
  } else if (missingRichTextAlt >= 1) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.improvements,
    };
  }
  return status;
};

export const getWordCountPreview = (wordCount: number | null): SeoCheckStatus => {
  let status: SeoCheckStatus = {
    message: '',
    qualityVerdict: qualityVerdict.good,
  };

  if (isNull(wordCount) || wordCount < 300) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.improvements,
    };
  }
  return status;
};

export const getKeywordDensityPreview = (keywordsDensity: KeywordDensityMap): SeoCheckStatus => {
  let status: SeoCheckStatus = {
    message: '',
    qualityVerdict: qualityVerdict.good,
  };

  if (isEmpty(keywordsDensity)) {
    return {
      message: '',
      qualityVerdict: qualityVerdict.improvements,
    };
  }

  Object.keys(keywordsDensity).forEach((keyword) => {
    const count = get<number>(keywordsDensity[keyword], 'count', 0);
    if (count === 0) {
      status = {
        message: '',
        qualityVerdict: qualityVerdict.improvements,
      };
    } else if (count <= 1) {
      status = {
        message: '',
        qualityVerdict: qualityVerdict.bad,
      };
    }
  });

  return status;
};

export const canonicalUrlPreview = (modifiedData: Record<string, any>): SeoCheckStatus => {
  const canonicalUrl = get<string | null>(modifiedData, 'seo.canonicalURL', null);
  let status: SeoCheckStatus = {
    message: '',
    qualityVerdict: qualityVerdict.good,
  };
  if (isNull(canonicalUrl)) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.bad,
    };
  }
  return status;
};

export const lastUpdatedAtPreview = (modifiedData: Record<string, any>): SeoCheckStatus => {
  const updatedAt = get<string | null>(modifiedData, 'updatedAt', null);

  let status: SeoCheckStatus = {
    message: '',
    qualityVerdict: qualityVerdict.improvements,
  };

  if (isNull(updatedAt)) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.bad,
    };
  } else {
    const oneYearAgo = Date.parse(new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString());
    if (Date.parse(updatedAt) >= oneYearAgo) {
      status = {
        message: '',
        qualityVerdict: qualityVerdict.good,
      };
    }
  }
  return status;
};

export const metaRobotPreview = (modifiedData: Record<string, any>): SeoCheckStatus => {
  const metaRobots = get<string | null>(modifiedData, 'seo.metaRobots', null);
  if (isNull(metaRobots) || isEmpty(metaRobots)) {
    return {
      message: '',
      qualityVerdict: qualityVerdict.good,
    };
  }
  return {
    message: '',
    qualityVerdict: qualityVerdict.good,
  };
};

export const openGraphPreview = (modifiedData: Record<string, any>): SeoCheckStatus => {
  const openGraph = get<OpenGraphData | null>(modifiedData, 'seo.openGraph', null);

  let status: SeoCheckStatus = {
    message: '',
    qualityVerdict: qualityVerdict.good,
  };

  if (isNull(openGraph) || openGraph === undefined) {
    return {
      message: '',
      qualityVerdict: qualityVerdict.bad,
    };
  } else if (!openGraph.ogTitle || !openGraph.ogDescription || !openGraph.ogImage) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.improvements,
    };
  }
  return status;
};

export const structuredDataPreview = (modifiedData: Record<string, any>): SeoCheckStatus => {
  const structuredData = get<unknown>(modifiedData, 'seo.structuredData', null);
  let status: SeoCheckStatus = {
    message: '',
    qualityVerdict: qualityVerdict.good,
  };
  if (isEmpty(structuredData)) {
    status = {
      message: '',
      qualityVerdict: qualityVerdict.bad,
    };
  }
  return status;
};
