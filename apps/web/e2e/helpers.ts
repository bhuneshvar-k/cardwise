import { expect, type Page } from '@playwright/test';

/** Add a card from the catalogue and close the details sheet that opens after it. */
export async function addCard(page: Page, search: string, name: string): Promise<void> {
  await page.goto('/cards');
  await page.getByRole('button', { name: 'Add a card' }).click();
  await page.getByPlaceholder(/Search by card or bank/).fill(search);
  await page.getByRole('option', { name }).click();
  await expect(page.getByText(`Added ${name}`)).toBeVisible();
  const sheet = page.getByRole('dialog', { name });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
