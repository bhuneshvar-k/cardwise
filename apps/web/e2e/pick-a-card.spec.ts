import { expect, test } from '@playwright/test';
import { addCard, toast } from './helpers';

test('add cards, get the best card for Swiggy, log the spend', async ({ page }) => {
  // Arrange: a wallet with two cards
  await addCard(page, 'Live+', 'HSBC Live+ Credit Card');
  await addCard(page, 'Amazon Pay ICICI', 'Amazon Pay ICICI Bank Credit Card');

  // Act: ask where to pay ₹600 on Swiggy
  await page.getByRole('link', { name: 'Pick' }).click();
  await page.getByLabel('Search merchants').fill('swig');
  await page.getByRole('button', { name: /^Swiggy\s+Food delivery$/ }).click();
  await page.getByLabel('Amount (optional)').fill('600');
  // nuqs writes the URL a moment later; a navigation before then would be overwritten.
  await expect(page).toHaveURL(/a=600/);

  // Assert: Live+ wins with 10%
  const best = page.getByTestId('result-card').first();
  await expect(best).toContainText('Best choice');
  await expect(best).toContainText('HSBC Live+ Credit Card');
  await expect(best).toContainText('₹60');

  // Log it and see it under Spends
  await best.getByRole('button', { name: 'Paid with this' }).click();
  await expect(toast(page, 'Logged ₹600 on HSBC Live+ Credit Card')).toBeVisible();
  await page.getByRole('link', { name: 'Spends' }).click();
  await expect(page.getByRole('region', { name: 'Recent spends' })).toContainText('Swiggy');
  await expect(
    page.getByRole('progressbar', { name: '10% cashback cap (₹1,200)' }),
  ).toHaveAttribute('aria-valuenow', '5');
});

test('UPI only ranks RuPay credit cards', async ({ page }) => {
  await addCard(page, 'Live+', 'HSBC Live+ Credit Card');
  await page.goto('/?c=grocery&p=upi');
  await expect(page.getByTestId('result-card').first()).toContainText(
    'Only RuPay credit cards can be used on UPI',
  );
});

test('the picker shell renders offline-ready pages without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of ['/', '/cards', '/spends', '/about', '/~offline']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('opens and moves between screens offline once installed', async ({ page, context }) => {
  // Arrange: first visit installs the service worker
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // A later online visit, now controlled by the worker, caches the tab payloads
  await page.reload();
  await expect
    .poll(
      () => page.evaluate(async () => (await (await caches.open('rsc-payloads')).keys()).length),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(2);

  // Act: open the app again with no network, like launching the home-screen app offline
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  await offlinePage.goto('/');

  // Assert: the picker loads and the bottom tabs still work
  await expect(offlinePage.getByRole('heading', { name: 'Which card?' })).toBeVisible();
  await offlinePage.getByRole('link', { name: 'My cards' }).click();
  await expect(offlinePage.getByRole('heading', { name: 'My cards' })).toBeVisible();
  await offlinePage.getByRole('link', { name: 'Spends' }).click();
  await expect(offlinePage.getByRole('heading', { name: 'Spends', level: 1 })).toBeVisible();
  await context.setOffline(false);
});
