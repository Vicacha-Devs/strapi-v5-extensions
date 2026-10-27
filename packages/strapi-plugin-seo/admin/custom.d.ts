declare module 'react' {
  export type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactElement
    | ReactNode[];

  export interface ReactElement<P = any> {
    type: any;
    props: P;
    key: string | number | null;
  }

  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  export interface FormEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: T;
  }

  export interface MouseEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: T;
  }

  export interface RefObject<T> {
    current: T;
  }

  export interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
  }

  export interface FC<P = {}> {
    (props: P): ReactElement | null;
  }

  export type ComponentType<P = {}> = FC<P>;
  export type Dispatch<A> = (value: A) => void;

  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: readonly unknown[]
  ): T;
  export function useRef<T>(initialValue: T): RefObject<T>;
  export function useReducer<S, A>(
    reducer: (state: S, action: A) => S,
    initialState: S
  ): [S, Dispatch<A>];
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useContext<T>(context: Context<T>): T;
  export function memo<P = {}>(component: FC<P>): FC<P>;
  export function createElement(...args: any[]): ReactElement;
  export const Fragment: FC<{ children?: ReactNode }>;

  export namespace JSX {
    interface Element extends ReactElement {}
    interface IntrinsicElements {
      [elemName: string]: Record<string, any>;
    }
  }

  export as namespace React;
}

declare module 'react/jsx-runtime' {
  import type { ReactElement } from 'react';
  export const Fragment: unknown;
  export function jsx(type: any, props: any, key?: any): ReactElement;
  export function jsxs(type: any, props: any, key?: any): ReactElement;

  export namespace JSX {
    interface Element extends ReactElement {}
    interface IntrinsicElements {
      [elemName: string]: Record<string, any>;
    }
  }
}

declare module 'react-intl' {
  export interface MessageDescriptor {
    id: string;
    defaultMessage?: string;
  }

  export function useIntl(): {
    formatMessage: (
      descriptor: MessageDescriptor,
      values?: Record<string, string | number>
    ) => string;
    locale: string;
  };
}

declare module 'react-router-dom' {
  import type { FC, ReactNode } from 'react';
  export const Routes: FC<{ children?: ReactNode }>;
  export const Route: FC<{
    index?: boolean;
    path?: string;
    element?: ReactNode;
  }>;
  export const NavLink: FC<Record<string, any>>;
  export function useNavigate(): (to: string) => void;
}

declare module '@strapi/strapi/admin' {
  import type { FC, ReactNode } from 'react';

  export interface FetchResponse<T = any> {
    data: T;
  }

  export interface FetchClient {
    get<T = any>(url: string): Promise<FetchResponse<T>>;
    post<T = any>(url: string, body?: unknown): Promise<FetchResponse<T>>;
    put<T = any>(url: string, body?: unknown): Promise<FetchResponse<T>>;
    del<T = any>(url: string): Promise<FetchResponse<T>>;
  }

  export function useFetchClient(): FetchClient;

  export function useNotification(): {
    toggleNotification(config: {
      type?: 'success' | 'warning' | 'danger' | 'info';
      message: string;
    }): void;
  };

  export function private_useAutoReloadOverlayBlocker(): {
    lockAppWithAutoreload: () => void;
    unlockAppWithAutoreload: () => void;
  };

  export const private_AutoReloadOverlayBlockerProvider: FC<{ children?: ReactNode }>;

  export function unstable_useContentManagerContext(): {
    model: string;
    collectionType: string;
    id?: string;
    form: {
      values: Record<string, any>;
    };
    contentType: Record<string, any>;
    components: Record<string, any>;
  };

  export function unstable_useDocument(params: {
    model: string;
    collectionType: string;
    documentId?: string;
  }): {
    document?: {
      updatedAt?: string | null;
      [key: string]: unknown;
    };
  };

  export const Page: {
    Loading: FC<Record<string, any>>;
    Protect: FC<Record<string, any> & { children?: ReactNode }>;
    Error: FC<Record<string, any>>;
  };

  export const ContentBox: FC<Record<string, any>>;

  export const Layouts: {
    Root: FC<Record<string, any>>;
    Header: FC<Record<string, any>>;
    Content: FC<Record<string, any>>;
  };

  export interface StrapiAdminApp {
    locales: string[];
    addMenuLink(config: Record<string, unknown>): void;
    registerPlugin(config: Record<string, unknown>): void;
    getPlugin(name: string): {
      injectComponent: (
        viewName: string,
        zoneName: string,
        componentConfig: { name: string; Component: FC<any> }
      ) => void;
    };
  }
}

declare module '@strapi/design-system' {
  import type { FC, ReactNode } from 'react';
  export type DesignComponentProps = Record<string, any> & { children?: ReactNode };

  export const Alert: FC<DesignComponentProps>;
  export const Badge: FC<DesignComponentProps>;
  export const Box: FC<DesignComponentProps>;
  export const Button: FC<DesignComponentProps>;
  export const Checkbox: FC<DesignComponentProps>;
  export const Divider: FC<DesignComponentProps>;
  export const EmptyStateLayout: FC<DesignComponentProps>;
  export const Flex: FC<DesignComponentProps>;
  export const IconButton: FC<DesignComponentProps>;
  export const LinkButton: FC<DesignComponentProps>;
  export const ProgressBar: FC<DesignComponentProps>;
  export const Status: FC<DesignComponentProps>;
  export const Switch: FC<DesignComponentProps>;
  export const Table: FC<DesignComponentProps>;
  export const Tbody: FC<DesignComponentProps>;
  export const Td: FC<DesignComponentProps>;
  export const TextButton: FC<DesignComponentProps>;
  export const Th: FC<DesignComponentProps>;
  export const Thead: FC<DesignComponentProps>;
  export const Tr: FC<DesignComponentProps>;
  export const Typography: FC<DesignComponentProps>;

  export const Accordion: {
    Root: FC<DesignComponentProps>;
    Item: FC<DesignComponentProps>;
    Header: FC<DesignComponentProps>;
    Trigger: FC<DesignComponentProps>;
    Actions: FC<DesignComponentProps>;
    Content: FC<DesignComponentProps>;
  };

  export const Grid: {
    Root: FC<DesignComponentProps>;
    Item: FC<DesignComponentProps>;
  };

  export const Modal: {
    Root: FC<DesignComponentProps>;
    Trigger: FC<DesignComponentProps>;
    Content: FC<DesignComponentProps>;
    Header: FC<DesignComponentProps>;
    Body: FC<DesignComponentProps>;
    Footer: FC<DesignComponentProps>;
    Close: FC<DesignComponentProps>;
  };

  export const Tabs: {
    Root: FC<DesignComponentProps>;
    List: FC<DesignComponentProps>;
    Trigger: FC<DesignComponentProps>;
    Content: FC<DesignComponentProps>;
  };
}

declare module '@strapi/icons' {
  import type { FC } from 'react';
  export const ArrowLeft: FC<Record<string, any>>;
  export const ArrowRight: FC<Record<string, any>>;
  export const CheckCircle: FC<Record<string, any>>;
  export const Cog: FC<Record<string, any>>;
  export const CrossCircle: FC<Record<string, any>>;
  export const Eye: FC<Record<string, any>>;
  export const Information: FC<Record<string, any>>;
  export const Pencil: FC<Record<string, any>>;
  export const Plus: FC<Record<string, any>>;
  export const Search: FC<Record<string, any>>;
  export const WarningCircle: FC<Record<string, any>>;
}

declare module 'lodash/get' {
  export default function get<T = any>(object: any, path: string | string[], defaultValue?: T): T;
}

declare module 'lodash/isEmpty' {
  export default function isEmpty(value: any): boolean;
}

declare module 'lodash/isEqual' {
  export default function isEqual(value: any, other: any): boolean;
}

declare module 'lodash/isNull' {
  export default function isNull(value: any): value is null;
}

declare module 'lodash/isNumber' {
  export default function isNumber(value: any): value is number;
}

declare module 'lodash/isArray' {
  export default function isArray(value: any): value is any[];
}

declare module 'lodash/isObject' {
  export default function isObject(value: any): value is Record<string, any>;
}

declare module 'lodash/pull' {
  export default function pull<T>(array: T[], ...values: T[]): T[];
}

declare module 'showdown' {
  export class Converter {
    makeHtml(markdown: string): string;
  }
  const showdownDefault: {
    Converter: typeof Converter;
  };
  export default showdownDefault;
}

declare module 'date-fns' {
  export function formatDistance(
    date: Date | number,
    baseDate: Date | number,
    options?: { addSuffix?: boolean }
  ): string;
}

declare module '*.json' {
  const value: Record<string, any>;
  export default value;
}

declare module 'styled-components' {
  export function useTheme(): Record<string, any>;
}
