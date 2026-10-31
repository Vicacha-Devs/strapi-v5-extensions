export default {
  default: {
    defaultSortOrder: 'DESC',
    enableLocaleScoping: true,
  },
  validator(config: Record<string, unknown>) {
    if (
      config.defaultSortOrder !== undefined &&
      config.defaultSortOrder !== 'ASC' &&
      config.defaultSortOrder !== 'DESC'
    ) {
      throw new Error(
        'Invalid notes plugin config: defaultSortOrder must be "ASC" or "DESC".'
      );
    }
  },
};
