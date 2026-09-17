import { COLLECTIONS } from '../../shared/constants';
import { db, type AttemptRecord, type MockRecord } from './db';
import { keyOf, track, type LocalRecord } from './tracking';

const APP_ID = 'leetcode-coach';
const BACKUP_VERSION = 1;

type MockWithoutAudio = Omit<MockRecord, 'audio'>;

export interface BackupFile {
  app: typeof APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: {
    progress: unknown[];
    attempts: unknown[];
    notes: unknown[];
    meta: unknown[];
    patternNotes: unknown[];
    mocks: MockWithoutAudio[];
    customProblems: unknown[];
    settings: unknown[];
  };
}

const TABLE_KEYS = ['progress', 'attempts', 'notes', 'meta', 'patternNotes', 'mocks', 'customProblems', 'settings'] as const;

/** 匯出全部資料；錄音檔太大，不放進備份 */
export async function exportBackup(): Promise<BackupFile> {
  return db.transaction('r', db.dataTables, async () => {
    const mocks = await db.mocks.toArray();
    return {
      app: APP_ID,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        progress: await db.progress.toArray(),
        attempts: await db.attempts.toArray(),
        notes: await db.notes.toArray(),
        meta: await db.meta.toArray(),
        patternNotes: await db.patternNotes.toArray(),
        mocks: mocks.map((m) => {
          const copy: MockRecord = { ...m };
          delete copy.audio;
          return copy;
        }),
        customProblems: await db.customProblems.toArray(),
        settings: await db.settings.toArray(),
      },
    };
  });
}

export type BackupErrorCode = 'not_json' | 'not_backup' | 'unsupported_version' | 'incomplete';

/** 備份檔無法匯入；畫面依 code 顯示對應語言的訊息 */
export class BackupError extends Error {
  constructor(readonly code: BackupErrorCode) {
    super(code);
  }
}

export function parseBackup(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('not_json');
  }
  const file = parsed as Partial<BackupFile> | null;
  if (!file || file.app !== APP_ID) throw new BackupError('not_backup');
  if (file.version !== BACKUP_VERSION) throw new BackupError('unsupported_version');
  const data = file.data as Record<string, unknown> | undefined;
  if (!data || TABLE_KEYS.some((key) => !Array.isArray(data[key]))) throw new BackupError('incomplete');
  return file as BackupFile;
}

/** 把現有的使用者資料全部刪掉，並留下刪除標記，登入時雲端也會跟著刪 */
async function deleteAllTracked(now: number): Promise<void> {
  for (const collection of COLLECTIONS) {
    const rows = (await db.syncedTable(collection).toArray()) as LocalRecord[];
    for (const row of rows) await track(db, collection, keyOf(collection, row), true, now);
  }
  await Promise.all(db.dataTables.map((table) => table.clear()));
}

/** 用備份檔取代目前全部資料；舊版備份的紀錄沒有 uid，匯入時補上 */
export async function restoreBackup(file: BackupFile): Promise<void> {
  await db.transaction('rw', [...db.dataTables, db.outbox], async () => {
    const now = Date.now();
    await deleteAllTracked(now);
    const { data } = file;
    const withUid = <T extends { uid?: string; id?: number }>(rows: unknown[]) =>
      (rows as T[]).map((row) => ({ ...row, uid: row.uid ?? crypto.randomUUID() }));

    await db.progress.bulkPut(data.progress as never[]);
    await db.attempts.bulkPut(withUid<AttemptRecord>(data.attempts));
    await db.notes.bulkPut(data.notes as never[]);
    await db.meta.bulkPut(data.meta as never[]);
    await db.patternNotes.bulkPut(data.patternNotes as never[]);
    await db.mocks.bulkPut(withUid<MockRecord>(data.mocks));
    await db.customProblems.bulkPut(data.customProblems as never[]);
    await db.settings.bulkPut(data.settings as never[]);

    // 匯入的資料視為最新的修改，登入時會覆蓋雲端
    for (const collection of COLLECTIONS) {
      const rows = (await db.syncedTable(collection).toArray()) as LocalRecord[];
      for (const row of rows) await track(db, collection, keyOf(collection, row), false, now);
    }
  });
}

/** 清除所有使用者資料；登入時雲端上的資料也會一起刪除 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [...db.dataTables, db.outbox], async () => {
    await deleteAllTracked(Date.now());
  });
}
