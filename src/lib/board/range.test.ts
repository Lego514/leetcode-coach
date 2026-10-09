import { describe, expect, it } from 'vitest';
import { boardDocSchema } from '../../../shared/protocol';
import { boardToSvg, estimateWidth } from './exportSvg';
import {
  addElement,
  addPointerAt,
  CELL,
  createElement,
  duplicateElements,
  EMPTY_DOC,
  findElement,
  hitConnector,
  hitInk,
  LABEL_H,
  moveElements,
  rangePair,
  rangeRect,
  removeElements,
  shiftPointer,
  type BoardDoc,
  type ElementOf,
} from './model';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

/** 陣列 s 上有 l（第 0 格）和 r（第 2 格），範圍框框住它們之間 */
function framed(): BoardDoc {
  let doc = addElement(EMPTY_DOC, { ...createElement('array', { x: 0, y: 0 }, 's', texts), items: ['a', 'b', 'c', 'a', 'b'] } as ElementOf<'list'>);
  doc = addPointerAt(addPointerAt(doc, 's', 0, 'l'), 's', 2, 'r');
  return addElement(doc, { type: 'range', id: 'w', from: 'l', to: 'r', color: 'orange' });
}

const range = (doc: BoardDoc) => findElement(doc, 'w') as ElementOf<'range'>;

describe('range frames', () => {
  it('frames the cells between two pointers and follows them', () => {
    let doc = framed();
    expect(rangeRect(doc, range(doc))).toEqual({ x: -5, y: LABEL_H - 5, w: 3 * CELL + 10, h: CELL + 10 });
    doc = shiftPointer(doc, 'r', 1);
    expect(rangeRect(doc, range(doc))?.w).toBe(4 * CELL + 10);
    // l 跑到 r 右邊也照樣框住中間
    doc = shiftPointer(shiftPointer(shiftPointer(shiftPointer(doc, 'l', 1), 'l', 1), 'l', 1), 'l', 1);
    expect(rangeRect(doc, range(doc))).toEqual({ x: 3 * CELL - 5, y: LABEL_H - 5, w: 2 * CELL + 10, h: CELL + 10 });
    // 整個陣列拖走時框跟著走
    doc = moveElements(doc, new Set(['s']), 100, 50);
    expect(rangeRect(doc, range(doc))?.x).toBe(100 + 3 * CELL - 5);
  });

  it('disappears when a pointer leaves the array, and is deleted with its pointer', () => {
    let doc = framed();
    const detached = moveElements(doc, new Set(['r']), 0, 200);
    expect(rangeRect(detached, range(detached))).toBeNull();
    doc = removeElements(doc, new Set(['l']));
    expect(findElement(doc, 'w')).toBeUndefined();
  });

  it('only offers a frame for two pointers on the same array that are not framed yet', () => {
    const doc = framed();
    expect(rangePair(doc, new Set(['l', 'r']))).toBeNull();
    const fresh = removeElements(doc, new Set(['w']));
    expect(rangePair(fresh, new Set(['l', 'r']))).toEqual(['l', 'r']);
    expect(rangePair(fresh, new Set(['l', 's']))).toBeNull();
  });

  it('can be clicked, erased, copied with its pointers, saved, and exported', () => {
    const doc = framed();
    const r = rangeRect(doc, range(doc))!;
    expect(hitConnector(doc, { x: r.x + 10, y: r.y }, 6)).toBe('w');
    expect(hitConnector(doc, { x: r.x + r.w / 2, y: r.y + r.h / 2 }, 6)).toBeUndefined();
    expect(hitInk(doc, { x: r.x, y: r.y + 20 }, 6)).toContain('w');

    const { doc: copied, ids } = duplicateElements(doc, new Set(['s', 'l', 'r', 'w']));
    const copy = ids.map((id) => findElement(copied, id)).find((el) => el?.type === 'range') as ElementOf<'range'>;
    expect(copy.from).not.toBe('l');
    expect(rangeRect(copied, copy)).not.toBeNull();
    // 只複製框框本身不會多出東西
    expect(duplicateElements(doc, new Set(['w'])).ids).toEqual([]);

    expect(boardDocSchema.safeParse(doc).success).toBe(true);
    const svg = boardToSvg(doc, undefined, { measure: estimateWidth, front: 'front', back: 'back' })!.svg;
    expect(svg).toContain(`width="${3 * CELL + 10}"`);
  });
});
