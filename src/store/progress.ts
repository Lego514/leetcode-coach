import { MOCK_MINUTES } from '../data/interview';
import type { Problem } from '../data/problems';
import { DEFAULT_RETENTION, explainSchedule, paceOf, replay, type ScheduleExplanation } from '../lib/srs';
import type { AttemptRecord, ProgressRecord, SettingsRecord } from './db';

// 一題的複習排程是把它的練習紀錄依時間重播算出來的，不另外同步；
// 換演算法、改目標記憶率或收到別台裝置的紀錄時，重播一次就好。

export function retentionOf(settings: Pick<SettingsRecord, 'retention'> | undefined): number {
  return settings?.retention ?? DEFAULT_RETENTION;
}

/** 每一題的目標時間（看難度，跟練習頁的計時目標一樣）：寫題時間的權重用它來比 */
export function targetMinutesOf(problems: Iterable<Pick<Problem, 'id' | 'difficulty'>>): Map<number, number> {
  const map = new Map<number, number>();
  for (const p of problems) map.set(p.id, MOCK_MINUTES[p.difficulty]);
  return map;
}

/** 依時間順序重播一題的練習紀錄；沒有紀錄是 null。targetMinutes 是這題的目標時間（不知道就不看時間） */
export function progressFromAttempts(
  problemId: number,
  attempts: readonly AttemptRecord[],
  retention: number,
  targetMinutes?: number,
): ProgressRecord | null {
  if (attempts.length === 0) return null;
  const sorted = [...attempts].sort((a, b) => a.at.localeCompare(b.at) || (a.id ?? 0) - (b.id ?? 0));
  const state = replay(sorted, retention, targetMinutes)!;
  const last = sorted[sorted.length - 1];
  return {
    problemId,
    ...state,
    lastRating: last.rating,
    lastDay: last.day,
    firstDay: sorted[0].day,
    attempts: sorted.length,
  };
}

/** 為什麼現在排這天：重播到最後一次之前，再照 schedule 的步驟算最後一次；沒有紀錄是 null */
export function explainLatest(
  attempts: readonly AttemptRecord[],
  retention: number,
  targetMinutes?: number,
): ScheduleExplanation | null {
  if (attempts.length === 0) return null;
  const sorted = [...attempts].sort((a, b) => a.at.localeCompare(b.at) || (a.id ?? 0) - (b.id ?? 0));
  const last = sorted[sorted.length - 1];
  const prev = replay(sorted.slice(0, -1), retention, targetMinutes);
  return explainSchedule(prev, last.rating, last.day, last.delayDays, retention, {
    pace: paceOf(last.minutes, targetMinutes),
    hintLayers: last.hints,
    stuck: last.stuck,
  });
}

/** 全部的練習紀錄依題目分組 */
export function groupByProblem(attempts: readonly AttemptRecord[]): Map<number, AttemptRecord[]> {
  const groups = new Map<number, AttemptRecord[]>();
  for (const attempt of attempts) {
    const list = groups.get(attempt.problemId) ?? [];
    list.push(attempt);
    groups.set(attempt.problemId, list);
  }
  return groups;
}
