export const PLUGIN_ID = "notes";
export const NOTE_CONTENT_TYPE_UID = "plugin::notes.note";

export const NOTE_CATEGORIES = ["general", "todo", "blocker", "idea"] as const;

export const MAX_NOTE_TITLE_LENGTH = 255;
export const MAX_NOTE_CONTENT_LENGTH = 20000;
export const MAX_ENTITY_SLUG_LENGTH = 160;
export const MAX_ENTITY_ID_LENGTH = 128;
export const MAX_LOCALE_LENGTH = 32;

export const NOTE_CATEGORY_META: Record<
  (typeof NOTE_CATEGORIES)[number],
  {
    labelKey: string;
    defaultLabel: string;
    badgeBackground: string;
    badgeTextColor: string;
  }
> = {
  general: {
    labelKey: "category.general",
    defaultLabel: "General",
    badgeBackground: "neutral150",
    badgeTextColor: "neutral800",
  },
  todo: {
    labelKey: "category.todo",
    defaultLabel: "Todo",
    badgeBackground: "primary100",
    badgeTextColor: "primary700",
  },
  blocker: {
    labelKey: "category.blocker",
    defaultLabel: "Blocker",
    badgeBackground: "danger100",
    badgeTextColor: "danger700",
  },
  idea: {
    labelKey: "category.idea",
    defaultLabel: "Idea",
    badgeBackground: "success100",
    badgeTextColor: "success700",
  },
};
