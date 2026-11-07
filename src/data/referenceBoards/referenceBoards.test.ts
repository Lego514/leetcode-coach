import { boardToSvg, MAX_STEPS, type BoardDoc } from 'dsa-whiteboard';
import { boardDocSchema } from 'dsa-whiteboard/schema';
import { describe, expect, it } from 'vitest';
import { EXPLANATIONS_EN } from '../explanations';
import { REFERENCE_BOARDS } from './boards';
import { loadReferenceBoard, REFERENCE_BOARD_IDS } from './index';

const boards = Object.entries(REFERENCE_BOARDS).map(([id, make]) => [Number(id), make()] as const);

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
  it('lists the same problems in the quick lookup and the boards', () => {
    expect([...REFERENCE_BOARD_IDS].sort((a, b) => a - b)).toEqual(boards.map(([id]) => id).sort((a, b) => a - b));
  });

  it('are valid boards that the whiteboard can draw and play', () => {
    for (const [id, doc] of boards) {
      const parsed = boardDocSchema.safeParse(doc);
      expect(parsed.success, `${id}: ${JSON.stringify(parsed.error?.issues.slice(0, 2))}`).toBe(true);
      expect(doc.steps!.length, `${id}`).toBeLessThanOrEqual(MAX_STEPS);
      for (const step of doc.steps!) {
        expect(pointersInRange(step.elements), `${id} ${step.id}`).toEqual([]);
        expect(boardToSvg({ elements: step.elements }, undefined, { measure: (s) => s.length * 8, front: 'f', back: 'b' })).not.toBeNull();
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
      expect([...at].sort((a, b) => a - b), `${id}`).toEqual(at);
      // 最後兩步是複雜度和邊界情況，複雜度那一步起白板上有複雜度區塊
      expect(at.slice(-2), `${id}`).toEqual([captions.length - 2, captions.length - 1]);
      expect(doc.steps![captions.length - 2].elements.some((el) => el.type === 'complexity'), `${id}`).toBe(true);
      // 白板上留著的是最後一步的畫面
      expect(doc.elements).toEqual(doc.steps![captions.length - 1].elements);
    }
  });

  it('loads a board only for problems that have one', async () => {
    expect(await loadReferenceBoard(1)).toEqual(REFERENCE_BOARDS[1]());
    expect(await loadReferenceBoard(2)).toBeUndefined();
  });
});
