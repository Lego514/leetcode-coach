import { boardToSvg, MAX_STEPS, type BoardDoc } from 'dsa-whiteboard';
import { boardDocSchema } from 'dsa-whiteboard/schema';
import { describe, expect, it } from 'vitest';
import { EXPLANATIONS_EN } from '../explanations';
import { BUILTIN_PROBLEMS } from '../problems';
import { leetTree } from './build';
import { loadReferenceBoard, REFERENCE_BOARD_IDS, REFERENCE_BOARD_LOADERS } from './index';

const modules = await Promise.all(Object.entries(REFERENCE_BOARD_LOADERS).map(async ([pattern, load]) => [pattern, (await load()).BOARDS] as const));
const boards = modules.flatMap(([, made]) => Object.entries(made).map(([id, make]) => [Number(id), make()] as const));

/** 指標指的格子或節點要在那個元件裡 */
function pointersInRange(elements: BoardDoc['elements']): string[] {
  return elements.flatMap((el) => {
    if (el.type !== 'pointer' || !el.attach) return [];
    const target = elements.find((other) => other.id === el.attach!.id);
    if (!target) return [`${el.name}: no ${el.attach.id}`];
    const size = target.type === 'list' ? target.items.length : target.type === 'tree' || target.type === 'graph' ? target.nodes.length : Infinity;
    if (el.attach.index >= size) return [`${el.name} at ${el.attach.index} of ${size}`];
    // 樹上 null 的位置沒有節點
    return target.type === 'tree' && target.nodes[el.attach.index] === null ? [`${el.name} on an empty tree slot ${el.attach.index}`] : [];
  });
}

describe('reference boards', () => {
  it('has one board for every problem, in the file of its pattern', () => {
    for (const [pattern, made] of modules) {
      const ids = BUILTIN_PROBLEMS.filter((problem) => problem.pattern === pattern).map((problem) => problem.id);
      expect(
        Object.keys(made)
          .map(Number)
          .sort((a, b) => a - b),
        pattern,
      ).toEqual(ids.sort((a, b) => a - b));
    }
    expect(REFERENCE_BOARD_IDS.size).toBe(BUILTIN_PROBLEMS.length);
  });

  it('are valid boards that the whiteboard can draw and play', () => {
    for (const [id, doc] of boards) {
      const parsed = boardDocSchema.safeParse(doc);
      expect(parsed.success, `${id}: ${JSON.stringify(parsed.error?.issues.slice(0, 2))}`).toBe(true);
      expect(doc.steps!.length, `${id}`).toBeLessThanOrEqual(MAX_STEPS);
      for (const step of doc.steps!) {
        expect(pointersInRange(step.elements), `${id} ${step.id}`).toEqual([]);
        expect(
          boardToSvg({ elements: step.elements }, undefined, {
            measure: (s) => s.length * 8,
            front: 'f',
            back: 'b',
          }),
        ).not.toBeNull();
      }
    }
  });

  it('walk through the reference explanation in order, one sentence per step, ending with complexity and an edge case', () => {
    for (const [id, doc] of boards) {
      const captions = doc.steps!.map((s) => s.caption);
      const sentences = EXPLANATIONS_EN[id].split('\n');
      // 五句都是某一步的字幕，而且照順序
      const at = sentences.map((line) => captions.indexOf(line));
      expect(at, `${id}`).not.toContain(-1);
      expect(
        [...at].sort((a, b) => a - b),
        `${id}`,
      ).toEqual(at);
      // 最後兩步是複雜度和邊界情況，複雜度那一步起白板上有複雜度區塊
      expect(at.slice(-2), `${id}`).toEqual([captions.length - 2, captions.length - 1]);
      expect(
        doc.steps![captions.length - 2].elements.some((el) => el.type === 'complexity'),
        `${id}`,
      ).toBe(true);
      // 白板上留著的是最後一步的畫面
      expect(doc.elements).toEqual(doc.steps![captions.length - 1].elements);
    }
  });

  it('loads a board only for problems that have one', async () => {
    expect(await loadReferenceBoard(1)).toEqual(boards.find(([id]) => id === 1)![1]);
    // 自己新增的題目（題庫裡沒有的編號）沒有參考板書
    expect(await loadReferenceBoard(99999)).toBeUndefined();
  });
});

describe('leetTree', () => {
  it('moves children of a node after a null to their whiteboard slots', () => {
    // 5、1 是右邊那個 4（第 6 格）的子節點：白板上在 13、14 格
    expect(leetTree(['5', '4', '8', '11', null, '13', '4', '7', '2', null, null, '5', '1'])).toEqual(['5', '4', '8', '11', null, '13', '4', '7', '2', null, null, null, null, '5', '1']);
    expect(leetTree(['1', null, '2', '3'])).toEqual(['1', null, '2', null, null, '3']);
    expect(leetTree(['1', '2', '3'])).toEqual(['1', '2', '3']);
  });
});
