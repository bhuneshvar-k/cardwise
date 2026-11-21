import { describe, expect, test } from 'vitest';
import { absoluteUrl, robotsRules, serializeJsonLd, sitemapEntries, SITE_URL } from './seo';

describe('absoluteUrl', () => {
  test('joins a path onto the site URL', () => {
    expect(absoluteUrl('/blog')).toBe(`${SITE_URL}/blog`);
  });

  test('returns the bare site URL for the root path', () => {
    expect(absoluteUrl('/')).toBe(SITE_URL);
  });
});

describe('robotsRules', () => {
  test('lets crawlers in but keeps them out of admin, API and offline pages', () => {
    // Act
    const robots = robotsRules();

    // Assert
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(rule?.allow).toBe('/');
    expect(rule?.disallow).toEqual(expect.arrayContaining(['/admin', '/api/', '/~offline']));
    expect(robots.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});

describe('sitemapEntries', () => {
  const posts = [
    { slug: 'first-post', updated: '2026-11-20' },
    { slug: 'second-post', updated: '2026-11-21' },
  ];

  test('lists public pages and every blog post with absolute URLs', () => {
    // Act
    const urls = sitemapEntries(posts).map((e) => e.url);

    // Assert
    expect(urls).toEqual(
      expect.arrayContaining([
        SITE_URL,
        `${SITE_URL}/blog`,
        `${SITE_URL}/about`,
        `${SITE_URL}/privacy`,
        `${SITE_URL}/blog/first-post`,
        `${SITE_URL}/blog/second-post`,
      ]),
    );
  });

  test('leaves out private and device-only screens', () => {
    const urls = sitemapEntries(posts).map((e) => e.url);
    for (const hidden of ['/admin', '/cards', '/spends', '/~offline']) {
      expect(urls).not.toContain(`${SITE_URL}${hidden}`);
    }
  });

  test('dates each post by its last update and the blog index by the newest post', () => {
    const entries = sitemapEntries(posts);
    const byUrl = new Map(entries.map((e) => [e.url, e.lastModified]));
    expect(byUrl.get(`${SITE_URL}/blog/first-post`)).toEqual(new Date('2026-11-20'));
    expect(byUrl.get(`${SITE_URL}/blog`)).toEqual(new Date('2026-11-21'));
  });
});

describe('serializeJsonLd', () => {
  test('escapes < so a value cannot close the script tag', () => {
    // Arrange
    const data = { name: '</script><script>alert(1)</script>' };

    // Act
    const json = serializeJsonLd(data);

    // Assert
    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual(data);
  });
});
