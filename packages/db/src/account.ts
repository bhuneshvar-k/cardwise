import { desc, eq, lt } from 'drizzle-orm';
import type { Db } from './client';
import { report, session, syncRecord, user, verification } from './schema';

export async function recordConsent(db: Db, userId: string, noticeVersion: string): Promise<void> {
  await db
    .update(user)
    .set({ consentedAt: new Date(), consentVersion: noticeVersion, updatedAt: new Date() })
    .where(eq(user.id, userId));
}

export async function getUserProfile(db: Db, userId: string) {
  const [profile] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      consentedAt: user.consentedAt,
      consentVersion: user.consentVersion,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return profile;
}

/** Everything stored about a user, for the DPDP right to access. */
export async function exportUserData(db: Db, userId: string) {
  const profile = await getUserProfile(db, userId);
  if (!profile) throw new Error('User not found');
  const rows = await db.select().from(syncRecord).where(eq(syncRecord.userId, userId));
  const records: Record<string, unknown[]> = { userCards: [], spends: [], settings: [] };
  for (const r of rows) records[r.collection]?.push(r.data);
  const reports = await db
    .select({
      id: report.id,
      cardId: report.cardId,
      message: report.message,
      status: report.status,
      createdAt: report.createdAt,
    })
    .from(report)
    .where(eq(report.userId, userId))
    .orderBy(desc(report.createdAt));
  return { exportedAt: new Date().toISOString(), profile, records, reports };
}

/**
 * Erase an account. Sessions, linked accounts and synced data go with the user row
 * (ON DELETE CASCADE); reports stay for card accuracy but lose the link to the user.
 */
export async function deleteUserAccount(db: Db, userId: string): Promise<void> {
  await db.delete(user).where(eq(user.id, userId));
}

/** Remove expired sessions and verification tokens. Returns how many rows went. */
export async function purgeExpiredAuthRecords(db: Db, now: Date = new Date()): Promise<number> {
  const sessions = await db
    .delete(session)
    .where(lt(session.expiresAt, now))
    .returning({ id: session.id });
  const tokens = await db
    .delete(verification)
    .where(lt(verification.expiresAt, now))
    .returning({ id: verification.id });
  return sessions.length + tokens.length;
}
