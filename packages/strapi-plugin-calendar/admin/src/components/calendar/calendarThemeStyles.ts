import type { CalendarThemeDefinition } from "../../../../shared/types";

function buildEventStyleCss(
  scope: string,
  activeTheme: CalendarThemeDefinition,
  evtRadius: string
): string {
  if (activeTheme.eventStyle === "tinted") {
    return `
      ${scope} .fc-daygrid-event,
      ${scope} .fc-timegrid-event {
        border-radius: ${evtRadius} !important;
        border-width: 1px !important;
        border-style: solid !important;
        background: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 20%, ${activeTheme.cellBg}) !important;
        border-color: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 45%, ${activeTheme.borderColor}) !important;
        color: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 72%, ${activeTheme.cellText}) !important;
        box-shadow: none !important;
      }
      ${scope} .fc-daygrid-event .fc-event-main,
      ${scope} .fc-timegrid-event .fc-event-main,
      ${scope} .fc-daygrid-event .vicacha-fc-event-inner,
      ${scope} .fc-timegrid-event .vicacha-fc-event-inner {
        color: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 75%, ${activeTheme.cellText}) !important;
      }
    `;
  }
  if (activeTheme.eventStyle === "accent-bar") {
    return `
      ${scope} .fc-daygrid-event,
      ${scope} .fc-timegrid-event {
        border-radius: ${evtRadius} !important;
        border-top: 1px solid color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 32%, transparent) !important;
        border-bottom: 1px solid color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 32%, transparent) !important;
        border-inline-end: 1px solid color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 32%, transparent) !important;
        border-inline-start: 6px solid var(--fc-event-bg-color, ${activeTheme.primaryColor}) !important;
        background: color-mix(in oklab, var(--fc-event-bg-color, ${activeTheme.primaryColor}) 24%, ${activeTheme.cellBg}) !important;
        color: ${activeTheme.cellText} !important;
        box-shadow: none !important;
      }
      ${scope} .fc-daygrid-event .fc-event-main,
      ${scope} .fc-timegrid-event .fc-event-main,
      ${scope} .fc-daygrid-event .vicacha-fc-event-inner,
      ${scope} .fc-timegrid-event .vicacha-fc-event-inner {
        color: ${activeTheme.cellText} !important;
      }
    `;
  }
  return `
    ${scope} .fc-daygrid-event,
    ${scope} .fc-timegrid-event {
      border-radius: ${evtRadius} !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08) !important;
    }
  `;
}

function buildTodayCellCss(scope: string, activeTheme: CalendarThemeDefinition): string {
  if (activeTheme.todayHeaderAccent === "top-bar") {
    return `
      ${scope} .fc-daygrid-day.fc-day-today {
        background: ${activeTheme.todayBg} !important;
        box-shadow: inset 0 4px 0 0 ${activeTheme.todayBorder} !important;
      }
      ${scope} .fc-col-header-cell.fc-day-today {
        box-shadow: inset 0 4px 0 0 ${activeTheme.todayBorder} !important;
      }
    `;
  }
  if (activeTheme.id === "monarch" || activeTheme.id === "pulse") {
    return `
      ${scope} .fc-daygrid-day.fc-day-today {
        background: ${activeTheme.todayBg} !important;
      }
    `;
  }
  return `
    ${scope} .fc-daygrid-day.fc-day-today {
      background: ${activeTheme.todayBg} !important;
      box-shadow: inset 0 0 0 2px ${activeTheme.todayBorder} !important;
    }
  `;
}

function buildInteractiveCursorCss(scope: string, allowCreate: boolean): string {
  if (!allowCreate) return "";
  return `
    ${scope} .fc-daygrid-day,
    ${scope} .fc-timegrid-slot-lane {
      cursor: pointer;
    }
    ${scope} .vicacha-fc-day-quick-add {
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    ${scope} .fc-daygrid-day:hover .vicacha-fc-day-quick-add {
      opacity: 1;
    }
  `;
}

function resolveThemeDefaults(activeTheme: CalendarThemeDefinition) {
  return {
    radius: activeTheme.containerRadius ?? "10px",
    shadow: activeTheme.containerShadow ?? "none",
    evtRadius: activeTheme.eventRadius ?? "6px",
    fontFamily: activeTheme.fontFamily ?? "'Inter Variable', Inter, system-ui, sans-serif",
  };
}

function resolveThemeVariantTokens(activeTheme: CalendarThemeDefinition) {
  const isForma = activeTheme.id === "forma";
  return {
    nowColor: activeTheme.id === "pulse" ? "#EF4444" : activeTheme.primaryColor,
    headerPad: activeTheme.id === "monarch" ? "12px 4px" : "10px 4px",
    headerWeight: activeTheme.id === "pulse" ? 600 : 700,
    headerTransform: isForma ? "none" : "uppercase",
    headerTracking: isForma ? "0" : "0.04em",
    listDayBorder: isForma
      ? `border-inline-start: 4px solid ${activeTheme.primaryColor} !important;`
      : "",
    weekNumRadius: isForma ? "2px" : "5px",
  };
}

export function buildCalendarThemeCss(
  activeTheme: CalendarThemeDefinition,
  allowCreate = true
): string {
  const scope = `.vicacha-fc-container.vicacha-fc-theme-${activeTheme.id}`;
  const defaults = resolveThemeDefaults(activeTheme);
  const variants = resolveThemeVariantTokens(activeTheme);
  const eventRules = buildEventStyleCss(scope, activeTheme, defaults.evtRadius);
  const todayCellRule = buildTodayCellCss(scope, activeTheme);
  const interactiveCursorRule = buildInteractiveCursorCss(scope, allowCreate);

  return `
    ${scope} {
      --fc-border-color: ${activeTheme.borderColor};
      --fc-page-bg-color: ${activeTheme.cellBg};
      --fc-neutral-bg-color: ${activeTheme.cellAltBg};
      --fc-today-bg-color: ${activeTheme.todayBg};
      --fc-highlight-color: ${activeTheme.cellHoverBg};
      --fc-now-indicator-color: ${variants.nowColor};
      font-family: ${defaults.fontFamily};
      background: ${activeTheme.cellBg};
      color: ${activeTheme.cellText};
      border-radius: ${defaults.radius};
      border: 1px solid ${activeTheme.borderColor};
      box-shadow: ${defaults.shadow};
      overflow: hidden;
    }
    ${scope} .fc-theme-standard th,
    ${scope} .fc-col-header-cell {
      background: ${activeTheme.headerBg} !important;
      color: ${activeTheme.headerText} !important;
      border-color: ${activeTheme.borderColor} !important;
      padding: ${variants.headerPad} !important;
    }
    ${scope} .fc-col-header-cell-cushion {
      color: ${activeTheme.headerText} !important;
      font-weight: ${variants.headerWeight} !important;
      font-size: 12px !important;
      text-transform: ${variants.headerTransform} !important;
      letter-spacing: ${variants.headerTracking} !important;
      text-decoration: none !important;
    }
    ${scope} .fc-daygrid-day {
      background: ${activeTheme.cellBg} !important;
      color: ${activeTheme.cellText} !important;
      border-color: ${activeTheme.borderColor} !important;
      transition: background-color 0.15s ease;
    }
    ${scope} .fc-daygrid-day:hover {
      background: ${activeTheme.cellHoverBg} !important;
    }
    ${scope} .fc-daygrid-day.fc-day-other {
      background: ${activeTheme.cellAltBg} !important;
      opacity: 0.72;
    }
    ${todayCellRule}
    ${eventRules}
    ${interactiveCursorRule}
    ${scope} .fc-daygrid-day-top {
      flex-direction: row !important;
      width: 100% !important;
      padding: 4px 4px 2px !important;
      box-sizing: border-box !important;
    }
    ${scope} .fc-daygrid-day-number {
      width: 100% !important;
      min-width: 0 !important;
      padding: 0 !important;
      color: ${activeTheme.cellText} !important;
      text-decoration: none !important;
    }
    ${scope} .fc-daygrid-day-frame {
      min-height: 92px !important;
      padding: 2px !important;
      box-sizing: border-box !important;
    }
    ${scope} .fc-daygrid-more-link {
      font-size: 11px !important;
      font-weight: 700 !important;
      color: ${activeTheme.primaryColor} !important;
      padding: 1px 4px !important;
      text-decoration: none !important;
    }
    ${scope} .fc-timegrid-slot,
    ${scope} .fc-timegrid-axis,
    ${scope} .fc-scrollgrid {
      border-color: ${activeTheme.borderColor} !important;
      color: ${activeTheme.cellText} !important;
      background: ${activeTheme.cellBg} !important;
    }
    ${scope} .fc-timegrid-slot-minor {
      border-top-style: dotted !important;
    }
    ${scope} .fc-timegrid-slot-label-cushion,
    ${scope} .fc-list-day-text,
    ${scope} .fc-list-day-side-text {
      color: ${activeTheme.headerText} !important;
      font-weight: 600 !important;
      text-decoration: none !important;
    }
    ${scope} .fc-list-day-cushion {
      background: ${activeTheme.headerBg} !important;
      ${variants.listDayBorder}
    }
    ${scope} .fc-list-event td {
      background: ${activeTheme.cellBg} !important;
      color: ${activeTheme.cellText} !important;
      border-color: ${activeTheme.borderColor} !important;
    }
    ${scope} .fc-list-empty {
      background: ${activeTheme.cellAltBg} !important;
      color: ${activeTheme.cellMutedText} !important;
    }
    ${scope} .fc-multimonth {
      border: none !important;
      padding: 12px !important;
      gap: 14px !important;
      box-sizing: border-box !important;
      background: ${activeTheme.cellAltBg} !important;
    }
    ${scope} .fc-multimonth-month {
      background: ${activeTheme.cellBg} !important;
      color: ${activeTheme.cellText} !important;
      border: 1px solid ${activeTheme.borderColor} !important;
      border-radius: ${defaults.radius} !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      padding: 0 !important;
    }
    ${scope} .fc-multimonth-month[style*="33.3"] {
      width: calc((100% - 28px) / 3) !important;
      flex: 0 0 calc((100% - 28px) / 3) !important;
    }
    ${scope} .fc-multimonth-month[style*="50%"] {
      width: calc((100% - 14px) / 2) !important;
      flex: 0 0 calc((100% - 14px) / 2) !important;
    }
    ${scope} .fc-multimonth-month[style*="25%"] {
      width: calc((100% - 42px) / 4) !important;
      flex: 0 0 calc((100% - 42px) / 4) !important;
    }
    ${scope} .fc-multimonth-month[style*="100%"] {
      width: 100% !important;
      flex: 0 0 100% !important;
    }
    ${scope} .fc-multimonth-header-table th,
    ${scope} .fc-multimonth-month .fc-col-header-cell {
      padding: 6px 2px !important;
    }
    ${scope} .fc-multimonth-month .fc-col-header-cell-cushion {
      font-size: 10.5px !important;
      letter-spacing: 0.02em !important;
    }
    ${scope} .fc-multimonth-month .fc-daygrid-day-frame {
      min-height: 46px !important;
      padding: 1px !important;
    }
    ${scope} .fc-multimonth-month .fc-daygrid-day-top {
      padding: 2px 2px 1px !important;
    }
    ${scope} .fc-multimonth-title {
      color: ${activeTheme.headerText} !important;
      background: ${activeTheme.headerBg} !important;
      border-bottom: 1px solid ${activeTheme.borderColor} !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      padding: 10px 12px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.06em !important;
    }
    ${scope} .fc-daygrid-week-number {
      background: ${activeTheme.badgeBg} !important;
      color: ${activeTheme.badgeText} !important;
      border-radius: ${variants.weekNumRadius} !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      padding: 1px 5px !important;
      margin: 2px 4px !important;
      opacity: 0.85;
    }
    @media (max-width: 1100px) {
      ${scope} .vicacha-fc-day-quick-add {
        display: none !important;
      }
      ${scope} .vicacha-fc-secondary-badge {
        font-size: 9.5px !important;
        padding: 0 5px !important;
      }
      ${scope} .fc-daygrid-day-frame {
        min-height: 76px !important;
      }
    }
    @media (max-width: 768px) {
      ${scope} .vicacha-fc-secondary-badge {
        display: none !important;
      }
      ${scope} .fc-daygrid-day-frame {
        min-height: 58px !important;
      }
      ${scope} .fc-multimonth {
        padding: 6px !important;
        gap: 10px !important;
      }
    }
  `;
}
