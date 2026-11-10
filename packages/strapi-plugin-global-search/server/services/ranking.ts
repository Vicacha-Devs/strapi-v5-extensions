import type { ContentTypeDescriptor, RankedHit } from "../types";
import { TIER, TIER_LABELS } from "../utils/constants";
import {
  getValuesAtPath,
  buildSnippet,
  humanizeFieldPath,
  toPlainText,
} from "../utils/text";

type ScoreResult = Pick<
  RankedHit,
  | "tier"
  | "tierLabel"
  | "matchedField"
  | "matchedFieldLabel"
  | "matchedSnippet"
  | "exactCase"
  | "valueLength"
>;

/**
 * Ordering rule, highest priority first:
 *   0 id / documentId exact
 *   1 id / documentId partial
 *   2 name (main field) exact
 *   3 name starts with
 *   4 name contains
 *   5 any other top-level field
 *   6 any nested component field ("from inside")
 * Ties are broken by an exact-case bonus, then the shortest matching value
 * (a hit in a 10-character title beats one in a 5,000-character body), then
 * the most recently updated entry.
 */
export default () => ({
  /** First path whose value satisfies `test`, searched in the given order. */
  findMatch(
    entry: unknown,
    paths: string[],
    test: (value: string) => boolean,
    normalize = false
  ): { path: string; value: string } | null {
    for (const path of paths) {
      const values = getValuesAtPath(entry, path);

      for (const rawValue of values) {
        const value = normalize ? toPlainText(rawValue) || rawValue : rawValue;
        if (test(value)) return { path, value };
      }
    }

    return null;
  },

  score(
    entry: unknown,
    descriptor: ContentTypeDescriptor,
    query: string
  ): ScoreResult {
    const lowered = query.toLowerCase();
    const idSet = new Set(["id", ...descriptor.idFields]);
    const idPaths = Array.from(idSet);
    const mainPaths =
      descriptor.mainField &&
      descriptor.mainField !== "id" &&
      descriptor.mainFieldSearchable !== false
        ? [descriptor.mainField]
        : [];

    const attempts: Array<
      [number, string[], (value: string) => boolean, boolean]
    > = [
      [TIER.ID_EXACT, idPaths, (val) => val.toLowerCase() === lowered, false],
      [
        TIER.ID_CONTAINS,
        idPaths,
        (val) => val.toLowerCase().includes(lowered),
        false,
      ],
      [
        TIER.MAIN_EXACT,
        mainPaths,
        (val) => val.toLowerCase() === lowered,
        true,
      ],
      [
        TIER.MAIN_STARTS_WITH,
        mainPaths,
        (val) => val.toLowerCase().startsWith(lowered),
        true,
      ],
      [
        TIER.MAIN_CONTAINS,
        mainPaths,
        (val) => val.toLowerCase().includes(lowered),
        true,
      ],
      [
        TIER.FIELD_CONTAINS,
        descriptor.topLevelFields,
        (val) => val.toLowerCase().includes(lowered),
        true,
      ],
      [
        TIER.NESTED_CONTAINS,
        descriptor.nestedFields,
        (val) => val.toLowerCase().includes(lowered),
        true,
      ],
    ];

    for (const [tier, paths, test, normalize] of attempts) {
      const match = this.findMatch(entry, paths, test, normalize);

      if (match) {
        return {
          tier,
          tierLabel: TIER_LABELS[tier],
          matchedField: match.path,
          matchedFieldLabel: humanizeFieldPath(match.path),
          matchedSnippet: buildSnippet(match.value, query),
          exactCase: match.value.includes(query),
          valueLength: match.value.length,
        };
      }
    }

    // The database matched something we cannot re-locate — a value behind an
    // unpopulated relation, say. Keep the hit, rank it last.
    return {
      tier: TIER.UNKNOWN,
      tierLabel: TIER_LABELS[TIER.UNKNOWN],
      matchedField: null,
      matchedFieldLabel: null,
      matchedSnippet: null,
      exactCase: false,
      valueLength: Number.MAX_SAFE_INTEGER,
    };
  },

  compare(a: RankedHit, b: RankedHit): number {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.exactCase !== b.exactCase) return a.exactCase ? -1 : 1;
    if (a.valueLength !== b.valueLength) return a.valueLength - b.valueLength;

    return (
      new Date(b.updatedAt || 0).getTime() -
      new Date(a.updatedAt || 0).getTime()
    );
  },

  sort(hits: RankedHit[]): RankedHit[] {
    return [...hits].sort((a, b) => this.compare(a, b));
  },
});
