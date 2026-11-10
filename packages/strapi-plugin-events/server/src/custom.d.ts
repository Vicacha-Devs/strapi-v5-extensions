declare module "node:crypto" {
  export function randomBytes(size: number): {
    toString(encoding: "hex" | "base64"): string;
  };
  export function createHash(algorithm: "sha256" | string): {
    update(
      data: string | Uint8Array,
      inputEncoding?: "utf8"
    ): {
      digest(encoding: "hex" | "base64"): string;
    };
  };
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
  const cryptoDefault: {
    randomBytes: typeof randomBytes;
    createHash: typeof createHash;
    timingSafeEqual: typeof timingSafeEqual;
  };
  export default cryptoDefault;
}

declare module "node:fs" {
  export function readFileSync(
    path: string,
    encoding: "utf8" | "utf-8"
  ): string;
  export function existsSync(path: string): boolean;
  const fsDefault: {
    readFileSync: typeof readFileSync;
    existsSync: typeof existsSync;
  };
  export default fsDefault;
}

declare module "node:path" {
  export function dirname(p: string): string;
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  const pathDefault: {
    dirname: typeof dirname;
    resolve: typeof resolve;
    join: typeof join;
  };
  export default pathDefault;
}

declare module "node:url" {
  export function fileURLToPath(url: string): string;
}

declare module "@strapi/strapi" {
  export namespace Core {
    export interface PluginStore {
      get(params: { key: string }): Promise<unknown>;
      set(params: { key: string; value: unknown }): Promise<void>;
    }

    export interface ContentTypeSchema {
      kind?: string;
      info?: {
        displayName?: string;
        singularName?: string;
        pluralName?: string;
      };
      attributes?: Record<
        string,
        {
          type?: string;
          private?: boolean;
          customField?: string;
          [key: string]: unknown;
        }
      >;
    }

    export interface DocumentQueryOptions {
      limit?: number;
      locale?: string;
      status?: "draft" | "published";
      filters?: Record<string, unknown>;
    }

    export interface DocumentServiceInstance {
      findMany(
        params?: DocumentQueryOptions
      ): Promise<Array<Record<string, unknown>>>;
      findOne(params: {
        documentId: string;
        locale?: string;
        status?: "draft" | "published";
      }): Promise<Record<string, unknown> | null>;
      create(params: {
        data: Record<string, unknown>;
        status?: "draft" | "published";
      }): Promise<Record<string, unknown>>;
      update(params: {
        documentId: string;
        data: Record<string, unknown>;
      }): Promise<Record<string, unknown> | null>;
    }

    export interface PluginInstance {
      service<T = Record<string, unknown>>(name: string): T;
    }

    export interface Strapi {
      config: {
        get<T = unknown>(key: string, defaultValue?: T): T;
      };
      log: {
        debug(message: string): void;
        info(message: string): void;
        warn(message: string): void;
        error(message: string): void;
      };
      db?: {
        transaction?: <T>(cb: (trx?: unknown) => Promise<T>) => Promise<T>;
      };
      contentTypes: Record<string, ContentTypeSchema>;
      store(params: { type: string; name: string }): PluginStore;
      documents(uid: string): DocumentServiceInstance;
      plugin(name: string): PluginInstance;
      customFields: {
        register(field: {
          name: string;
          plugin: string;
          type: string;
          inputSize?: { default: number; isResizable: boolean };
        }): void;
      };
      admin?: {
        services?: {
          permission?: {
            actionProvider?: {
              registerMany(
                actions: Array<{
                  section: string;
                  displayName: string;
                  uid: string;
                  pluginName: string;
                }>
              ): Promise<void>;
            };
          };
        };
      };
    }
  }
}

declare module "*.json" {
  const value: Record<string, string>;
  export default value;
}
