import type { ContentTypeDescriptor } from '../types';

/** `seo.metaTitle` + condition -> `{ seo: { metaTitle: condition } }` */
const nest = (path: string, condition: Record<string, unknown>): Record<string, unknown> =>
  path
    .split('.')
    .reverse()
    .reduce((acc, segment) => ({ [segment]: acc }), condition as Record<string, unknown>);

/**
 * Turns the component segments of the nested paths into a Document Service
 * populate tree, so the matched value is present on the returned entry and can
 * be ranked and excerpted. Only the components actually searched are populated.
 */
const buildPopulate = (paths: string[]): Record<string, unknown> | undefined => {
  const tree: Record<string, Record<string, unknown>> = {};

  paths.forEach((path) => {
    const segments = path.split('.');
    segments.pop(); // drop the scalar field itself

    let node: Record<string, unknown> = tree;
    segments.forEach((segment) => {
      node[segment] = (node[segment] as Record<string, unknown>) || {};
      node = node[segment] as Record<string, unknown>;
    });
  });

  const toPopulate = (node: Record<string, unknown>): Record<string, unknown> =>
    Object.entries(node).reduce((acc: Record<string, unknown>, [key, child]) => {
      const childObj = child as Record<string, unknown>;
      acc[key] = Object.keys(childObj).length ? { populate: toPopulate(childObj) } : true;
      return acc;
    }, {});

  return Object.keys(tree).length ? toPopulate(tree) : undefined;
};

export default () => ({
  nest,
  buildPopulate,

  /** All field paths a hit could have matched, in ranking order. */
  searchablePaths(descriptor: ContentTypeDescriptor): string[] {
    return [
      ...descriptor.idFields,
      ...(descriptor.mainField && descriptor.mainField !== 'id' ? [descriptor.mainField] : []),
      ...descriptor.topLevelFields,
      ...descriptor.nestedFields,
    ];
  },

  /**
   * One `$or` over every searchable path. `id` is numeric, so it is only added —
   * as an equality — when the query is a plain integer; `$containsi` on an
   * integer column is rejected by Postgres and misbehaves elsewhere.
   * `documentId` is always matched as a string.
   */
  buildFilters(descriptor: ContentTypeDescriptor, query: string): { $or: unknown[] } | null {
    const conditions: unknown[] = [{ documentId: { $containsi: query } }];

    if (/^\d+$/.test(query)) {
      conditions.push({ id: { $eq: Number(query) } });
    }

    this.searchablePaths(descriptor).forEach((path) => {
      if (path === 'documentId') return;
      conditions.push(nest(path, { $containsi: query }));
    });

    return conditions.length ? { $or: conditions } : null;
  },

  /** Bounded projection — never `populate: '*'`, never a full row. */
  buildParams(
    descriptor: ContentTypeDescriptor,
    {
      query,
      locale,
      limit,
      includeDrafts,
    }: { query: string; locale?: string; limit: number; includeDrafts: boolean }
  ): Record<string, unknown> | null {
    const filters = this.buildFilters(descriptor, query);
    if (!filters) return null;

    const fields = Array.from(
      new Set(
        [
          'documentId',
          ...descriptor.idFields,
          descriptor.mainField,
          ...descriptor.topLevelFields,
          'createdAt',
          'updatedAt',
          ...(descriptor.draftAndPublish ? ['publishedAt'] : []),
          ...(descriptor.localized ? ['locale'] : []),
        ].filter((field) => field && field !== 'id')
      )
    );

    const params: Record<string, unknown> = {
      filters,
      fields,
      sort: { updatedAt: 'desc' },
      limit,
      start: 0,
    };

    const populate = buildPopulate(descriptor.nestedFields);
    if (populate) params.populate = populate;

    if (descriptor.draftAndPublish) {
      params.status = includeDrafts ? 'draft' : 'published';
    }

    if (descriptor.localized) {
      params.locale = locale && locale !== 'all' ? locale : '*';
    }

    return params;
  },
});
