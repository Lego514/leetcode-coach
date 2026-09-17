import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import type { Database } from './client';
import { schemaMigrations } from './schema';

/** 把 SQL 檔拆成單一陳述式；遷移檔裡不會有字串或函式本體包含分號 */
export function splitStatements(source: string): string[] {
  return source
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

/**
 * 依檔名順序套用 migrations 資料夾裡還沒執行過的 .sql 檔，
 * 每個檔案在一個交易裡完成，失敗就整個退回。
 */
export async function migrate(db: Database, dir: string, log: (message: string) => void = () => {}): Promise<string[]> {
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const applied = new Set((await db.select({ name: schemaMigrations.name }).from(schemaMigrations)).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const pending = files.filter((f) => !applied.has(f));

  for (const file of pending) {
    const statements = splitStatements(await readFile(path.join(dir, file), 'utf8'));
    await db.transaction(async (tx) => {
      for (const statement of statements) await tx.execute(sql.raw(statement));
      await tx.insert(schemaMigrations).values({ name: file });
    });
    log(`Applied migration ${file}`);
  }
  return pending;
}
