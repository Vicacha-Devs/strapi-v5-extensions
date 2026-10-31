import { TIER, TIER_LABELS } from '../utils/constants';
import { getValuesAtPath, buildSnippet, humanizeFieldPath } from '../utils/text';
import type { ContentTypeDescriptor, RankedHit } from '../types';

type ScoreResult = Pick<
  RankedHit,
  | 'tier'
  | 'tierLabel'
  | 'matchedField'
  | 'matchedFieldLabel'
  | 'matchedSnippet'
  | 'exactCase'
  | 'valueLength'
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
    test: (value: string) => boolean
  ): { path: string; value: string } | null {
    for (const path of paths) {
      const values = getValuesAtPath(entry, path);

      for (const value of values) {
        if (test(value)) return { path, value };
      }
    }

    return null;
  },

  score(entry: unknown, descriptor: ContentTypeDescriptor, query: string): ScoreResult {
    const lowered = query.toLowerCase();
    const idPaths = ['id', 'documentId', ...descriptor.idFields];
    const mainPaths = descriptor.mainField && descriptor.mainField !== 'id' ? [descriptor.mainField] : [];

    const attempts: Array<[number, string[], (value: string) => boolean]> = [
      [TIER.ID_EXACT, idPaths, (value) => value.toLowerCase() === lowered],
      [TIER.ID_CONTAINS, idPaths, (value) => value.toLowerCase().includes(lowered)],
      [TIER.MAIN_EXACT, mainPaths, (value) => value.toLowerCase() === lowered],
      [TIER.MAIN_STARTS_WITH, mainPaths, (value) => value.toLowerCase().startsWith(lowered)],
      [TIER.MAIN_CONTAINS, mainPaths, (value) => value.toLowerCase().includes(lowered)],
      [
        TIER.FIELD_CONTAINS,
        descriptor.topLevelFields,
        (value) => value.toLowerCase().includes(lowered),
      ],
      [
        TIER.NESTED_CONTAINS,
        descriptor.nestedFields,
        (value) => value.toLowerCase().includes(lowered),
      ],
    ];

    for (const [tier, paths, test] of attempts) {
      const match = this.findMatch(entry, paths, test);

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

    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  },

  sort(hits: RankedHit[]): RankedHit[] {
    return [...hits].sort((a, b) => this.compare(a, b));
  },
});
