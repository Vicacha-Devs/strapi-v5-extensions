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
    }

    export interface DocumentServiceInstance {
      findMany(params?: DocumentQueryOptions): Promise<Array<Record<string, unknown>>>;
      findOne(params: {
        documentId: string;
        locale?: string;
      }): Promise<Record<string, unknown> | null>;
      create(params: {
        data: Record<string, unknown>;
        status?: 'draft' | 'published';
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

declare module 'vitest' {
  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export interface Assertion<T = unknown> {
    toBe(expected: T): void;
    toEqual(expected: unknown): void;
    toContain(expected: unknown): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeTruthy(): void;
  }
  export function expect<T = unknown>(actual: T): Assertion<T>;
}

declare module '*.json' {
  const value: Record<string, string>;
  export default value;
}
