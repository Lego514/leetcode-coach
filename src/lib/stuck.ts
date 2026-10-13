import { STUCK_REASONS, type StuckReason } from '../../shared/constants';
import type { PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import type { Day } from './dates';

// 卡住原因：做完一題時勾「卡在哪」，統計最常卡住的地方，以及最常在哪些模式卡住。

export type { StuckReason };

/** 進度頁統計最近幾天的紀錄 */
export const STUCK_WINDOW_DAYS = 90;
/** 衝刺計畫看最近幾天、同一個模式卡住幾次以上，就多排這個模式的題目 */
export const STUCK_SPRINT_DAYS = 30;
export const STUCK_SPRINT_MIN = 2;

interface AttemptLike {
  problemId: number;
  day: Day;
  stuck?: readonly StuckReason[];
}

export interface StuckSummary {
  reason: StuckReason;
  count: number;
  /** 這個原因最常出現在哪些模式，最多三個 */
  patterns: { pattern: PatternId; count: number }[];
}

/** 某天以後、勾過卡住原因的練習，依原因統計，次數多的排前面 */
export function summarizeStuck(
  attempts: readonly AttemptLike[],
  problemOf: (id: number) => Problem | undefined,
  since: Day,
): { attempts: number; reasons: StuckSummary[] } {
  const recent = attempts.filter((a) => a.day >= since && a.stuck && a.stuck.length > 0);
  const reasons = STUCK_REASONS.map((reason) => {
    const matching = recent.filter((a) => a.stuck!.includes(reason));
    const byPattern = new Map<PatternId, number>();
    for (const a of matching) {
      const pattern = problemOf(a.problemId)?.pattern;
      if (pattern) byPattern.set(pattern, (byPattern.get(pattern) ?? 0) + 1);
    }
    const patterns = [...byPattern.entries()]
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return { reason, count: matching.length, patterns };
  })
    .filter((s) => s.count > 0)
    // 次數一樣時照原因的固定順序
    .sort((a, b) => b.count - a.count || STUCK_REASONS.indexOf(a.reason) - STUCK_REASONS.indexOf(b.reason));
  return { attempts: recent.length, reasons };
}

/** 最近常卡住的模式：某天以後在這個模式卡住至少 min 次 */
export function stuckPatterns(
  attempts: readonly AttemptLike[],
  problemOf: (id: number) => Problem | undefined,
  since: Day,
  min = STUCK_SPRINT_MIN,
): Set<PatternId> {
  const counts = new Map<PatternId, number>();
  for (const a of attempts) {
    if (a.day < since || !a.stuck?.length) continue;
    const pattern = problemOf(a.problemId)?.pattern;
    if (pattern) counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count >= min).map(([pattern]) => pattern));
}
