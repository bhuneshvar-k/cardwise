import { PRIVACY_NOTICE_VERSION } from '@cardwise/contracts';

const KEY = 'cardwise:consent-intent';

/** Remember, across the sign-in redirect, that the user ticked "I agree". */
export function rememberConsentIntent(): void {
  try {
    sessionStorage.setItem(KEY, PRIVACY_NOTICE_VERSION);
  } catch {
    // Storage blocked: the user is asked to agree again after signing in.
  }
}

/** True once if the user agreed to the current notice before signing in. */
export function takeConsentIntent(): boolean {
  try {
    const agreed = sessionStorage.getItem(KEY) === PRIVACY_NOTICE_VERSION;
    sessionStorage.removeItem(KEY);
    return agreed;
  } catch {
    return false;
  }
}
