import type { PatternId } from '../data/patterns';
import { BUILTIN_PROBLEMS, type Problem } from '../data/problems';
import { toDay, type Day } from '../lib/dates';
import { parseSlug } from '../lib/catalog';
import { schedule, type Rating } from '../lib/srs';
import {
  db,
  DEFAULT_SETTINGS,
  type AttemptMode,
  type MockRecord,
  type NoteRecord,
  type PatternNoteRecord,
  type ProgressRecord,
  type SettingsRecord,
} from './db';
import { track } from './tracking';

// 所有寫入都集中在這裡。每次修改都會記進待上傳清單，登入後由同步程式上傳。

export interface RecordAttemptOptions {
  mode?: AttemptMode;
  minutes?: number;
  hints?: number;
  sawSolution?: boolean;
  day?: Day;
  at?: Date;
}

export async function recordAttempt(
  problemId: number,
  rating: Rating,
  { mode = 'practice', minutes, hints, sawSolution, day, at = new Date() }: RecordAttemptOptions = {},
): Promise<ProgressRecord> {
  const attemptDay = day ?? toDay(at);
  return db.transaction('rw', db.progress, db.attempts, db.outbox, async () => {
    const prev = await db.progress.get(problemId);
    const state = schedule(prev, rating, attemptDay);
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
    });
    await track(db, 'attempts', uid);
    return record;
  });
}

/**
 * 開始使用前就刷過的題目：一次排進複習，已經有紀錄的題目略過。
 * 回傳實際標記的題數。
 */
export async function markSolvedBefore(problemIds: readonly number[], rating: Rating): Promise<number> {
  return db.transaction('rw', db.progress, db.attempts, db.outbox, async () => {
    let marked = 0;
    for (const problemId of new Set(problemIds)) {
      if (await db.progress.get(problemId)) continue;
      await recordAttempt(problemId, rating, { mode: 'import' });
      marked += 1;
    }
    return marked;
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
  await db.transaction('rw', db.settings, db.outbox, async () => {
    const prev = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    const next: SettingsRecord = { ...prev, ...patch, key: 'app' };
    if (!next.targetDate) delete next.targetDate;
    await db.settings.put(next);
    await track(db, 'settings', 'app');
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
