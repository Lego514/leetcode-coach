import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
import { SYNC_BATCH_SIZE } from '../../../shared/constants';
import type { SyncChange, SyncResponse } from '../../../shared/protocol';
import type { Database, Executor } from '../db/client';
import { records } from '../db/schema';

type RecordRow = typeof records.$inferSelect;

function toChange(row: Pick<RecordRow, 'collection' | 'key' | 'data' | 'deleted' | 'updatedAt'>): SyncChange {
  const change: SyncChange = {
    collection: row.collection as SyncChange['collection'],
    key: row.key,
    updatedAt: row.updatedAt,
    deleted: row.deleted,
  };
  if (!row.deleted) change.data = row.data;
  return change;
}

/** 同一批裡同一筆資料出現多次時，只保留最新的一次（時間相同取後面的） */
export function latestPerRecord(changes: SyncChange[]): SyncChange[] {
  const byKey = new Map<string, SyncChange>();
  for (const change of changes) {
    const id = `${change.collection}\u0000${change.key}`;
    const current = byKey.get(id);
    if (!current || change.updatedAt >= current.updatedAt) byKey.set(id, change);
  }
  return [...byKey.values()];
}

/**
 * 套用上傳的變更，採「最後寫入者勝出」：用戶端修改時間比伺服器上的版本新才會覆蓋。
 * 時間相同時保留已有的版本，所以首次登入時用 0 當時間上傳的舊資料，不會蓋掉雲端已有的資料。
 * 回傳沒有套用的變更，以及伺服器上目前的版本。
 */
async function applyChanges(tx: Executor, userId: string, changes: SyncChange[]): Promise<SyncChange[]> {
  if (changes.length === 0) return [];
  const applied = await tx
    .insert(records)
    .values(
      changes.map((c) => ({
        userId,
        collection: c.collection,
        key: c.key,
        data: c.deleted ? null : c.data,
        deleted: c.deleted,
        updatedAt: c.updatedAt,
      })),
    )
    .onConflictDoUpdate({
      target: [records.userId, records.collection, records.key],
      set: {
        data: sql`excluded.data`,
        deleted: sql`excluded.deleted`,
        updatedAt: sql`excluded.updated_at`,
        version: sql`nextval('record_version_seq')`,
      },
      setWhere: sql`${records.updatedAt} < excluded.updated_at`,
    })
    .returning({ collection: records.collection, key: records.key });

  const appliedIds = new Set(applied.map((r) => `${r.collection}\u0000${r.key}`));
  const stale = changes.filter((c) => !appliedIds.has(`${c.collection}\u0000${c.key}`));
  if (stale.length === 0) return [];

  const current: SyncChange[] = [];
  for (const collection of new Set(stale.map((c) => c.collection))) {
    const keys = stale.filter((c) => c.collection === collection).map((c) => c.key);
    const rows = await tx
      .select()
      .from(records)
      .where(and(eq(records.userId, userId), eq(records.collection, collection), inArray(records.key, keys)));
    current.push(...rows.map(toChange));
  }
  return current;
}

async function changesSince(tx: Executor, userId: string, cursor: number): Promise<Pick<SyncResponse, 'changes' | 'cursor' | 'hasMore'>> {
  const rows = await tx
    .select()
    .from(records)
    .where(and(eq(records.userId, userId), gt(records.version, cursor)))
    .orderBy(asc(records.version))
    .limit(SYNC_BATCH_SIZE + 1);
  const page = rows.slice(0, SYNC_BATCH_SIZE);
  return {
    changes: page.map(toChange),
    cursor: page.length > 0 ? page[page.length - 1].version : cursor,
    hasMore: rows.length > SYNC_BATCH_SIZE,
  };
}

/**
 * 一次同步：先套用上傳，再回傳游標之後的變更。
 * 同一個使用者的同步用 advisory lock 排隊，版本號才會照提交順序遞增，不會漏掉資料。
 */
export async function sync(db: Database, userId: string, cursor: number, changes: SyncChange[]): Promise<SyncResponse> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    const rejected = await applyChanges(tx, userId, latestPerRecord(changes));
    const page = await changesSince(tx, userId, cursor);
    return { ...page, rejected };
  });
}
