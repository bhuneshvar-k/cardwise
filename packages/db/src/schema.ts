import type { CardProduct } from '@cardwise/engine';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const createdAt = () => tz('created_at').notNull().defaultNow();
const updatedAt = () => tz('updated_at').notNull().defaultNow();

/* ------------------------------------------------- Better Auth core tables */

export const userRole = pgEnum('user_role', ['user', 'admin']);

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: userRole('role').notNull().default('user'),
  /** DPDP: when the user agreed to which privacy notice. */
  consentedAt: tz('consented_at'),
  consentVersion: text('consent_version'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: tz('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: tz('access_token_expires_at'),
    refreshTokenExpiresAt: tz('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: tz('expires_at').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* -------------------------------------------------------------- user sync */

/** Every write gets the next number, so a device can ask for "everything after N". */
export const syncVersionSeq = pgSequence('sync_version_seq', { startWith: 1 });

export const syncCollection = pgEnum('sync_collection', ['userCards', 'spends', 'settings']);

/** One row per synced record: a user card, a spend or the settings document. */
export const syncRecord = pgTable(
  'sync_record',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    collection: syncCollection('collection').notNull(),
    id: text('id').notNull(),
    data: jsonb('data').notNull(),
    /** Client edit time; an older edit never overwrites a newer one. */
    updatedAt: tz('updated_at').notNull(),
    deletedAt: tz('deleted_at'),
    /** For spends: the purchase date, so retention can delete old ones. */
    recordDate: text('record_date'),
    version: bigint('version', { mode: 'number' })
      .notNull()
      .default(sql`nextval('sync_version_seq')`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.collection, t.id] }),
    index('sync_record_user_version_idx').on(t.userId, t.version),
  ],
);

/* -------------------------------------------------------------- catalogue */

export const cardOrigin = pgEnum('card_origin', ['curated', 'cardadvisor']);

export const card = pgTable(
  'card',
  {
    id: text('id').primaryKey(),
    origin: cardOrigin('origin').notNull(),
    cardAdvisorKey: text('card_advisor_key'),
    data: jsonb('data').$type<CardProduct>().notNull(),
    revision: integer('revision').notNull().default(1),
    /** An admin changed this card; imports must not overwrite it silently. */
    adminEdited: boolean('admin_edited').notNull().default(false),
    /** Hidden from users while it waits for review (new imported cards stay visible). */
    retired: boolean('retired').notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [index('card_advisor_key_idx').on(t.cardAdvisorKey)],
);

export const revisionSource = pgEnum('revision_source', ['seed', 'import', 'admin']);

export const cardRevision = pgTable(
  'card_revision',
  {
    id: serial('id').primaryKey(),
    cardId: text('card_id')
      .notNull()
      .references(() => card.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    data: jsonb('data').$type<CardProduct>().notNull(),
    source: revisionSource('source').notNull(),
    note: text('note'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('card_revision_card_idx').on(t.cardId, t.revision)],
);

export const importStatus = pgEnum('import_status', ['running', 'succeeded', 'failed']);

export const importRun = pgTable('import_run', {
  id: serial('id').primaryKey(),
  sourceVersion: text('source_version'),
  status: importStatus('status').notNull().default('running'),
  stats: jsonb('stats').$type<Record<string, number>>(),
  error: text('error'),
  startedAt: createdAt(),
  finishedAt: tz('finished_at'),
});

export const pendingReason = pgEnum('pending_reason', [
  'admin_edited',
  'large_change',
  'curated_source_changed',
]);
export const decisionStatus = pgEnum('decision_status', ['pending', 'approved', 'rejected']);

/** Imported changes that need an admin before they go live. */
export const pendingChange = pgTable(
  'pending_change',
  {
    id: serial('id').primaryKey(),
    cardId: text('card_id')
      .notNull()
      .references(() => card.id, { onDelete: 'cascade' }),
    proposed: jsonb('proposed').$type<CardProduct>().notNull(),
    baseRevision: integer('base_revision').notNull(),
    reason: pendingReason('reason').notNull(),
    summary: text('summary').notNull(),
    importRunId: integer('import_run_id').references(() => importRun.id, { onDelete: 'set null' }),
    status: decisionStatus('status').notNull().default('pending'),
    decidedBy: text('decided_by').references(() => user.id, { onDelete: 'set null' }),
    decidedAt: tz('decided_at'),
    createdAt: createdAt(),
  },
  (t) => [index('pending_change_status_idx').on(t.status, t.createdAt)],
);

/* ----------------------------------------------------------------- reports */

export const reportStatus = pgEnum('report_status', ['open', 'resolved', 'dismissed']);

export const report = pgTable(
  'report',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    cardId: text('card_id').notNull(),
    merchantId: text('merchant_id'),
    category: text('category'),
    message: text('message').notNull(),
    shown: jsonb('shown'),
    status: reportStatus('status').notNull().default('open'),
    resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
    resolvedAt: tz('resolved_at'),
    createdAt: createdAt(),
  },
  (t) => [index('report_status_idx').on(t.status, t.createdAt)],
);

export const schema = {
  user,
  session,
  account,
  verification,
  syncRecord,
  card,
  cardRevision,
  importRun,
  pendingChange,
  report,
};
