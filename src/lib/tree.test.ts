import { describe, expect, it } from 'vitest';
import type { Problem } from '../data/problems';
import { schedule, type Rating } from './srs';
import { grownBetween, pointOn, shadeOf, TREE_VIEW, treeLayout, treeState, type TreeNode } from './tree';

const problem = (id: number, pattern: Problem['pattern']): Problem => ({
  id,
  slug: `p-${id}`,
  title: `Problem ${id}`,
  difficulty: 'Medium',
  pattern,
  premium: false,
  custom: false,
});

function stateAfter(steps: [Rating, string][]) {
  let state: ReturnType<typeof schedule> | undefined;
  for (const [rating, day] of steps) state = schedule(state, rating, day);
  return { ...state!, lastRating: steps[steps.length - 1][0] };
}

const attempt = (problemId: number, day: string, rating: Rating) => ({ problemId, day, at: `${day}T10:00:00.000Z`, rating, mode: 'practice' });

describe('treeLayout', () => {
  const problems = [problem(1, 'arrays'), problem(2, 'arrays'), problem(3, 'two-pointers'), problem(4, 'bits')];

  it('grows one branch per pattern in roadmap order, from the bottom up, alternating sides', () => {
    const branches = treeLayout(problems);
    expect(branches.map((b) => b.pattern)).toEqual(['arrays', 'two-pointers', 'bits']);
    expect(branches.map((b) => b.side)).toEqual([-1, 1, -1]);
    expect(branches[0].start.y).toBeGreaterThan(branches[2].start.y);
    expect(branches[0].problems.map((p) => p.id)).toEqual([1, 2]);
  });

  it('keeps every branch inside the drawing and is the same every time', () => {
    const branches = treeLayout(problems);
    for (const b of branches) {
      for (const t of [0, 0.5, 1]) {
        const { x, y } = pointOn(b, t);
        expect(x).toBeGreaterThan(TREE_VIEW.x);
        expect(x).toBeLessThan(TREE_VIEW.x + TREE_VIEW.width);
        expect(y).toBeGreaterThan(TREE_VIEW.y);
      }
    }
    expect(treeLayout(problems)).toEqual(branches);
  });
});

describe('treeState', () => {
  const today = '2026-10-21';
  const problems = [problem(1, 'arrays'), problem(2, 'arrays'), problem(3, 'arrays'), problem(4, 'stack')];

  it('turns each problem into a bud, a sprout, or a leaf shaded by how likely you still remember it', () => {
    const progress = new Map([
      [1, stateAfter([['solo', '2026-10-20']])],
      [2, stateAfter([['hint', '2026-10-20']])],
      [3, stateAfter([['solo', '2025-10-01']])],
    ]);
    const state = treeState(problems, progress, [], today);
    expect(state.nodes.get(1)).toMatchObject({ kind: 'leaf', shade: 'fresh', fruit: false });
    expect(state.nodes.get(2)).toEqual({ kind: 'sprout' });
    expect(state.nodes.get(3)).toMatchObject({ kind: 'leaf', shade: 'faded' });
    expect(state.nodes.get(4)).toEqual({ kind: 'bud' });
    expect(state.ready).toBe(1);
    expect(state.fading).toEqual([3]);
    expect(state.levels.get('arrays')).toBe(1);
  });

  it('hangs a fruit on conquered problems', () => {
    const attempts = [attempt(1, '2026-10-18', 'hint'), attempt(1, '2026-10-20', 'solo')];
    const progress = new Map([[1, stateAfter([['hint', '2026-10-18'], ['solo', '2026-10-20']])]]);
    const state = treeState(problems, progress, attempts, today);
    expect(state.nodes.get(1)).toMatchObject({ kind: 'leaf', fruit: true });
    expect(state.fruits).toBe(1);
  });

  it('shades leaves from fresh to faded', () => {
    expect([0.95, 0.85, 0.72, 0.6, 0.5].map(shadeOf)).toEqual(['fresh', 'good', 'ok', 'fading', 'faded']);
  });
});

describe('grownBetween', () => {
  it('finds problems that just sprouted or grew a leaf', () => {
    const leaf: TreeNode = { kind: 'leaf', shade: 'fresh', recall: 1, fruit: false };
    const before = new Map<number, TreeNode>([
      [1, { kind: 'bud' }],
      [2, { kind: 'sprout' }],
      [3, leaf],
      [4, { kind: 'bud' }],
    ]);
    const after = new Map<number, TreeNode>([
      [1, { kind: 'sprout' }],
      [2, leaf],
      [3, { ...leaf, shade: 'fading' }],
      [4, { kind: 'bud' }],
    ]);
    expect([...grownBetween(before, after)]).toEqual([1, 2]);
  });
});
