import { unstable_useContentManagerContext as useContentManagerContext } from "@strapi/strapi/admin";
import * as React from "react";

import { Summary } from "./Summary";

export const SeoChecker = () => {
  const {
    form: { values },
  } = useContentManagerContext();

  if (values?.seo) {
    return <Summary />;
  }

  return <React.Fragment />;
};
