import { expect, test } from '@playwright/test';

test('popular merchants sit on one row that scrolls sideways without a scrollbar', async ({
  page,
}) => {
  await page.goto('/');
  const row = page.getByRole('group', { name: 'Popular merchants' });
  const chips = row.getByRole('button');
  await expect(chips.first()).toBeVisible();

  const layout = await row.evaluate((el) => {
    const tops = new Set([...el.children].map((c) => Math.round(c.getBoundingClientRect().top)));
    return {
      rows: tops.size,
      overflows: el.scrollWidth > el.clientWidth,
      scrollbar: getComputedStyle(el).scrollbarWidth,
    };
  });
  expect(layout).toEqual({ rows: 1, overflows: true, scrollbar: 'none' });

  // The last chip is reachable by scrolling and still works
  const last = chips.last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});
