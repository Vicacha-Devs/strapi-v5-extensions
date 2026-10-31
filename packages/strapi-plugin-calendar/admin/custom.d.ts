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

  export function useState<T>(initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
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
  export function jsx(type: unknown, props: unknown, key?: unknown): ReactElement;
  export function jsxs(type: unknown, props: unknown, key?: unknown): ReactElement;

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

declare module "@strapi/strapi/admin" {
  export type DefaultFetchPayload = { data?: unknown; [key: string]: unknown };
  export interface FetchResponse<T = DefaultFetchPayload> {
    data: T;
  }
  export interface FetchClient {
    get<T = DefaultFetchPayload>(url: string): Promise<FetchResponse<T>>;
    post<T = DefaultFetchPayload>(url: string, body?: unknown): Promise<FetchResponse<T>>;
    put<T = DefaultFetchPayload>(url: string, body?: unknown): Promise<FetchResponse<T>>;
    del<T = DefaultFetchPayload>(url: string): Promise<FetchResponse<T>>;
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

declare module "styled-components" {
  export function useTheme(): {
    colors?: Record<string, string | undefined>;
    spaces?: Record<string, string | undefined>;
    shadows?: Record<string, string | undefined>;
    [key: string]: unknown;
  };
}

declare module "@strapi/design-system/*";

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

declare module "@fullcalendar/core" {
  export interface CalendarApi {
    changeView(viewName: string): void;
    prev(): void;
    next(): void;
    today(): void;
    getDate(): Date;
    gotoDate(date: string | Date): void;
  }

  export interface DatesSetArg {
    start: Date;
    end: Date;
    startStr: string;
    endStr: string;
    view: {
      type: string;
      currentStart: Date;
      currentEnd: Date;
    };
  }

  export interface DateSelectArg {
    start: Date;
    end: Date;
    startStr: string;
    endStr: string;
    allDay: boolean;
  }

  export interface DateClickArg {
    date: Date;
    dateStr: string;
    allDay: boolean;
  }

  export interface EventClickArg {
    event: {
      id: string;
      title: string;
      start: Date | null;
      end: Date | null;
      extendedProps: Record<string, unknown>;
    };
  }

  export interface EventDropArg {
    event: {
      id: string;
      title: string;
      start: Date | null;
      end: Date | null;
      extendedProps: Record<string, unknown>;
    };
  }

  export interface DayCellContentArg {
    date: Date;
    dayNumberText: string;
    isToday?: boolean;
    view?: {
      type: string;
    };
  }

  export interface EventContentArg {
    timeText: string;
    view?: {
      type: string;
    };
    event: {
      id: string;
      title: string;
      extendedProps: Record<string, unknown>;
    };
  }

  export interface LocaleInput {
    code: string;
    direction?: "ltr" | "rtl";
    week?: {
      dow?: number;
      doy?: number;
    };
    buttonText?: Record<string, string>;
    weekText?: string;
    allDayText?: string;
    moreLinkText?: string | ((num: number) => string);
    noEventsText?: string;
  }
}

declare module "@fullcalendar/core/locales-all" {
  const allLocales: Array<import("@fullcalendar/core").LocaleInput>;
  export default allLocales;
}

declare module "@fullcalendar/react" {
  export interface FullCalendarProps {
    ref?: unknown;
    plugins?: unknown[];
    initialView?: string;
    views?: Record<string, Record<string, unknown>>;
    headerToolbar?: boolean | Record<string, unknown>;
    locales?: Array<import("@fullcalendar/core").LocaleInput>;
    locale?: string | import("@fullcalendar/core").LocaleInput;
    direction?: "ltr" | "rtl";
    firstDay?: number;
    weekNumbers?: boolean;
    weekNumberCalculation?: "local" | "ISO" | ((date: Date) => number);
    weekText?: string;
    allDayText?: string;
    moreLinkText?: string | ((num: number) => string);
    noEventsText?: string;
    buttonText?: Record<string, string>;
    eventTimeFormat?: Record<string, unknown>;
    slotLabelFormat?: Record<string, unknown>;
    weekends?: boolean;
    slotMinTime?: string;
    slotMaxTime?: string;
    slotDuration?: string;
    businessHours?: boolean | unknown[];
    nowIndicator?: boolean;
    editable?: boolean;
    selectable?: boolean;
    selectMirror?: boolean;
    dayMaxEvents?: boolean | number;
    height?: string | number;
    events?: Array<Record<string, unknown>>;
    datesSet?: (arg: import("@fullcalendar/core").DatesSetArg) => void;
    dateClick?: (arg: import("@fullcalendar/core").DateClickArg) => void;
    select?: (arg: import("@fullcalendar/core").DateSelectArg) => void;
    eventClick?: (arg: import("@fullcalendar/core").EventClickArg) => void;
    eventDrop?: (arg: import("@fullcalendar/core").EventDropArg) => void;
    eventResize?: (arg: import("@fullcalendar/core").EventDropArg) => void;
    dayCellContent?: (
      arg: import("@fullcalendar/core").DayCellContentArg
    ) => import("react").ReactNode;
    eventContent?: (arg: import("@fullcalendar/core").EventContentArg) => import("react").ReactNode;
  }

  export default class FullCalendar {
    props: FullCalendarProps;
    constructor(props: FullCalendarProps);
    getApi(): import("@fullcalendar/core").CalendarApi;
    render(): import("react").ReactNode;
  }
}

declare module "@fullcalendar/daygrid" {
  const plugin: unknown;
  export default plugin;
}

declare module "@fullcalendar/timegrid" {
  const plugin: unknown;
  export default plugin;
}

declare module "@fullcalendar/list" {
  const plugin: unknown;
  export default plugin;
}

declare module "@fullcalendar/multimonth" {
  const plugin: unknown;
  export default plugin;
}

declare module "@fullcalendar/interaction" {
  export interface DateClickArg {
    date: Date;
    dateStr: string;
    allDay: boolean;
  }
  const plugin: unknown;
  export default plugin;
}
