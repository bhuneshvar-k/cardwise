import { expect, test } from '@playwright/test';
import { addCard } from './helpers';

test('the wallet grows from a ghost card to a grid to a stack', async ({ page }) => {
  // Arrange: an empty wallet shows the ghost card
  await page.goto('/cards');
  const wallet = page.getByTestId('wallet');
  await expect(wallet).toHaveAttribute('data-layout', 'empty');
  await expect(page.getByRole('button', { name: /Add your first card/ })).toBeVisible();

  // Act: one and two cards show as a grid
  await addCard(page, 'Live+', 'HSBC Live+ Credit Card');
  await addCard(page, 'Amazon Pay ICICI', 'Amazon Pay ICICI Bank Credit Card');
  await expect(wallet).toHaveAttribute('data-layout', 'grid');

  // A third card stacks them
  await addCard(page, 'IndianOil', 'IndianOil HDFC Bank Credit Card');
  await expect(wallet).toHaveAttribute('data-layout', 'stack');

  // Assert: selecting a card shows its details, and Edit opens its sheet
  // Only each card's top strip is visible in the stack, so tap there, as a person would
  await page.getByRole('button', { name: /^HSBC Live\+/ }).click({ position: { x: 24, y: 12 } });
  const details = page.getByRole('region', { name: 'Selected card' });
  await expect(details).toContainText('HSBC Live+ Credit Card');
  await details.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('dialog', { name: 'HSBC Live+ Credit Card' })).toBeVisible();
});
