import { describe, expect, it, vi } from 'vitest';
import { CONTENT_TYPE_UID, SINGLE_URL_UID } from '../pluginId';
import settingsFactory from './settings';

const makeStrapi = (tables: Record<string, any[]>) => {
  const calls: Record<string, any[]> = {};
  const record = (uid: string, op: string, arg: any) => {
    (calls[`${uid}:${op}`] ??= []).push(arg);
  };
  const updateOptions = vi.fn(async () => ({}));
  const getOptions = vi.fn(async () => ({
    baseUrl: 'https://a.com',
    excludedUrls: ['/x'],
    useSitemapIndex: true,
    sitemapDefinitions: [{ name: 'blog' }],
  }));
  const strapi: any = {
    plugin: () => ({ service: () => ({ getOptions, updateOptions }) }),
    db: {
      query: (uid: string) => ({
        findMany: async () => tables[uid] ?? [],
        update: async (arg: any) => record(uid, 'update', arg),
        create: async (arg: any) => record(uid, 'create', arg),
        deleteMany: async (arg: any) => record(uid, 'deleteMany', arg),
      }),
    },
    log: { error: vi.fn() },
  };
  return { calls, updateOptions, svc: settingsFactory.settings({ strapi }) };
};

describe('getSettings', () => {
  it('maps stored rows to the admin shape', async () => {
    const { svc } = makeStrapi({
      [CONTENT_TYPE_UID]: [
        { id: 1, type: 'post', pattern: '/[slug]', priority: '0.5', lastModified: 'true', populateLinkedModels: 'false' },
      ],
      [SINGLE_URL_UID]: [{ id: 1, slug: '/about', priority: 1, frequency: 'daily' }],
    });
    const result = await svc.getSettings();
    expect(result).toMatchObject({
      baseUrl: 'https://a.com',
      useSitemapIndex: true,
      sitemaps: [{ name: 'blog' }],
      customURLs: [{ url: '/about', priority: 1, frequency: 'daily' }],
    });
    expect(result.collectionTypes[0]).toMatchObject({
      type: 'post',
      priority: 0.5,
      lastModified: true,
      populateLinkedModels: false,
    });
  });
});

describe('updateSettings', () => {
  it('updates rows by position, creates new ones and deletes surplus', async () => {
    const { svc, calls, updateOptions } = makeStrapi({
      [CONTENT_TYPE_UID]: [{ id: 10 }, { id: 11 }, { id: 12 }],
      [SINGLE_URL_UID]: [],
    });
    await svc.updateSettings({
      baseUrl: 'https://b.com',
      collectionTypes: [{ type: 'post', lastModified: true }],
      customURLs: [{ url: '/a', priority: 1, frequency: 'daily' }],
      excludedUrls: ['/z'],
      sitemaps: [],
    });

    expect(calls[`${CONTENT_TYPE_UID}:update`]).toEqual([
      { where: { id: 10 }, data: expect.objectContaining({ type: 'post', lastModified: 'true' }) },
    ]);
    expect(calls[`${CONTENT_TYPE_UID}:deleteMany`]).toEqual([{ where: { id: { $in: [11, 12] } } }]);
    expect(calls[`${SINGLE_URL_UID}:create`]).toEqual([
      { data: { slug: '/a', priority: 1, frequency: 'daily' } },
    ]);
    expect(updateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'https://b.com', excludedUrls: ['/z'], sitemapDefinitions: [] })
    );
  });

  it('wraps failures in a generic error', async () => {
    const { svc, updateOptions } = makeStrapi({});
    updateOptions.mockRejectedValueOnce(new Error('db down'));
    await expect(svc.updateSettings({})).rejects.toThrow('Failed to save settings');
  });
});
