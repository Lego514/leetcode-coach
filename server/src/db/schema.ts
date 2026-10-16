import { sql } from 'drizzle-orm';
import { bigint, boolean, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

// 資料表結構以 migrations/*.sql 為準，這裡的定義用來產生型別安全的查詢，兩邊要一起改。

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  /** 只用 GitHub 登入的帳號沒有密碼 */
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** 用其他服務登入（目前只有 GitHub）：哪個外部帳號對到哪個使用者 */
export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 顯示用的帳號名稱（GitHub 的 login），登入時更新 */
    username: text('username').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerUserId] }), uniqueIndex('oauth_accounts_user_provider_idx').on(t.userId, t.provider)],
);

export const sessions = pgTable(
  'sessions',
  {
    /** session token 的 SHA-256；資料庫外洩也拿不到可用的 token */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

/** 同步用的通用文件表：每個使用者的每一筆資料一列，刪除時保留標記 */
export const records = pgTable(
  'records',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    collection: text('collection').notNull(),
    key: text('key').notNull(),
    data: jsonb('data'),
    deleted: boolean('deleted').notNull().default(false),
    /** 用戶端修改時間（epoch 毫秒），用來決定衝突時誰勝出 */
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    /** 伺服器寫入順序，用戶端用它當同步游標 */
    version: bigint('version', { mode: 'number' })
      .notNull()
      .default(sql`nextval('record_version_seq')`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.collection, t.key] }), index('records_user_version_idx').on(t.userId, t.version)],
);

/** 忘記密碼的重設連結；只存 token 的雜湊 */
export const passwordResets = pgTable(
  'password_resets',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('password_resets_user_idx').on(t.userId)],
);

/** 每位使用者每天（UTC）的 AI 用量 */
export const aiUsage = pgTable(
  'ai_usage',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    requests: integer('requests').notNull().default(0),
    inputTokens: bigint('input_tokens', { mode: 'number' }).notNull().default(0),
    outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

/** 錯誤回報與建議；沒登入時 userId 為空 */
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    message: text('message').notNull(),
    contact: text('contact'),
    context: jsonb('context').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [index('reports_created_idx').on(t.createdAt), index('reports_user_idx').on(t.userId)],
);

export const schemaMigrations = pgTable('schema_migrations', {
  name: text('name').primaryKey(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
});
