'use server';

import {
  decidePendingChange,
  markCardReviewed,
  saveCardAsAdmin,
  setReportStatus,
} from '@cardwise/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { requireAdmin } from '@/server/session';

export interface ActionResult {
  ok: boolean;
  message: string;
}

const failure = (error: unknown): ActionResult => ({
  ok: false,
  message: error instanceof Error ? error.message : 'Something went wrong',
});

const decisionSchema = z.object({
  id: z.coerce.number().int().positive(),
  decision: z.enum(['approve', 'reject']),
});

export async function decideChange(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const { id, decision } = decisionSchema.parse(Object.fromEntries(formData));
  await decidePendingChange(await getDb(), id, admin.id, decision);
  revalidatePath('/admin', 'layout');
}

const reportSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(['resolved', 'dismissed', 'open']),
});

export async function updateReport(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const { id, status } = reportSchema.parse(Object.fromEntries(formData));
  await setReportStatus(await getDb(), id, status, admin.id);
  revalidatePath('/admin', 'layout');
}

const saveSchema = z.object({
  id: z.string().min(1),
  json: z.string().min(2).max(200_000),
  note: z.string().trim().min(3, 'Say what you changed and why').max(500),
});

export async function saveCard(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = saveSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' };
    let data: unknown;
    try {
      data = JSON.parse(parsed.data.json);
    } catch {
      return { ok: false, message: 'The card is not valid JSON' };
    }
    await saveCardAsAdmin(await getDb(), parsed.data.id, data, admin.id, parsed.data.note);
    revalidatePath('/admin', 'layout');
    return { ok: true, message: 'Saved. Users get it on their next catalogue refresh.' };
  } catch (error) {
    return failure(error);
  }
}

export async function markReviewed(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = z.string().min(1).parse(formData.get('id'));
  await markCardReviewed(
    await getDb(),
    id,
    admin.id,
    admin.name,
    new Date().toISOString().slice(0, 10),
  );
  revalidatePath('/admin', 'layout');
}
