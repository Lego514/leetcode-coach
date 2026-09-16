import { SYNC_BATCH_SIZE } from '../../shared/constants';
import type { PublicUser, SyncChange, SyncResponse } from '../../shared/protocol';
import { apiRequest, type FetchLike } from './api';
import type { CoachDB, OutboxRecord } from './db';
import {
  applyRemote,
  findLocal,
  getSyncState,
  markAllDirty,
  outboxId,
  rebuildProgress,
  toSyncData,
} from './tracking';

/** 一次同步最多來回幾輪，避免資料異常時無限重試 */
const MAX_ROUNDS = 40;

export class SyncAbortedError extends Error {}

function syncTables(database: CoachDB) {
  return [database.outbox, database.syncState, ...database.dataTables];
}

async function buildChanges(database: CoachDB, pending: OutboxRecord[]): Promise<SyncChange[]> {
  const changes: SyncChange[] = [];
  for (const entry of pending) {
    const base = { collection: entry.collection, key: entry.key, updatedAt: entry.updatedAt };
    const record = entry.deleted ? undefined : await findLocal(database, entry.collection, entry.key);
    // 找不到資料就當作已刪除
    changes.push(record ? { ...base, deleted: false, data: toSyncData(entry.collection, record) } : { ...base, deleted: true });
  }
  return changes;
}

/**
 * 套用伺服器回應：
 * 1. 已送出且之後沒再修改的變更，從待上傳清單移除。
 * 2. 套用伺服器上的變更；本機有更新的未上傳修改時，保留本機版本。
 * 3. 練習紀錄有變動的題目，重算複習排程。
 */
async function applyResponse(database: CoachDB, userId: string, sent: OutboxRecord[], res: SyncResponse): Promise<number> {
  return database.transaction('rw', syncTables(database), async () => {
    const state = await getSyncState(database);
    if (state.userId !== userId) throw new SyncAbortedError('Account changed during sync');

    for (const entry of sent) {
      const current = await database.outbox.get(entry.id);
      if (current && current.updatedAt === entry.updatedAt && current.deleted === entry.deleted) {
        await database.outbox.delete(entry.id);
      }
    }

    let applied = 0;
    const affected = new Set<number>();
    for (const change of [...res.changes, ...res.rejected]) {
      const id = outboxId(change.collection, change.key);
      const pending = await database.outbox.get(id);
      if (pending && pending.updatedAt > change.updatedAt) continue;
      if (pending) await database.outbox.delete(id);
      const problemId = await applyRemote(database, change.collection, change.key, change.deleted, change.data);
      if (problemId !== undefined) affected.add(problemId);
      applied += 1;
    }
    await rebuildProgress(database, affected);
    await database.syncState.put({ ...state, cursor: res.cursor, lastSyncedAt: Date.now() });
    return applied;
  });
}

export interface SyncResult {
  pushed: number;
  pulled: number;
}

/** 上傳待上傳清單、下載伺服器上的新變更，直到兩邊都沒有剩下的 */
export async function runSync(database: CoachDB, fetchImpl: FetchLike): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0 };
  const { userId } = await getSyncState(database);
  if (!userId) throw new SyncAbortedError('Not signed in');

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const state = await getSyncState(database);
    if (state.userId !== userId) throw new SyncAbortedError('Account changed during sync');
    const pending = await database.outbox.limit(SYNC_BATCH_SIZE).toArray();
    const changes = await buildChanges(database, pending);
    const res = await apiRequest<SyncResponse>(fetchImpl, '/api/sync', {
      method: 'POST',
      body: { cursor: state.cursor, changes },
    });
    result.pulled += await applyResponse(database, userId, pending, res);
    result.pushed += pending.length;
    if (!res.hasMore && pending.length < SYNC_BATCH_SIZE) return result;
  }
  return result;
}

/**
 * 把這個瀏覽器的資料交給某個帳號：
 * 同一個帳號只更新 email；換了帳號就重設游標，並把本機資料全部排進上傳清單以便合併。
 */
export async function adoptAccount(database: CoachDB, user: Pick<PublicUser, 'id' | 'email'>): Promise<{ merged: number }> {
  return database.transaction('rw', syncTables(database), async () => {
    const state = await getSyncState(database);
    if (state.userId === user.id) {
      await database.syncState.put({ ...state, email: user.email });
      return { merged: 0 };
    }
    const merged = await markAllDirty(database);
    await database.syncState.put({ key: 'state', userId: user.id, email: user.email, cursor: 0 });
    return { merged };
  });
}

/** 讓這個瀏覽器的資料不再屬於任何帳號（資料本身保留） */
export async function detachAccount(database: CoachDB): Promise<void> {
  await database.syncState.put({ key: 'state', cursor: 0 });
}

/** 登出並清除時使用：刪掉本機所有資料，不留刪除標記 */
export async function wipeLocalData(database: CoachDB): Promise<void> {
  await database.transaction('rw', syncTables(database), async () => {
    await Promise.all(syncTables(database).map((table) => table.clear()));
  });
}
