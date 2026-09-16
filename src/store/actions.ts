import type { PatternId } from '../data/patterns';
import { BUILTIN_PROBLEMS, type Problem } from '../data/problems';
import { toDay, type Day } from '../lib/dates';
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

// 所有寫入都集中在這裡；之後換成後端 API 時，只需要改這個檔案和 queries.ts。

export interface RecordAttemptOptions {
  mode?: AttemptMode;
  minutes?: number;
  day?: Day;
  at?: Date;
}

export async function recordAttempt(
  problemId: number,
  rating: Rating,
  { mode = 'practice', minutes, day, at = new Date() }: RecordAttemptOptions = {},
): Promise<ProgressRecord> {
  const attemptDay = day ?? toDay(at);
  return db.transaction('rw', db.progress, db.attempts, async () => {
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
    await db.attempts.add({
      problemId,
      day: attemptDay,
      at: at.toISOString(),
      rating,
      mode,
      ...(minutes && minutes > 0 ? { minutes } : {}),
    });
    return record;
  });
}

/** 清除一題的複習排程與練習紀錄，筆記保留 */
export async function resetProgress(problemId: number): Promise<void> {
  await db.transaction('rw', db.progress, db.attempts, async () => {
    await db.progress.delete(problemId);
    await db.attempts.where('problemId').equals(problemId).delete();
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
  await db.transaction('rw', db.notes, async () => {
    const prev = await db.notes.get(problemId);
    await db.notes.put({
      ...EMPTY_NOTE,
      ...prev,
      ...patch,
      problemId,
      updatedAt: new Date().toISOString(),
    });
  });
}

export function normalizeCompany(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export async function setCompanies(problemId: number, companies: string[]): Promise<void> {
  const cleaned = [...new Set(companies.map(normalizeCompany).filter(Boolean))];
  if (cleaned.length === 0) {
    await db.meta.delete(problemId);
  } else {
    await db.meta.put({ problemId, companies: cleaned });
  }
}

export async function savePatternNote(
  patternId: PatternId,
  patch: Partial<Omit<PatternNoteRecord, 'patternId' | 'updatedAt'>>,
): Promise<void> {
  await db.transaction('rw', db.patternNotes, async () => {
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
  });
}

export async function updateSettings(patch: Partial<Omit<SettingsRecord, 'key'>>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const prev = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    const next: SettingsRecord = { ...prev, ...patch, key: 'app' };
    if (!next.targetDate) delete next.targetDate;
    await db.settings.put(next);
  });
}

export class ValidationError extends Error {}

export interface NewProblemInput {
  id: number;
  title: string;
  slug: string;
  difficulty: Problem['difficulty'];
  pattern: PatternId;
  premium?: boolean;
}

/** 從 LeetCode 網址或 slug 取出 slug */
export function parseSlug(input: string): string {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/leetcode\.(?:com|cn)\/problems\/([a-z0-9-]+)/i);
  const slug = (fromUrl ? fromUrl[1] : trimmed).toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : '';
}

export async function addCustomProblem(input: NewProblemInput): Promise<Problem> {
  const slug = parseSlug(input.slug);
  const title = input.title.trim();
  if (!Number.isInteger(input.id) || input.id <= 0) throw new ValidationError('題號要是正整數。');
  if (!title) throw new ValidationError('請輸入題目名稱。');
  if (!slug) throw new ValidationError('請貼上 LeetCode 題目網址，例如 https://leetcode.com/problems/two-sum/');
  if (BUILTIN_PROBLEMS.some((p) => p.id === input.id)) {
    throw new ValidationError(`第 ${input.id} 題已經在內建題庫裡了。`);
  }
  const problem: Problem = {
    id: input.id,
    slug,
    title,
    difficulty: input.difficulty,
    pattern: input.pattern,
    premium: input.premium ?? false,
    custom: true,
  };
  await db.transaction('rw', db.customProblems, async () => {
    if (await db.customProblems.get(input.id)) {
      throw new ValidationError(`第 ${input.id} 題已經新增過了。`);
    }
    await db.customProblems.add(problem);
  });
  return problem;
}

export async function deleteCustomProblem(problemId: number): Promise<void> {
  await db.transaction('rw', [db.customProblems, db.progress, db.attempts, db.notes, db.meta, db.mocks], async () => {
    await db.customProblems.delete(problemId);
    await db.progress.delete(problemId);
    await db.notes.delete(problemId);
    await db.meta.delete(problemId);
    await db.attempts.where('problemId').equals(problemId).delete();
    await db.mocks.where('problemId').equals(problemId).delete();
  });
}

export async function saveMock(record: Omit<MockRecord, 'id'>): Promise<void> {
  await db.mocks.add(record);
}

export async function deleteMock(id: number): Promise<void> {
  await db.mocks.delete(id);
}
