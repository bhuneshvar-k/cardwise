import { expect, test, type Page } from '@playwright/test';
import { addCard } from './helpers';

const PASSWORD = 'e2e-test-password-123';

// Sign-in hashes a password on an embedded database; several of these share one test.
test.describe.configure({ timeout: 90_000 });

async function signIn(page: Page, email: string) {
  await page.goto('/about');
  await page.getByRole('checkbox', { name: /I agree to the/ }).check();
  await page.getByLabel('Test email').fill(email);
  await page.getByLabel('Test password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in for testing' }).click();
  // New accounts hash a password and migrate an embedded database: allow time.
  await expect(page.getByText(email)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Last synced: \d/)).toBeVisible({ timeout: 20_000 });
}

test('cards sync to a second device after sign-in', async ({ browser }) => {
  const email = `user-${Date.now()}@e2e.test`;
  // Device A: sign in and add a card
  const deviceA = await (await browser.newContext()).newPage();
  await signIn(deviceA, email);
  await addCard(deviceA, 'Live+', 'HSBC Live+ Credit Card');
  await deviceA.goto('/about');
  await deviceA.getByRole('button', { name: 'Sync now' }).click();
  await expect(deviceA.getByText('Synced', { exact: true })).toBeVisible({ timeout: 15_000 });

  // Device B: a fresh browser signs in and gets the card
  const deviceB = await (await browser.newContext()).newPage();
  await signIn(deviceB, email);
  await deviceB.goto('/cards');
  await expect(deviceB.getByText('HSBC Live+ Credit Card')).toBeVisible({ timeout: 15_000 });
});

test('admin pages are hidden from everyone but admins', async ({ browser }) => {
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto('/admin');
  await expect(visitor.getByText(/could not be found/i)).toBeVisible();

  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, 'admin@e2e.test');
  await admin.getByRole('link', { name: 'Admin' }).click();
  await expect(admin.getByText('Changes to review')).toBeVisible();
  await admin.goto('/admin/cards?q=live');
  await expect(admin.getByRole('link', { name: /HSBC Live\+ Credit Card/ }).first()).toBeVisible();
});

test('reports from the picker reach the admin queue', async ({ browser }) => {
  const user = await (await browser.newContext()).newPage();
  await addCard(user, 'Live+', 'HSBC Live+ Credit Card');
  await user.goto('/?m=swiggy&a=600');
  await user.getByRole('button', { name: 'Something wrong?' }).first().click();
  const message = `E2E report ${Date.now()}`;
  await user.getByPlaceholder(/My bank says/).fill(message);
  await user.getByRole('button', { name: 'Send report' }).click();
  await expect(user.getByText('Thanks — we will check this card.')).toBeVisible();

  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, 'admin@e2e.test');
  await admin.goto('/admin/reports');
  await expect(admin.getByText(message).first()).toBeVisible();
});
