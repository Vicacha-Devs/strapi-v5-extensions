const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export const escapeXml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);

export const generateSitemapIndexXml = (
  baseURL: string,
  prefix: string,
  definitions: any[]
): string => {
  const base = baseURL.replace(/\/$/, '');
  const sitemaps = definitions
    .map((d) => String(d.name ?? '').trim())
    .filter(Boolean)
    .map(
      (name) =>
        `<sitemap><loc>${escapeXml(`${base}${prefix}/sitemap-${encodeURIComponent(name)}.xml`)}</loc></sitemap>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemaps}</sitemapindex>`;
};

export const generateUrlsetXml = (sitemap: any[]): string => {
  const urlSet = sitemap
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
      const image = entry.thumbnail
        ? `<image:image><image:loc>${escapeXml(entry.thumbnail)}</image:loc><image:title>${escapeXml(entry.thumbnailTitle)}</image:title></image:image>`
        : '';
      return `<url><loc>${escapeXml(entry.url)}</loc><priority>${escapeXml(entry.priority)}</priority><changefreq>${escapeXml(entry.frequency)}</changefreq>${lastmod}${image}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urlSet}</urlset>`;
};
