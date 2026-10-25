import { describe, expect, it } from 'vitest';
import { getPattern, PATTERN_ORDER, type PatternId } from '../data/patterns';
import type { Problem } from '../data/problems';
import { schedule, type Rating } from './srs';
import {
  branchOutline,
  canopyBlobs,
  GROUND,
  grownBetween,
  nextStage,
  nodeFor,
  pointOn,
  shadeOf,
  sproutHeight,
  labelWidth,
  stageView,
  taperedPath,
  TREE_VIEW,
  treeLayout,
  treeStage,
  treeState,
  visibleProblems,
  type TreeNode,
} from './tree';

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

describe('nodeFor', () => {
  it('draws one problem the same way the tree and the problem page do', () => {
    expect(nodeFor(undefined, false, '2026-10-21')).toEqual({ kind: 'bud' });
    expect(nodeFor(stateAfter([['hint', '2026-10-20']]), false, '2026-10-21')).toEqual({ kind: 'sprout' });
    const leaf = nodeFor(stateAfter([['solo', '2026-10-20']]), true, '2026-10-21');
    expect(leaf).toMatchObject({ kind: 'leaf', shade: 'fresh', fruit: true });
    // 一年沒碰的題目，葉子枯了
    expect(nodeFor(stateAfter([['solo', '2025-10-20']]), false, '2026-10-21')).toMatchObject({ kind: 'leaf', shade: 'faded' });
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

describe('growth stages', () => {
  it('starts as a seed and grows with every problem you do', () => {
    expect([0, 1, 4, 5, 19, 20, 59, 60, 150].map(treeStage)).toEqual([
      'seed',
      'sprout',
      'sprout',
      'sapling',
      'sapling',
      'young',
      'young',
      'grown',
      'grown',
    ]);
    expect(nextStage(0)).toEqual({ stage: 'sprout', needed: 1 });
    expect(nextStage(3)).toEqual({ stage: 'sapling', needed: 2 });
    expect(nextStage(59)).toEqual({ stage: 'grown', needed: 1 });
    expect(nextStage(60)).toBeNull();
  });

  it('shows only the patterns you started, plus the next one or two, until the tree is grown', () => {
    const problems = [problem(1, 'arrays'), problem(2, 'two-pointers'), problem(3, 'stack'), problem(4, 'binary-search'), problem(5, 'bits')];
    const levels = new Map([['arrays', 1]] as const);
    const patterns = (stage: Parameters<typeof visibleProblems>[2]) => [...new Set(visibleProblems(problems, levels, stage).map((p) => p.pattern))];
    expect(patterns('seed')).toEqual([]);
    expect(patterns('sprout')).toEqual([]);
    expect(patterns('sapling')).toEqual(['arrays', 'two-pointers']);
    expect(patterns('young')).toEqual(['arrays', 'two-pointers', 'stack']);
    expect(patterns('grown')).toHaveLength(5);
  });

  it('frames the tree closely at every stage and keeps every branch in view', () => {
    const ratio = TREE_VIEW.height / TREE_VIEW.width;
    expect(stageView('seed', []).width).toBeLessThan(stageView('sprout', []).width);
    // 發芽的莖每長一片葉子就高一截，畫面也跟著框高一點，上面不留一大片空白
    expect(sproutHeight(3)).toBeGreaterThan(sproutHeight(1));
    expect(stageView('sprout', [], undefined, 3).height).toBeGreaterThan(stageView('sprout', [], undefined, 1).height);
    // 莖頂端的新芽（高 11）也要在畫面裡
    expect(stageView('sprout', [], undefined, 4).y).toBeLessThan(GROUND - sproutHeight(4) - 11);
    const few = treeLayout([problem(1, 'arrays'), problem(2, 'two-pointers')]);
    const all = treeLayout(PATTERN_ORDER.map((pattern, i) => problem(i + 1, pattern)));
    // 樹枝少，樹幹就短：最上面那根樹枝比完整的樹低很多
    expect(Math.min(...few.map((b) => b.start.y))).toBeGreaterThan(Math.min(...all.map((b) => b.start.y)) + 200);
    // 小樹苗框得比較扁，上面不留一大片空白；沒有題型名稱（今天卡）時左右不用留名稱的位置
    const english = (pattern: PatternId) => getPattern(pattern, 'en').name;
    const chinese = (pattern: PatternId) => getPattern(pattern, 'zh-TW').name;
    expect(stageView('sapling', few, english).height / stageView('sapling', few, english).width).toBeLessThan(ratio);
    expect(stageView('sapling', few).width).toBeLessThan(stageView('sapling', few, english).width);
    const half = treeLayout(PATTERN_ORDER.slice(0, 9).map((pattern, i) => problem(i + 1, pattern)));
    for (const labelOf of [english, chinese, undefined]) {
      for (const [stage, branches] of [['sapling', few], ['young', half], ['grown', all]] as const) {
        const view = stageView(stage, branches, labelOf);
        expect(view.height / view.width).toBeGreaterThanOrEqual(0.6 - 1e-9);
        expect(view.height / view.width).toBeLessThanOrEqual(ratio + 1e-9);
        for (const b of branches) {
          expect(b.end.y).toBeGreaterThan(view.y);
          expect(b.end.x).toBeGreaterThan(view.x);
          expect(b.end.x).toBeLessThan(view.x + view.width);
          // 題型名稱（從樹枝末端往外，開花的離 10）整個在畫面裡
          if (labelOf) {
            const far = b.end.x + b.side * (10 + labelWidth(labelOf(b.pattern)));
            expect(far).toBeGreaterThan(view.x);
            expect(far).toBeLessThan(view.x + view.width);
          }
        }
      }
    }
  });

  it('estimates how wide a pattern name is, wider for long English names', () => {
    // 以前左右固定留 80，「Arrays & Hashing」放不下
    expect(labelWidth(getPattern('arrays', 'en').name) + 4).toBeGreaterThan(80);
    expect(labelWidth(getPattern('dp-1d', 'en').name)).toBeGreaterThan(labelWidth(getPattern('stack', 'en').name));
    // 中文一個字比英文字母寬
    expect(labelWidth(getPattern('stack', 'zh-TW').name) / [...getPattern('stack', 'zh-TW').name].length).toBeGreaterThan(labelWidth('Stack') / 5);
  });

  it('counts every problem you have done toward the stage', () => {
    const problems = [problem(1, 'arrays'), problem(2, 'arrays'), problem(3, 'stack')];
    const progress = new Map([
      [1, stateAfter([['hint', '2026-10-20']])],
      [2, stateAfter([['solo', '2026-10-20']])],
    ]);
    expect(treeState(problems, progress, [], '2026-10-21').started).toBe(2);
  });
});

describe('drawing the tree', () => {
  it('draws a shape that tapers from one width to another along a line', () => {
    expect(
      taperedPath(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        4,
        2,
      ),
    ).toBe('M0 2 L10 1 L10 -1 L0 -2Z');
  });

  it('makes branches thick where they meet the trunk and thin at the tip', () => {
    const [branch] = treeLayout([problem(1, 'arrays')]);
    const corners = branchOutline(branch, 6)
      .replace(/[MLZ]/g, ' ')
      .trim()
      .split(/\s+/)
      .map(Number);
    const points = Array.from({ length: corners.length / 2 }, (_, i) => ({ x: corners[2 * i], y: corners[2 * i + 1] }));
    // 13 個點沿著一邊出去，再沿著另一邊回來：第一個和最後一個點是樹枝根部的兩邊
    expect(points).toHaveLength(26);
    const width = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
    expect(width(points[0], points[25])).toBeCloseTo(6, 0);
    expect(width(points[12], points[13])).toBeCloseTo(1.8, 0);
  });

  it('puts a canopy only around branches with problems you have done, bigger with more of them', () => {
    const problems = [problem(1, 'arrays'), problem(2, 'arrays'), problem(3, 'arrays'), problem(4, 'two-pointers'), problem(5, 'stack')];
    const branches = treeLayout(problems);
    const leaf: TreeNode = { kind: 'leaf', shade: 'fresh', recall: 1, fruit: false };
    const nodes = new Map<number, TreeNode>([
      [1, leaf],
      [2, leaf],
      [3, { kind: 'sprout' }],
      [4, leaf],
      [5, { kind: 'bud' }],
    ]);
    const blobs = canopyBlobs(branches, nodes);
    // 陣列與雜湊、雙指標各一團（四個圓），堆疊還沒做過，沒有
    expect(blobs).toHaveLength(8);
    const [arrays, pointers] = [blobs.slice(0, 4), blobs.slice(4)];
    expect(Math.max(...arrays.map((c) => c.r))).toBeGreaterThan(Math.max(...pointers.map((c) => c.r)));
    expect(canopyBlobs(branches, new Map())).toEqual([]);
  });
});
