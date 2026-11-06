export default {
  default: {
    defaultSortOrder: "DESC",
    enableLocaleScoping: true,
  },
  validator(config: Record<string, unknown>) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new Error("Invalid notes plugin config: expected an object.");
    }
    if (
      config.defaultSortOrder !== undefined &&
      config.defaultSortOrder !== "ASC" &&
      config.defaultSortOrder !== "DESC"
    ) {
      throw new Error(
        'Invalid notes plugin config: defaultSortOrder must be "ASC" or "DESC".'
      );
    }
    if (
      config.enableLocaleScoping !== undefined &&
      typeof config.enableLocaleScoping !== "boolean"
    ) {
      throw new Error(
        "Invalid notes plugin config: enableLocaleScoping must be a boolean."
      );
    }
  },
};
