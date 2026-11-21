import 'server-only';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { schema } from '@cardwise/db';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from './db';
import { serverEnv, testLoginEnabled } from './env';

const SESSION_DAYS = 30;
const DAY_SECONDS = 24 * 60 * 60;

async function createAuth() {
  const env = serverEnv();
  const db = await getDb();
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: 'select_account' as const,
          },
        }
      : {};

  return betterAuth({
    appName: 'Cardwise',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    socialProviders: google,
    emailAndPassword: { enabled: testLoginEnabled(env) },
    session: { expiresIn: SESSION_DAYS * DAY_SECONDS, updateAge: DAY_SECONDS },
    user: {
      additionalFields: {
        // Set only by the server: never accepted from sign-up input.
        role: { type: 'string', input: false, defaultValue: 'user' },
        consentVersion: { type: 'string', input: false, required: false },
      },
    },
    // Automated tests sign many browsers in from one IP; never relaxed on a public host.
    rateLimit: { enabled: !testLoginEnabled(env), window: 60, max: 30 },
    telemetry: { enabled: false },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              role: env.ADMIN_EMAILS.includes(user.email.toLowerCase()) ? 'admin' : 'user',
            },
          }),
        },
      },
    },
    plugins: [nextCookies()],
  });
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;

const globalForAuth = globalThis as unknown as { cardwiseAuth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  globalForAuth.cardwiseAuth ??= createAuth();
  return globalForAuth.cardwiseAuth;
}
