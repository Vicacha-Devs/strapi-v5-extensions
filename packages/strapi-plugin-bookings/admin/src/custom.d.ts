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
    target: T & { value: string; checked?: boolean };
    currentTarget: T & { value: string; checked?: boolean };
  }

  export interface MouseEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: T;
  }

  export interface DragEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: T;
    dataTransfer: {
      getData(format: string): string;
      setData(format: string, data: string): void;
    };
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
  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;
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
  export interface FetchResponse<T = Record<string, unknown>> {
    data: T;
  }

  export interface FetchClient {
    get<T = Record<string, unknown>>(url: string): Promise<FetchResponse<T>>;
    post<T = Record<string, unknown>>(
      url: string,
      body?: unknown
    ): Promise<FetchResponse<T>>;
    put<T = Record<string, unknown>>(
      url: string,
      body?: unknown
    ): Promise<FetchResponse<T>>;
    del<T = Record<string, unknown>>(url: string): Promise<FetchResponse<T>>;
  }

  export function useFetchClient(): FetchClient;

  export function useNotification(): {
    toggleNotification(config: {
      type?: "success" | "warning" | "danger" | "info";
      message: string;
    }): void;
  };

  export const Layouts: {
    Root: import("react").FC<Record<string, unknown>>;
    Header: import("react").FC<Record<string, unknown>>;
    Content: import("react").FC<Record<string, unknown>>;
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

declare module "react-router-dom" {
  import type { FC, ReactNode } from "react";
  export const Routes: FC<{ children?: ReactNode }>;
  export const Route: FC<{
    index?: boolean;
    path?: string;
    element?: ReactNode;
  }>;
  export const NavLink: FC<{
    to: string;
    end?: boolean;
    className?: string | ((props: { isActive: boolean }) => string);
    children?: ReactNode;
    [key: string]: unknown;
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
  export const DatePicker: FC<DesignComponentProps>;
  export const DateTimePicker: FC<DesignComponentProps>;
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
  export const Calendar: FC<Record<string, unknown>>;
}

declare module "@fullcalendar/core" {
  export interface CalendarApi {
    changeView(viewName: string): void;
    prev(): void;
    next(): void;
    today(): void;
    getDate(): Date;
    gotoDate(date: Date | string): void;
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
      allDay: boolean;
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
  import type { LocaleInput } from "@fullcalendar/core";
  const allLocales: LocaleInput[];
  export default allLocales;
}

declare module "@fullcalendar/react" {
  import type {
    CalendarApi,
    DateClickArg,
    DatesSetArg,
    DateSelectArg,
    DayCellContentArg,
    EventClickArg,
    EventContentArg,
    EventDropArg,
    LocaleInput,
  } from "@fullcalendar/core";
  import type { ReactNode } from "react";

  export interface FullCalendarProps {
    ref?: unknown;
    plugins?: unknown[];
    initialView?: string;
    views?: Record<string, Record<string, unknown>>;
    headerToolbar?: boolean | Record<string, unknown>;
    locales?: LocaleInput[];
    locale?: string | LocaleInput;
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
    datesSet?: (arg: DatesSetArg) => void;
    dateClick?: (arg: DateClickArg) => void;
    select?: (arg: DateSelectArg) => void;
    eventClick?: (arg: EventClickArg) => void;
    eventDrop?: (arg: EventDropArg) => void;
    eventResize?: (arg: EventDropArg) => void;
    dayCellContent?: (arg: DayCellContentArg) => ReactNode;
    eventContent?: (arg: EventContentArg) => ReactNode;
  }

  export default class FullCalendar {
    props: FullCalendarProps;
    constructor(props: FullCalendarProps);
    getApi(): CalendarApi;
    render(): ReactNode;
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
  import type { DateClickArg } from "@fullcalendar/core";
  export type { DateClickArg };
  const plugin: unknown;
  export default plugin;
}

declare module "*.json" {
  const value: Record<string, string>;
  export default value;
}

declare module "styled-components" {
  export function useTheme(): {
    colors?: Record<string, string | undefined>;
    [key: string]: unknown;
  };
}
