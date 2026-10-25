import { describe, expect, it } from 'vitest';
import { explainProgress, explainSessions, type MockLike } from './explainProgress';

let n = 0;
/** 一次講解練習：自己勾了哪些重點 */
const drill = (steps: string[], clarity?: 1 | 2 | 3): MockLike => {
  n += 1;
  const day = `2026-10-${String(n).padStart(2, '0')}`;
  return { kind: 'explain', day, startedAt: `${day}T10:00:00.000Z`, steps, clarity };
};

describe('explainSessions', () => {
  it('scores each drill from the points I ticked, or from the AI when it scored the explanation', () => {
    const self = drill(['insight', 'structure'], 2);
    const ai: MockLike = {
      ...drill(['insight', 'structure', 'walkthrough', 'complexity', 'edge'], 1),
      feedback: {
        points: [
          { id: 'insight', score: 2, comment: '' },
          { id: 'structure', score: 2, comment: '' },
          { id: 'walkthrough', score: 0, comment: '' },
          { id: 'complexity', score: 1, comment: '' },
          { id: 'edge', score: 0, comment: '' },
        ],
      },
      followUp: { items: [{ kind: 'edge', score: 1 }, { kind: 'complexity' }] },
    };
    const [first, second] = explainSessions([ai, self]);
    // 照時間排：先自己勾的那次
    expect(first).toMatchObject({ source: 'self', score: 0.4, clarity: 2, followUps: [] });
    expect(first.points).toEqual({ insight: 1, structure: 1, walkthrough: 0, complexity: 0, edge: 0 });
    // 有 AI 評分就用 AI 的分數，不管自己勾了什麼；沒評分的追問不算
    expect(second).toMatchObject({ source: 'ai', score: 0.5, followUps: [{ kind: 'edge', score: 0.5 }] });
    expect(second.points.complexity).toBe(0.5);
  });

  it('counts a full mock only when the AI scored its explanation', () => {
    const full = (feedback?: MockLike['feedback']): MockLike => ({ ...drill(['clarify', 'code']), kind: 'full', feedback });
    expect(explainSessions([full()])).toEqual([]);
    const [scored] = explainSessions([full({ points: [{ id: 'insight', score: 2, comment: '' }] })]);
    expect(scored).toMatchObject({ source: 'ai', score: 0.2, clarity: undefined });
  });
});

describe('explainProgress', () => {
  it('compares the last few drills with the ones before, and finds the point I miss most', () => {
    const early = [drill(['insight'], 3), drill(['insight', 'structure'], 2)];
    const late = [drill(['insight', 'structure', 'complexity'], 2), drill(['insight', 'structure', 'walkthrough', 'complexity'], 1)];
    const result = explainProgress(explainSessions([...early, ...late]), 2);
    expect(result.previous).toBeCloseTo(0.3);
    expect(result.recent).toBeCloseTo(0.7);
    // 最近兩次都沒講邊界情況
    expect(result.weakest).toBe('edge');
    expect(result.points.find((p) => p.id === 'walkthrough')).toEqual({ id: 'walkthrough', recent: 0.5, previous: 0 });
    expect(result.smooth).toEqual({ recent: 1, recentOf: 2, previous: 0, previousOf: 2 });
    // 圖上的線是每一次和前兩次的平均
    expect(result.rolling.map((v) => Math.round(v * 100))).toEqual([20, 30, 40, 60]);
  });

  it('has nothing to compare before there are enough drills, and no weak point once every point is covered', () => {
    const result = explainProgress(explainSessions([drill(['insight', 'structure', 'walkthrough', 'complexity', 'edge'], 1)]));
    expect(result.recent).toBe(1);
    expect(result.previous).toBeNull();
    expect(result.weakest).toBeNull();
    expect(explainProgress([]).recent).toBeNull();
  });

  it('finds the kind of follow-up question that is hardest to answer', () => {
    const withFollowUps = (items: { kind: 'edge' | 'complexity' | 'optimize'; score: 0 | 1 | 2 }[]): MockLike => ({ ...drill(['insight']), followUp: { items } });
    const result = explainProgress(
      explainSessions([
        withFollowUps([
          { kind: 'edge', score: 2 },
          { kind: 'optimize', score: 0 },
        ]),
        withFollowUps([
          { kind: 'edge', score: 2 },
          { kind: 'optimize', score: 1 },
          { kind: 'complexity', score: 0 },
        ]),
      ]),
    );
    expect(result.followUps.count).toBe(5);
    expect(result.followUps.recent).toBeCloseTo(0.5);
    // 複雜度只答過一題，不夠判斷；能不能更好平均最低
    expect(result.followUps.weakestKind).toBe('optimize');
  });
});
