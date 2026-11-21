// Builds public/sw.js after `next build` (Serwist configurator mode, works with Turbopack).
// Prerendered routes, including /~offline, are precached automatically.
import { serwist } from '@serwist/next/config';

// Next 16 writes these legacy manifests but does not serve them (404), which breaks install.
const UNSERVED = /\/_(build|ssg|clientMiddleware)Manifest\.js$/;
// Dynamic route patterns such as /blog/[slug] are listed as if they were pages; fetching one
// 404s, and a single failed precache request stops the service worker installing.
const ROUTE_PATTERN = /\[[^\]]+\]/;
const isServed = (url) => !UNSERVED.test(url) && !ROUTE_PATTERN.test(url);

export default serwist({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  manifestTransforms: [
    async (entries) => ({ manifest: entries.filter((e) => isServed(e.url)), warnings: [] }),
  ],
});
