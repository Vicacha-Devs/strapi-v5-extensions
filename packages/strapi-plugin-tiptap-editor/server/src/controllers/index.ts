import media from "./media";
import preset from "./preset";
import search from "./search";
import settings from "./settings";
import theme from "./theme";

// Explicit annotation: the inferred type references @strapi/types internals
// that declaration emit cannot name portably (TS2742).
const controllers: Record<string, unknown> = {
  preset,
  theme,
  settings,
  search,
  media,
};

export default controllers;
