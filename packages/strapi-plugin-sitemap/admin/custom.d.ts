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

  export interface ChangeEvent<T = Element> {
    target: T & { value: string };
    currentTarget: T & { value: string };
  }

  export interface RefObject<T> {
    current: T;
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
  export function getFetchClient(): FetchClient;

  export interface StrapiAdminApp {
    locales: string[];
    createSettingSection(
      section: {
        id: string;
        intlLabel: { id: string; defaultMessage: string };
      },
      links: Array<{
        intlLabel: { id: string; defaultMessage: string };
        id: string;
        to: string;
        Component: () => Promise<any>;
        permissions?: Array<{ action: string; subject: string | null }>;
      }>
    ): void;
    registerPlugin(config: Record<string, unknown>): void;
  }
}

declare module '@strapi/design-system' {
  import type { FC, ReactNode } from 'react';
  export type DesignComponentProps = Record<string, any> & { children?: ReactNode };

  export const Box: FC<DesignComponentProps>;
  export const Button: FC<DesignComponentProps>;
  export const Checkbox: FC<DesignComponentProps>;
  export const Flex: FC<DesignComponentProps>;
  export const IconButton: FC<DesignComponentProps>;
  export const LinkButton: FC<DesignComponentProps>;
  export const Main: FC<DesignComponentProps>;
  export const SingleSelect: FC<DesignComponentProps>;
  export const SingleSelectOption: FC<DesignComponentProps>;
  export const Table: FC<DesignComponentProps>;
  export const Tbody: FC<DesignComponentProps>;
  export const Td: FC<DesignComponentProps>;
  export const TFooter: FC<DesignComponentProps>;
  export const Th: FC<DesignComponentProps>;
  export const Thead: FC<DesignComponentProps>;
  export const Tr: FC<DesignComponentProps>;
  export const Typography: FC<DesignComponentProps>;
  export const VisuallyHidden: FC<DesignComponentProps>;

  export const Field: {
    Root: FC<DesignComponentProps>;
    Label: FC<DesignComponentProps>;
    Input: FC<DesignComponentProps>;
    Hint: FC<DesignComponentProps>;
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
    Title: FC<DesignComponentProps>;
    Body: FC<DesignComponentProps>;
    Footer: FC<DesignComponentProps>;
    Close: FC<DesignComponentProps>;
  };
}

declare module '@strapi/icons' {
  import type { FC } from 'react';
  export const Pencil: FC<Record<string, any>>;
  export const Plus: FC<Record<string, any>>;
  export const Trash: FC<Record<string, any>>;
}

declare module '*.json' {
  const value: Record<string, any>;
  export default value;
}
