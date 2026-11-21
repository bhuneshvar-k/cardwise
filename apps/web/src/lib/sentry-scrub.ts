import type { ErrorEvent } from '@sentry/nextjs';

const PARAMS = /params:[\s\S]*$/;

/** Database errors list the failed query's parameters (cards, spends): never send them. */
export function scrubQueryParams(event: ErrorEvent): ErrorEvent {
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = exception.value.replace(PARAMS, 'params: [redacted]');
  }
  if (event.message) event.message = event.message.replace(PARAMS, 'params: [redacted]');
  return event;
}
