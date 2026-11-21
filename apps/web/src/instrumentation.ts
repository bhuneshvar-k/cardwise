import * as Sentry from '@sentry/nextjs';
import { scrubQueryParams } from './lib/sentry-scrub';

/** Server-side error tracking. Off unless SENTRY_DSN is set. */
export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.05,
    beforeSend: scrubQueryParams,
  });
}

export const onRequestError = Sentry.captureRequestError;
