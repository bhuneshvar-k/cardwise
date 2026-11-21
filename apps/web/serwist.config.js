// Builds public/sw.js after `next build` (Serwist configurator mode, works with Turbopack).
// Prerendered routes, including /~offline, are precached automatically.
import { serwist } from '@serwist/next/config';

// Next 16 writes these legacy manifests but does not serve them (404), which breaks install.
const UNSERVED = /\/_(build|ssg|clientMiddleware)Manifest\.js$/;

export default serwist({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  manifestTransforms: [
    async (entries) => ({ manifest: entries.filter((e) => !UNSERVED.test(e.url)), warnings: [] }),
  ],
});
