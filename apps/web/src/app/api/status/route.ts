import { connection, NextResponse } from 'next/server';
import { accountsEnabled, serverEnv, testLoginEnabled } from '@/server/env';

/** Tells the client which account features this server offers. */
export async function GET() {
  await connection(); // per-request: reflects the server's runtime settings, not the build's
  const env = serverEnv();
  return NextResponse.json(
    {
      accounts: accountsEnabled(env),
      google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      testLogin: testLoginEnabled(env),
      reports: Boolean(env.DATABASE_URL),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
