import type { Core } from "@strapi/strapi";

import { createCaseworkHandlers } from "./caseworkHandlers";
import { createCommunityHandlers } from "./communityHandlers";
import { createFormHandlers } from "./formHandlers";

export interface ControllerCtx {
  params?: Record<string, string>;
  query?: Record<string, string>;
  request: {
    body?: Record<string, unknown>;
    ip?: string;
    headers?: Record<string, string | undefined>;
  };
  set?: (header: string, value: string) => void;
  status?: number;
  body?: unknown;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  ...createFormHandlers(strapi),
  ...createCaseworkHandlers(strapi),
  ...createCommunityHandlers(strapi),
});
