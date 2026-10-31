declare module 'react' {
  export type ReactNode =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined
    | ReactElement
    | Iterable<ReactNode>
    | ReactNode[];

  export interface ReactElement<P = unknown> {
    type: unknown;
    props: P;
    key: string | number | null;
  }

  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  export interface ChangeEvent<T = Element> {
    target: T & { value: string; checked?: boolean };
    currentTarget: T & { value: string; checked?: boolean };
  }

  export interface RefObject<T> {
    current: T;
  }

  export interface FC<P = {}> {
    (props: P & { key?: string | number | null }): ReactElement | null;
  }

  export type ComponentType<P = {}> = FC<P>;

  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;
  export function useMemo<T>(
    factory: () => T,
    deps?: readonly unknown[]
  ): T;
  export function useCallback<T extends (...args: never[]) => unknown>(
    callback: T,
    deps?: readonly unknown[]
  ): T;
  export function useRef<T>(initialValue: T): RefObject<T>;
  export function createElement(...args: unknown[]): ReactElement;
  export const Fragment: unknown;

  export namespace JSX {
    interface Element extends ReactElement {}
    interface IntrinsicAttributes {
      key?: string | number | null;
    }
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }

  export as namespace React;
}

declare module 'react/jsx-runtime' {
  import type { ReactElement } from 'react';
  export const Fragment: unknown;
  export function jsx(type: unknown, props: unknown, key?: unknown): ReactElement;
  export function jsxs(type: unknown, props: unknown, key?: unknown): ReactElement;

  export namespace JSX {
    interface Element extends ReactElement {}
    interface IntrinsicAttributes {
      key?: string | number | null;
    }
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
}

declare module '*.json' {
  const value: Record<string, string>;
  export default value;
}

declare module '@strapi/icons' {
  import type { FC } from 'react';
  export const Book: FC<Record<string, unknown>>;
  export const Check: FC<Record<string, unknown>>;
  export const Cross: FC<Record<string, unknown>>;
  export const ExternalLink: FC<Record<string, unknown>>;
  export const File: FC<Record<string, unknown>>;
  export const Pencil: FC<Record<string, unknown>>;
  export const Pin: FC<Record<string, unknown>>;
  export const Plus: FC<Record<string, unknown>>;
  export const Search: FC<Record<string, unknown>>;
  export const Trash: FC<Record<string, unknown>>;
  export const WarningCircle: FC<Record<string, unknown>>;
}

declare module '@strapi/design-system' {
  import type { FC, ReactNode } from 'react';
  export type DesignComponentProps = Record<string, unknown> & {
    children?: ReactNode;
  };

  export const Main: FC<DesignComponentProps>;
  export const Box: FC<DesignComponentProps>;
  export const Flex: FC<DesignComponentProps>;
  export const Typography: FC<DesignComponentProps>;
  export const Button: FC<DesignComponentProps>;
  export const IconButton: FC<DesignComponentProps>;
  export const TextInput: FC<DesignComponentProps>;
  export const Textarea: FC<DesignComponentProps>;
  export const Checkbox: FC<DesignComponentProps>;
  export const SingleSelect: FC<DesignComponentProps>;
  export const SingleSelectOption: FC<DesignComponentProps>;
  export const Badge: FC<DesignComponentProps>;
  export const Divider: FC<DesignComponentProps>;
  export const Loader: FC<DesignComponentProps>;
  export const EmptyStateLayout: FC<DesignComponentProps>;
  export const Table: FC<DesignComponentProps>;
  export const Thead: FC<DesignComponentProps>;
  export const Tbody: FC<DesignComponentProps>;
  export const Tr: FC<DesignComponentProps>;
  export const Th: FC<DesignComponentProps>;
  export const Td: FC<DesignComponentProps>;

  export const Grid: {
    Root: FC<DesignComponentProps>;
    Item: FC<DesignComponentProps>;
  };

  export const Modal: {
    Root: FC<DesignComponentProps>;
    Trigger: FC<DesignComponentProps>;
    Close: FC<DesignComponentProps>;
    Content: FC<DesignComponentProps>;
    Header: FC<DesignComponentProps>;
    Title: FC<DesignComponentProps>;
    Body: FC<DesignComponentProps>;
    Footer: FC<DesignComponentProps>;
  };

  export const Dialog: {
    Root: FC<DesignComponentProps>;
    Trigger: FC<DesignComponentProps>;
    Content: FC<DesignComponentProps>;
    Header: FC<DesignComponentProps>;
    Body: FC<DesignComponentProps>;
    Description: FC<DesignComponentProps>;
    Footer: FC<DesignComponentProps>;
    Cancel: FC<DesignComponentProps>;
    Action: FC<DesignComponentProps>;
  };

  export const Field: {
    Root: FC<DesignComponentProps>;
    Label: FC<DesignComponentProps>;
    Error: FC<DesignComponentProps>;
    Hint: FC<DesignComponentProps>;
  };
}

declare module '@strapi/strapi/admin' {
  import type { FC, ReactNode } from 'react';
  export type AdminLayoutProps = Record<string, unknown> & { children?: ReactNode };

  export const Layouts: {
    Root: FC<AdminLayoutProps>;
    Header: FC<AdminLayoutProps>;
    Content: FC<AdminLayoutProps>;
  };

  export const useFetchClient: () => {
    get: <T = unknown>(url: string) => Promise<{ data: T }>;
    post: <T = unknown>(url: string, data?: unknown) => Promise<{ data: T }>;
    put: <T = unknown>(url: string, data?: unknown) => Promise<{ data: T }>;
    del: <T = unknown>(url: string) => Promise<{ data: T }>;
  };

  export const useNotification: () => {
    toggleNotification: (config: {
      type?: 'success' | 'warning' | 'danger' | 'info';
      message: string | { id: string; defaultMessage?: string };
    }) => void;
  };
}

declare module 'react-router-dom' {
  export function useNavigate(): (to: string) => void;
}

declare module 'styled-components' {
  export function useTheme(): Record<string, unknown>;
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
