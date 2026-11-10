declare const Buffer: {
  from(
    input: string,
    encoding?: "utf8" | "utf-8" | "hex" | "base64" | "base64url"
  ): Uint8Array & {
    toString(
      encoding?: "utf8" | "utf-8" | "hex" | "base64" | "base64url"
    ): string;
  };
  byteLength(input: string, encoding?: "utf8" | "utf-8"): number;
};

declare const process: {
  env: Record<string, string | undefined>;
};

declare module "node:crypto" {
  export interface Hmac {
    update(data: string | Uint8Array, inputEncoding?: "utf8" | "utf-8"): Hmac;
    digest(encoding: "hex" | "base64" | "base64url"): string;
    digest(): Uint8Array;
  }
  export function createHmac(algorithm: string, key: string | Uint8Array): Hmac;
  export function randomBytes(size: number): Uint8Array & {
    toString(encoding?: "hex" | "base64" | "base64url" | "utf8"): string;
  };
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

declare module "node:assert/strict" {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): string | void;
    throws(fn: () => unknown, regExp?: RegExp | Error): void;
    rejects(fn: () => Promise<unknown>, regExp?: RegExp | Error): Promise<void>;
  };
  export default assert;
}

declare module "node:test" {
  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}

declare module "@strapi/strapi" {
  export namespace Core {
    export interface PluginStore {
      get(params: { key: string }): Promise<unknown>;
      set(params: { key: string; value: unknown }): Promise<void>;
    }

    export interface ContentTypeSchema {
      kind?: string;
      collectionName?: string;
      info?: {
        displayName?: string;
        singularName?: string;
        pluralName?: string;
      };
      attributes?: Record<
        string,
        {
          type?: string;
          customField?: string;
          [key: string]: unknown;
        }
      >;
    }

    export interface DocumentQueryOptions {
      start?: number;
      limit?: number;
      locale?: string;
      status?: "draft" | "published";
      filters?: Record<string, unknown>;
      populate?: string[];
      sort?: string | Record<string, string>;
    }

    export interface DocumentServiceInstance {
      findMany(
        params?: DocumentQueryOptions
      ): Promise<Array<Record<string, unknown>>>;
      findOne(params: {
        documentId: string;
        locale?: string;
        status?: "draft" | "published";
        populate?: string[];
      }): Promise<Record<string, unknown> | null>;
      create(params: {
        data: Record<string, unknown>;
        locale?: string;
        status?: "draft" | "published";
        populate?: string[];
      }): Promise<Record<string, unknown>>;
      update(params: {
        documentId: string;
        locale?: string;
        status?: "draft" | "published";
        data: Record<string, unknown>;
        populate?: string[];
      }): Promise<Record<string, unknown> | null>;
      delete?(params: {
        documentId: string;
        locale?: string;
      }): Promise<unknown>;
    }

    export interface DbQueryInstance {
      findMany(params?: {
        where?: Record<string, unknown>;
        populate?: string[] | Record<string, unknown>;
        orderBy?: Record<string, "asc" | "desc">;
        limit?: number;
      }): Promise<Array<Record<string, unknown>>>;
      findOne(params?: {
        where?: Record<string, unknown>;
        populate?: string[] | Record<string, unknown>;
      }): Promise<Record<string, unknown> | null>;
    }

    export interface PluginInstance {
      service<T = Record<string, never>>(name: string): T;
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
      eventHub?: {
        emit(event: string, payload?: unknown): void;
      };
      db?: {
        query(uid: string): DbQueryInstance;
        connection?: (tableName: string) => {
          where(filter: Record<string, unknown>): {
            increment(column: string, amount?: number): Promise<number>;
            update?(data: Record<string, unknown>): Promise<number>;
            select(
              ...columns: string[]
            ): Promise<Array<Record<string, unknown>>>;
          };
        };
      };
      query?(uid: string): DbQueryInstance;
      contentTypes: Record<string, ContentTypeSchema>;
      store(params: { type: string; name: string }): PluginStore;
      documents(uid: string): DocumentServiceInstance;
      plugin(name: string): PluginInstance;
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
  const value: Record<string, unknown>;
  export default value;
}
