import { describe, expect, it } from 'vitest';
import { boardDataSchema, boardDocSchema } from '../../../shared/protocol';
import {
  addElement,
  addPointerAt,
  appendPoint,
  arrowPoints,
  CELL,
  checkpoint,
  commit,
  contentBounds,
  createElement,
  distanceToShapeEdge,
  deleteCell,
  dropEmptyCheckpoint,
  dropPointer,
  duplicateElements,
  EMPTY_DOC,
  hitInk,
  INDEX_H,
  initHistory,
  insertCell,
  LABEL_H,
  moveElements,
  nextPointerName,
  PALETTE,
  placeAtCenter,
  recolorElements,
  elementsInRect,
  rectFromCorners,
  captureStep,
  deleteStep,
  setStepCaption,
  restoreStep,
  stepDoc,
  clearElements,
  MAX_STEPS,
  hitConnector,
  setArrowHead,
  pointerPosition,
  pointerTone,
  POINTER_TONES,
  POINTER_H,
  POINTER_W,
  redo,
  removeElements,
  replace,
  resizeList,
  resizeShape,
  resizeTable,
  setCellColor,
  shapeFromDrag,
  shiftPointer,
  sizeOf,
  undo,
  type BoardDoc,
  type ElementOf,
} from './model';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

function boardWithArray(): BoardDoc {
  const array = createElement('array', { x: 100, y: 100 }, 'arr', texts);
  const i = createElement('pointer', { x: 0, y: 0 }, 'pi', texts);
  const j = { ...createElement('pointer', { x: 0, y: 0 }, 'pj', texts), name: 'j' } as ElementOf<'pointer'>;
  return { elements: [array, i, j] };
}

const pointer = (doc: BoardDoc, id: string) => doc.elements.find((el) => el.id === id) as ElementOf<'pointer'>;

describe('creating elements', () => {
  it('makes every palette item with content the server accepts', () => {
    let doc = EMPTY_DOC;
    for (const { kinds } of PALETTE) {
      for (const kind of kinds) doc = addElement(doc, createElement(kind, { x: 10.6, y: -3.2 }, `k${doc.elements.length}`, texts));
    }
    expect(doc.elements).toHaveLength(17);
    expect(boardDocSchema.parse(doc)).toEqual(doc);
    expect(doc.elements[0]).toMatchObject({ x: 11, y: -3 });
  });

  it('sizes structured elements from their content', () => {
    const array = createElement('array', { x: 0, y: 0 }, 'a', texts) as ElementOf<'list'>;
    expect(sizeOf(array)).toEqual({ w: 4 * CELL, h: LABEL_H + CELL + INDEX_H });
    const stack = createElement('stack', { x: 0, y: 0 }, 's', texts);
    expect(sizeOf(stack)).toEqual({ w: CELL, h: LABEL_H + 2 * CELL });
    const set = createElement('set', { x: 0, y: 0 }, 'z', texts);
    expect(sizeOf(set).h).toBe(LABEL_H + CELL);
  });

  it('centers new elements and finds a free spot instead of covering others', () => {
    const first = placeAtCenter(EMPTY_DOC, createElement('treeNode', { x: 0, y: 0 }, 'a', texts), { x: 100, y: 100 });
    expect(first).toMatchObject({ x: 76, y: 76 });
    let doc: BoardDoc = { elements: [first] };
    for (const id of ['b', 'c', 'd']) {
      const next = placeAtCenter(doc, createElement('array', { x: 0, y: 0 }, id, texts), { x: 100, y: 100 });
      doc = addElement(doc, next);
    }
    const rects = doc.elements.map((el) => ({ ...(el as ElementOf<'list'>), ...sizeOf(el as ElementOf<'list'>) }));
    for (const [i, a] of rects.entries()) {
      for (const b of rects.slice(i + 1)) {
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.id} and ${b.id}`).toBe(true);
      }
    }
  });

  it('gives each common pointer name its own color, and any name a stable one', () => {
    expect(['i', 'j', 'k', 'l'].map(pointerTone)).toEqual(['blue', 'orange', 'green', 'purple']);
    expect(pointerTone('left')).toBe(pointerTone('left'));
    expect(POINTER_TONES).toContain(pointerTone('whatever'));
  });

  it('names new pointers i, j, k and so on', () => {
    let doc = EMPTY_DOC;
    const names: string[] = [];
    for (let n = 0; n < 3; n += 1) {
      const name = nextPointerName(doc);
      names.push(name);
      doc = addElement(doc, { ...createElement('pointer', { x: 0, y: 0 }, `p${n}`, texts), name } as ElementOf<'pointer'>);
    }
    expect(names).toEqual(['i', 'j', 'k']);
  });
});

describe('pointers', () => {
  it('snaps to the nearest array cell when dropped close to it', () => {
    let doc = boardWithArray();
    // 放在第 3 格（index 2）下方附近
    doc = moveElements(doc, new Set(['pi']), 100 + 2 * CELL + 3, 100 + LABEL_H + CELL + INDEX_H + 10);
    doc = dropPointer(doc, 'pi');
    expect(pointer(doc, 'pi').attach).toEqual({ id: 'arr', index: 2 });
    expect(pointerPosition(doc, pointer(doc, 'pi'))).toEqual({
      x: 100 + 2 * CELL + CELL / 2 - POINTER_W / 2,
      y: 100 + LABEL_H + CELL + INDEX_H + 2,
    });

    // 太遠的不吸附
    doc = moveElements(doc, new Set(['pj']), 900, 900);
    expect(pointer(dropPointer(doc, 'pj'), 'pj').attach).toBeUndefined();
  });

  it('stacks pointers on the same cell and follows the array when it moves', () => {
    let doc = boardWithArray();
    doc = { elements: doc.elements.map((el) => (el.type === 'pointer' ? { ...el, attach: { id: 'arr', index: 0 } } : el)) };
    const i = pointerPosition(doc, pointer(doc, 'pi'));
    const j = pointerPosition(doc, pointer(doc, 'pj'));
    expect(j).toEqual({ x: i.x, y: i.y + POINTER_H });

    doc = moveElements(doc, new Set(['arr']), 50, 10);
    expect(pointerPosition(doc, pointer(doc, 'pi'))).toEqual({ x: i.x + 50, y: i.y + 10 });
  });

  it('moves one cell at a time and stays inside the array', () => {
    let doc = boardWithArray();
    doc = { elements: doc.elements.map((el) => (el.id === 'pi' ? { ...el, attach: { id: 'arr', index: 3 } } : el)) };
    doc = shiftPointer(doc, 'pi', 1);
    expect(pointer(doc, 'pi').attach?.index).toBe(3);
    doc = shiftPointer(shiftPointer(doc, 'pi', -1), 'pi', -1);
    expect(pointer(doc, 'pi').attach?.index).toBe(1);
  });

  it('comes off the array where it was when dragged or when the array is deleted', () => {
    let doc = boardWithArray();
    doc = { elements: doc.elements.map((el) => (el.id === 'pi' ? { ...el, attach: { id: 'arr', index: 1 } } : el)) };
    const before = pointerPosition(doc, pointer(doc, 'pi'));
    const dragged = moveElements(doc, new Set(['pi']), 5, 5);
    expect(pointer(dragged, 'pi')).toMatchObject({ x: before.x + 5, y: before.y + 5, attach: undefined });

    const removed = removeElements(doc, new Set(['arr']));
    expect(pointer(removed, 'pi')).toMatchObject({ x: before.x, y: before.y, attach: undefined });
  });

  it('moves to the last cell when the array shrinks', () => {
    let doc = boardWithArray();
    doc = { elements: doc.elements.map((el) => (el.id === 'pi' ? { ...el, attach: { id: 'arr', index: 3 } } : el)) };
    doc = resizeList(doc, 'arr', -1);
    expect(pointer(doc, 'pi').attach?.index).toBe(2);
    expect((doc.elements[0] as ElementOf<'list'>).items).toEqual(['1', '2', '3']);
  });
});

describe('single cells', () => {
  const at = (doc: BoardDoc, index: number) => ({ elements: doc.elements.map((el) => (el.id === 'pi' ? { ...el, attach: { id: 'arr', index } } : el)) });
  const list = (doc: BoardDoc) => doc.elements[0] as ElementOf<'list'>;

  it('inserts a cell and moves pointers with their values', () => {
    let doc = at(boardWithArray(), 2);
    doc = insertCell(doc, 'arr', 1);
    expect(list(doc).items).toEqual(['1', '', '2', '3', '4']);
    // 指標原本指著 '3'，插入後還是指著 '3'
    expect(pointer(doc, 'pi').attach?.index).toBe(3);
    doc = insertCell(doc, 'arr', 99);
    expect(list(doc).items).toHaveLength(6);
  });

  it('deletes a cell, keeps at least one, and keeps pointers inside the array', () => {
    let doc = at(boardWithArray(), 3);
    doc = deleteCell(doc, 'arr', 0);
    expect(list(doc).items).toEqual(['2', '3', '4']);
    expect(pointer(doc, 'pi').attach?.index).toBe(2);
    doc = deleteCell(doc, 'arr', 2);
    expect(pointer(doc, 'pi').attach?.index).toBe(1);
    doc = deleteCell(deleteCell(doc, 'arr', 0), 'arr', 0);
    expect(list(doc).items).toEqual(['3']);
  });

  it('colors cells and keeps colors with their cells', () => {
    let doc = setCellColor(boardWithArray(), 'arr', 1, 'yellow');
    expect(list(doc).colors).toEqual([null, 'yellow', null, null]);
    doc = insertCell(doc, 'arr', 0);
    expect(list(doc).colors).toEqual([null, null, 'yellow', null, null]);
    doc = deleteCell(doc, 'arr', 2);
    expect(list(doc).colors).toBeUndefined();
    expect(boardDocSchema.safeParse(setCellColor(doc, 'arr', 0, 'green')).success).toBe(true);
  });

  it('adds a pointer on a cell with the next free name', () => {
    const doc = addPointerAt(boardWithArray(), 'arr', 2, 'pk');
    expect(pointer(doc, 'pk')).toMatchObject({ name: 'k', attach: { id: 'arr', index: 2 } });
  });
});

describe('editing', () => {
  it('adds and removes table rows and columns but keeps at least one', () => {
    let doc: BoardDoc = { elements: [createElement('dict', { x: 0, y: 0 }, 'd', texts)] };
    doc = resizeTable(doc, 'd', 'row', 1);
    doc = resizeTable(doc, 'd', 'col', 1);
    expect((doc.elements[0] as ElementOf<'table'>).rows).toEqual([
      ['a', '1', ''],
      ['b', '2', ''],
      ['', '', ''],
    ]);
    for (let n = 0; n < 5; n += 1) doc = resizeTable(resizeTable(doc, 'd', 'row', -1), 'd', 'col', -1);
    expect((doc.elements[0] as ElementOf<'table'>).rows).toEqual([['a']]);
  });

  it('deletes arrows attached to a deleted element', () => {
    const a = createElement('treeNode', { x: 0, y: 0 }, 'a', texts);
    const b = createElement('treeNode', { x: 100, y: 0 }, 'b', texts);
    const doc: BoardDoc = {
      elements: [a, b, { type: 'arrow', id: 'e', from: { id: 'a' }, to: { id: 'b' }, color: 'ink' }],
    };
    expect(removeElements(doc, new Set(['b'])).elements.map((el) => el.id)).toEqual(['a']);
  });

  it('duplicates with new ids and offset, freeing a pointer copied without its array', () => {
    let doc = boardWithArray();
    doc = { elements: doc.elements.map((el) => (el.id === 'pi' ? { ...el, attach: { id: 'arr', index: 0 } } : el)) };
    const { doc: next, ids } = duplicateElements(doc, new Set(['pi']));
    expect(ids).toHaveLength(1);
    const copy = next.elements.find((el) => el.id === ids[0]) as ElementOf<'pointer'>;
    expect(copy.attach).toBeUndefined();
    expect(copy.x).toBe(pointerPosition(doc, pointer(doc, 'pi')).x + 24);
  });
});

describe('arrows and ink', () => {
  const a = createElement('treeNode', { x: 0, y: 0 }, 'a', texts);
  const b = createElement('listNode', { x: 200, y: 0 }, 'b', texts);
  const arrow = { type: 'arrow' as const, id: 'e', from: { id: 'a' }, to: { id: 'b' }, color: 'ink' as const };
  const doc: BoardDoc = { elements: [a, b, arrow] };

  it('stops at the edge of circles and boxes', () => {
    const [start, end] = arrowPoints(doc, arrow)!;
    // 圓心 (24, 24)、半徑 24；串列節點從 x = 200 開始，中心高度 22
    expect(Math.hypot(start.x - 24, start.y - 24)).toBeCloseTo(24);
    expect(start.x).toBeCloseTo(48, 1);
    expect(end.x).toBeCloseTo(200);
    expect(end.y).toBeGreaterThan(22);
    expect(end.y).toBeLessThan(23);
    expect(arrowPoints({ elements: [a, arrow] }, arrow)).toBeNull();
  });

  it('erases strokes and arrows near the eraser', () => {
    const stroke = { type: 'stroke' as const, id: 's', color: 'red' as const, points: [0, 300, 100, 300] };
    const inked = addElement(doc, stroke);
    expect(hitInk(inked, { x: 50, y: 304 }, 6)).toEqual(['s']);
    expect(hitInk(inked, { x: 120, y: 23 }, 6)).toEqual(['e']);
    expect(hitInk(inked, { x: 50, y: 200 }, 6)).toEqual([]);
  });

  it('skips stroke points that are too close and rounds them', () => {
    let pts = appendPoint([], { x: 0.4, y: 0.6 });
    pts = appendPoint(pts, { x: 1, y: 1 });
    pts = appendPoint(pts, { x: 5.2, y: 1 });
    expect(pts).toEqual([0, 1, 5, 1]);
  });

  it('measures everything on the board', () => {
    const inked = addElement(doc, { type: 'stroke', id: 's', color: 'red', points: [-50, 300, 10, 310] });
    expect(contentBounds(inked)).toEqual({ x: -50, y: 0, w: 326, h: 310 });
    expect(contentBounds(EMPTY_DOC)).toBeNull();
  });
});

describe('rectangles and ellipses', () => {
  it('draws from any corner and squares up with Shift', () => {
    expect(shapeFromDrag('r', 'rect', { x: 100, y: 100 }, { x: 40, y: 60 }, 'red')).toMatchObject({ x: 40, y: 60, w: 60, h: 40 });
    expect(shapeFromDrag('e', 'ellipse', { x: 0, y: 0 }, { x: 30, y: 80 }, 'blue', true)).toMatchObject({ w: 80, h: 80 });
    expect(shapeFromDrag('t', 'rect', { x: 0, y: 0 }, { x: 1, y: 1 }, 'ink')).toMatchObject({ w: 8, h: 8 });
  });

  it('only counts the outline, so whatever is framed stays clickable', () => {
    const rect = shapeFromDrag('r', 'rect', { x: 0, y: 0 }, { x: 100, y: 60 }, 'ink');
    expect(distanceToShapeEdge(rect, { x: 50, y: 2 })).toBe(2);
    expect(distanceToShapeEdge(rect, { x: 50, y: 30 })).toBe(30);
    expect(distanceToShapeEdge(rect, { x: 110, y: 30 })).toBe(10);
    const circle = shapeFromDrag('c', 'ellipse', { x: 0, y: 0 }, { x: 100, y: 100 }, 'ink');
    expect(distanceToShapeEdge(circle, { x: 50, y: 0 })).toBeCloseTo(0);
    expect(distanceToShapeEdge(circle, { x: 50, y: 50 })).toBeCloseTo(50);

    const doc: BoardDoc = { elements: [rect] };
    expect(hitInk(doc, { x: 50, y: 4 }, 6)).toEqual(['r']);
    expect(hitInk(doc, { x: 50, y: 30 }, 6)).toEqual([]);
  });

  it('resizes, recolors, and stops arrows on an ellipse', () => {
    const circle = shapeFromDrag('c', 'ellipse', { x: 0, y: 0 }, { x: 100, y: 50 }, 'ink');
    const node = createElement('treeNode', { x: 300, y: 1 }, 'n', texts);
    let doc: BoardDoc = { elements: [circle, node, { type: 'arrow', id: 'a', from: { id: 'c' }, to: { id: 'n' }, color: 'ink' }] };
    const [start] = arrowPoints(doc, doc.elements[2] as ElementOf<'arrow'>)!;
    // 橢圓中心 (50, 25)、半軸 50 和 25：起點要落在橢圓上
    expect(((start.x - 50) / 50) ** 2 + ((start.y - 25) / 25) ** 2).toBeCloseTo(1);

    doc = resizeShape(doc, 'c', 3, 400);
    expect(doc.elements[0]).toMatchObject({ w: 8, h: 400 });
    doc = recolorElements(doc, new Set(['c', 'n']), 'green');
    expect(doc.elements[0]).toMatchObject({ color: 'green' });
    expect(doc.elements[1]).not.toHaveProperty('color');
    expect(boardDocSchema.safeParse(doc).success).toBe(true);
  });
});

describe('lines', () => {
  const a = createElement('graphNode', { x: 0, y: 0 }, 'a', texts);
  const b = createElement('graphNode', { x: 200, y: 0 }, 'b', texts);
  const edge = { type: 'arrow' as const, id: 'e', from: { id: 'a' }, to: { id: 'b' }, color: 'ink' as const };

  it('turns an arrow into a plain line and back', () => {
    let doc: BoardDoc = { elements: [a, b, edge] };
    doc = setArrowHead(doc, 'e', 'none');
    expect(doc.elements[2]).toMatchObject({ head: 'none' });
    expect(boardDocSchema.safeParse(doc).success).toBe(true);
    doc = setArrowHead(doc, 'e', 'end');
    expect(doc.elements[2]).not.toHaveProperty('head', 'none');
  });

  it('can be clicked and recolored', () => {
    let doc: BoardDoc = { elements: [a, b, edge] };
    expect(hitConnector(doc, { x: 120, y: 27 }, 8)).toBe('e');
    expect(hitConnector(doc, { x: 120, y: 80 }, 8)).toBeUndefined();
    doc = recolorElements(doc, new Set(['e', 'a']), 'red');
    expect(doc.elements[2]).toMatchObject({ color: 'red' });
    expect(doc.elements[0]).not.toHaveProperty('color');
  });
});

describe('steps', () => {
  it('records snapshots that later edits do not change', () => {
    let doc = boardWithArray();
    doc = captureStep(doc, 's1', 'start');
    doc = shiftPointer({ elements: doc.elements.map((el) => (el.id === 'pi' ? { ...el, attach: { id: 'arr', index: 0 } } : el)), steps: doc.steps }, 'pi', 1);
    doc = captureStep(doc, 's2');
    doc = moveElements(doc, new Set(['arr']), 100, 0);
    expect(doc.steps?.map((s) => s.caption)).toEqual(['start', '']);
    // 第一步記的時候指標還沒吸附，第二步在第 1 格
    expect(pointer(stepDoc(doc, 0), 'pi').attach).toBeUndefined();
    expect(pointer(stepDoc(doc, 1), 'pi').attach?.index).toBe(1);
    expect((stepDoc(doc, 1).elements[0] as ElementOf<'list'>).x).toBe(100);
    expect(boardDocSchema.safeParse(doc).success).toBe(true);
  });

  it('keeps steps through edits, captions, restores, and clearing the canvas', () => {
    let doc = captureStep(boardWithArray(), 's1');
    doc = setStepCaption(doc, 0, 'j moves right');
    doc = removeElements(doc, new Set(['arr']));
    doc = addElement(doc, createElement('var', { x: 0, y: 0 }, 'v', texts));
    expect(doc.steps).toHaveLength(1);
    doc = restoreStep(doc, 0);
    expect(doc.elements.map((el) => el.id)).toEqual(['arr', 'pi', 'pj']);
    doc = clearElements(doc);
    expect(doc.elements).toEqual([]);
    expect(doc.steps?.[0].caption).toBe('j moves right');
    doc = deleteStep(doc, 0);
    expect(doc).not.toHaveProperty('steps');
  });

  it('stops at the step limit', () => {
    let doc: BoardDoc = EMPTY_DOC;
    for (let i = 0; i < MAX_STEPS + 3; i += 1) doc = captureStep(doc, `s${i}`);
    expect(doc.steps).toHaveLength(MAX_STEPS);
  });
});

describe('marquee selection', () => {
  function group(): BoardDoc {
    const base = boardWithArray();
    const elements = base.elements.map((el) => (el.id === 'pi' ? { ...el, attach: { id: 'arr', index: 1 } } : el));
    const a = createElement('treeNode', { x: 100, y: 300 }, 'a', texts);
    const b = createElement('treeNode', { x: 200, y: 300 }, 'b', texts);
    return {
      elements: [
        ...elements,
        a,
        b,
        { type: 'arrow', id: 'e', from: { id: 'a' }, to: { id: 'b' }, color: 'ink' },
        { type: 'stroke', id: 's', color: 'red', points: [100, 400, 150, 420] },
      ],
    };
  }

  it('selects only what lies entirely inside the box', () => {
    const doc = group();
    expect(elementsInRect(doc, rectFromCorners({ x: 90, y: 290 }, { x: 260, y: 430 })).sort()).toEqual(['a', 'b', 'e', 's']);
    // 只框到一半的陣列不算
    expect(elementsInRect(doc, rectFromCorners({ x: 90, y: 90 }, { x: 180, y: 200 }))).not.toContain('arr');
    expect(elementsInRect(doc, rectFromCorners({ x: 90, y: 90 }, { x: 300, y: 240 }))).toEqual(['arr', 'pi']);
  });

  it('moves a group together, keeping pointers on their array and ink in place relative to it', () => {
    const doc = moveElements(group(), new Set(['arr', 'pi', 's', 'e', 'a', 'b']), 50, 10);
    expect(pointer(doc, 'pi').attach).toEqual({ id: 'arr', index: 1 });
    expect((doc.elements.find((el) => el.id === 's') as ElementOf<'stroke'>).points).toEqual([150, 410, 200, 430]);
    expect(doc.elements.find((el) => el.id === 'a')).toMatchObject({ x: 150, y: 310 });
  });

  it('duplicates a group with pointers and arrows wired to the copies', () => {
    const source = group();
    const { doc, ids } = duplicateElements(source, new Set(['arr', 'pi', 'a', 'b', 'e', 's']));
    expect(ids).toHaveLength(6);
    const copies = doc.elements.filter((el) => ids.includes(el.id));
    const arrCopy = copies.find((el) => el.type === 'list')!;
    const ptrCopy = copies.find((el) => el.type === 'pointer') as ElementOf<'pointer'>;
    expect(ptrCopy.attach).toEqual({ id: arrCopy.id, index: 1 });
    const edgeCopy = copies.find((el) => el.type === 'arrow') as ElementOf<'arrow'>;
    const nodeIds = copies.filter((el) => el.type === 'node').map((el) => el.id);
    expect(nodeIds).toContain((edgeCopy.from as { id: string }).id);
    expect(nodeIds).toContain((edgeCopy.to as { id: string }).id);
    expect(boardDocSchema.safeParse(doc).success).toBe(true);

    // 箭頭的另一端沒有一起複製時，不複製箭頭
    const partial = duplicateElements(source, new Set(['a', 'e']));
    expect(partial.ids).toHaveLength(1);
  });
});

describe('history', () => {
  it('undoes and redoes commits, and treats a drag as one step', () => {
    const one: BoardDoc = { elements: [createElement('var', { x: 0, y: 0 }, 'v', texts)] };
    let h = commit(initHistory(EMPTY_DOC), one);
    // 拖曳：開始時 checkpoint，過程中只 replace
    h = checkpoint(h);
    h = replace(h, moveElements(h.present, new Set(['v']), 5, 0));
    h = replace(h, moveElements(h.present, new Set(['v']), 5, 0));
    expect(h.present.elements[0]).toMatchObject({ x: 10 });

    h = undo(h);
    expect(h.present).toBe(one);
    h = undo(h);
    expect(h.present).toBe(EMPTY_DOC);
    h = redo(redo(h));
    expect(h.present.elements[0]).toMatchObject({ x: 10 });
  });

  it('drops the checkpoint of a click that changed nothing', () => {
    const h = dropEmptyCheckpoint(checkpoint(initHistory(EMPTY_DOC)));
    expect(h.past).toEqual([]);
  });
});

describe('sync schema', () => {
  it('rejects boards that are too large', () => {
    const points = Array.from({ length: 4000 }, (_, i) => 100000 + i);
    const elements = Array.from({ length: 120 }, (_, i) => ({ type: 'stroke' as const, id: `s${i}`, color: 'ink' as const, points }));
    expect(boardDataSchema.safeParse({ doc: { elements }, updatedAt: '2026-10-06T12:00:00.000Z' }).success).toBe(false);
    expect(boardDataSchema.safeParse({ doc: { elements: elements.slice(0, 2) }, updatedAt: '2026-10-06T12:00:00.000Z' }).success).toBe(true);
  });
});
