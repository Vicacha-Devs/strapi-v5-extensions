declare module "*.png";
declare module "*.svg";
declare module "*.json" {
  const value: Record<string, string>;
  export default value;
}

declare module "react" {
  export type ReactNode = unknown;

  export interface ReactElement<P = unknown> {
    type?: unknown;
    props?: P;
    key?: string | number | null;
  }

  export type FC<P = Record<string, unknown>> = (
    props: P & { children?: ReactNode; key?: string | number | null }
  ) => ReactElement | null;

  export type ComponentType<P = Record<string, unknown>> = FC<P>;

  export type CSSProperties = Record<string, string | number | undefined>;

  export interface ChangeEvent<T = HTMLInputElement> {
    target: T & { value: string; checked?: boolean };
    currentTarget: T & { value: string; checked?: boolean };
  }

  export interface FormEvent<T = HTMLFormElement> {
    preventDefault(): void;
    currentTarget: T;
  }

  export interface MouseEvent<T = HTMLElement> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: T;
  }

  export interface RefObject<T> {
    current: T | null;
  }

  export function useState<T>(
    initial: T | (() => T)
  ): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;
  export function useCallback<T extends (...args: never[]) => unknown>(
    cb: T,
    deps: readonly unknown[]
  ): T;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useRef<T>(initial: T | null): RefObject<T>;
  export function createElement(
    type: unknown,
    props?: Record<string, unknown> | null,
    ...children: unknown[]
  ): ReactElement;
  export const Fragment: unknown;

  export namespace JSX {
    interface Element extends ReactElement {}
    interface IntrinsicAttributes {
      key?: string | number | null;
      ref?: unknown;
      [key: string]: unknown;
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
    interface IntrinsicAttributes {
      key?: string | number | null;
      ref?: unknown;
      [key: string]: unknown;
    }
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
  export interface IntlShape {
    formatMessage(
      descriptor: MessageDescriptor,
      values?: Record<string, string | number | boolean | null | undefined>
    ): string;
    locale: string;
  }
  export function useIntl(): IntlShape;
}

declare module "react-router-dom" {
  export const NavLink: FC<{
    to: string;
    end?: boolean;
    className?: string | ((props: { isActive: boolean }) => string);
    children?: ReactNode;
    [key: string]: unknown;
  }>;
  export function useNavigate(): (to: string) => void;
  export function useLocation(): {
    pathname: string;
    search: string;
    hash: string;
  };
  export function useParams<
    T extends Record<string, string | undefined> = Record<
      string,
      string | undefined
    >,
  >(): T;
}

declare module "@strapi/strapi/admin" {
  export type DefaultFetchPayload = { data?: unknown; [key: string]: unknown };
  export interface FetchResponse<T = DefaultFetchPayload> {
    data: T;
  }
  export interface FetchClient {
    get<T = DefaultFetchPayload>(url: string): Promise<FetchResponse<T>>;
    post<T = DefaultFetchPayload>(
      url: string,
      body?: unknown
    ): Promise<FetchResponse<T>>;
    put<T = DefaultFetchPayload>(
      url: string,
      body?: unknown
    ): Promise<FetchResponse<T>>;
    del<T = DefaultFetchPayload>(
      url: string,
      body?: unknown
    ): Promise<FetchResponse<T>>;
  }
  export function useFetchClient(): FetchClient;
  export function useNotification(): {
    toggleNotification: (opts: { type?: string; message: string }) => void;
  };
  export const Layouts: {
    Root: import("react").FC<Record<string, unknown>>;
    Header: import("react").FC<Record<string, unknown>>;
    Content: import("react").FC<Record<string, unknown>>;
    Action: import("react").FC<Record<string, unknown>>;
  };
  export const Page: {
    Main: import("react").FC<Record<string, unknown>>;
    Title: import("react").FC<Record<string, unknown>>;
    Loading: import("react").FC<Record<string, unknown>>;
    Error: import("react").FC<Record<string, unknown>>;
  };
  export interface StrapiAdminApp {
    customFields: {
      register(config: Record<string, unknown>): void;
    };
    addMenuLink(config: Record<string, unknown>): void;
    addSettingsLink?(sectionId: string, link: Record<string, unknown>): void;
    createSettingSection(
      section: Record<string, unknown>,
      links: Array<Record<string, unknown>>
    ): void;
    registerPlugin(config: Record<string, unknown>): void;
    getPlugin(name: string):
      | {
          apis?: {
            addEditViewSidePanel?: (panels: Array<unknown>) => void;
          };
        }
      | undefined;
  }
  export type StrapiApp = StrapiAdminApp;
}

declare module "@strapi/design-system" {
  export type DesignComponentProps = {
    [key: string]: unknown;
    children?: import("react").ReactNode;
    onChange?:
      | ((val: never) => void)
      | ((e: import("react").ChangeEvent<HTMLInputElement>) => void);
    onCheckedChange?: (checked: boolean) => void;
    onValueChange?: ((val: never) => void) | ((val: string) => void);
    onClear?: () => void;
    onClick?: (e?: import("react").MouseEvent<HTMLElement>) => void;
  };
  type DesignComponent = import("react").FC<DesignComponentProps>;
  export const DesignSystemProvider: DesignComponent;
  export const Main: DesignComponent;
  export const Box: DesignComponent;
  export const Flex: DesignComponent;
  export const Grid: {
    Root: DesignComponent;
    Item: DesignComponent;
  };
  export const Typography: DesignComponent;
  export const Button: DesignComponent;
  export const TextInput: DesignComponent;
  export const NumberInput: DesignComponent;
  export const DatePicker: DesignComponent;
  export const DateTimePicker: DesignComponent;
  export const Textarea: DesignComponent;
  export const Toggle: DesignComponent;
  export const Checkbox: DesignComponent;
  export const Badge: DesignComponent;
  export const Divider: DesignComponent;
  export const Loader: DesignComponent;
  export const Alert: DesignComponent;
  export const EmptyStateLayout: DesignComponent;
  export const Table: DesignComponent;
  export const Thead: DesignComponent;
  export const Tbody: DesignComponent;
  export const Tr: DesignComponent;
  export const Th: DesignComponent;
  export const Td: DesignComponent;
  export const SingleSelect: DesignComponent;
  export const SingleSelectOption: DesignComponent;
  export const MultiSelect: DesignComponent;
  export const MultiSelectOption: DesignComponent;
  export const Field: {
    Root: DesignComponent;
    Label: DesignComponent;
    Hint: DesignComponent;
    Error: DesignComponent;
    Input: DesignComponent;
  };
  export const Tabs: {
    Root: DesignComponent;
    List: DesignComponent;
    Trigger: DesignComponent;
    Content: DesignComponent;
  };
  export const Modal: {
    Root: DesignComponent;
    Trigger: DesignComponent;
    Content: DesignComponent;
    Header: DesignComponent;
    Title: DesignComponent;
    Body: DesignComponent;
    Footer: DesignComponent;
  };
  export const Dialog: {
    Root: DesignComponent;
    Trigger: DesignComponent;
    Content: DesignComponent;
    Header: DesignComponent;
    Body: DesignComponent;
    Footer: DesignComponent;
    Cancel: DesignComponent;
    Action: DesignComponent;
  };
}

declare module "@strapi/icons" {
  type IconComponent = import("react").FC<Record<string, unknown>>;
  export const Calendar: IconComponent;
  export const Check: IconComponent;
  export const CheckCircle: IconComponent;
  export const Clock: IconComponent;
  export const Cog: IconComponent;
  export const Cross: IconComponent;
  export const Download: IconComponent;
  export const ExclamationMarkCircle: IconComponent;
  export const ExternalLink: IconComponent;
  export const Filter: IconComponent;
  export const Information: IconComponent;
  export const Mail: IconComponent;
  export const Pencil: IconComponent;
  export const Plus: IconComponent;
  export const Refresh: IconComponent;
  export const Search: IconComponent;
  export const Sparkle: IconComponent;
  export const Trash: IconComponent;
  export const User: IconComponent;
  export const WarningCircle: IconComponent;
}
