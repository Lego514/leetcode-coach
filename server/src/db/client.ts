import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** 查詢可以在一般連線或交易中執行 */
export type Executor = Database | Transaction;

export interface DatabaseHandle {
  db: Database;
  kind: 'pglite' | 'postgres';
  close: () => Promise<void>;
}

/**
 * PostgreSQL 連線設定，針對 Neon 這類會自動休眠的服務調整：
 * - 閒置連線 60 秒後關閉，資料庫才能休眠，不會一直消耗運算時數
 * - 資料庫從休眠喚醒需要幾秒，連線逾時放寬到 30 秒
 * - 經過 PgBouncer 連線池（Neon 的 -pooler 主機）時不使用具名 prepared statement
 */
export function postgresOptions(url: string): postgres.Options<Record<string, never>> {
  const host = new URL(url).hostname;
  return {
    max: 10,
    idle_timeout: 60,
    connect_timeout: 30,
    prepare: !host.includes('-pooler.'),
    onnotice: () => {},
  };
}

/**
 * 依連線字串開啟資料庫：
 * - `postgres://…`：正式環境的 PostgreSQL
 * - `pglite:<資料夾>`：本機開發用，資料存在該資料夾
 * - `pglite:memory`：測試用，存在記憶體
 */
export async function openDatabase(url: string): Promise<DatabaseHandle> {
  if (url.startsWith('pglite:')) {
    const target = url.slice('pglite:'.length);
    let client: PGlite;
    if (target === 'memory') {
      client = new PGlite();
    } else {
      mkdirSync(target, { recursive: true });
      client = new PGlite(target);
    }
    await client.waitReady;
    return {
      db: drizzlePglite(client, { schema }) as unknown as Database,
      kind: 'pglite',
      close: () => client.close(),
    };
  }

  if (!/^postgres(ql)?:\/\//.test(url)) throw new Error('DATABASE_URL must start with postgres:// or pglite:');
  const client = postgres(url, postgresOptions(url));
  return {
    db: drizzlePostgres(client, { schema }) as unknown as Database,
    kind: 'postgres',
    close: () => client.end({ timeout: 5 }),
  };
}
