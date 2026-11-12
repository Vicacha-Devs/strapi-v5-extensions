import type { ContentTypeDescriptor } from "../types";

const CM_READ_ACTION = "plugin::content-manager.explorer.read";

export default () => ({
  /**
   * An editor restricted to Articles must not discover Orders through search, so
   * candidate types are intersected with what the caller can read in the Content
   * Manager before any query runs.
   */
  filterReadableTypes(
    types: ContentTypeDescriptor[],
    userAbility?: { can: (action: string, subject: string) => boolean } | null
  ): ContentTypeDescriptor[] {
    if (userAbility === undefined) return types;
    if (userAbility === null || typeof userAbility.can !== "function") {
      return [];
    }

    return types.filter((type) => {
      try {
        return userAbility.can(CM_READ_ACTION, type.uid);
      } catch {
        return false;
      }
    });
  },
});
