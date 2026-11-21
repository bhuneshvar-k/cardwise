import 'server-only';
import { z } from 'zod';

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

/** `FOO=` in an env file means "not set", not an empty value. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const envSchema = z.object({
  /** `postgres://…` in production; `pglite:./.data/dev` for local work without Docker. */
  DATABASE_URL: optional(z.string().min(1)),
  BETTER_AUTH_SECRET: optional(z.string().min(32)),
  BETTER_AUTH_URL: optional(z.url()),
  GOOGLE_CLIENT_ID: optional(z.string().min(1)),
  GOOGLE_CLIENT_SECRET: optional(z.string().min(1)),
  /** Emails that become admins when they first sign in. */
  ADMIN_EMAILS: csv,
  /** Enables email + password sign-in for automated tests. Never set in production. */
  AUTH_TEST_LOGIN: z.enum(['0', '1']).default('0'),
  SENTRY_DSN: optional(z.url()),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= envSchema.parse(process.env);
  return cached;
}

/** Sign-in and sync need a database and an auth secret; the picker works without them. */
export function accountsEnabled(env: ServerEnv = serverEnv()): boolean {
  return Boolean(env.DATABASE_URL && env.BETTER_AUTH_SECRET);
}

function isLocalhost(url: string | undefined): boolean {
  if (!url) return false;
  const { hostname } = new URL(url);
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Test sign-in: development, or a production build served on localhost for end-to-end tests. */
export function testLoginEnabled(env: ServerEnv = serverEnv()): boolean {
  if (env.AUTH_TEST_LOGIN !== '1') return false;
  return process.env.NODE_ENV !== 'production' || isLocalhost(env.BETTER_AUTH_URL);
}
