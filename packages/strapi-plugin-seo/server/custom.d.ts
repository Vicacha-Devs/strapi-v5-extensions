declare function setImmediate(callback: (...args: any[]) => void, ...args: any[]): unknown;

declare module 'lodash' {
  export function get<T = any>(object: any, path: string | string[], defaultValue?: T): T;
  const lodashDefault: {
    get: typeof get;
  };
  export default lodashDefault;
}

declare module '@strapi/strapi' {
  export namespace Core {
    export interface PluginStore {
      get<T = any>(params: { key: string }): Promise<T>;
      set(params: { key: string; value: unknown }): Promise<void>;
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
      pluginOptions?: Record<string, any>;
      __schema__?: {
        pluginOptions?: Record<string, any>;
      };
      attributes?: Record<string, any>;
    }

    export interface ComponentSchema {
      uid?: string;
      category?: string;
      info?: {
        displayName?: string;
        icon?: string;
      };
      attributes?: Record<string, any>;
    }

    export interface PluginInstance {
      service<T = any>(name: string): T;
      services: Record<string, any>;
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
  const value: Record<string, any>;
  export default value;
}
