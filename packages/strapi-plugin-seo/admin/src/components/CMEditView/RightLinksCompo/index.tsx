import { unstable_useContentManagerContext as useContentManagerContext } from "@strapi/strapi/admin";
import * as React from "react";

import { findSeoAttributeName } from "../../../../../shared";
import { Summary } from "./Summary";

export const SeoChecker = () => {
  const {
    contentType,
    form: { values },
  } = useContentManagerContext();

  const seoFieldName =
    findSeoAttributeName(contentType?.attributes) ??
    (values?.seo !== undefined ? "seo" : null);

  if (seoFieldName) {
    return <Summary seoFieldName={seoFieldName} />;
  }

  return <React.Fragment />;
};
