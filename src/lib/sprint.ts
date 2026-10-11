import { PATTERN_ORDER, type PatternId } from '../data/patterns';
import type { Difficulty, Problem } from '../data/problems';
import { addDays, diffDays, parseDay, type Day } from './dates';
import { DEFAULT_RETENTION, masteryOf, recallOn, schedule, type ReviewState } from './srs';

// 面試衝刺：從今天到面試前一天，每天排多少新題、多少複習，最後幾天只複習。
// 計畫不存起來，每天依目前的進度重新算；哪天沒做到，剩下的天數會自動分攤。

export interface SprintSettings {
  /** 面試那天 */
  date: Day;
  /** 面試的公司；有標這家公司的題目排最前面 */
  company?: string;
  /** 平日、週末每天能花幾分鐘 */
  weekdayMinutes: number;
  weekendMinutes: number;
  /** 面試前幾天不排新題，只複習 */
  reviewDays: number;
}

export const SPRINT_MINUTE_OPTIONS = [30, 60, 90, 120, 180, 240, 300] as const;
export const SPRINT_REVIEW_DAY_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
export const DEFAULT_SPRINT: Omit<SprintSettings, 'date'> = { weekdayMinutes: 90, weekendMinutes: 180, reviewDays: 2 };

/** 估計的時間：一題新題依難度，複習一題，一場完整模擬，一次行為面試練習 */
export const NEW_MINUTES: Record<Difficulty, number> = { Easy: 20, Medium: 35, Hard: 50 };
export const REVIEW_MINUTES = 10;
export const MOCK_MINUTES = 45;
export const STORY_MINUTES = 15;

/** 面試那天還記得的機率低於這個，就在面試前補一次複習 */
export const INTERVIEW_RECALL = 0.9;
/** 平均熟練度低於這個的模式算弱，多排兩題 */
const WEAK_MASTERY = 0.4;
const WEAK_EXTRA = 2;

/** 為什麼排這題：這家公司考過、還沒碰過的模式、比較弱的模式、清單的下一題 */
export type SprintReason = 'company' | 'newPattern' | 'weakPattern' | 'list';

export interface SprintPick {
  problem: Problem;
  reason: SprintReason;
}

export interface SprintDay {
  day: Day;
  /** 距離面試幾天；1 是面試前一天 */
  daysBefore: number;
  phase: 'learn' | 'review';
  /** 這天能用的分鐘 */
  budget: number;
  newProblems: SprintPick[];
  /** 這天到期的複習題數（包含衝刺中新做的題目，估計的第一次複習） */
  reviews: number;
  /** 本來排在面試之後、到面試那天會忘記的題目，提前到這天複習 */
  pulled: Problem[];
  mock: boolean;
  story: boolean;
  /** 排進去的分鐘數 */
  minutes: number;
}

export interface SprintPlan {
  /** 今天到面試前一天；面試當天或已經過了是空的 */
  days: SprintDay[];
  /** 依優先順序排好的新題；每天的新題都從這裡依序取 */
  queue: SprintPick[];
  /** 排不進去的新題 */
  unscheduled: SprintPick[];
  /** 標了這家公司的題目：總數、做過幾題、計畫裡有幾題 */
  company: { total: number; started: number; planned: number } | null;
  /** 至少做過一題的模式：現在幾個、照計畫做完幾個、總共幾個 */
  patterns: { covered: number; planned: number; total: number };
}

export interface SprintInput {
  sprint: SprintSettings;
  today: Day;
  /** 目前的清單，依路線圖順序 */
  list: readonly Problem[];
  /** 整個題庫，依路線圖順序；公司題可能不在清單裡 */
  all: readonly Problem[];
  progress: ReadonlyMap<number, ReviewState>;
  companiesOf: (problemId: number) => readonly string[];
  /** 今天已經開始的新題，用掉今天的時間 */
  startedToday?: readonly Problem[];
  retention?: number;
}

const sameCompany = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const isWeekend = (day: Day) => {
  const weekday = parseDay(day).getDay();
  return weekday === 0 || weekday === 6;
};

/** 這天能用的分鐘 */
export function budgetOn(sprint: SprintSettings, day: Day): number {
  return isWeekend(day) ? sprint.weekendMinutes : sprint.weekdayMinutes;
}

/** 完整模擬：面試前 2 天一場，再往前每 7 天一場 */
export const mockOn = (daysBefore: number) => daysBefore % 7 === 2;
/** 行為面試練習：面試前一天，再往前每 3 天一次（一週兩次多） */
export const storyOn = (daysBefore: number) => daysBefore % 3 === 1;

/** 新題的優先順序：公司題 → 每個還沒碰過的模式一題 → 弱的模式多兩題 → 清單的其他題 */
export function rankNewProblems(input: Pick<SprintInput, 'sprint' | 'list' | 'all' | 'progress' | 'companiesOf'>): SprintPick[] {
  const { sprint, list, all, progress, companiesOf } = input;
  const picks: SprintPick[] = [];
  const taken = new Set<number>();
  const take = (problem: Problem, reason: SprintReason) => {
    if (taken.has(problem.id) || progress.has(problem.id)) return;
    taken.add(problem.id);
    picks.push({ problem, reason });
  };

  const company = sprint.company?.trim();
  if (company) for (const p of all) if (companiesOf(p.id).some((c) => sameCompany(c, company))) take(p, 'company');

  // 每個模式做過幾題、平均熟練度
  const byPattern = new Map<PatternId, number[]>();
  for (const p of all) {
    const state = progress.get(p.id);
    if (state) byPattern.set(p.pattern, [...(byPattern.get(p.pattern) ?? []), masteryOf(state)]);
  }
  const covered = new Set<PatternId>([...byPattern.keys(), ...picks.map((pick) => pick.problem.pattern)]);
  for (const pattern of PATTERN_ORDER) {
    if (covered.has(pattern)) continue;
    const first = list.find((p) => p.pattern === pattern && !progress.has(p.id));
    if (first) take(first, 'newPattern');
  }

  const weak = [...byPattern.entries()]
    .map(([pattern, scores]) => ({ pattern, mastery: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .filter((w) => w.mastery < WEAK_MASTERY)
    .sort((a, b) => a.mastery - b.mastery);
  for (const { pattern } of weak) {
    let added = 0;
    for (const p of list) {
      if (added >= WEAK_EXTRA) break;
      if (p.pattern !== pattern || taken.has(p.id) || progress.has(p.id)) continue;
      take(p, 'weakPattern');
      added += 1;
    }
  }

  for (const p of list) take(p, 'list');
  return picks;
}

/**
 * 從某一天開始，假設每次都在到期日複習而且記得，把面試前的每次複習記在 reviews 裡。
 * 回傳最後的狀態，用來判斷面試那天還記不記得。
 */
function forecastReviews(
  state: ReviewState,
  from: Day,
  interview: Day,
  reviews: Map<Day, number>,
  retention: number,
): ReviewState {
  let s = state;
  let due = s.due < from ? from : s.due;
  while (due < interview) {
    reviews.set(due, (reviews.get(due) ?? 0) + 1);
    s = schedule(s, 'solo', due, 0, retention);
    due = s.due;
  }
  return s;
}

/** 依面試日、每天的時間和目前的進度，排出到面試前每一天要做什麼 */
export function planSprint(input: SprintInput): SprintPlan {
  const { sprint, today, all, progress, companiesOf } = input;
  const retention = input.retention ?? DEFAULT_RETENTION;
  const interview = sprint.date;
  const total = Math.max(0, diffDays(today, interview));
  const queue = rankNewProblems(input);

  const reviews = new Map<Day, number>();
  /** 面試那天會忘記的題目，最後幾天補複習；先排最可能忘記的 */
  const fading: { problem: Problem; recall: number }[] = [];
  const checkFading = (problem: Problem, state: ReviewState) => {
    const recall = recallOn(state, interview);
    if (recall !== undefined && recall < INTERVIEW_RECALL) fading.push({ problem, recall });
  };
  const byId = new Map(all.map((p) => [p.id, p]));
  for (const [id, state] of progress) {
    const problem = byId.get(id);
    if (!problem) continue;
    checkFading(problem, forecastReviews(state, today, interview, reviews, retention));
  }

  const days: SprintDay[] = [];
  let next = 0;
  for (let i = 0; i < total; i += 1) {
    const day = addDays(today, i);
    const daysBefore = total - i;
    const phase = daysBefore <= sprint.reviewDays ? 'review' : 'learn';
    let budget = budgetOn(sprint, day);
    if (i === 0) for (const p of input.startedToday ?? []) budget -= NEW_MINUTES[p.difficulty];
    budget = Math.max(0, budget);
    const mock = mockOn(daysBefore);
    const story = storyOn(daysBefore);
    const fixed = (reviews.get(day) ?? 0) * REVIEW_MINUTES + (mock ? MOCK_MINUTES : 0) + (story ? STORY_MINUTES : 0);
    const newProblems: SprintPick[] = [];
    let used = fixed;
    if (phase === 'learn') {
      // 照順序拿，放不下就停，不跳過去拿比較簡單的題
      while (next < queue.length && used + NEW_MINUTES[queue[next].problem.difficulty] <= budget) {
        const pick = queue[next];
        newProblems.push(pick);
        used += NEW_MINUTES[pick.problem.difficulty];
        next += 1;
        checkFading(pick.problem, forecastReviews(schedule(undefined, 'solo', day, 0, retention), addDays(day, 1), interview, reviews, retention));
      }
    }
    days.push({ day, daysBefore, phase, budget, newProblems, reviews: reviews.get(day) ?? 0, pulled: [], mock, story, minutes: used });
  }

  // 會忘記的題目平均分到只複習的那幾天；沒有那幾天就放在面試前一天
  const reviewPhase = days.filter((d) => d.phase === 'review');
  const targets = reviewPhase.length > 0 ? reviewPhase : days.slice(-1);
  if (targets.length > 0) {
    fading.sort((a, b) => a.recall - b.recall || a.problem.id - b.problem.id);
    fading.forEach(({ problem }, i) => {
      const target = targets[i % targets.length];
      target.pulled.push(problem);
      target.minutes += REVIEW_MINUTES;
    });
  }

  const company = sprint.company?.trim();
  let companyStats: SprintPlan['company'] = null;
  if (company) {
    const tagged = all.filter((p) => companiesOf(p.id).some((c) => sameCompany(c, company)));
    companyStats = {
      total: tagged.length,
      started: tagged.filter((p) => progress.has(p.id)).length,
      planned: queue.slice(0, next).filter((pick) => pick.reason === 'company').length,
    };
  }

  const coveredNow = new Set<PatternId>();
  for (const p of all) if (progress.has(p.id)) coveredNow.add(p.pattern);
  const coveredPlanned = new Set(coveredNow);
  for (const pick of queue.slice(0, next)) coveredPlanned.add(pick.problem.pattern);

  return {
    days,
    queue,
    unscheduled: queue.slice(next),
    company: companyStats,
    patterns: { covered: coveredNow.size, planned: coveredPlanned.size, total: PATTERN_ORDER.length },
  };
}
