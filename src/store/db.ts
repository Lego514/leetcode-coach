import Dexie, { type EntityTable } from 'dexie';
import type { ListId } from '../data/lists';
import type { PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import type { Day } from '../lib/dates';
import type { Rating, ReviewState } from '../lib/srs';

export interface ProgressRecord extends ReviewState {
  problemId: number;
  lastRating: Rating;
  lastDay: Day;
  firstDay: Day;
  attempts: number;
}

export type AttemptMode = 'practice' | 'review' | 'mock' | 'explain';

export interface AttemptRecord {
  id?: number;
  problemId: number;
  day: Day;
  /** ISO 時間戳 */
  at: string;
  rating: Rating;
  minutes?: number;
  mode: AttemptMode;
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

export type MockKind = 'full' | 'explain';

export type Clarity = 1 | 2 | 3;

export interface MockRecord {
  id?: number;
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
  reflection: string;
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

export class CoachDB extends Dexie {
  progress!: EntityTable<ProgressRecord, 'problemId'>;
  attempts!: EntityTable<AttemptRecord, 'id'>;
  notes!: EntityTable<NoteRecord, 'problemId'>;
  meta!: EntityTable<MetaRecord, 'problemId'>;
  patternNotes!: EntityTable<PatternNoteRecord, 'patternId'>;
  mocks!: EntityTable<MockRecord, 'id'>;
  customProblems!: EntityTable<CustomProblemRecord, 'id'>;
  settings!: EntityTable<SettingsRecord, 'key'>;

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
  }
}

export const db = new CoachDB();
