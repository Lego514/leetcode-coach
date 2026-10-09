import { describe, expect, it } from 'vitest';
import { boardDocSchema } from '../../../shared/protocol';
import { boardToSvg, estimateWidth } from './exportSvg';
import {
  addElement,
  addPointerAt,
  CELL,
  createElement,
  cycleHeapView,
  EMPTY_DOC,
  findElement,
  heapify,
  heapLayout,
  heapPop,
  heapPush,
  heapViolations,
  insertCell,
  LABEL_H,
  pointerPosition,
  pointsDown,
  recordHeapSteps,
  setHeapOrder,
  type BoardDoc,
  type ElementOf,
} from './model';
import { applyStructureText } from './structures';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

function heapDoc(items?: string[]): BoardDoc {
  const base = createElement('heap', { x: 0, y: 0 }, 'h', texts) as ElementOf<'list'>;
  return addElement(EMPTY_DOC, items ? { ...base, items } : base);
}

const heap = (doc: BoardDoc) => findElement(doc, 'h') as ElementOf<'list'>;
const last = (steps: { doc: BoardDoc }[]) => steps[steps.length - 1].doc;

describe('heap layout', () => {
  it('draws the tree above the array, or either one alone', () => {
    let doc = heapDoc();
    const both = heapLayout(heap(doc));
    expect(both.showTree && both.showArray).toBe(true);
    expect([...both.centers.keys()]).toEqual([3, 1, 4, 0, 2]);
    expect(both.arrayTop).toBeGreaterThan(LABEL_H + CELL);

    doc = cycleHeapView(doc, 'h');
    expect(heap(doc).view).toBe('array');
    expect(heapLayout(heap(doc))).toMatchObject({ showTree: false, arrayTop: LABEL_H });
    doc = cycleHeapView(doc, 'h');
    expect(heapLayout(heap(doc))).toMatchObject({ showTree: true, showArray: false });
    doc = cycleHeapView(doc, 'h');
    expect(heap(doc).view).toBeUndefined();
  });

  it('puts pointers under the array, or above tree nodes when only the tree shows', () => {
    let doc = addPointerAt(heapDoc(), 'h', 1, 'p');
    const pointer = () => findElement(doc, 'p') as ElementOf<'pointer'>;
    const layout = heapLayout(heap(doc));
    expect(pointsDown(doc, pointer())).toBe(false);
    expect(pointerPosition(doc, pointer()).y).toBeGreaterThan(layout.arrayTop + CELL);
    doc = cycleHeapView(cycleHeapView(doc, 'h'), 'h');
    expect(pointsDown(doc, pointer())).toBe(true);
    expect(pointerPosition(doc, pointer()).y).toBeLessThan(heapLayout(heap(doc)).centers.get(1)!.y);
  });
});

describe('heap operations', () => {
  it('pushes and sifts up, one recorded step per swap', () => {
    const steps = heapPush(heapDoc(), 'h', '0');
    // 放在第 5 格，父節點是第 2 格的 2，再上去是根節點 1：往上換兩次
    expect(steps.map((s) => s.caption)).toEqual(['push 0', 'swap 0 ↔ 2', 'swap 0 ↔ 1']);
    expect(heap(last(steps)).items).toEqual(['0', '3', '1', '7', '4', '2']);
    expect(heapViolations(heap(last(steps))).size).toBe(0);
  });

  it('pops the top and sifts the last value down', () => {
    const popped = heapPop(heapDoc(), 'h')!;
    expect(popped.value).toBe('1');
    expect(heap(last(popped.steps)).items).toEqual(['2', '3', '4', '7']);
    const single = heapPop(heapDoc(['5']), 'h')!;
    expect(heap(last(single.steps)).items).toEqual([]);
    expect(heapPop(last(single.steps), 'h')).toBeNull();
  });

  it('compares numbers as numbers, flips for a max-heap, and heapifies', () => {
    let doc = heapDoc(['10', '9', '2']);
    expect([...heapViolations(heap(doc))]).toEqual([1, 2]);
    doc = last(heapify(doc, 'h'));
    expect(heap(doc).items).toEqual(['2', '9', '10']);
    doc = setHeapOrder(doc, 'h', 'max');
    expect(heap(doc).order).toBe('max');
    doc = last(heapify(doc, 'h'));
    expect(heap(doc).items).toEqual(['10', '9', '2']);
    expect(heapViolations(heap(doc)).size).toBe(0);
  });

  it('records every step for playback and lands on the last one', () => {
    const base = heapDoc();
    const steps = heapPush(base, 'h', '0');
    const recorded = recordHeapSteps(base, steps);
    expect(recorded.steps?.map((s) => s.caption)).toEqual(['push 0', 'swap 0 ↔ 2', 'swap 0 ↔ 1']);
    expect(heap(recorded).items).toEqual(heap(last(steps)).items);
  });

  it('caps the heap at 31 values', () => {
    const full = heapDoc(Array.from({ length: 31 }, (_, i) => String(i)));
    expect(heapPush(full, 'h', '99')).toEqual([]);
    expect(insertCell(full, 'h', 31)).toBe(full);
    expect(applyStructureText(heapDoc(), 'h', JSON.stringify(Array.from({ length: 32 }, (_, i) => i)))).toEqual({ error: 'tooMany' });
  });
});

describe('saving and exporting heaps', () => {
  it('passes the sync schema and draws both views, with violations in red', () => {
    const doc = setHeapOrder(heapDoc(['1', '5', '0']), 'h', 'min');
    expect(boardDocSchema.safeParse(doc).success).toBe(true);
    const svg = boardToSvg(doc, undefined, { measure: estimateWidth, front: 'front', back: 'back' })!.svg;
    expect(svg.match(/<circle /g)).toHaveLength(3);
    expect(svg).toContain('stroke-dasharray="4 3"');
    expect(svg).toContain('>2</text>');
  });
});
