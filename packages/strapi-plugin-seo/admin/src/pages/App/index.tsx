import {
  Page,
  private_AutoReloadOverlayBlockerProvider as AutoReloadOverlayBlockerProvider,
} from "@strapi/strapi/admin";
import * as React from "react";
import { Route, Routes } from "react-router-dom";

import { pluginPermissions } from "../../permissions";
import { HomePage } from "../HomePage";

const App = () => {
  return (
    <AutoReloadOverlayBlockerProvider>
      <Page.Protect permissions={pluginPermissions.main}>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="*" element={<Page.Error />} />
        </Routes>
      </Page.Protect>
    </AutoReloadOverlayBlockerProvider>
  );
};

export default App;
