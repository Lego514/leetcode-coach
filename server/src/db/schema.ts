import { sql } from 'drizzle-orm';
import { bigint, boolean, index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// 資料表結構以 migrations/*.sql 為準，這裡的定義用來產生型別安全的查詢，兩邊要一起改。

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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

export const schemaMigrations = pgTable('schema_migrations', {
  name: text('name').primaryKey(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
});
