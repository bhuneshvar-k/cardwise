import { expect, test } from '@playwright/test';

// One failed precache request stops the service worker installing, and with it offline use.
test('every URL the service worker precaches is served', async ({ request }) => {
  const sw = await (await request.get('/sw.js')).text();
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1] ?? '');
  expect(urls.length).toBeGreaterThan(10);

  const failures: string[] = [];
  for (const url of urls) {
    const res = await request.get(url, { maxRedirects: 0 });
    if (!res.ok()) failures.push(`${res.status()} ${url}`);
  }
  expect(failures).toEqual([]);
});
