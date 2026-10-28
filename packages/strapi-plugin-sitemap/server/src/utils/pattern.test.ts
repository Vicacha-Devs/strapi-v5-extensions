import { describe, expect, it } from 'vitest';
import { buildEntryUrl, getNestedValue, parseTableReferences } from './pattern';

describe('getNestedValue', () => {
  it('reads nested paths and returns null when missing', () => {
    expect(getNestedValue({ a: { b: 'x' } }, 'a.b')).toBe('x');
    expect(getNestedValue({ a: {} }, 'a.b')).toBeNull();
    expect(getNestedValue({}, 'a.b.c')).toBeNull();
  });
});

describe('parseTableReferences', () => {
  it('returns an empty object when there are no relations', () => {
    expect(parseTableReferences('/blog/[slug]')).toEqual({});
  });

  it('populates single and nested relations', () => {
    expect(parseTableReferences('/[category.slug]/[a.b.slug]')).toEqual({
      populate: { category: true, a: { populate: { b: true } } },
    });
  });
});

describe('buildEntryUrl', () => {
  it('fills placeholders and joins with the base url', () => {
    expect(buildEntryUrl('/blog/[slug]', { slug: 'hi' }, 'https://a.com/')).toBe(
      'https://a.com/blog/hi'
    );
  });

  it('adds a leading slash and collapses duplicates', () => {
    expect(buildEntryUrl('blog//[slug]', { slug: 'hi' }, 'https://a.com')).toBe(
      'https://a.com/blog/hi'
    );
  });

  it('returns null when a plain placeholder is missing', () => {
    expect(buildEntryUrl('/[slug]', {}, 'https://a.com')).toBeNull();
  });

  it('drops a missing nested placeholder instead of skipping the entry', () => {
    expect(buildEntryUrl('/[cat.slug]/[slug]', { slug: 'x' }, 'https://a.com')).toBe(
      'https://a.com/x'
    );
  });
});
