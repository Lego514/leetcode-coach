import { describe, expect, it } from 'vitest';
import { boardDocSchema } from '../../../shared/protocol';
import { boardToSvg, estimateWidth } from './exportSvg';
import {
  addElement,
  clearDpValues,
  createElement,
  dpArrowPath,
  dpDependencies,
  dpLayout,
  dpNextEmpty,
  dpOrder,
  dpStep,
  EMPTY_DOC,
  fillDpCell,
  findElement,
  moveDpCursor,
  resizeDp,
  setDpDeps,
  setDpOrder,
  stepDpCursor,
  type BoardDoc,
  type ElementOf,
} from './model';
import { applyStructureText, parseDp, serializeDp } from './structures';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

/** 元件庫的預設內容：LCS("abcde", "ace")，邊界填好 0，正在填 dp[1][1] */
function lcsDoc(): BoardDoc {
  return addElement(EMPTY_DOC, createElement('dpTable', { x: 0, y: 0 }, 'd', texts));
}

function dpDoc(cells: string[][], extra: Partial<ElementOf<'dp'>> = {}): BoardDoc {
  return addElement(EMPTY_DOC, { type: 'dp', id: 'd', x: 0, y: 0, label: 'dp', cells, ...extra });
}

const dp = (doc: BoardDoc) => findElement(doc, 'd') as ElementOf<'dp'>;
const blank = (rows: number, cols: number) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));

describe('DP table layout and dependencies', () => {
  it('leaves room for indices and the strings beside the rows and columns', () => {
    const doc = lcsDoc();
    expect(dpLayout(dp(doc))).toEqual({ rows: 6, cols: 4, left: 48, top: 62, w: 224, h: 326 });
    // 一維的沒有列的索引，下面留空間畫弧線
    expect(dpLayout(dp(dpDoc(blank(1, 6))))).toMatchObject({ left: 0, top: 40, w: 264, h: 116 });
    expect(boardDocSchema.safeParse(doc).success).toBe(true);
    expect(boardDocSchema.safeParse(dpDoc([['1', '2'], ['3']])).success).toBe(false);
  });

  it('finds the cells each preset reads from, leaving out ones off the table', () => {
    const el = (deps: ElementOf<'dp'>['deps'], extra: Partial<ElementOf<'dp'>> = {}) => dp(dpDoc(blank(4, 4), { deps, ...extra }));
    expect(dpDependencies(el('upLeftDiag'), { r: 2, c: 2 })).toEqual([
      { r: 1, c: 2 },
      { r: 2, c: 1 },
      { r: 1, c: 1 },
    ]);
    expect(dpDependencies(el('upLeft'), { r: 0, c: 1 })).toEqual([{ r: 0, c: 0 }]);
    expect(dpDependencies(el('downLeft'), { r: 1, c: 2 })).toEqual([{ r: 2, c: 1 }]);
    expect(dpDependencies(el(undefined), { r: 2, c: 2 })).toEqual([]);
    const row = (deps: ElementOf<'dp'>['deps'], steps?: number[]) => dp(dpDoc(blank(1, 8), { deps, steps }));
    expect(dpDependencies(row('prev2'), { r: 0, c: 1 })).toEqual([{ r: 0, c: 0 }]);
    expect(dpDependencies(row('before'), { r: 0, c: 3 }).map((d) => d.c)).toEqual([0, 1, 2]);
    expect(dpDependencies(row('steps', [1, 2, 5]), { r: 0, c: 6 }).map((d) => d.c)).toEqual([5, 4, 1]);
  });

  it('draws arcs under a 1D table and short arrows into the cell in a 2D one', () => {
    const row = dp(dpDoc(blank(1, 4), { deps: 'prev1' }));
    expect(dpArrowPath(row, { r: 0, c: 1 }, { r: 0, c: 2 })).toBe('M66 86Q88 112 106 87');
    const grid = dp(lcsDoc());
    // 從左邊那格裡面出發，停在 dp[1][1] 的左邊
    expect(dpArrowPath(grid, { r: 1, c: 0 }, { r: 1, c: 1 })).toBe('M77.7 128L91 128');
  });
});

describe('filling a DP table', () => {
  it('walks the fill order, top row first or bottom row first', () => {
    const el = dp(dpDoc(blank(2, 2), { at: { r: 0, c: 1 } }));
    expect(dpOrder(el)).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
    ]);
    expect(dpStep(el, 'next')).toEqual({ r: 1, c: 0 });
    expect(dpStep(el, 'prev')).toEqual({ r: 0, c: 0 });
    const up = dp(setDpOrder(dpDoc(blank(2, 2)), 'd', 'up'));
    expect(dpOrder(up)[0]).toEqual({ r: 1, c: 0 });
    // 還沒選格子時從第一格開始
    expect(dpStep(up, 'next')).toEqual({ r: 1, c: 0 });
  });

  it('writes the value, records the step with its arrows, and jumps to the next empty cell', () => {
    let doc = fillDpCell(lcsDoc(), 'd', '1', true);
    expect(dp(doc).cells[1][1]).toBe('1');
    expect(dp(doc).at).toEqual({ r: 1, c: 2 });
    expect(doc.steps?.map((s) => s.caption)).toEqual(['dp[1][1] = 1']);
    expect((doc.steps![0].elements[0] as ElementOf<'dp'>).at).toEqual({ r: 1, c: 1 });
    doc = fillDpCell(doc, 'd', '1', false);
    doc = fillDpCell(doc, 'd', '1', false);
    // 第 1 列填完，跳過已經填好 0 的 dp[2][0]
    expect(dp(doc).at).toEqual({ r: 2, c: 1 });
    expect(doc.steps).toHaveLength(1);
    expect(dpNextEmpty(dp(dpDoc([['1', '2']], { at: { r: 0, c: 0 } })))).toBeNull();
  });

  it('moves the cell with arrow keys, clears values, and resizes with the labels', () => {
    let doc = moveDpCursor(lcsDoc(), 'd', -1, 0);
    expect(dp(doc).at).toEqual({ r: 0, c: 1 });
    doc = moveDpCursor(doc, 'd', -1, -5);
    expect(dp(doc).at).toEqual({ r: 0, c: 0 });
    doc = stepDpCursor(doc, 'd', 'next');
    expect(dp(doc).at).toEqual({ r: 0, c: 1 });
    doc = resizeDp(doc, 'd', 'col', 1);
    expect(dp(doc).colHead).toEqual(['', 'a', 'c', 'e', '']);
    expect(dp(doc).cells[0]).toHaveLength(5);
    doc = resizeDp(resizeDp(doc, 'd', 'row', -1), 'd', 'row', -1);
    expect(dp(doc).rowHead).toEqual(['', 'a', 'b', 'c']);
    doc = clearDpValues(doc, 'd');
    expect(dp(doc).cells.flat().every((v) => v === '')).toBe(true);
    expect(dp(doc).at).toEqual({ r: 0, c: 0 });
    doc = setDpDeps(doc, 'd', 'steps', [5, 1, 1, 40, 2]);
    expect(dp(doc).steps).toEqual([1, 2, 5]);
  });
});

describe('building a DP table from the problem’s input', () => {
  it('reads two strings, one string, sizes, coins, and arrays', () => {
    expect(parseDp('text1 = "abcde", text2 = "ace"')).toMatchObject({
      cells: blank(6, 4),
      rowHead: ['', 'a', 'b', 'c', 'd', 'e'],
      colHead: ['', 'a', 'c', 'e'],
      deps: 'upLeftDiag',
    });
    expect(parseDp('s = "226"')).toMatchObject({ cells: blank(1, 4), colHead: ['', '2', '2', '6'], deps: 'prev2' });
    expect(parseDp('s = "leetcode", wordDict = ["leet","code"]')).toMatchObject({ cells: blank(1, 9), deps: 'before' });
    expect(parseDp('m = 3, n = 7')).toEqual({ cells: blank(3, 7), deps: 'upLeft' });
    expect(parseDp('n = 5')).toEqual({ cells: blank(1, 6), deps: 'prev2' });
    expect(parseDp('coins = [1,2,5], amount = 11')).toEqual({ cells: blank(1, 12), deps: 'steps', steps: [1, 2, 5] });
    expect(parseDp('nums = [2,7,9,3,1]')).toEqual({ cells: blank(1, 5), colHead: ['2', '7', '9', '3', '1'] });
    expect(parseDp('[[1,0],[1,1]]')).toEqual({ cells: [['1', '0'], ['1', '1']] });
  });

  it('explains what went wrong', () => {
    expect(parseDp('n = 40')).toEqual({ error: 'tooMany' });
    expect(parseDp('  ')).toEqual({ error: 'empty' });
    expect(parseDp('True')).toEqual({ error: 'badFormat' });
  });

  it('writes the table back in the same shape it was built from', () => {
    for (const text of ['text1 = "abcde", text2 = "ace"', 's = "226"', 'm = 3, n = 7', 'n = 5', 'coins = [1,2,5], amount = 11', 'nums = [2,7,9,3,1]']) {
      const parsed = parseDp(text);
      if ('error' in parsed) throw new Error(text);
      expect(serializeDp(dp(dpDoc(parsed.cells, parsed)))).toBe(text);
    }
    expect(serializeDp(dp(dpDoc([['1', ''], ['2', '3']])))).toBe('[[1,""],[2,3]]');
  });

  it('starts filling from the first cell, and keeps the arrows when they still fit', () => {
    let doc = dpDoc(blank(2, 2), { deps: 'upLeft', order: 'up', at: { r: 1, c: 1 } });
    const result = applyStructureText(doc, 'd', '[[1,1,1],[1,"",""],[1,"",""]]');
    if (!('doc' in result)) throw new Error('parse failed');
    doc = result.doc;
    expect(dp(doc)).toMatchObject({ deps: 'upLeft', order: 'up', at: { r: 2, c: 0 } });
    const oneD = applyStructureText(doc, 'd', 'nums = [1,2]');
    if (!('doc' in oneD)) throw new Error('parse failed');
    // 換成一維：二維的箭頭和填表順序不適用了
    expect(dp(oneD.doc)).toMatchObject({ deps: undefined, order: undefined, at: { r: 0, c: 0 } });
  });
});

describe('exporting a DP table', () => {
  it('draws the headers, the cell being filled, and an arrow from each cell it reads', () => {
    const svg = boardToSvg(lcsDoc(), undefined, { measure: estimateWidth, front: 'front', back: 'back' })!.svg;
    expect(svg.match(/marker-end="url\(#head-orange\)"/g)).toHaveLength(3);
    expect(svg).toContain('stroke="#2346a0" stroke-width="3"');
    expect(svg.match(/fill="#e7edfa"/g)).toHaveLength(3);
    expect(svg).toContain('>e</text>');
  });
});
