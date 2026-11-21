import { deleteUserAccount, exportUserData } from '@cardwise/db';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { accountsEnabled } from '@/server/env';
import { isSameOrigin, jsonError } from '@/server/http';
import { getSessionUser } from '@/server/session';

/** Download everything the server holds about the signed-in user. */
export async function GET(request: Request) {
  if (!accountsEnabled()) return jsonError(503, 'Accounts are not enabled on this server');
  const user = await getSessionUser(request.headers);
  if (!user) return jsonError(401, 'Sign in first');
  const data = await exportUserData(await getDb(), user.id);
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="cardwise-account-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

/** Erase the account and everything synced to it. */
export async function DELETE(request: Request) {
  if (!accountsEnabled()) return jsonError(503, 'Accounts are not enabled on this server');
  if (!isSameOrigin(request)) return jsonError(403, 'Cross-site request refused');
  const user = await getSessionUser(request.headers);
  if (!user) return jsonError(401, 'Sign in first');
  await deleteUserAccount(await getDb(), user.id);
  return new NextResponse(null, { status: 204 });
}
