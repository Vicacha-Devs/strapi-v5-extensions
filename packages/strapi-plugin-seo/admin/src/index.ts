import { Search } from "@strapi/icons";
import { createRegisterTrads } from "@vicacha-devs/plugin-shared";

import pluginPkg from "../../package.json";
import { SeoChecker } from "./components/CMEditView/RightLinksCompo";
import { Initializer } from "./components/Initializer";
import { pluginPermissions } from "./permissions";
import { pluginId } from "./pluginId";

interface StrapiAdminApp {
  addMenuLink: (link: Record<string, unknown>) => void;
  registerPlugin: (plugin: Record<string, unknown>) => void;
  getPlugin: (name: string) => {
    injectComponent: (
      containerName: string,
      blockName: string,
      component: Record<string, unknown>
    ) => void;
  };
}
import ar from "./translations/ar.json";
import en from "./translations/en.json";
import es from "./translations/es.json";
import fr from "./translations/fr.json";
import ptBR from "./translations/pt-BR.json";
import tr from "./translations/tr.json";

const name = pluginPkg.strapi.name;

const TRAD_MAP: Record<string, Record<string, string>> = {
  en,
  es,
  ar,
  tr,
  fr,
  "pt-BR": ptBR,
};

export default {
  register(app: StrapiAdminApp) {
    app.addMenuLink({
      to: `${pluginId}`,
      icon: Search,
      permissions: pluginPermissions.main,
      intlLabel: {
        id: `${pluginId}.Plugin.name`,
        defaultMessage: "SEO",
      },
      Component: () => import("./pages/App"),
    });
    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },
  bootstrap(app: StrapiAdminApp) {
    app
      .getPlugin("content-manager")
      .injectComponent("editView", "right-links", {
        name: "SeoChecker",
        Component: SeoChecker,
      });
  },
  registerTrads: createRegisterTrads({
    pluginId,
    defaultLocales: [],
    keepUnprefixed: false,
    translations: TRAD_MAP,
  }),
};
