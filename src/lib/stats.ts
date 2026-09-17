import { PATTERN_ORDER, type PatternId } from '../data/patterns';
import type { Difficulty, Problem } from '../data/problems';
import { addDays, diffDays, startOfWeek, type Day } from './dates';
import { masteryOf, stageOf, type ReviewState } from './srs';

type StateMap = ReadonlyMap<number, Pick<ReviewState, 'interval' | 'due'>>;

interface AttemptLike {
  problemId: number;
  day: Day;
  at: string;
  mode: string;
}

/** 真正練習的紀錄；批次標記的舊題不算在連續天數、每週次數和日曆裡 */
export function practiceAttempts<T extends { mode: string }>(attempts: readonly T[]): T[] {
  return attempts.filter((a) => a.mode !== 'import');
}

/** 某天第一次練習的題目數；批次標記的題目不佔每天的新題額度 */
export function newProblemsStartedOn(attempts: readonly AttemptLike[], day: Day): number {
  const first = new Map<number, AttemptLike>();
  for (const a of attempts) {
    const prev = first.get(a.problemId);
    if (!prev || a.at < prev.at) first.set(a.problemId, a);
  }
  let count = 0;
  for (const a of first.values()) if (a.day === day && a.mode !== 'import') count += 1;
  return count;
}

/** 連續練習天數；今天還沒練習時從昨天往回算，不會因為早上打開就歸零 */
export function practiceStreak(days: Iterable<Day>, today: Day): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function countByDay(items: Iterable<{ day: Day }>): Map<Day, number> {
  const map = new Map<Day, number>();
  for (const { day } of items) map.set(day, (map.get(day) ?? 0) + 1);
  return map;
}

export interface WeekCount {
  start: Day;
  count: number;
}

/** 最近 n 週（含本週）每週的練習次數，由舊到新 */
export function weeklyCounts(items: Iterable<{ day: Day }>, today: Day, weeks: number): WeekCount[] {
  const thisWeek = startOfWeek(today);
  const result: WeekCount[] = Array.from({ length: weeks }, (_, i) => ({
    start: addDays(thisWeek, -7 * (weeks - 1 - i)),
    count: 0,
  }));
  const index = new Map(result.map((w, i) => [w.start, i]));
  for (const { day } of items) {
    const i = index.get(startOfWeek(day));
    if (i !== undefined) result[i].count += 1;
  }
  return result;
}

export interface PatternSummary {
  pattern: PatternId;
  total: number;
  started: number;
  mastered: number;
  /** 所有題目熟練度的平均，0 到 1（沒做過的算 0） */
  mastery: number;
  /** 只看做過的題目的熟練度平均；用來找「做過但不熟」的模式 */
  startedMastery: number;
}

export function summarizePatterns(problems: Problem[], progress: StateMap): PatternSummary[] {
  const groups = new Map<PatternId, PatternSummary>();
  for (const p of problems) {
    const summary = groups.get(p.pattern) ?? {
      pattern: p.pattern,
      total: 0,
      started: 0,
      mastered: 0,
      mastery: 0,
      startedMastery: 0,
    };
    const state = progress.get(p.id);
    summary.total += 1;
    if (state) summary.started += 1;
    if (stageOf(state) === 'mastered') summary.mastered += 1;
    summary.mastery += masteryOf(state);
    groups.set(p.pattern, summary);
  }
  return PATTERN_ORDER.flatMap((id) => {
    const s = groups.get(id);
    // 累加時 mastery 存的是總和，這裡換算成平均
    return s ? [{ ...s, mastery: s.mastery / s.total, startedMastery: s.started ? s.mastery / s.started : 0 }] : [];
  });
}

export interface DifficultySummary {
  difficulty: Difficulty;
  total: number;
  started: number;
}

export function summarizeDifficulty(problems: Problem[], progress: StateMap): DifficultySummary[] {
  return (['Easy', 'Medium', 'Hard'] as const).map((difficulty) => {
    const subset = problems.filter((p) => p.difficulty === difficulty);
    return {
      difficulty,
      total: subset.length,
      started: subset.filter((p) => progress.has(p.id)).length,
    };
  });
}

/** 到期（含逾期）的題目，最早到期的排前面 */
export function dueProblems(problems: Problem[], progress: StateMap, today: Day): Problem[] {
  return problems
    .filter((p) => {
      const state = progress.get(p.id);
      return state !== undefined && state.due <= today;
    })
    .sort((a, b) => progress.get(a.id)!.due.localeCompare(progress.get(b.id)!.due));
}

export interface TargetPlan {
  /** 目標日前還能用來刷新題的天數（不含目標日當天） */
  daysLeft: number;
  /** 每天需要的新題數；目標日已到或已過時為 null */
  perDay: number | null;
}

export function planToTarget(remaining: number, today: Day, targetDate: Day): TargetPlan {
  const daysLeft = diffDays(today, targetDate);
  if (daysLeft <= 0) return { daysLeft, perDay: null };
  return { daysLeft, perDay: remaining === 0 ? 0 : Math.ceil(remaining / daysLeft) };
}

/** 照每天 dailyNew 題的速度，最後一題會在哪一天做完 */
export function finishDay(remaining: number, dailyNew: number, today: Day): Day | null {
  if (remaining === 0) return today;
  if (dailyNew <= 0) return null;
  return addDays(today, Math.ceil(remaining / dailyNew) - 1);
}
