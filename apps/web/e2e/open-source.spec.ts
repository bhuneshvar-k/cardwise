import { expect, test } from '@playwright/test';

const REPO = 'https://github.com/bhuneshvar-k/cardwise';

test('the home page links to the source code on GitHub', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: 'Cardwise source code on GitHub' });
  await expect(link).toHaveAttribute('href', REPO);
  await expect(link).toHaveAttribute('target', '_blank');
});

test('About explains the project is open source and links to the repo', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'Open source' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Star on GitHub/ })).toHaveAttribute('href', REPO);
});
