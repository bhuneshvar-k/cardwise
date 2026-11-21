import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The visible ding toast with this title. Ding also mirrors each message into a
 * screen-reader live region, so a bare getByText would match twice.
 */
export function toast(page: Page, title: string): Locator {
  return page.locator('.tst-title').filter({ hasText: title });
}

/** Add a card from the catalogue and close the details sheet that opens after it. */
export async function addCard(page: Page, search: string, name: string): Promise<void> {
  await page.goto('/cards');
  await page.getByRole('button', { name: 'Add a card' }).click();
  await page.getByPlaceholder(/Search by card or bank/).fill(search);
  await page.getByRole('option', { name }).click();
  await expect(toast(page, `Added ${name}`)).toBeVisible();
  const sheet = page.getByRole('dialog', { name });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
