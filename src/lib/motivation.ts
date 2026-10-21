import { PATTERN_ORDER, type PatternId } from '../data/patterns';
import { DIFFICULTIES } from '../../shared/constants';
import type { Difficulty, Problem } from '../data/problems';
import { addDays, type Day } from './dates';
import { recallOn, replay, stageOf, type Rating, type ReviewState } from './srs';

// 讓人想繼續刷的東西：看得到自己變強（題型等級、準備度、每週回顧）和「征服」的時刻。
// 全部從練習紀錄和複習排程算出來，不另外存。

type StateLike = Pick<ReviewState, 'interval'> & Partial<Pick<ReviewState, 'stability' | 'lastReview'>> & { lastRating: Rating };
type StateMap = ReadonlyMap<number, StateLike>;

interface AttemptLike {
  problemId: number;
  day: Day;
  at: string;
  rating: Rating;
  mode: string;
  minutes?: number;
  delayDays?: number;
}

/** 現在還記得的機率至少這麼多，才算「會了」 */
export const READY_RECALL = 0.7;

/**
 * 這題現在會不會：最近一次是自己解出，而且現在還記得（機率至少 READY_RECALL）。
 * 看了提示或解答的題目，要自己重寫出來才算
 */
export function isReady(state: StateLike | undefined, today: Day): boolean {
  if (!state || state.lastRating !== 'solo') return false;
  // 舊版的紀錄沒有穩定度，最近一次自己解出就算
  return (recallOn(state, today) ?? 1) >= READY_RECALL;
}

export interface Readiness {
  ready: number;
  total: number;
  byDifficulty: { difficulty: Difficulty; ready: number; total: number }[];
}

/** 準備度：清單裡現在會的題目佔多少，也分難度算 */
export function readiness(problems: readonly Problem[], progress: StateMap, today: Day): Readiness {
  const byDifficulty = DIFFICULTIES.map((difficulty) => ({ difficulty, ready: 0, total: 0 }));
  let ready = 0;
  for (const p of problems) {
    const row = byDifficulty.find((d) => d.difficulty === p.difficulty)!;
    row.total += 1;
    if (isReady(progress.get(p.id), today)) {
      ready += 1;
      row.ready += 1;
    }
  }
  return { ready, total: problems.length, byDifficulty };
}

/** 0 到 100 的百分比；沒有題目時是 0 */
export const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

/** 某一天開始之前的排程：只重播那天以前的紀錄，用來跟過去比較準備度 */
export function progressBefore(attempts: readonly AttemptLike[], day: Day, retention: number): Map<number, StateLike> {
  const groups = new Map<number, AttemptLike[]>();
  for (const a of attempts) {
    if (a.day >= day) continue;
    groups.set(a.problemId, [...(groups.get(a.problemId) ?? []), a]);
  }
  const map = new Map<number, StateLike>();
  for (const [id, list] of groups) {
    const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at));
    map.set(id, { ...replay(sorted, retention)!, lastRating: sorted[sorted.length - 1].rating });
  }
  return map;
}

/**
 * 題型等級：
 * 0 還沒開始、1 練習中、2 會了（至少四成的題目現在會）、3 精通（八成的題目現在會，而且已經隔一週以上複習）
 */
export type PatternLevel = 0 | 1 | 2 | 3;
export const PATTERN_LEVELS: PatternLevel[] = [0, 1, 2, 3];

export interface PatternProgress {
  pattern: PatternId;
  level: PatternLevel;
  ready: number;
  total: number;
}

export function patternLevels(problems: readonly Problem[], progress: StateMap, today: Day): PatternProgress[] {
  return PATTERN_ORDER.flatMap((pattern) => {
    const list = problems.filter((p) => p.pattern === pattern);
    if (list.length === 0) return [];
    const states = list.map((p) => progress.get(p.id));
    const readyStates = states.filter((s) => isReady(s, today));
    const ready = readyStates.length;
    const settled = readyStates.filter((s) => stageOf(s) !== 'learning').length;
    const level: PatternLevel =
      settled >= Math.ceil(list.length * 0.8) ? 3 : ready >= Math.ceil(list.length * 0.4) ? 2 : states.some(Boolean) ? 1 : 0;
    return [{ pattern, level, ready, total: list.length }];
  });
}

/** 「征服」：之前靠提示、看了解答或還不懂，後來自己解出來。回傳每次征服的題目和日子 */
export function conquests(attempts: readonly AttemptLike[]): { problemId: number; day: Day }[] {
  const sorted = attempts.filter((a) => a.mode !== 'import').sort((a, b) => a.at.localeCompare(b.at));
  const last = new Map<number, Rating>();
  const result: { problemId: number; day: Day }[] = [];
  for (const a of sorted) {
    const prev = last.get(a.problemId);
    if (a.rating === 'solo' && prev !== undefined && prev !== 'solo') result.push({ problemId: a.problemId, day: a.day });
    last.set(a.problemId, a.rating);
  }
  return result;
}

export interface WeekSummary {
  /** 有練習的天數（練題目或做微複習） */
  days: number;
  /** 練了幾次題目（含複習） */
  sessions: number;
  /** 第一次做的新題 */
  newProblems: number;
  /** 征服了幾題 */
  conquered: number;
  /** 自己解出的次數 */
  solo: number;
  minutes: number;
}

/** 一週（start 起 7 天）的摘要 */
export function weekSummary(attempts: readonly AttemptLike[], otherDays: readonly Day[], start: Day): WeekSummary {
  const end = addDays(start, 7);
  const inWeek = (day: Day) => day >= start && day < end;
  const practiced = attempts.filter((a) => a.mode !== 'import');
  const week = practiced.filter((a) => inWeek(a.day));
  const firstDay = new Map<number, Day>();
  for (const a of practiced) {
    const prev = firstDay.get(a.problemId);
    if (!prev || a.day < prev) firstDay.set(a.problemId, a.day);
  }
  return {
    days: new Set([...week.map((a) => a.day), ...otherDays.filter(inWeek)]).size,
    sessions: week.length,
    newProblems: [...firstDay.values()].filter(inWeek).length,
    conquered: conquests(attempts).filter((c) => inWeek(c.day)).length,
    solo: week.filter((a) => a.rating === 'solo').length,
    minutes: week.reduce((sum, a) => sum + (a.minutes ?? 0), 0),
  };
}

/**
 * 做完一題之後要不要慶祝：征服了這題，或這題的題型升級了。
 * before、after 是這題做之前和之後整份排程
 */
export type Win = { kind: 'conquered'; problem: Problem; lastRating: Rating } | { kind: 'levelUp'; pattern: PatternId; level: PatternLevel };

export function winsFor(problem: Problem, list: readonly Problem[], before: StateMap, after: StateMap, today: Day): Win[] {
  const prev = before.get(problem.id);
  const next = after.get(problem.id);
  const wins: Win[] = [];
  if (prev && prev.lastRating !== 'solo' && next?.lastRating === 'solo') wins.push({ kind: 'conquered', problem, lastRating: prev.lastRating });
  if (list.some((p) => p.id === problem.id)) {
    const inPattern = list.filter((p) => p.pattern === problem.pattern);
    const levelBefore = patternLevels(inPattern, before, today)[0]?.level ?? 0;
    const levelAfter = patternLevels(inPattern, after, today)[0]?.level ?? 0;
    // 升到「會了」或「精通」才慶祝；開始練一個新題型不算
    if (levelAfter > levelBefore && levelAfter >= 2) wins.push({ kind: 'levelUp', pattern: problem.pattern, level: levelAfter });
  }
  return wins;
}
