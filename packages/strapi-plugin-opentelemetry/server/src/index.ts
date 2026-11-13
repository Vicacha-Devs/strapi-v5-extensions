import type { Core } from "@strapi/strapi";

import {
  defaultConfig,
  resolveOtelConfig,
  validateOtelConfig,
  type OtelPluginConfig,
} from "./config";
import {
  registerDocumentServiceInstrumentation,
  type StrapiDocumentsLike,
} from "./documents";
import {
  instrumentStrapiLogger,
  type StrapiLoggerWithError,
} from "./logger-hook";
import { createOtelRequestMiddleware, type KoaLikeContext } from "./middleware";
import { shutdownOtelSdk, startOtelSdk } from "./sdk";

const PLUGIN_ID = "opentelemetry";

function getPluginConfig(strapi: Core.Strapi): OtelPluginConfig {
  const raw = strapi.config.get<Partial<OtelPluginConfig>>(
    `plugin::${PLUGIN_ID}`,
    {}
  );
  return resolveOtelConfig(raw);
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    const cfg = getPluginConfig(strapi);
    if (!cfg.enabled) {
      return;
    }

    startOtelSdk(cfg);

    instrumentStrapiLogger(
      strapi.log as unknown as StrapiLoggerWithError | undefined,
      cfg
    );

    const requestMiddleware = createOtelRequestMiddleware(cfg, strapi.log);
    strapi.server.use(
      requestMiddleware as (
        ctx: KoaLikeContext,
        next: () => Promise<void>
      ) => Promise<void>
    );

    registerDocumentServiceInstrumentation(
      strapi.documents as unknown as StrapiDocumentsLike | undefined,
      cfg
    );
  },

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const cfg = getPluginConfig(strapi);
    if (cfg.enabled) {
      strapi.log.info(
        `[opentelemetry] Active for service "${cfg.serviceName}" (${cfg.otlpEndpoint || (cfg.consoleExporter ? "console" : "no-exporter")})`
      );
    }
  },

  async destroy() {
    await shutdownOtelSdk();
  },

  config: {
    default: defaultConfig,
    validator: validateOtelConfig,
  },

  middlewares: {
    tracker: (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
      const cfg = getPluginConfig(strapi);
      return createOtelRequestMiddleware(cfg, strapi.log);
    },
  },
};
