import { STUCK_REASONS, type StoredStuckReason, type StuckReason } from '../../shared/constants';
import type { PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import type { Day } from './dates';

// 卡住原因：做完一題時勾「卡在哪」，統計最常卡住的地方，以及最常在哪些模式卡住。

export type { StoredStuckReason, StuckReason };

/** 統計和紀錄上顯示的種類：現在的五類，加上舊紀錄才有的「時間不夠」 */
export type StuckKind = StuckReason | 'time';
export const STUCK_KINDS: readonly StuckKind[] = [...STUCK_REASONS, 'time'];

/** 紀錄裡的代號換成現在的種類：漏了邊界、有 bug 算「邏輯／邊界」；照固定順序、不重複 */
export function stuckKinds(reasons: readonly StoredStuckReason[] | undefined): StuckKind[] {
  const kinds = new Set<StuckKind>((reasons ?? []).map((r) => (r === 'edge' || r === 'bug' ? 'logic' : r)));
  return STUCK_KINDS.filter((k) => kinds.has(k));
}

/** 進度頁統計最近幾天的紀錄 */
export const STUCK_WINDOW_DAYS = 90;
/** 衝刺計畫看最近幾天、同一個模式卡住幾次以上，就多排這個模式的題目 */
export const STUCK_SPRINT_DAYS = 30;
export const STUCK_SPRINT_MIN = 2;

interface AttemptLike {
  problemId: number;
  day: Day;
  stuck?: readonly StoredStuckReason[];
}

export interface StuckSummary {
  reason: StuckKind;
  count: number;
  /** 這個原因最常出現在哪些模式，最多三個 */
  patterns: { pattern: PatternId; count: number }[];
}

/**
 * 點一個選項：勾或取消，照選項的順序排；選項裡沒有的舊代號（例如舊紀錄的「時間不夠」）原樣留著，
 * 改舊紀錄時才不會被清掉
 */
export function toggleStuck(value: readonly StoredStuckReason[], reason: StuckReason): StoredStuckReason[] {
  return [
    ...STUCK_REASONS.filter((r) => (r === reason ? !value.includes(r) : value.includes(r))),
    ...value.filter((r) => !(STUCK_REASONS as readonly string[]).includes(r)),
  ];
}

/** 某天以後、勾過卡住原因的練習，依原因統計，次數多的排前面 */
export function summarizeStuck(
  attempts: readonly AttemptLike[],
  problemOf: (id: number) => Problem | undefined,
  since: Day,
): { attempts: number; reasons: StuckSummary[] } {
  const recent = attempts.filter((a) => a.day >= since && a.stuck && a.stuck.length > 0);
  const reasons = STUCK_KINDS.map((reason) => {
    const matching = recent.filter((a) => stuckKinds(a.stuck).includes(reason));
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
    .sort((a, b) => b.count - a.count || STUCK_KINDS.indexOf(a.reason) - STUCK_KINDS.indexOf(b.reason));
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
