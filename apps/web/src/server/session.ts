import 'server-only';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getAuth } from './auth';
import { accountsEnabled } from './env';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  consentVersion: string | null;
}

/** The signed-in user for a request, or null. Works in route handlers and server components. */
export async function getSessionUser(requestHeaders?: Headers): Promise<SessionUser | null> {
  // Read the request first: a build without DATABASE_URL would otherwise prerender a signed-out
  // (404) admin page into the static output, and production would serve it to admins.
  const reqHeaders = requestHeaders ?? (await headers());
  if (!accountsEnabled()) return null;
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string; consentVersion?: string | null };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === 'admin' ? 'admin' : 'user',
    consentVersion: u.consentVersion ?? null,
  };
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') throw new Error('Forbidden');
  return user;
}

/** For admin pages: anyone else gets a plain 404. Server actions use `requireAdmin`. */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getSessionUser().catch(() => null);
  if (!user || user.role !== 'admin') notFound();
  return user;
}
