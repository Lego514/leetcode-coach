import type { PatternId } from '../data/patterns';
import { BUILTIN_PROBLEMS, type Problem } from '../data/problems';
import { toDay, type Day } from '../lib/dates';
import { parseSlug } from '../lib/catalog';
import { schedule, spreadDelays, type Rating } from '../lib/srs';
import type { BehavioralTheme, CardResult } from '../../shared/constants';
import type { BoardDoc } from '../../shared/protocol';
import {
  db,
  DEFAULT_SETTINGS,
  type AttemptMode,
  type CardReviewRecord,
  type MockRecord,
  type NoteRecord,
  type PatternNoteRecord,
  type ProgressRecord,
  type RehearsalRecord,
  type SettingsRecord,
  type StoryRecord,
} from './db';
import { retentionOf } from './progress';
import { rebuildAllProgress, track } from './tracking';

// 所有寫入都集中在這裡。每次修改都會記進待上傳清單，登入後由同步程式上傳。

export interface RecordAttemptOptions {
  mode?: AttemptMode;
  minutes?: number;
  hints?: number;
  sawSolution?: boolean;
  /** 到期日往後挪幾天，只有批次標記會用到 */
  delayDays?: number;
  day?: Day;
  at?: Date;
}

export async function recordAttempt(
  problemId: number,
  rating: Rating,
  { mode = 'practice', minutes, hints, sawSolution, delayDays, day, at = new Date() }: RecordAttemptOptions = {},
): Promise<ProgressRecord> {
  const attemptDay = day ?? toDay(at);
  return db.transaction('rw', db.progress, db.attempts, db.outbox, db.settings, async () => {
    const prev = await db.progress.get(problemId);
    const state = schedule(prev, rating, attemptDay, delayDays, retentionOf(await db.settings.get('app')));
    const record: ProgressRecord = {
      problemId,
      ...state,
      lastRating: rating,
      lastDay: attemptDay,
      firstDay: prev?.firstDay ?? attemptDay,
      attempts: (prev?.attempts ?? 0) + 1,
    };
    await db.progress.put(record);
    const uid = crypto.randomUUID();
    await db.attempts.add({
      uid,
      problemId,
      day: attemptDay,
      at: at.toISOString(),
      rating,
      mode,
      ...(minutes && minutes > 0 ? { minutes } : {}),
      ...(hints && hints > 0 ? { hints } : {}),
      ...(sawSolution ? { sawSolution } : {}),
      ...(delayDays && delayDays > 0 ? { delayDays } : {}),
    });
    await track(db, 'attempts', uid);
    return record;
  });
}

export interface MarkResult {
  marked: number;
  /** 最早和最晚的複習日；沒有標記任何題目時沒有 */
  firstDue?: Day;
  lastDue?: Day;
}

/**
 * 開始使用前就刷過的題目：一次排進複習，已經有紀錄的題目略過。
 * 題目多的時候分散到之後幾天，每天到期的題數（含原本就排好的複習）不超過上限，
 * 免得幾十題同一天到期。
 */
export async function markSolvedBefore(problemIds: readonly number[], rating: Rating, at = new Date()): Promise<MarkResult> {
  return db.transaction('rw', db.progress, db.attempts, db.outbox, db.settings, async () => {
    const fresh: number[] = [];
    for (const problemId of new Set(problemIds)) {
      if (!(await db.progress.get(problemId))) fresh.push(problemId);
    }
    if (fresh.length === 0) return { marked: 0 };

    const start = schedule(undefined, rating, toDay(at), 0, retentionOf(await db.settings.get('app'))).due;
    // 整張表讀出來自己數：iOS 的 WebKit 在某些索引游標上會出錯，資料量也很小
    const load = new Map<Day, number>();
    for (const p of await db.progress.toArray()) {
      if (p.due >= start) load.set(p.due, (load.get(p.due) ?? 0) + 1);
    }
    const delays = spreadDelays(fresh.length, start, load);

    const dues: Day[] = [];
    for (const [i, problemId] of fresh.entries()) {
      const state = await recordAttempt(problemId, rating, { mode: 'import', delayDays: delays[i], at });
      dues.push(state.due);
    }
    dues.sort();
    return { marked: fresh.length, firstDue: dues[0], lastDue: dues[dues.length - 1] };
  });
}

/** 清除一題的複習排程與練習紀錄，筆記保留 */
export async function resetProgress(problemId: number): Promise<void> {
  await db.transaction('rw', db.progress, db.attempts, db.outbox, async () => {
    const attempts = await db.attempts.where('problemId').equals(problemId).toArray();
    for (const attempt of attempts) await track(db, 'attempts', attempt.uid, true);
    await db.attempts.where('problemId').equals(problemId).delete();
    await db.progress.delete(problemId);
  });
}

const EMPTY_NOTE: Omit<NoteRecord, 'problemId' | 'updatedAt'> = {
  idea: '',
  explanation: '',
  time: '',
  space: '',
  pitfalls: '',
  code: '',
  language: DEFAULT_SETTINGS.language,
};

export async function saveNote(problemId: number, patch: Partial<Omit<NoteRecord, 'problemId'>>): Promise<void> {
  await db.transaction('rw', db.notes, db.outbox, async () => {
    const prev = await db.notes.get(problemId);
    await db.notes.put({
      ...EMPTY_NOTE,
      ...prev,
      ...patch,
      problemId,
      updatedAt: new Date().toISOString(),
    });
    await track(db, 'notes', String(problemId));
  });
}

// ---------- 行為面試的故事 ----------

/** 新增一個空白的故事，可以先標好主題；回傳它的 id */
export async function createStory(themes: BehavioralTheme[] = []): Promise<string> {
  const id = crypto.randomUUID();
  await db.transaction('rw', db.stories, db.outbox, async () => {
    await db.stories.put({ id, title: '', situation: '', task: '', action: '', result: '', themes, updatedAt: new Date().toISOString() });
    await track(db, 'stories', id);
  });
  return id;
}

export async function saveStory(id: string, patch: Partial<Omit<StoryRecord, 'id' | 'updatedAt'>>): Promise<void> {
  await db.transaction('rw', db.stories, db.outbox, async () => {
    const prev = await db.stories.get(id);
    if (!prev) return;
    await db.stories.put({ ...prev, ...patch, id, updatedAt: new Date().toISOString() });
    await track(db, 'stories', id);
  });
}

export async function deleteStory(id: string): Promise<void> {
  await db.transaction('rw', db.stories, db.outbox, async () => {
    await db.stories.delete(id);
    await track(db, 'stories', id, true);
  });
}

/** 存一次行為面試的練習；回傳它的 uid */
export async function saveRehearsal(record: Omit<RehearsalRecord, 'id' | 'uid'>): Promise<string> {
  const uid = crypto.randomUUID();
  await db.transaction('rw', db.rehearsals, db.outbox, async () => {
    await db.rehearsals.add({ ...record, uid });
    await track(db, 'rehearsals', uid);
  });
  return uid;
}

export async function deleteRehearsal(uid: string): Promise<void> {
  await db.transaction('rw', db.rehearsals, db.outbox, async () => {
    await db.rehearsals.where('uid').equals(uid).delete();
    await track(db, 'rehearsals', uid, true);
  });
}

export function normalizeCompany(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export async function setCompanies(problemId: number, companies: string[]): Promise<void> {
  const cleaned = [...new Set(companies.map(normalizeCompany).filter(Boolean))];
  await db.transaction('rw', db.meta, db.outbox, async () => {
    if (cleaned.length === 0) {
      await db.meta.delete(problemId);
      await track(db, 'meta', String(problemId), true);
    } else {
      await db.meta.put({ problemId, companies: cleaned });
      await track(db, 'meta', String(problemId));
    }
  });
}

/** 幫很多題一次標上同一家公司；已經標過的不會重複 */
export async function tagProblems(problemIds: readonly number[], company: string): Promise<void> {
  const name = normalizeCompany(company);
  if (!name) return;
  await db.transaction('rw', db.meta, db.outbox, async () => {
    for (const problemId of problemIds) {
      const companies = (await db.meta.get(problemId))?.companies ?? [];
      if (companies.some((c) => c.toLowerCase() === name.toLowerCase())) continue;
      await db.meta.put({ problemId, companies: [...companies, name] });
      await track(db, 'meta', String(problemId));
    }
  });
}

export async function savePatternNote(
  patternId: PatternId,
  patch: Partial<Omit<PatternNoteRecord, 'patternId' | 'updatedAt'>>,
): Promise<void> {
  await db.transaction('rw', db.patternNotes, db.outbox, async () => {
    const prev = await db.patternNotes.get(patternId);
    const next: PatternNoteRecord = {
      notes: '',
      ...prev,
      ...patch,
      patternId,
      updatedAt: new Date().toISOString(),
    };
    if (next.template === undefined) delete next.template;
    await db.patternNotes.put(next);
    await track(db, 'patternNotes', patternId);
  });
}

export async function updateSettings(patch: Partial<Omit<SettingsRecord, 'key'>>): Promise<void> {
  // 只有改目標記憶率時才需要重算排程；其他設定不要卡住練習紀錄的資料表
  const tables = 'retention' in patch ? [db.settings, db.outbox, db.progress, db.attempts] : [db.settings, db.outbox];
  await db.transaction('rw', tables, async () => {
    const prev = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    const next: SettingsRecord = { ...prev, ...patch, key: 'app' };
    if (!next.targetDate) delete next.targetDate;
    if (!next.sprint) delete next.sprint;
    await db.settings.put(next);
    await track(db, 'settings', 'app');
    // 目標記憶率變了，每一題的下次複習日都要重算
    if (retentionOf(next) !== retentionOf(prev)) await rebuildAllProgress(db);
  });
}

export type ValidationCode = 'invalid_id' | 'missing_title' | 'title_too_long' | 'invalid_url' | 'builtin_exists' | 'already_added';

/** 輸入不合法；畫面依 code 顯示對應語言的訊息 */
export class ValidationError extends Error {
  constructor(
    readonly code: ValidationCode,
    readonly problemId?: number,
  ) {
    super(code);
  }
}

export interface NewProblemInput {
  id: number;
  title: string;
  slug: string;
  difficulty: Problem['difficulty'];
  pattern: PatternId;
  premium?: boolean;
}

export { parseSlug };

export async function addCustomProblem(input: NewProblemInput): Promise<Problem> {
  const slug = parseSlug(input.slug);
  const title = input.title.trim();
  if (!Number.isInteger(input.id) || input.id <= 0 || input.id > 9_999_999) throw new ValidationError('invalid_id');
  if (!title) throw new ValidationError('missing_title');
  if (title.length > 200) throw new ValidationError('title_too_long');
  if (!slug || slug.length > 120) throw new ValidationError('invalid_url');
  if (BUILTIN_PROBLEMS.some((p) => p.id === input.id)) throw new ValidationError('builtin_exists', input.id);
  const problem: Problem = {
    id: input.id,
    slug,
    title,
    difficulty: input.difficulty,
    pattern: input.pattern,
    premium: input.premium ?? false,
    custom: true,
  };
  await db.transaction('rw', db.customProblems, db.outbox, async () => {
    if (await db.customProblems.get(input.id)) throw new ValidationError('already_added', input.id);
    await db.customProblems.add(problem);
    await track(db, 'customProblems', String(problem.id));
  });
  return problem;
}

export async function deleteCustomProblem(problemId: number): Promise<void> {
  const tables = [db.customProblems, db.progress, db.attempts, db.notes, db.meta, db.mocks, db.outbox];
  await db.transaction('rw', tables, async () => {
    const key = String(problemId);
    const attempts = await db.attempts.where('problemId').equals(problemId).toArray();
    const mocks = await db.mocks.where('problemId').equals(problemId).toArray();
    for (const attempt of attempts) await track(db, 'attempts', attempt.uid, true);
    for (const mock of mocks) await track(db, 'mocks', mock.uid, true);
    if (await db.notes.get(problemId)) await track(db, 'notes', key, true);
    if (await db.meta.get(problemId)) await track(db, 'meta', key, true);
    await track(db, 'customProblems', key, true);

    await db.customProblems.delete(problemId);
    await db.progress.delete(problemId);
    await db.notes.delete(problemId);
    await db.meta.delete(problemId);
    await db.attempts.where('problemId').equals(problemId).delete();
    await db.mocks.where('problemId').equals(problemId).delete();
  });
}

export async function saveMock(record: Omit<MockRecord, 'id' | 'uid'>): Promise<void> {
  await db.transaction('rw', db.mocks, db.outbox, async () => {
    const uid = crypto.randomUUID();
    await db.mocks.add({ ...record, uid });
    await track(db, 'mocks', uid);
  });
}

export async function deleteMock(id: number): Promise<void> {
  await db.transaction('rw', db.mocks, db.outbox, async () => {
    const mock = await db.mocks.get(id);
    if (!mock) return;
    await db.mocks.delete(id);
    await track(db, 'mocks', mock.uid, true);
  });
}

/** 微複習答完一張卡就存，中途離開也不會遺失 */
export async function recordCardReview(cardId: string, result: CardResult, at = new Date()): Promise<CardReviewRecord> {
  return db.transaction('rw', db.cardReviews, db.outbox, async () => {
    const record: CardReviewRecord = { uid: crypto.randomUUID(), cardId, day: toDay(at), at: at.toISOString(), result };
    record.id = await db.cardReviews.add(record);
    await track(db, 'cardReviews', record.uid);
    return record;
  });
}

/** 白板自動存檔；整張白板一起存，同步時較新的版本勝出 */
export async function saveBoard(id: string, doc: BoardDoc, at = new Date()): Promise<void> {
  await db.transaction('rw', db.boards, db.outbox, async () => {
    await db.boards.put({ id, doc, updatedAt: at.toISOString() });
    await track(db, 'boards', id, false, at.getTime());
  });
}

export async function deleteBoard(id: string): Promise<void> {
  await db.transaction('rw', db.boards, db.outbox, async () => {
    if (!(await db.boards.get(id))) return;
    await db.boards.delete(id);
    await track(db, 'boards', id, true);
  });
}
