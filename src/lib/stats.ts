import { PATTERN_ORDER, type PatternId } from '../data/patterns';
import type { Difficulty, Problem } from '../data/problems';
import { streakState } from '../../shared/streak';
import { addDays, diffDays, startOfWeek, type Day } from './dates';
import { masteryOf, recallOn, stageOf, type Rating, type ReviewState } from './srs';

type StateMap = ReadonlyMap<
  number,
  Pick<ReviewState, 'interval' | 'due'> & Partial<Pick<ReviewState, 'stability' | 'lastReview'>> & { explained?: boolean }
>;

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

/** 某天第一次練習的題目；批次標記的題目不佔每天的新題額度 */
export function problemsStartedOn(attempts: readonly AttemptLike[], day: Day): number[] {
  const first = new Map<number, AttemptLike>();
  for (const a of attempts) {
    const prev = first.get(a.problemId);
    if (!prev || a.at < prev.at) first.set(a.problemId, a);
  }
  return [...first.values()].filter((a) => a.day === day && a.mode !== 'import').map((a) => a.problemId);
}

/** 某天第一次練習的題目數 */
export function newProblemsStartedOn(attempts: readonly AttemptLike[], day: Day): number {
  return problemsStartedOn(attempts, day).length;
}

/** 連續練習天數；今天還沒練習時算到昨天，不會因為早上打開就歸零。漏掉的日子有保護就不會斷（見 shared/streak.ts） */
export function practiceStreak(days: Iterable<Day>, today: Day): number {
  return streakState(days, today).streak;
}

/** 算連續天數用的日子：有練習題目，或做過微複習 */
export function streakDays(
  practiced: readonly { day: Day }[],
  cardReviews: readonly { day: Day }[],
  rehearsals: readonly { day: Day }[] = [],
): Day[] {
  return [...practiced, ...cardReviews, ...rehearsals].map((item) => item.day);
}

/** 最長連續幾天；日子不用排序，重複的會合併 */
export function longestStreak(days: Iterable<Day>): number {
  let best = 0;
  let run = 0;
  let prev: Day | undefined;
  for (const day of [...new Set(days)].sort()) {
    run = prev !== undefined && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
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
    // 今天最可能已經忘了的排前面；一樣的話早到期的先
    .sort((a, b) => {
      const sa = progress.get(a.id)!;
      const sb = progress.get(b.id)!;
      return (recallOn(sa, today) ?? 0) - (recallOn(sb, today) ?? 0) || sa.due.localeCompare(sb.due);
    });
}

/** 某天複習了幾題：那天練過、而且不是那天第一次練的題目（新題不算） */
export function reviewsDoneOn(attempts: readonly AttemptLike[], day: Day): number {
  const started = new Set(problemsStartedOn(attempts, day));
  const practiced = new Set(attempts.filter((a) => a.day === day && a.mode !== 'import').map((a) => a.problemId));
  return [...practiced].filter((id) => !started.has(id)).length;
}

/**
 * 每天最多複習幾題：到期的題目已經照「最可能忘的在前」排好，今天只拿前面幾題（扣掉今天已經複習的），
 * 其他的留著，明天自然排進來。cap 沒設定就全部
 */
export function capDue<T>(due: readonly T[], cap: number | undefined, doneToday: number): { shown: T[]; later: number } {
  if (cap === undefined) return { shown: [...due], later: 0 };
  const room = Math.max(0, cap - doneToday);
  return { shown: due.slice(0, room), later: Math.max(0, due.length - room) };
}

export interface ForecastDay {
  day: Day;
  /** 這天新到期的題數（今天包括之前逾期的） */
  due: number;
  /** 這天要複習的題數：有每天上限時最多到上限 */
  load: number;
  /** 做完這天之後還在排隊的題數（超過上限、留到之後的） */
  waiting: number;
}

/**
 * 接下來幾天每天要複習幾題：照現在的到期日數，有上限就把超過的往後排（跟 capDue 一樣）。
 * 不算之後複習完又排回來的題目（例如寫得不順，一週內再確認），所以實際會再多一點
 */
export function reviewForecast(
  states: Iterable<{ due: Day }>,
  today: Day,
  cap: number | undefined,
  doneToday: number,
  days = 7,
): ForecastDay[] {
  const counts = new Map<Day, number>();
  for (const { due } of states) {
    const day = due < today ? today : due;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const result: ForecastDay[] = [];
  let backlog = 0;
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i);
    const due = counts.get(day) ?? 0;
    backlog += due;
    const room = cap === undefined ? backlog : Math.max(0, cap - (i === 0 ? doneToday : 0));
    const load = Math.min(backlog, room);
    backlog -= load;
    result.push({ day, due, load, waiting: backlog });
  }
  return result;
}

/**
 * 上次看了提示、看了解答或還不懂的題目，複習時要「重寫」：不看筆記，在 LeetCode 從頭寫到通過。
 * 只是回想思路很容易覺得自己會了，自己寫得出來才算真的會；自己解出一次之後就回到一般的複習
 */
export function needsRewrite(state: { lastRating: Rating } | null | undefined): boolean {
  return !!state && state.lastRating !== 'solo';
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

export interface MonthBlock {
  /** 這個月的 1 號（範圍從月中開始時是範圍的第一天） */
  first: Day;
  /** 一欄一週，七格依星期排（週一在上）；不屬於這個月或不在範圍內的格子是 null */
  weeks: (Day | null)[][];
}

/**
 * 熱度圖照月份分塊，跟 LeetCode 一樣：跨月的那一週拆成兩欄，前一個月的留在前一塊，
 * 月份之間留空隙，一眼就看得出哪幾格是哪個月。
 */
export function monthBlocks(from: Day, to: Day): MonthBlock[] {
  const blocks: MonthBlock[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    let block = blocks.at(-1);
    if (!block || block.first.slice(0, 7) !== day.slice(0, 7)) {
      block = { first: day, weeks: [] };
      blocks.push(block);
    }
    const row = diffDays(startOfWeek(day), day);
    let week = block.weeks.at(-1);
    if (!week || row === 0) {
      week = Array.from({ length: 7 }, () => null);
      block.weeks.push(week);
    }
    week[row] = day;
  }
  return blocks;
}
