import { expect, test } from '@playwright/test';

test('guides are reachable from About, not from the main navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveCount(4);

  await page.goto('/about');
  await page.getByRole('link', { name: 'Read the guides' }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Guides' })).toBeVisible();
});

test('a guide renders with canonical URL, social card and structured data', async ({ page }) => {
  await page.goto('/blog');
  await page.getByRole('link', { name: /Swiggy, Zomato/ }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Swiggy');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/blog\/best-credit-card-for-swiggy-zomato-dining$/,
  );
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
    'content',
    /opengraph-image/,
  );
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(jsonLd ?? '{}')['@graph'][0]['@type']).toBe('BlogPosting');

  await page.getByRole('link', { name: 'Try it in Cardwise' }).click();
  await expect(page).toHaveURL(/m=swiggy/);
});

test('robots.txt and sitemap.xml point crawlers at the public pages', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /admin');
  expect(robots).toContain('Sitemap:');

  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/blog/credit-card-reward-caps-explained');
  expect(sitemap).not.toContain('/admin');
});

test('device-only screens ask search engines not to index them', async ({ page }) => {
  await page.goto('/cards');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
