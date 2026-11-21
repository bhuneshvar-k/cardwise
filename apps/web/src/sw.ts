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
 * Cache them by path alone so tab navigation keeps working without a network.
 */
const stripRscParam: SerwistPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    url.searchParams.delete('_rsc');
    return url.href;
  },
};

const rscPayloads: RuntimeCaching = {
  matcher: ({ request, sameOrigin }) => sameOrigin && request.headers.get('RSC') === '1',
  handler: new NetworkFirst({
    cacheName: 'rsc-payloads',
    networkTimeoutSeconds: RSC_NETWORK_TIMEOUT_SECONDS,
    matchOptions: { ignoreVary: true },
    plugins: [stripRscParam, new ExpirationPlugin({ maxEntries: RSC_CACHE_ENTRIES })],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [rscPayloads, ...defaultCache],
  fallbacks: {
    entries: [{ url: '/~offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();
