import Dexie, { type EntityTable, type Table } from 'dexie';
import type { AttemptMode, Collection, MockKind } from '../../shared/constants';
import type { ListId } from '../data/lists';
import type { PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import type { Day } from '../lib/dates';
import type { Rating, ReviewState } from '../lib/srs';

export type { AttemptMode, MockKind };

/** 複習排程：由練習紀錄推算，不會同步到伺服器 */
export interface ProgressRecord extends ReviewState {
  problemId: number;
  lastRating: Rating;
  lastDay: Day;
  firstDay: Day;
  attempts: number;
}

export interface AttemptRecord {
  id?: number;
  /** 跨裝置唯一的識別碼，同步時當主鍵 */
  uid: string;
  problemId: number;
  day: Day;
  /** ISO 時間戳 */
  at: string;
  rating: Rating;
  minutes?: number;
  mode: AttemptMode;
  /** 這次打開了幾層提示 */
  hints?: number;
  sawSolution?: boolean;
}

export interface NoteRecord {
  problemId: number;
  /** 一句話的核心思路 */
  idea: string;
  /** 面試時要講出來的英文講解稿 */
  explanation: string;
  time: string;
  space: string;
  pitfalls: string;
  code: string;
  language: string;
  updatedAt: string;
}

export interface MetaRecord {
  problemId: number;
  companies: string[];
}

export interface PatternNoteRecord {
  patternId: PatternId;
  /** 使用者改寫過的模板；沒有就用內建的 */
  template?: string;
  notes: string;
  updatedAt: string;
}

export type Clarity = 1 | 2 | 3;

export interface MockRecord {
  id?: number;
  uid: string;
  problemId: number;
  kind: MockKind;
  day: Day;
  startedAt: string;
  limitSec: number;
  usedSec: number;
  /** 完成的面試步驟 id */
  steps: string[];
  /** 完整模擬的解題結果 */
  rating?: Rating;
  /** 講解練習的自評：1 講得很順、2 有卡住、3 講不出來 */
  clarity?: Clarity;
  hints?: number;
  sawSolution?: boolean;
  reflection: string;
  /** 錄音只留在這台裝置，不會同步 */
  audio?: Blob;
}

export type CustomProblemRecord = Problem;

export interface SettingsRecord {
  key: 'app';
  /** 目標日期（面試日或預計刷完的日子），可以不設定 */
  targetDate?: Day;
  activeList: ListId;
  dailyNew: number;
  language: string;
}

export const DEFAULT_SETTINGS: SettingsRecord = {
  key: 'app',
  activeList: 'neetcode150',
  dailyNew: 3,
  language: 'python',
};

/** 還沒上傳的本機變更；同一筆資料只留最後一次 */
export interface OutboxRecord {
  /** `${collection}:${key}` */
  id: string;
  collection: Collection;
  key: string;
  deleted: boolean;
  /** 本機修改時間（epoch 毫秒） */
  updatedAt: number;
}

export interface SyncStateRecord {
  key: 'state';
  /** 這個瀏覽器的資料目前屬於哪個帳號；沒有登入過就沒有 */
  userId?: string;
  email?: string;
  /** 已經拿到的伺服器版本號 */
  cursor: number;
  lastSyncedAt?: number;
}

export class CoachDB extends Dexie {
  progress!: EntityTable<ProgressRecord, 'problemId'>;
  attempts!: EntityTable<AttemptRecord, 'id'>;
  notes!: EntityTable<NoteRecord, 'problemId'>;
  meta!: EntityTable<MetaRecord, 'problemId'>;
  patternNotes!: EntityTable<PatternNoteRecord, 'patternId'>;
  mocks!: EntityTable<MockRecord, 'id'>;
  customProblems!: EntityTable<CustomProblemRecord, 'id'>;
  settings!: EntityTable<SettingsRecord, 'key'>;
  outbox!: EntityTable<OutboxRecord, 'id'>;
  syncState!: EntityTable<SyncStateRecord, 'key'>;

  constructor(name = 'leetcode-coach') {
    super(name);
    this.version(1).stores({
      progress: 'problemId, due',
      attempts: '++id, problemId, day',
      notes: 'problemId',
      meta: 'problemId, *companies',
      patternNotes: 'patternId',
      mocks: '++id, problemId, day',
      customProblems: 'id',
      settings: 'key',
    });
    // 第 2 版：加入同步用的識別碼、待上傳清單與同步狀態
    this.version(2)
      .stores({
        attempts: '++id, problemId, day, &uid',
        mocks: '++id, problemId, day, &uid',
        outbox: 'id',
        syncState: 'key',
      })
      .upgrade(async (tx) => {
        const addUid = (row: { uid?: string }) => {
          row.uid ??= crypto.randomUUID();
        };
        await tx.table('attempts').toCollection().modify(addUid);
        await tx.table('mocks').toCollection().modify(addUid);
      });
  }

  /** 會同步的資料表，依集合名稱查 */
  syncedTable(collection: Collection): Table {
    return this[collection] as unknown as Table;
  }

  /** 使用者資料（不含同步用的表） */
  get dataTables(): Table[] {
    return [this.progress, this.attempts, this.notes, this.meta, this.patternNotes, this.mocks, this.customProblems, this.settings];
  }
}

export const db = new CoachDB();
