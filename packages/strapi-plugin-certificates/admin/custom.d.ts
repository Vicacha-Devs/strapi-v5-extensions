declare module "react" {
  export type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];

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

  export interface MouseEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: T;
  }

  export interface RefObject<T> {
    current: T | null;
  }

  export interface FC<P = {}> {
    (props: P): ReactElement | null;
  }

  export type ComponentType<P = {}> = FC<P>;

  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: never[]) => unknown>(
    callback: T,
    deps: readonly unknown[]
  ): T;
  export function useRef<T>(initialValue: T | null): RefObject<T>;
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
  export function jsx(type: unknown, props: unknown, key?: unknown): ReactElement;
  export function jsxs(type: unknown, props: unknown, key?: unknown): ReactElement;

  export namespace JSX {
    interface Element extends ReactElement {}
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
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

declare module "@strapi/strapi/admin" {
  import type { FC, ReactNode } from "react";
  export type AdminLayoutProps = Record<string, unknown> & { children?: ReactNode };

  export const Layouts: {
    Root: FC<AdminLayoutProps>;
    Header: FC<AdminLayoutProps>;
    Content: FC<AdminLayoutProps>;
  };

  export interface FetchResponse<T = Record<string, unknown>> {
    data: T;
  }

  export interface FetchClient {
    get<T = Record<string, unknown>>(url: string): Promise<FetchResponse<T>>;
    post<T = Record<string, unknown>>(url: string, body?: unknown): Promise<FetchResponse<T>>;
    put<T = Record<string, unknown>>(url: string, body?: unknown): Promise<FetchResponse<T>>;
    del<T = Record<string, unknown>>(url: string): Promise<FetchResponse<T>>;
  }

  export function useFetchClient(): FetchClient;

  export function useNotification(): {
    toggleNotification(config: {
      type?: "success" | "warning" | "danger" | "info";
      message: string;
    }): void;
  };

  export interface StrapiAdminApp {
    customFields: {
      register(config: Record<string, unknown>): void;
    };
    addMenuLink(config: Record<string, unknown>): void;
    addSettingsLink(sectionId: string, config: Record<string, unknown>): void;
    createSettingSection(
      section: Record<string, unknown>,
      links: Array<Record<string, unknown>>
    ): void;
    registerPlugin(config: Record<string, unknown>): void;
  }

  export type StrapiApp = StrapiAdminApp;
}

declare module "react-router-dom" {
  import type { FC, ReactNode } from "react";
  export const Routes: FC<{ children?: ReactNode }>;
  export const Route: FC<{
    index?: boolean;
    path?: string;
    element?: ReactNode;
  }>;
  export function useNavigate(): (to: string) => void;
}

declare module "@strapi/design-system" {
  import type { FC, ReactNode } from "react";
  export type DesignComponentProps = Record<string, unknown> & {
    children?: ReactNode;
    onChange?: (arg: never) => void;
    onValueChange?: (val: number | undefined) => void;
    onCheckedChange?: (checked: boolean) => void;
    onClick?: (e: never) => void;
  };
  export const Tabs: {
    Root: FC<DesignComponentProps>;
    List: FC<DesignComponentProps>;
    Trigger: FC<DesignComponentProps>;
    Content: FC<DesignComponentProps>;
  };

  export const Badge: FC<DesignComponentProps>;
  export const Box: FC<DesignComponentProps>;
  export const Button: FC<DesignComponentProps>;
  export const Checkbox: FC<DesignComponentProps>;
  export const Divider: FC<DesignComponentProps>;
  export const Flex: FC<DesignComponentProps>;
  export const NumberInput: FC<DesignComponentProps>;
  export const SingleSelect: FC<DesignComponentProps>;
  export const SingleSelectOption: FC<DesignComponentProps>;
  export const Textarea: FC<DesignComponentProps>;
  export const TextInput: FC<DesignComponentProps>;
  export const Typography: FC<DesignComponentProps>;

  export const Layouts: {
    Root: FC<DesignComponentProps>;
    Header: FC<DesignComponentProps>;
    Content: FC<DesignComponentProps>;
  };

  export const Field: {
    Root: FC<DesignComponentProps>;
    Label: FC<DesignComponentProps>;
    Error: FC<DesignComponentProps>;
    Hint: FC<DesignComponentProps>;
  };
}

declare module "@strapi/design-system/*";

declare module "@strapi/icons" {
  import type { FC } from "react";
  export const CheckCircle: FC<Record<string, unknown>>;
  export const File: FC<Record<string, unknown>>;
  export const Key: FC<Record<string, unknown>>;
}

declare module "*.json" {
  const value: Record<string, string>;
  export default value;
}

declare const Buffer: {
  from(
    input: string,
    encoding?: "utf8" | "utf-8" | "hex" | "base64" | "base64url"
  ): Uint8Array & {
    toString(encoding?: "utf8" | "utf-8" | "hex" | "base64" | "base64url"): string;
  };
};

declare module "node:crypto" {
  export function randomBytes(size: number): {
    toString(encoding: "hex" | "base64" | "base64url"): string;
  };
  export function createHash(algorithm: "sha256" | "sha512"): {
    update(
      data: string,
      encoding?: "utf8" | "utf-8"
    ): {
      digest(encoding: "hex" | "base64" | "base64url"): string;
    };
  };
  export function createHmac(
    algorithm: "sha256" | "sha512",
    key: string
  ): {
    update(
      data: string,
      encoding?: "utf8" | "utf-8"
    ): {
      digest(encoding: "hex" | "base64" | "base64url"): string;
    };
  };
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
  export function generateKeyPairSync(
    type: "ed25519",
    options: {
      publicKeyEncoding: { type: "spki"; format: "pem" };
      privateKeyEncoding: { type: "pkcs8"; format: "pem" };
    }
  ): {
    publicKey: string;
    privateKey: string;
  };
  export function sign(
    algorithm: null | undefined,
    data: Uint8Array,
    privateKeyPem: string
  ): {
    toString(encoding: "hex" | "base64" | "base64url"): string;
  };
  export function verify(
    algorithm: null | undefined,
    data: Uint8Array,
    publicKeyPem: string,
    signature: Uint8Array
  ): boolean;
}

declare module "styled-components" {
  export function useTheme(): {
    colors?: Record<string, string | undefined>;
    [key: string]: unknown;
  };
}
