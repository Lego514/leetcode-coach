import { COLLECTIONS, type Collection } from '../../shared/constants';
import type { PatternId } from '../data/patterns';
import { schedule, type ReviewState } from '../lib/srs';
import type {
  AttemptRecord,
  CoachDB,
  CustomProblemRecord,
  MetaRecord,
  MockRecord,
  NoteRecord,
  PatternNoteRecord,
  SettingsRecord,
  SyncStateRecord,
} from './db';

// 本機紀錄與同步資料之間的轉換，以及「哪些資料改過、還沒上傳」的記錄。

export type LocalRecord =
  | AttemptRecord
  | MockRecord
  | NoteRecord
  | MetaRecord
  | PatternNoteRecord
  | CustomProblemRecord
  | SettingsRecord;

export function outboxId(collection: Collection, key: string): string {
  return `${collection}:${key}`;
}

/**
 * 記下一筆本機變更，下次同步時上傳。
 * 要在包含 outbox 的交易裡呼叫，才會和資料本身一起寫入或一起失敗。
 */
export async function track(database: CoachDB, collection: Collection, key: string, deleted = false, updatedAt = Date.now()) {
  await database.outbox.put({ id: outboxId(collection, key), collection, key, deleted, updatedAt });
}

export function keyOf(collection: Collection, record: LocalRecord): string {
  switch (collection) {
    case 'attempts':
    case 'mocks':
      return (record as AttemptRecord | MockRecord).uid;
    case 'notes':
    case 'meta':
      return String((record as NoteRecord | MetaRecord).problemId);
    case 'customProblems':
      return String((record as CustomProblemRecord).id);
    case 'patternNotes':
      return (record as PatternNoteRecord).patternId;
    case 'settings':
      return 'app';
  }
}

function omit<T extends object, K extends keyof T>(record: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...record };
  for (const key of keys) delete copy[key];
  return copy;
}

/** 去掉只屬於本機的欄位（自動編號、錄音、主鍵） */
export function toSyncData(collection: Collection, record: LocalRecord): unknown {
  switch (collection) {
    case 'attempts':
      return omit(record as AttemptRecord, 'id', 'uid');
    case 'mocks':
      return omit(record as MockRecord, 'id', 'uid', 'audio');
    case 'notes':
    case 'meta':
      return omit(record as NoteRecord | MetaRecord, 'problemId');
    case 'patternNotes':
      return omit(record as PatternNoteRecord, 'patternId');
    case 'customProblems':
      return omit(record as CustomProblemRecord, 'id', 'custom');
    case 'settings':
      return omit(record as SettingsRecord, 'key');
  }
}

export async function findLocal(database: CoachDB, collection: Collection, key: string): Promise<LocalRecord | undefined> {
  switch (collection) {
    case 'attempts':
      return database.attempts.where('uid').equals(key).first();
    case 'mocks':
      return database.mocks.where('uid').equals(key).first();
    case 'notes':
      return database.notes.get(Number(key));
    case 'meta':
      return database.meta.get(Number(key));
    case 'customProblems':
      return database.customProblems.get(Number(key));
    case 'patternNotes':
      return database.patternNotes.get(key as PatternId);
    case 'settings':
      return database.settings.get('app');
  }
}

/**
 * 把伺服器上的一筆資料寫進本機，保留本機專屬的欄位。
 * 回傳受影響的題號（練習紀錄變動時要重算複習排程）。
 */
export async function applyRemote(
  database: CoachDB,
  collection: Collection,
  key: string,
  deleted: boolean,
  data: unknown,
): Promise<number | undefined> {
  const existing = await findLocal(database, collection, key);
  switch (collection) {
    case 'attempts': {
      const local = existing as AttemptRecord | undefined;
      if (deleted) {
        if (local?.id !== undefined) await database.attempts.delete(local.id);
        return local?.problemId;
      }
      const record = { ...(data as Omit<AttemptRecord, 'id' | 'uid'>), uid: key, ...(local?.id !== undefined ? { id: local.id } : {}) };
      await database.attempts.put(record);
      return record.problemId;
    }
    case 'mocks': {
      const local = existing as MockRecord | undefined;
      if (deleted) {
        if (local?.id !== undefined) await database.mocks.delete(local.id);
        return undefined;
      }
      await database.mocks.put({
        ...(data as Omit<MockRecord, 'id' | 'uid' | 'audio'>),
        uid: key,
        ...(local?.id !== undefined ? { id: local.id } : {}),
        ...(local?.audio ? { audio: local.audio } : {}),
      });
      return undefined;
    }
    case 'notes':
      if (deleted) await database.notes.delete(Number(key));
      else await database.notes.put({ ...(data as Omit<NoteRecord, 'problemId'>), problemId: Number(key) });
      return undefined;
    case 'meta':
      if (deleted) await database.meta.delete(Number(key));
      else await database.meta.put({ ...(data as Omit<MetaRecord, 'problemId'>), problemId: Number(key) });
      return undefined;
    case 'customProblems':
      if (deleted) await database.customProblems.delete(Number(key));
      else await database.customProblems.put({ ...(data as Omit<CustomProblemRecord, 'id' | 'custom'>), id: Number(key), custom: true });
      return undefined;
    case 'patternNotes':
      if (deleted) await database.patternNotes.delete(key as PatternId);
      else await database.patternNotes.put({ ...(data as Omit<PatternNoteRecord, 'patternId'>), patternId: key as PatternId });
      return undefined;
    case 'settings':
      if (deleted) await database.settings.delete('app');
      else await database.settings.put({ ...(data as Omit<SettingsRecord, 'key'>), key: 'app' });
      return undefined;
  }
}

/** 沒有修改時間的舊資料用 0，合併時伺服器上已有的版本會優先 */
export function knownUpdatedAt(collection: Collection, record: LocalRecord): number {
  const parse = (value: string | undefined) => {
    const time = value ? Date.parse(value) : NaN;
    return Number.isFinite(time) ? time : 0;
  };
  switch (collection) {
    case 'attempts':
      return parse((record as AttemptRecord).at);
    case 'mocks':
      return parse((record as MockRecord).startedAt);
    case 'notes':
    case 'patternNotes':
      return parse((record as NoteRecord | PatternNoteRecord).updatedAt);
    default:
      return 0;
  }
}

/**
 * 登入新帳號時，把本機所有資料排進待上傳清單，讓它們和帳號裡的資料合併。
 * 已經在清單裡的變更保留原本的修改時間。
 */
export async function markAllDirty(database: CoachDB): Promise<number> {
  let added = 0;
  for (const collection of COLLECTIONS) {
    const rows = (await database.syncedTable(collection).toArray()) as LocalRecord[];
    for (const row of rows) {
      const key = keyOf(collection, row);
      const id = outboxId(collection, key);
      if (await database.outbox.get(id)) continue;
      await track(database, collection, key, false, knownUpdatedAt(collection, row));
      added += 1;
    }
  }
  return added;
}

/**
 * 依時間順序重播練習紀錄，得到複習排程。
 * 每次記錄時是逐筆累加，結果和重播相同；同步收到別台裝置的紀錄後用這個重算。
 */
export async function rebuildProgress(database: CoachDB, problemIds: Iterable<number>): Promise<void> {
  for (const problemId of new Set(problemIds)) {
    const attempts = await database.attempts.where('problemId').equals(problemId).toArray();
    if (attempts.length === 0) {
      await database.progress.delete(problemId);
      continue;
    }
    attempts.sort((a, b) => a.at.localeCompare(b.at) || (a.id ?? 0) - (b.id ?? 0));
    let state: ReviewState | undefined;
    for (const attempt of attempts) state = schedule(state, attempt.rating, attempt.day);
    const last = attempts[attempts.length - 1];
    await database.progress.put({
      problemId,
      ...state!,
      lastRating: last.rating,
      lastDay: last.day,
      firstDay: attempts[0].day,
      attempts: attempts.length,
    });
  }
}

export async function getSyncState(database: CoachDB): Promise<SyncStateRecord> {
  return (await database.syncState.get('state')) ?? { key: 'state', cursor: 0 };
}
