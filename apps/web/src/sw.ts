/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import {
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  type PrecacheEntry,
  type RuntimeCaching,
  type SerwistGlobalConfig,
  type SerwistPlugin,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const RSC_CACHE_ENTRIES = 64;
const RSC_NETWORK_TIMEOUT_SECONDS = 3;

/**
 * Next adds a changing `_rsc` value to RSC requests, so cached payloads never match offline.
 * Key the cache by path plus the kind of payload instead: the route tree prefetch, each
 * segment prefetch and the full navigation share a path but carry different bodies.
 */
function rscVariant(request: Request): string {
  const segment = request.headers.get('Next-Router-Segment-Prefetch');
  if (segment) return `segment:${segment}`;
  return request.headers.get('Next-Router-Prefetch') === '1' ? 'prefetch' : 'full';
}

const rscCacheKey: SerwistPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    url.searchParams.delete('_rsc');
    url.searchParams.set('__rsc_variant', rscVariant(request));
    return url.href;
  },
};

const rscPayloads: RuntimeCaching = {
  matcher: ({ request, sameOrigin }) => sameOrigin && request.headers.get('RSC') === '1',
  handler: new NetworkFirst({
    cacheName: 'rsc-payloads',
    networkTimeoutSeconds: RSC_NETWORK_TIMEOUT_SECONDS,
    matchOptions: { ignoreVary: true },
    plugins: [rscCacheKey, new ExpirationPlugin({ maxEntries: RSC_CACHE_ENTRIES })],
  }),
};

/** Admin pages need the network anyway; don't keep them on every user's device. */
const isAdmin = (entry: PrecacheEntry | string) =>
  (typeof entry === 'string' ? entry : entry.url).startsWith('/admin');

const serwist = new Serwist({
  precacheEntries: (self.__SW_MANIFEST ?? []).filter((entry) => !isAdmin(entry)),
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [rscPayloads, ...defaultCache],
  fallbacks: {
    entries: [{ url: '/~offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();
