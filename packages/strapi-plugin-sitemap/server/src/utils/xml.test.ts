import { describe, expect, it } from 'vitest';
import { escapeXml, generateSitemapIndexXml, generateUrlsetXml } from './xml';

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;'
    );
  });

  it('turns null and undefined into an empty string', () => {
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
  });
});

describe('generateUrlsetXml', () => {
  it('escapes urls and omits optional tags when absent', () => {
    const xml = generateUrlsetXml([
      { url: 'https://a.com/?x=1&y=2', priority: 0.5, frequency: 'daily' },
    ]);
    expect(xml).toContain('<loc>https://a.com/?x=1&amp;y=2</loc>');
    expect(xml).not.toContain('<lastmod>');
    expect(xml).not.toContain('<image:image>');
  });

  it('renders lastmod and image tags', () => {
    const xml = generateUrlsetXml([
      {
        url: 'https://a.com/p',
        priority: 1,
        frequency: 'weekly',
        lastmod: '2024-01-01',
        thumbnail: 'https://a.com/i.png',
        thumbnailTitle: 'A & B',
      },
    ]);
    expect(xml).toContain('<lastmod>2024-01-01</lastmod>');
    expect(xml).toContain('<image:title>A &amp; B</image:title>');
  });

  it('returns an empty urlset for no entries', () => {
    expect(generateUrlsetXml([])).toMatch(/<urlset[^>]*><\/urlset>$/);
  });
});

describe('generateSitemapIndexXml', () => {
  it('builds encoded sitemap locs and skips blank names', () => {
    const xml = generateSitemapIndexXml('https://a.com/', '/api/sitemap', [
      { name: ' blog posts ' },
      { name: '  ' },
      {},
    ]);
    expect(xml).toContain('<loc>https://a.com/api/sitemap/sitemap-blog%20posts.xml</loc>');
    expect(xml.match(/<sitemap>/g)).toHaveLength(1);
  });
});
