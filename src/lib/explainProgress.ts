import { EXPLAIN_POINTS, type ExplainPoint, type FollowUpKind } from '../../shared/constants';
import type { ExplanationFeedback } from '../../shared/protocol';
import type { Day } from './dates';
import type { ExplanationMark } from './srs';

// 講解能力的進步：每一次講解（講解練習，或有 AI 評分的完整模擬）算出五個重點各講到幾成。
// 有 AI 評分就用 AI 的分數（0、1、2 → 0、0.5、1）；沒有就用自己勾的重點（有勾 1、沒勾 0）。
// 都從模擬面試的紀錄算出來，不另外存。

/** 算進步曲線需要的那幾個欄位（MockRecord 的一部分） */
export interface MockLike {
  kind: 'full' | 'explain';
  day: Day;
  startedAt: string;
  /** 講解練習：自己勾的重點；完整模擬：做完的面試步驟 */
  steps: readonly string[];
  /** 講解練習的自評：1 講得很順、2 有卡住、3 講不出來 */
  clarity?: 1 | 2 | 3;
  feedback?: Pick<ExplanationFeedback, 'points'>;
  followUp?: { items: readonly { kind: FollowUpKind; score?: 0 | 1 | 2 }[] };
}

export interface ExplainSession {
  day: Day;
  /** 分數是 AI 評的，還是自己勾的 */
  source: 'ai' | 'self';
  /** 五個重點各講到幾成（0 到 1） */
  points: Record<ExplainPoint, number>;
  /** 五個重點的平均（0 到 1） */
  score: number;
  clarity?: 1 | 2 | 3;
  /** 追問的回答，有評分的才算（0 到 1） */
  followUps: { kind: FollowUpKind; score: number }[];
}

/** 每一次講解，照時間排；完整模擬只有拿到 AI 評分的才算（它勾的是面試步驟，不是講解的重點） */
export function explainSessions(mocks: readonly MockLike[]): ExplainSession[] {
  return mocks
    .filter((m) => m.kind === 'explain' || (m.feedback?.points.length ?? 0) > 0)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((m) => {
      const ai = (m.feedback?.points.length ?? 0) > 0;
      const points = Object.fromEntries(
        EXPLAIN_POINTS.map((id) => {
          if (!ai) return [id, m.steps.includes(id) ? 1 : 0];
          // AI 沒給分的重點當作沒講到
          const point = m.feedback!.points.find((p) => p.id === id);
          return [id, point ? point.score / 2 : 0];
        }),
      ) as Record<ExplainPoint, number>;
      return {
        day: m.day,
        source: ai ? 'ai' : 'self',
        points,
        score: average(EXPLAIN_POINTS.map((id) => points[id]))!,
        clarity: m.kind === 'explain' ? m.clarity : undefined,
        followUps: (m.followUp?.items ?? []).flatMap((item) => (item.score === undefined ? [] : [{ kind: item.kind, score: item.score / 2 }])),
      };
    });
}

/**
 * 講得清楚的門檻：有 AI 評分時五個重點平均八成以上；
 * 沒有 AI 時五個重點都勾了，而且自評「講得很順」
 */
export const CLEAR_SCORE = 0.8;

/** 一次講解講得清不清楚；不是講解（沒有 AI 評分的完整模擬）是 null */
export function explanationMark(mock: MockLike): ExplanationMark | null {
  const [session] = explainSessions([mock]);
  if (!session) return null;
  const clear = session.source === 'ai' ? session.score >= CLEAR_SCORE : session.score === 1 && mock.clarity === 1;
  return { day: mock.day, clear };
}

/** 每一題的講解紀錄，照時間排（排程判斷 Easy、「已熟練」用） */
export function explanationsByProblem(mocks: readonly (MockLike & { problemId: number })[]): Map<number, ExplanationMark[]> {
  const map = new Map<number, ExplanationMark[]>();
  for (const mock of [...mocks].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    const mark = explanationMark(mock);
    if (mark) map.set(mock.problemId, [...(map.get(mock.problemId) ?? []), mark]);
  }
  return map;
}

function average(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface ExplainProgress {
  sessions: ExplainSession[];
  /** 最近 window 次的平均，和再之前 window 次的平均（0 到 1）；沒有就是 null */
  recent: number | null;
  previous: number | null;
  /** 五個重點：最近和之前各講到幾成 */
  points: { id: ExplainPoint; recent: number | null; previous: number | null }[];
  /** 最近最常漏掉的重點；最近都講到了就是 null */
  weakest: ExplainPoint | null;
  /** 自評「講得很順」的次數：最近 window 次和之前 window 次裡各有幾次（只算有自評的） */
  smooth: { recent: number; recentOf: number; previous: number; previousOf: number };
  /** 追問的回答：最近 window 次講解裡的平均、全部答過幾題、最難答的種類（至少答過兩題才算） */
  followUps: { recent: number | null; count: number; weakestKind: FollowUpKind | null };
  /** 圖上的線：每一次和前兩次的平均 */
  rolling: number[];
}

export function explainProgress(sessions: readonly ExplainSession[], window = 5): ExplainProgress {
  const recent = sessions.slice(-window);
  const previous = sessions.slice(-2 * window, -window);
  const points = EXPLAIN_POINTS.map((id) => ({
    id,
    recent: average(recent.map((s) => s.points[id])),
    previous: average(previous.map((s) => s.points[id])),
  }));
  const missed = points.filter((p) => p.recent !== null && p.recent < 1);
  const weakest = missed.length === 0 ? null : missed.reduce((low, p) => (p.recent! < low.recent! ? p : low)).id;

  const rated = (list: readonly ExplainSession[]) => list.filter((s) => s.clarity !== undefined);
  const smooth = {
    recent: rated(recent).filter((s) => s.clarity === 1).length,
    recentOf: rated(recent).length,
    previous: rated(previous).filter((s) => s.clarity === 1).length,
    previousOf: rated(previous).length,
  };

  const answers = sessions.flatMap((s) => s.followUps);
  const byKind = new Map<FollowUpKind, number[]>();
  for (const a of answers) byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a.score]);
  const hardest = [...byKind]
    .filter(([, scores]) => scores.length >= 2)
    .map(([kind, scores]) => ({ kind, score: average(scores)! }))
    .filter((k) => k.score < 1)
    .sort((a, b) => a.score - b.score)[0];

  return {
    sessions: [...sessions],
    recent: average(recent.map((s) => s.score)),
    previous: average(previous.map((s) => s.score)),
    points,
    weakest,
    smooth,
    followUps: {
      recent: average(recent.flatMap((s) => s.followUps.map((f) => f.score))),
      count: answers.length,
      weakestKind: hardest?.kind ?? null,
    },
    rolling: sessions.map((_, i) => average(sessions.slice(Math.max(0, i - 2), i + 1).map((s) => s.score))!),
  };
}
