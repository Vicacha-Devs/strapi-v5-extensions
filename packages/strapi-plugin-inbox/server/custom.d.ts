declare const Buffer: {
  from(
    input: string,
    encoding?: 'utf8' | 'utf-8' | 'hex' | 'base64' | 'base64url'
  ): Uint8Array & {
    toString(encoding?: 'utf8' | 'utf-8' | 'hex' | 'base64' | 'base64url'): string;
  };
  byteLength(input: string, encoding?: 'utf8' | 'utf-8'): number;
};

declare const process: {
  env: Record<string, string | undefined>;
};

declare module 'node:crypto' {
  export function randomBytes(size: number): {
    toString(encoding: 'hex' | 'base64' | 'base64url'): string;
  };
  export function createHmac(
    algorithm: 'sha256' | 'sha512',
    key: string
  ): {
    update(data: string, encoding?: 'utf8' | 'utf-8'): {
      digest(encoding: 'hex' | 'base64' | 'base64url'): string;
    };
  };
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

declare module 'node:assert/strict' {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): string | void;
    rejects(fn: () => Promise<unknown>, regExp?: RegExp | Error): Promise<void>;
  };
  export default assert;
}

declare module 'node:test' {
  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}

declare module '@strapi/strapi' {
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
          customField?: string;
          [key: string]: unknown;
        }
      >;
    }

    export interface DocumentQueryOptions {
      limit?: number;
      locale?: string;
      status?: 'draft' | 'published';
      filters?: Record<string, unknown>;
      populate?: string[];
      sort?: string;
    }

    export interface DocumentServiceInstance {
      findMany(params?: DocumentQueryOptions): Promise<Array<Record<string, unknown>>>;
      findOne(params: {
        documentId: string;
        locale?: string;
        populate?: string[];
      }): Promise<Record<string, unknown> | null>;
      create(params: {
        data: Record<string, unknown>;
        locale?: string;
        status?: 'draft' | 'published';
      }): Promise<Record<string, unknown>>;
      update(params: {
        documentId: string;
        locale?: string;
        status?: 'draft' | 'published';
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
      eventHub?: {
        emit(event: string, payload?: unknown): void;
      };
      contentTypes: Record<string, ContentTypeSchema>;
      store(params: { type: string; name: string }): PluginStore;
      documents(uid: string): DocumentServiceInstance;
      plugin(name: string): PluginInstance;
      db: {
        query(uid: string): {
          findMany(params?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
          findOne(params?: Record<string, unknown>): Promise<Record<string, unknown> | null>;
          create(params: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
          update(params: {
            where: Record<string, unknown>;
            data: Record<string, unknown>;
          }): Promise<Record<string, unknown>>;
          updateMany?(params: {
            where: Record<string, unknown>;
            data: Record<string, unknown>;
          }): Promise<unknown>;
          count(params?: Record<string, unknown>): Promise<number>;
        };
        lifecycles?: {
          subscribe(subscriber: {
            models?: string[];
            beforeUpdate?: (event: {
              params?: {
                where?: Record<string, unknown>;
                data?: Record<string, unknown>;
              };
            }) => void | Promise<void>;
            afterCreate?: (event: {
              result?: Record<string, unknown>;
              params?: { data?: Record<string, unknown> };
            }) => void | Promise<void>;
            afterUpdate?: (event: {
              result?: Record<string, unknown>;
              params?: { data?: Record<string, unknown> };
            }) => void | Promise<void>;
          }): void;
        };
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

declare module '*.json' {
  const value: Record<string, unknown>;
  export default value;
}
