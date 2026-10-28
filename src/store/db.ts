import Dexie, { type EntityTable, type Table, type Transaction } from 'dexie';
import type { AttemptMode, BehavioralPoint, BehavioralTheme, CardResult, Collection, MockKind, StepNoteKey, StuckReason } from '../../shared/constants';
import type { BehavioralFeedback, BoardDoc, ExplanationFeedback, FollowUpRecord } from '../../shared/protocol';
import type { ListId } from '../data/lists';
import type { PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import type { NewProblemMode } from '../lib/daily';
import type { Day } from '../lib/dates';
import type { SprintSettings } from '../lib/sprint';
import type { Rating, ReviewState } from '../lib/srs';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { groupByProblem, progressFromAttempts, retentionOf, targetMinutesOf } from './progress';

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
  /** 批次標記時為了分散複習日，到期日往後挪的天數 */
  delayDays?: number;
  /** 卡在哪；沒勾就沒有 */
  stuck?: StuckReason[];
  /** 事後改過的時間（ISO）；同步時用來判斷哪一版比較新 */
  editedAt?: string;
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
  /** 解題步驟每一步寫的一句話 */
  steps?: StepNotes;
  updatedAt: string;
}

export type StepNotes = Partial<Record<StepNoteKey, string>>;

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
  /** 在白板上照著步驟講的講解練習 */
  board?: boolean;
  /** 講解練習的自評：1 講得很順、2 有卡住、3 講不出來 */
  clarity?: Clarity;
  hints?: number;
  sawSolution?: boolean;
  reflection: string;
  /** 語音辨識產生的英文逐字稿 */
  transcript?: string;
  /** Claude 對逐字稿的講解回饋 */
  feedback?: ExplanationFeedback;
  /** 講完之後面試官的追問、我的回答和評分 */
  followUp?: FollowUpRecord;
  /** 複製提示詞到 ChatGPT 或 Claude 之後，自己貼回來的回覆 */
  chatReply?: string;
  /** 錄音只留在這台裝置，不會同步 */
  audio?: Blob;
}

/** 練習講一題行為面試 */
export interface RehearsalRecord {
  id?: number;
  uid: string;
  /** 題庫裡的題目 id，例如 conflict-disagree */
  questionId: string;
  /** 用哪個故事回答；沒選是即興 */
  storyId?: string;
  day: Day;
  startedAt: string;
  limitSec: number;
  usedSec: number;
  /** 自己勾的：STAR 哪幾段有講到、有沒有講「我」做了什麼 */
  covered: BehavioralPoint[];
  /** 1 講得很順、2 有卡住、3 講不出來 */
  clarity?: Clarity;
  transcript?: string;
  feedback?: BehavioralFeedback;
  /** 自己貼回來的 ChatGPT 或 Claude 回覆 */
  chatReply?: string;
  /** 錄音只留在這台裝置，不會同步 */
  audio?: Blob;
}

/** 微複習的一次作答；卡片的複習排程由這些紀錄推算 */
export interface CardReviewRecord {
  id?: number;
  uid: string;
  /** 卡片 id，例如 pattern:217、tip:heap-max */
  cardId: string;
  day: Day;
  /** ISO 時間戳 */
  at: string;
  result: CardResult;
}

/** 一張白板：scratch 是自由白板，p 加題號是那一題的白板 */
export interface BoardRecord {
  id: string;
  doc: BoardDoc;
  /** ISO 時間戳 */
  updatedAt: string;
}

export type CustomProblemRecord = Problem;

/** 行為面試的一個故事；id 是 UUID，同步時當主鍵 */
export interface StoryRecord {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  themes: BehavioralTheme[];
  /** ISO 時間戳 */
  updatedAt: string;
}

export interface SettingsRecord {
  key: 'app';
  /** 目標日期（面試日或預計刷完的日子），可以不設定 */
  targetDate?: Day;
  activeList: ListId;
  dailyNew: number;
  language: string;
  /** 複習排程的目標記憶率；沒寫是 0.9 */
  retention?: number;
  /** 面試衝刺；沒有就是平常的每日計畫 */
  sprint?: SprintSettings;
  /** 每天的新題怎麼挑（src/lib/daily.ts）；沒寫是 mixed */
  newMode?: NewProblemMode;
  /** newMode 是 focus 時專練的模式 */
  focusPattern?: PatternId;
  /** 新題直接顯示是哪個模式；沒寫是不顯示，練習自己看出來 */
  showPatterns?: boolean;
  /** 跳過要 LeetCode Premium 才能做的題目（還沒做過的） */
  skipPremium?: boolean;
  /** 每天的新題最多幾題 Medium、幾題 Hard；沒設定是不限 */
  maxMedium?: number;
  maxHard?: number;
  /** 每天最多複習幾題；沒設定是不限 */
  maxReviews?: number;
  /** 最近 Medium 常要看提示時自動少排 Medium（src/lib/daily.ts 的 adaptDifficulty）；沒寫是開著 */
  adaptiveDifficulty?: boolean;
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

/** 資料庫升級時用新的排程算法重算每一題（練習紀錄本身不動） */
async function rebuildInUpgrade(tx: Transaction): Promise<void> {
  const retention = retentionOf(await tx.table('settings').get('app'));
  const targets = targetMinutesOf([...BUILTIN_PROBLEMS, ...(await tx.table('customProblems').toArray())]);
  const progress = tx.table('progress');
  await progress.clear();
  for (const [problemId, attempts] of groupByProblem(await tx.table('attempts').toArray())) {
    const record = progressFromAttempts(problemId, attempts, retention, targets.get(problemId));
    if (record) await progress.put(record);
  }
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
  cardReviews!: EntityTable<CardReviewRecord, 'id'>;
  boards!: EntityTable<BoardRecord, 'id'>;
  stories!: EntityTable<StoryRecord, 'id'>;
  rehearsals!: EntityTable<RehearsalRecord, 'id'>;

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
    // 第 3 版：微複習的作答紀錄
    this.version(3).stores({
      cardReviews: '++id, cardId, day, &uid',
    });
    // 第 4 版：白板
    this.version(4).stores({
      boards: 'id',
    });
    // 第 5 版：複習排程改用 FSRS，依練習紀錄重算每一題（練習紀錄本身不動）
    this.version(5)
      .stores({ progress: 'problemId, due' })
      .upgrade(async (tx) => {
        const retention = retentionOf(await tx.table('settings').get('app'));
        const progress = tx.table('progress');
        await progress.clear();
        for (const [problemId, attempts] of groupByProblem(await tx.table('attempts').toArray())) {
          const record = progressFromAttempts(problemId, attempts, retention);
          if (record) await progress.put(record);
        }
      });
    // 第 6 版：行為面試的故事
    this.version(6).stores({
      stories: 'id',
    });
    // 第 7 版：行為面試的練習紀錄
    this.version(7).stores({
      rehearsals: '++id, day, &uid',
    });
    // 第 8 版：寫題時間算進記憶度、寫得不順先在一週內確認；依練習紀錄重算每一題（練習紀錄本身不動）
    this.version(8).stores({}).upgrade(rebuildInUpgrade);
    // 第 9 版：提示看到第幾層、卡在哪的種類也算進記憶度；一樣重算每一題
    this.version(9).stores({}).upgrade(rebuildInUpgrade);
  }

  /** 會同步的資料表，依集合名稱查 */
  syncedTable(collection: Collection): Table {
    return this[collection] as unknown as Table;
  }

  /** 使用者資料（不含同步用的表） */
  get dataTables(): Table[] {
    return [
      this.progress,
      this.attempts,
      this.notes,
      this.meta,
      this.patternNotes,
      this.mocks,
      this.customProblems,
      this.settings,
      this.cardReviews,
      this.boards,
      this.stories,
      this.rehearsals,
    ];
  }
}

export const db = new CoachDB();
