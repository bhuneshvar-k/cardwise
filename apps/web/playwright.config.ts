import { defineConfig, devices } from '@playwright/test';

const OFFLINE_PORT = 3200;
const ACCOUNTS_PORT = 3201;
const RUN_ID = Date.now();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { trace: 'on-first-retry' },
  projects: [
    {
      // The app with no backend: everything runs on the device.
      name: 'device-only',
      testIgnore: /accounts\.spec\.ts/,
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${OFFLINE_PORT}` },
    },
    {
      // Sign-in, sync and admin, against a throwaway embedded database.
      name: 'accounts',
      testMatch: /accounts\.spec\.ts/,
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${ACCOUNTS_PORT}` },
    },
  ],
  webServer: [
    {
      command: `pnpm start --port ${OFFLINE_PORT}`,
      url: `http://localhost:${OFFLINE_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      // Empty values override .env.local so this server has no backend.
      env: { DATABASE_URL: '', BETTER_AUTH_SECRET: '' },
    },
    {
      command: `pnpm start --port ${ACCOUNTS_PORT}`,
      url: `http://localhost:${ACCOUNTS_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: `pglite:./.data/e2e-${RUN_ID}`,
        BETTER_AUTH_SECRET: 'e2e-only-secret-not-for-production-use',
        BETTER_AUTH_URL: `http://localhost:${ACCOUNTS_PORT}`,
        AUTH_TEST_LOGIN: '1',
        ADMIN_EMAILS: 'admin@e2e.test',
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: '',
      },
    },
  ],
});
