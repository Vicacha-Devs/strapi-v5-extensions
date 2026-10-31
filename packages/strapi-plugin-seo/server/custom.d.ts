declare function setImmediate(callback: (...args: unknown[]) => void, ...args: unknown[]): unknown;

declare module 'lodash' {
  export function get<T = unknown>(object: unknown, path: string | string[], defaultValue?: T): T;
  const lodashDefault: {
    get: typeof get;
  };
  export default lodashDefault;
}

declare module '@strapi/strapi' {
  export namespace Core {
    export interface PluginStore {
      get<T = unknown>(params: { key: string }): Promise<T>;
      set(params: { key: string; value: unknown }): Promise<void>;
    }

    export interface ContentTypePluginOptions {
      'content-manager'?: {
        visible?: boolean;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }

    export interface ContentTypeSchema {
      uid?: string;
      kind?: string;
      globalId?: string;
      info?: {
        displayName?: string;
        singularName?: string;
        pluralName?: string;
      };
      pluginOptions?: ContentTypePluginOptions;
      __schema__?: {
        pluginOptions?: ContentTypePluginOptions;
      };
      attributes?: Record<string, unknown>;
    }

    export interface ComponentSchema {
      uid?: string;
      category?: string;
      info?: {
        displayName?: string;
        icon?: string;
      };
      attributes?: Record<string, unknown>;
    }

    export interface PluginServiceMethods {
      getSeoComponent(): { attributes?: Record<string, unknown>; category?: string } | null;
      getContentTypes(): unknown;
      createSeoComponent(): Promise<unknown>;
      getSettings(): Promise<unknown>;
      setSettings(value: unknown): Promise<unknown>;
      createComponent(params: Record<string, unknown>): Promise<unknown>;
      [key: string]: unknown;
    }

    export interface PluginInstance {
      service<T = PluginServiceMethods>(name: string): T;
      services: Record<string, PluginServiceMethods>;
    }

    export interface Strapi {
      contentTypes: Record<string, ContentTypeSchema>;
      components: Record<string, ComponentSchema>;
      plugins: Record<string, PluginInstance>;
      plugin(name: string): PluginInstance;
      store(params: { environment?: string; type: string; name: string }): PluginStore;
      reload?: (() => void) & { isWatching?: boolean };
      log?: {
        debug?(msg: string): void;
        info?(msg: string): void;
        warn?(msg: string): void;
        error?(msg: string): void;
      };
      admin: {
        services: {
          permission: {
            actionProvider: {
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
  const value: {
    collectionName?: string;
    info: {
      displayName: string;
      icon: string;
      description?: string;
    };
    options?: Record<string, unknown>;
    attributes: Record<string, unknown>;
    [key: string]: unknown;
  };
  export default value;
}
