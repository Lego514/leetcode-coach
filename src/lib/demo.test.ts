import { describe, expect, it } from 'vitest';
import { BEHAVIORAL_THEMES, EXPLAIN_POINTS } from '../../shared/constants';
import { boardDataSchema, rehearsalDataSchema, storyDataSchema } from '../../shared/protocol';
import { BEHAVIORAL_QUESTIONS } from '../data/behavioral';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { progressFromAttempts } from '../store/progress';
import type { AttemptRecord } from '../store/db';
import { demoData } from './demo';
import { explainProgress, explainSessions, type MockLike } from './explainProgress';

const today = '2026-10-16';
let n = 0;
const demo = demoData(today, () => `uid-${(n += 1)}`);
const attempts = demo.attempts as unknown as AttemptRecord[];

describe('demo data', () => {
  it('only uses real problems and never dates anything after today', () => {
    const ids = new Set(BUILTIN_PROBLEMS.map((p) => p.id));
    expect(attempts.every((a) => ids.has(a.problemId))).toBe(true);
    expect(attempts.every((a) => a.day <= today && a.day >= '2026-09-01')).toBe(true);
    expect(new Set(attempts.map((a) => a.uid)).size).toBe(attempts.length);
    expect(demo.cardReviews.every((r) => (r.day as string) <= today)).toBe(true);
  });

  it('looks like real use: a few dozen problems, a recent streak, and only a handful of reviews due', () => {
    const problems = new Set(attempts.map((a) => a.problemId));
    expect(problems.size).toBeGreaterThan(20);
    // 最近一週每天都有練
    for (let i = 0; i < 5; i += 1) {
      const day = `2026-10-${String(16 - i).padStart(2, '0')}`;
      expect(attempts.some((a) => a.day === day)).toBe(true);
    }
    const due = [...problems].filter((id) => {
      const state = progressFromAttempts(id, attempts.filter((a) => a.problemId === id), 0.9);
      return state !== null && state.due <= today;
    });
    expect(due.length).toBeGreaterThan(0);
    expect(due.length).toBeLessThanOrEqual(10);
  });

  it('has a few explanation drills that get more complete, with edge cases missed the most', () => {
    const mocks = demo.mocks as unknown as (MockLike & { problemId: number; uid: string })[];
    const ids = new Set(BUILTIN_PROBLEMS.map((p) => p.id));
    expect(mocks.length).toBeGreaterThanOrEqual(5);
    expect(mocks.every((m) => ids.has(m.problemId) && m.day <= today && m.steps.every((s) => (EXPLAIN_POINTS as readonly string[]).includes(s)))).toBe(true);
    expect(new Set([...attempts, ...mocks].map((r) => r.uid)).size).toBe(attempts.length + mocks.length);
    const result = explainProgress(explainSessions(mocks));
    expect(result.recent).toBeGreaterThan(result.previous!);
    expect(result.weakest).toBe('edge');
  });

  it('has a few STAR stories that pass the sync schema and cover several themes', () => {
    expect(demo.stories.length).toBeGreaterThanOrEqual(3);
    for (const { id, ...data } of demo.stories) {
      expect(typeof id).toBe('string');
      expect(storyDataSchema.safeParse(data).success).toBe(true);
      expect((data.updatedAt as string).slice(0, 10) <= today).toBe(true);
    }
    const themes = new Set(demo.stories.flatMap((s) => s.themes as string[]));
    // 有涵蓋的主題，也留幾個還沒有故事的主題，故事頁才看得到「還缺哪些」
    expect(themes.size).toBeGreaterThanOrEqual(6);
    expect(themes.size).toBeLessThan(BEHAVIORAL_THEMES.length);
  });

  it('has a couple of behavioral practices, each answered with one of its stories, valid for sync', () => {
    // 同步的 schema 要 storyId 是 UUID，這裡用真的 UUID 產生一份
    const real = demoData(today);
    const storyIds = new Set(real.stories.map((s) => s.id));
    const questions = new Set(BEHAVIORAL_QUESTIONS.map((q) => q.id));
    expect(real.rehearsals.length).toBeGreaterThanOrEqual(2);
    for (const { uid, ...data } of real.rehearsals) {
      expect(typeof uid).toBe('string');
      const parsed = rehearsalDataSchema.safeParse(data);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      expect(storyIds.has(data.storyId as string)).toBe(true);
      expect(questions.has(data.questionId as string)).toBe(true);
      expect((data.day as string) < today).toBe(true);
    }
    // 至少一次有 AI 回饋，故事頁才看得到分數
    expect(real.rehearsals.some((r) => r.feedback)).toBe(true);
  });

  it('has whiteboards for problems it practiced, valid for sync, and none on the README screenshot’s problem', () => {
    const practiced = new Set(attempts.map((a) => a.problemId));
    expect(demo.boards.length).toBeGreaterThanOrEqual(2);
    for (const { id, ...data } of demo.boards) {
      expect(id).toMatch(/^p\d+$/);
      expect(practiced.has(Number((id as string).slice(1)))).toBe(true);
      const parsed = boardDataSchema.safeParse(data);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
    expect(demo.boards.map((b) => b.id)).not.toContain('p3');
  });
});
