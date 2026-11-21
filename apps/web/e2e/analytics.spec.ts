import { expect, test } from '@playwright/test';

test('pages load the cookieless Umami script, limited to the production domain', async ({
  page,
}) => {
  await page.goto('/');
  const script = page.locator('script[data-website-id]');
  await expect(script).toHaveAttribute('src', 'https://stats.prvaha.com/script.js');
  await expect(script).toHaveAttribute('data-domains', 'cardwise.prvaha.com');
  await expect(script).toHaveAttribute('data-do-not-track', 'true');
});

test('the privacy notice explains the visit counting', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Visit statistics' })).toBeVisible();
});
