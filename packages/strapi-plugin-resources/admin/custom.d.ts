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

  export interface FC<P = {}> {
    (props: P): ReactElement | null;
  }

  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;
  export function createElement(...args: any[]): ReactElement;
  export const Fragment: unknown;

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

declare module '*.json' {
  const value: Record<string, string>;
  export default value;
}

declare module '@strapi/design-system' {
  import type { FC, ReactNode } from 'react';
  export type DesignComponentProps = Record<string, any> & { children?: ReactNode };

  export const Main: FC<DesignComponentProps>;
  export const Box: FC<DesignComponentProps>;
  export const Flex: FC<DesignComponentProps>;
  export const Typography: FC<DesignComponentProps>;
  export const Button: FC<DesignComponentProps>;
  export const TextInput: FC<DesignComponentProps>;
  export const Checkbox: FC<DesignComponentProps>;
  export const Badge: FC<DesignComponentProps>;
  export const Divider: FC<DesignComponentProps>;
  export const Table: FC<DesignComponentProps>;
  export const Thead: FC<DesignComponentProps>;
  export const Tbody: FC<DesignComponentProps>;
  export const Tr: FC<DesignComponentProps>;
  export const Th: FC<DesignComponentProps>;
  export const Td: FC<DesignComponentProps>;
}

declare module '@strapi/strapi/admin' {
  export const useFetchClient: () => {
    get: (url: string) => Promise<{ data: any }>;
    post: (url: string, data?: any) => Promise<{ data: any }>;
    put: (url: string, data?: any) => Promise<{ data: any }>;
  };
}
