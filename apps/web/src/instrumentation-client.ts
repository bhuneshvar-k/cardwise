import * as Sentry from '@sentry/nextjs';

/** Browser error tracking. Off unless NEXT_PUBLIC_SENTRY_DSN is set at build time. */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.05 });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
