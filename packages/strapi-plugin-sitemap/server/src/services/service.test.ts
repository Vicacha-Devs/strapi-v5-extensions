import { describe, expect, it, vi } from 'vitest';
import { OPTION_UID } from '../pluginId';
import serviceFactory from './service';

const POST_UID = 'api::post.post';

const makeStrapi = (opts: {
  options?: any;
  configs?: any[];
  customUrls?: any[];
  entries?: Record<string, any[]>;
}) => {
  const findMany = vi.fn(async (_params: any) => opts.entries?.[POST_UID] ?? []);
  const strapi: any = {
    contentTypes: {
      [POST_UID]: {
        kind: 'collectionType',
        info: { singularName: 'post', pluralName: 'posts', displayName: 'Post' },
        attributes: {
          title: { type: 'string' },
          slug: { type: 'string' },
          cover: { type: 'media' },
          category: { type: 'relation', relation: 'manyToOne' },
          tags: { type: 'relation', relation: 'manyToMany' },
          seo: { type: 'component', component: 'shared.seo', repeatable: false },
          createdAt: { type: 'datetime' },
        },
      },
      'plugin::sitemap.sitemap-option': { kind: 'singleType', info: {} },
      'plugin::upload.file': { kind: 'collectionType', info: {} },
    },
    components: { 'shared.seo': { attributes: { metaTitle: {}, metaDescription: {} } } },
    documents: vi.fn((uid: string) =>
      uid === OPTION_UID
        ? { findFirst: async () => opts.options ?? null }
        : { findMany }
    ),
    db: {
      query: vi.fn((uid: string) => ({
        findMany: async () =>
          uid.endsWith('single-url') ? (opts.customUrls ?? []) : (opts.configs ?? []),
      })),
    },
    log: { error: vi.fn() },
  };
  return { strapi, findMany, svc: serviceFactory.service({ strapi } as any) };
};

const config = (over: any = {}) => ({
  type: 'post',
  langcode: '-',
  pattern: '/blog/[slug]',
  priority: 0.8,
  frequency: 'weekly',
  lastModified: 'false',
  thumbnail: '-',
  populateLinkedModels: 'false',
  ...over,
});

describe('getSitemap', () => {
  it('returns an empty urlset when no options are saved', async () => {
    const { svc } = makeStrapi({});
    expect(await svc.getSitemap()).toMatch(/<urlset[^>]*><\/urlset>$/);
  });

  it('builds urls from collection entries and custom urls', async () => {
    const { svc } = makeStrapi({
      options: { baseUrl: 'https://a.com/' },
      configs: [config()],
      customUrls: [{ slug: 'about', priority: 1, frequency: 'monthly' }],
      entries: { [POST_UID]: [{ slug: 'one' }, { slug: 'two' }] },
    });
    const xml = await svc.getSitemap();
    expect(xml).toContain('<loc>https://a.com/blog/one</loc>');
    expect(xml).toContain('<loc>https://a.com/blog/two</loc>');
    expect(xml).toContain('<loc>https://a.com/about</loc>');
  });

  it('skips entries with a missing plain placeholder', async () => {
    const { svc } = makeStrapi({
      options: { baseUrl: 'https://a.com' },
      configs: [config()],
      entries: { [POST_UID]: [{ slug: null }, { slug: 'ok' }] },
    });
    const xml = await svc.getSitemap();
    expect(xml.match(/<url>/g)).toHaveLength(1);
  });

  it('applies excluded paths with or without slashes', async () => {
    const { svc } = makeStrapi({
      options: { baseUrl: 'https://a.com', excludedUrls: ['blog/two/', '/about'] },
      configs: [config()],
      customUrls: [{ slug: '/about', priority: 1, frequency: 'monthly' }],
      entries: { [POST_UID]: [{ slug: 'one' }, { slug: 'two' }] },
    });
    const xml = await svc.getSitemap();
    expect(xml).toContain('/blog/one');
    expect(xml).not.toContain('/blog/two');
    expect(xml).not.toContain('/about');
  });

  it('adds lastmod and thumbnail when configured', async () => {
    const { svc, findMany } = makeStrapi({
      options: { baseUrl: 'https://a.com' },
      configs: [config({ lastModified: 'true', thumbnail: 'cover' })],
      entries: {
        [POST_UID]: [
          { slug: 'one', updatedAt: '2024-05-01', cover: { url: 'https://a.com/i.png', name: 'Pic' } },
        ],
      },
    });
    const xml = await svc.getSitemap();
    expect(xml).toContain('<lastmod>2024-05-01</lastmod>');
    expect(xml).toContain('<image:loc>https://a.com/i.png</image:loc>');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published', populate: { cover: true } })
    );
  });

  it('passes the locale unless the language code is "-"', async () => {
    const { svc, findMany } = makeStrapi({
      options: { baseUrl: 'https://a.com' },
      configs: [config({ langcode: 'es' })],
    });
    await svc.getSitemap();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ locale: 'es' }));
  });

  it('skips configs whose content type no longer exists', async () => {
    const { svc } = makeStrapi({
      options: { baseUrl: 'https://a.com' },
      configs: [config({ type: 'ghost' })],
    });
    expect(await svc.getSitemap()).toMatch(/<urlset[^>]*><\/urlset>$/);
  });

  describe('sitemap index mode', () => {
    const options = {
      baseUrl: 'https://a.com',
      useSitemapIndex: true,
      sitemapDefinitions: [
        { name: 'blog', collectionTypeConfigIndices: [0], includeCustomUrls: false },
        { name: 'pages', collectionTypeConfigIndices: [], includeCustomUrls: true },
      ],
    };
    const setup = () =>
      makeStrapi({
        options,
        configs: [config()],
        customUrls: [{ slug: 'about', priority: 1, frequency: 'monthly' }],
        entries: { [POST_UID]: [{ slug: 'one' }] },
      });

    it('returns a sitemap index without a slug', async () => {
      const xml = await setup().svc.getSitemap();
      expect(xml).toContain('<sitemapindex');
      expect(xml).toContain('https://a.com/api/sitemap/sitemap-blog.xml');
    });

    it('returns only the selected configs for a named sitemap', async () => {
      const xml = await setup().svc.getSitemap('blog');
      expect(xml).toContain('/blog/one');
      expect(xml).not.toContain('/about');
    });

    it('includes custom urls only when the definition asks for them', async () => {
      const xml = await setup().svc.getSitemap('pages');
      expect(xml).toContain('/about');
      expect(xml).not.toContain('/blog/one');
    });

    it('returns an empty urlset for an unknown slug', async () => {
      expect(await setup().svc.getSitemap('nope')).toMatch(/<urlset[^>]*><\/urlset>$/);
    });
  });
});

describe('getContentTypes', () => {
  it('lists api collection types and hides internal plugin types', async () => {
    const { svc } = makeStrapi({});
    const { collectionTypes } = await svc.getContentTypes();
    expect(collectionTypes.map((c: any) => c.uid)).toEqual([POST_UID]);
  });
});

describe('getAllowedFields', () => {
  it('lists plain fields, to-one relations and non-repeatable components', async () => {
    const { svc } = makeStrapi({});
    const { allowedFields, slug } = await svc.getAllowedFields('post');
    expect(allowedFields).toEqual(
      expect.arrayContaining(['title', 'slug', 'cover', 'category.id', 'seo.metaTitle', 'id'])
    );
    expect(allowedFields).not.toContain('tags');
    expect(allowedFields).not.toContain('createdAt');
    expect(slug).toBe('posts');
  });

  it('falls back to id for unknown types', async () => {
    const { svc } = makeStrapi({});
    expect(await svc.getAllowedFields('ghost')).toEqual({ allowedFields: ['id'], slug: 'ghost' });
  });
});
