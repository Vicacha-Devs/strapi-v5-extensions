declare module "react" {
  export type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactElement
    | ReactNode[];

  export interface ReactElement<P = unknown> {
    type: unknown;
    props: P;
    key: string | number | null;
  }

  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  export interface FC<P = {}> {
    (props: P & { key?: string | number | null }): ReactElement | null;
  }

  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;
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

declare module "react/jsx-runtime" {
  import type { ReactElement } from "react";
  export const Fragment: unknown;
  export function jsx(
    type: unknown,
    props: unknown,
    key?: unknown
  ): ReactElement;
  export function jsxs(
    type: unknown,
    props: unknown,
    key?: unknown
  ): ReactElement;

  export namespace JSX {
    interface Element extends ReactElement {}
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
}

declare module "*.json" {
  const value: Record<string, string>;
  export default value;
}

declare module "node:crypto" {
  export function createHmac(
    algorithm: string,
    key: string
  ): {
    update(
      data: string,
      encoding?: string
    ): { digest(encoding: string): string };
  };
  export function timingSafeEqual(a: unknown, b: unknown): boolean;
}

declare const Buffer: {
  from(data: string, encoding?: string): { length: number };
};

declare module "@strapi/design-system" {
  import type { FC, ReactNode } from "react";
  export type DesignComponentProps = Record<string, unknown> & {
    children?: ReactNode;
  };

  export const Tabs: {
    Root: FC<DesignComponentProps>;
    List: FC<DesignComponentProps>;
    Trigger: FC<DesignComponentProps>;
    Content: FC<DesignComponentProps>;
  };

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
  export const NumberInput: FC<DesignComponentProps>;
  export const SingleSelect: FC<DesignComponentProps>;
  export const SingleSelectOption: FC<DesignComponentProps>;
  export const Textarea: FC<DesignComponentProps>;

  export const Field: {
    Root: FC<DesignComponentProps>;
    Label: FC<DesignComponentProps>;
    Error: FC<DesignComponentProps>;
    Hint: FC<DesignComponentProps>;
  };
}

declare module "@strapi/strapi/admin" {
  export const useFetchClient: () => {
    get: <T = Record<string, unknown>>(url: string) => Promise<{ data: T }>;
    post: <T = Record<string, unknown>>(
      url: string,
      data?: unknown
    ) => Promise<{ data: T }>;
    put: <T = Record<string, unknown>>(
      url: string,
      data?: unknown
    ) => Promise<{ data: T }>;
  };
}

declare module "styled-components" {
  export function useTheme(): Record<string, unknown>;
}

declare module "react-intl" {
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

declare module "@vicacha-devs/strapi-plugin-calendar/shared" {
  export const SUPPORTED_INTL_CALENDARS: ReadonlyArray<{
    id: string;
    intlCalendar: string;
    defaultLabel: string;
  }>;
}
