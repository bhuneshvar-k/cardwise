// @vitest-environment node
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const base = { ADMIN_EMAILS: [], AUTH_TEST_LOGIN: '1' as const };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('server env', () => {
  test('accounts need both a database and an auth secret', async () => {
    const { accountsEnabled } = await import('./env');
    expect(accountsEnabled({ ...base, DATABASE_URL: 'pglite:memory' })).toBe(false);
    expect(accountsEnabled({ ...base, DATABASE_URL: 'pglite:memory', BETTER_AUTH_SECRET: 'x'.repeat(32) })).toBe(true);
  });

  test('test sign-in never runs on a public production host', async () => {
    const { testLoginEnabled } = await import('./env');
    vi.stubEnv('NODE_ENV', 'production');
    expect(testLoginEnabled({ ...base, BETTER_AUTH_URL: 'https://cardwise.example.com' })).toBe(false);
    expect(testLoginEnabled({ ...base, BETTER_AUTH_URL: 'http://localhost:3201' })).toBe(true);
    expect(testLoginEnabled({ ...base, AUTH_TEST_LOGIN: '0', BETTER_AUTH_URL: 'http://localhost:3201' })).toBe(false);
  });
});
