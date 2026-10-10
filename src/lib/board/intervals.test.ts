import { describe, expect, it } from 'vitest';
import { boardDocSchema } from '../../../shared/protocol';
import { boardToSvg, estimateWidth } from './exportSvg';
import {
  activeAt,
  addElement,
  addInterval,
  canMergeNext,
  createElement,
  deleteInterval,
  EMPTY_DOC,
  findElement,
  intervalEvents,
  intervalsLayout,
  mergeWithNext,
  niceStep,
  sortIntervals,
  stepSweep,
  toggleSweep,
  updateInterval,
  type BoardDoc,
  type ElementOf,
  type Interval,
} from './model';
import { applyStructureText, parseIntervals, serializeIntervals } from './structures';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

/** 元件庫的預設內容：[1,3] [2,6] [8,10] [15,18] */
function mergeDoc(): BoardDoc {
  return addElement(EMPTY_DOC, createElement('intervals', { x: 0, y: 0 }, 'v', texts));
}

function ivDoc(items: Interval[], extra: Partial<ElementOf<'intervals'>> = {}): BoardDoc {
  return addElement(EMPTY_DOC, { type: 'intervals', id: 'v', x: 0, y: 0, label: 'intervals', items, ...extra });
}

const iv = (doc: BoardDoc) => findElement(doc, 'v') as ElementOf<'intervals'>;
const pairs = (doc: BoardDoc) => iv(doc).items.map((item) => [item.a, item.b]);
const of = (...list: [number, number][]) => list.map(([a, b]) => ({ a, b }));

describe('interval layout', () => {
  it('fits the number line to round ticks around every interval', () => {
    const layout = intervalsLayout(iv(mergeDoc()));
    expect([layout.lo, layout.hi, layout.step]).toEqual([0, 18, 2]);
    expect(layout.ticks).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    expect(layout.x(0)).toBe(14);
    expect(layout.x(18)).toBeCloseTo(574);
    expect([layout.w, layout.h]).toEqual([646, 160]);
    expect([niceStep(10000), niceStep(3)]).toEqual([1000, 0.5]);
    // 沒有區間時是 0 到 10
    expect(intervalsLayout(iv(ivDoc([])))).toMatchObject({ lo: 0, hi: 10 });
  });

  it('stops the sweep line at every start and end, counting starts but not ends', () => {
    const el = iv(mergeDoc());
    expect(intervalEvents(el)).toEqual([1, 2, 3, 6, 8, 10, 15, 18]);
    expect(activeAt(el, 2)).toBe(2);
    expect(activeAt(el, 3)).toBe(1);
    // 移除的不算
    expect(activeAt(iv(updateInterval(mergeDoc(), 'v', 1, { removed: true })), 2)).toBe(1);
  });
});

describe('working with intervals', () => {
  it('sorts by start, then merges overlapping neighbors, touching ends included', () => {
    let doc = sortIntervals(ivDoc(of([8, 10], [2, 6], [1, 3], [15, 18])), 'v');
    expect(pairs(doc)).toEqual([[1, 3], [2, 6], [8, 10], [15, 18]]);
    expect(canMergeNext(iv(doc), 0)).toBe(true);
    doc = mergeWithNext(doc, 'v', 0);
    expect(pairs(doc)).toEqual([[1, 6], [8, 10], [15, 18]]);
    expect(canMergeNext(iv(doc), 0)).toBe(false);
    expect(mergeWithNext(doc, 'v', 0)).toBe(doc);
    expect(canMergeNext(iv(ivDoc(of([1, 4], [4, 5]))), 0)).toBe(true);
  });

  it('edits, adds, and deletes intervals, swapping a start that passes the end', () => {
    let doc = updateInterval(mergeDoc(), 'v', 0, { a: 9, color: 'green' });
    expect(iv(doc).items[0]).toEqual({ a: 3, b: 9, color: 'green' });
    doc = updateInterval(doc, 'v', 0, { color: null, removed: true });
    expect(iv(doc).items[0]).toEqual({ a: 3, b: 9, removed: true });
    const added = addInterval(doc, 'v')!;
    expect(added.index).toBe(4);
    expect(pairs(added.doc)[4]).toEqual([19, 21]);
    expect(pairs(deleteInterval(added.doc, 'v', 0))).toHaveLength(4);
  });

  it('moves the sweep line between points and hides it again', () => {
    let doc = toggleSweep(mergeDoc(), 'v');
    expect(iv(doc).sweep).toBe(1);
    doc = stepSweep(stepSweep(doc, 'v', 'next'), 'v', 'next');
    expect(iv(doc).sweep).toBe(3);
    doc = stepSweep(doc, 'v', 'prev');
    expect(iv(doc).sweep).toBe(2);
    expect(stepSweep(toggleSweep(mergeDoc(), 'v'), 'v', 'prev')).toEqual(toggleSweep(mergeDoc(), 'v'));
    expect(iv(toggleSweep(doc, 'v')).sweep).toBeUndefined();
  });
});

describe('building intervals from text', () => {
  it('reads interval lists, a new interval to insert, and a schedule per employee', () => {
    expect(parseIntervals('intervals = [[1,3],[6,9]], newInterval = [2,5]')).toEqual({
      items: [{ a: 1, b: 3 }, { a: 6, b: 9 }, { a: 2, b: 5, color: 'yellow' }],
    });
    expect(parseIntervals('schedule = [[[1,2],[5,6]],[[1,3]],[[4,10]]]')).toEqual({
      items: [
        { a: 1, b: 2, color: 'yellow' },
        { a: 5, b: 6, color: 'yellow' },
        { a: 1, b: 3, color: 'green' },
        { a: 4, b: 10, color: 'blue' },
      ],
    });
    expect(parseIntervals('[1,3], [5,2]')).toEqual({ items: of([1, 3], [2, 5]) });
  });

  it('explains what went wrong', () => {
    expect(parseIntervals('intervals = []')).toEqual({ error: 'empty' });
    expect(parseIntervals('meetings')).toEqual({ error: 'badFormat' });
    expect(parseIntervals(JSON.stringify(Array.from({ length: 31 }, (_, i) => [i, i + 1])))).toEqual({ error: 'tooMany' });
  });

  it('writes the list back, and moves an open sweep line to the first start', () => {
    expect(serializeIntervals(iv(mergeDoc()))).toBe('intervals = [[1,3],[2,6],[8,10],[15,18]]');
    const result = applyStructureText(toggleSweep(mergeDoc(), 'v'), 'v', '[[5,7],[4,9]]');
    if (!('doc' in result)) throw new Error('parse failed');
    expect(iv(result.doc)).toMatchObject({ items: of([5, 7], [4, 9]), sweep: 4 });
  });
});

describe('saving and exporting intervals', () => {
  it('passes the sync schema and draws bars, removed ones dashed, and the sweep count', () => {
    let doc = updateInterval(mergeDoc(), 'v', 3, { removed: true });
    doc = stepSweep(toggleSweep(doc, 'v'), 'v', 'next');
    expect(boardDocSchema.safeParse(doc).success).toBe(true);
    const svg = boardToSvg(doc, undefined, {
      measure: estimateWidth,
      front: 'front',
      back: 'back',
      active: (t, n) => `at ${t}: ${n}`,
    })!.svg;
    expect(svg.match(/rx="4"/g)).toHaveLength(4);
    expect(svg.match(/stroke-dasharray="4 3"/g)).toHaveLength(1);
    expect(svg).toContain('>at 2: 2</text>');
    expect(svg).toContain('>[15,18]</text>');
  });
});
