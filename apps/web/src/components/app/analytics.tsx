import Script from 'next/script';

/**
 * Self-hosted Umami (https://stats.prvaha.com): cookieless, no personal data, so no consent
 * banner. `data-domains` keeps local, preview and test builds from sending hits.
 */
const UMAMI = {
  src: 'https://stats.prvaha.com/script.js',
  websiteId: '21e28343-5922-4484-bdf6-7c3ff33d5964',
  domains: 'cardwise.prvaha.com',
} as const;

export function Analytics() {
  return (
    <Script
      src={UMAMI.src}
      data-website-id={UMAMI.websiteId}
      data-domains={UMAMI.domains}
      data-do-not-track="true"
      strategy="afterInteractive"
    />
  );
}
