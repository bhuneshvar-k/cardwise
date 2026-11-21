import type { MetadataRoute } from 'next';

/** Public origin, used for canonical URLs, the sitemap and social cards. Set at build time. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cardwise.prvaha.com').replace(
  /\/+$/,
  '',
);
export const SITE_NAME = 'Cardwise';
export const REPO_URL = 'https://github.com/bhuneshvar-k/cardwise';
export const SITE_DESCRIPTION =
  'Find which credit or debit card earns the most for each purchase in India: Swiggy, Amazon, fuel, UPI and more, with caps and exclusions counted.';

/** Pages worth indexing. App screens that only show this device's data are left out. */
const PUBLIC_PAGES = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
] as const;

export interface SitemapPost {
  slug: string;
  updated: string;
}

export function absoluteUrl(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

export function robotsRules(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/~offline'] },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}

export function sitemapEntries(posts: readonly SitemapPost[]): MetadataRoute.Sitemap {
  const newest = posts.reduce<string | undefined>(
    (max, p) => (max === undefined || p.updated > max ? p.updated : max),
    undefined,
  );
  const pages = PUBLIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    ...(page.path === '/blog' && newest ? { lastModified: new Date(newest) } : {}),
  }));
  const articles = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updated),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));
  return [...pages, ...articles];
}

/** JSON for a `<script type="application/ld+json">`; `<` is escaped so values cannot end the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
