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

  export interface ChangeEvent<T = Element> {
    target: T & { value: string; checked?: boolean; files?: FileList | null };
    currentTarget: T & {
      value: string;
      checked?: boolean;
      files?: FileList | null;
    };
  }

  export interface RefObject<T> {
    current: T;
  }

  export interface FC<P = {}> {
    (props: P): ReactElement | null;
  }

  export type ComponentType<P = {}> = FC<P>;

  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;
  export function useMemo<T>(factory: () => T, deps?: readonly unknown[]): T;
  export function useCallback<T extends (...args: never[]) => unknown>(
    callback: T,
    deps?: readonly unknown[]
  ): T;
  export function useRef<T>(initialValue: T): RefObject<T>;
  export function createElement(...args: unknown[]): ReactElement;
  export const Fragment: unknown;

  export namespace JSX {
    interface Element extends ReactElement {}
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

declare module "@strapi/icons" {
  import type { FC } from "react";
  export const Book: FC<Record<string, unknown>>;
  export const Folder: FC<Record<string, unknown>>;
  export const File: FC<Record<string, unknown>>;
}

declare module "@strapi/design-system" {
  import type { FC, ReactNode } from "react";
  export type DesignComponentProps = {
    children?: ReactNode;
    onClick?: (...args: never[]) => unknown;
    onChange?: (...args: never[]) => unknown;
    onValueChange?: (...args: never[]) => unknown;
    [key: string]: unknown;
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
  export const NumberInput: FC<DesignComponentProps>;
  export const Checkbox: FC<DesignComponentProps>;
  export const SingleSelect: FC<DesignComponentProps>;
  export const SingleSelectOption: FC<DesignComponentProps>;
  export const MultiSelect: FC<DesignComponentProps>;
  export const MultiSelectOption: FC<DesignComponentProps>;
  export const Badge: FC<DesignComponentProps>;
  export const Divider: FC<DesignComponentProps>;
  export const Table: FC<DesignComponentProps>;
  export const Thead: FC<DesignComponentProps>;
  export const Tbody: FC<DesignComponentProps>;
  export const Tr: FC<DesignComponentProps>;
  export const Th: FC<DesignComponentProps>;
  export const Td: FC<DesignComponentProps>;

  export const Field: {
    Root: FC<DesignComponentProps>;
    Label: FC<DesignComponentProps>;
    Error: FC<DesignComponentProps>;
    Hint: FC<DesignComponentProps>;
  };
}

declare module "@strapi/strapi/admin" {
  import type {
    GalleryAlbumRecord,
    GlossaryTermRecord,
    MediaLibraryAsset,
    PublicationRecord,
    ResourcesPluginSettings,
  } from "../shared";

  export type FetchInnerData = ResourcesPluginSettings & {
    publications?: PublicationRecord[];
    galleries?: GalleryAlbumRecord[];
    glossary?: GlossaryTermRecord[];
    mediaFiles?: MediaLibraryAsset[];
    [key: string]: unknown;
  };

  export interface FetchClientResponse {
    data?: FetchInnerData;
    [key: string]: unknown;
  }

  export const useFetchClient: () => {
    get: (url: string) => Promise<{ data: FetchClientResponse }>;
    post: (
      url: string,
      data?: unknown
    ) => Promise<{ data: FetchClientResponse }>;
    put: (
      url: string,
      data?: unknown
    ) => Promise<{ data: FetchClientResponse }>;
    del: (url: string) => Promise<{ data: FetchClientResponse }>;
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
