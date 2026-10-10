import { DEFAULT_RETENTION, replay } from '../lib/srs';
import type { AttemptRecord, ProgressRecord, SettingsRecord } from './db';

// 一題的複習排程是把它的練習紀錄依時間重播算出來的，不另外同步；
// 換演算法、改目標記憶率或收到別台裝置的紀錄時，重播一次就好。

export function retentionOf(settings: Pick<SettingsRecord, 'retention'> | undefined): number {
  return settings?.retention ?? DEFAULT_RETENTION;
}

/** 依時間順序重播一題的練習紀錄；沒有紀錄是 null */
export function progressFromAttempts(problemId: number, attempts: readonly AttemptRecord[], retention: number): ProgressRecord | null {
  if (attempts.length === 0) return null;
  const sorted = [...attempts].sort((a, b) => a.at.localeCompare(b.at) || (a.id ?? 0) - (b.id ?? 0));
  const state = replay(sorted, retention)!;
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
