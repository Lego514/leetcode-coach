import { db, type MockRecord } from './db';

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
  return db.transaction('r', db.tables, async () => {
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

export function parseBackup(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('這個檔案不是有效的 JSON。');
  }
  const file = parsed as Partial<BackupFile> | null;
  if (!file || file.app !== APP_ID) throw new Error('這不是刷題教練匯出的備份檔。');
  if (file.version !== BACKUP_VERSION) throw new Error(`不支援第 ${String(file.version)} 版的備份檔。`);
  const data = file.data as Record<string, unknown> | undefined;
  if (!data || TABLE_KEYS.some((key) => !Array.isArray(data[key]))) {
    throw new Error('備份檔缺少部分資料，無法匯入。');
  }
  return file as BackupFile;
}

/** 用備份檔取代目前全部資料 */
export async function restoreBackup(file: BackupFile): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    const { data } = file;
    await db.progress.bulkPut(data.progress as never[]);
    await db.attempts.bulkPut(data.attempts as never[]);
    await db.notes.bulkPut(data.notes as never[]);
    await db.meta.bulkPut(data.meta as never[]);
    await db.patternNotes.bulkPut(data.patternNotes as never[]);
    await db.mocks.bulkPut(data.mocks as never[]);
    await db.customProblems.bulkPut(data.customProblems as never[]);
    await db.settings.bulkPut(data.settings as never[]);
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}
