import { describe, expect, it } from 'vitest';
import { boardDocSchema } from '../../../shared/protocol';
import { boardToSvg, estimateWidth } from './exportSvg';
import {
  addElement,
  EMPTY_DOC,
  findElement,
  firstCodeLine,
  nextCodeLine,
  setCodeTracing,
  traceCodeTo,
  type BoardDoc,
  type ElementOf,
} from './model';

const SOURCE = ['', 'def total(nums):', '    s = 0', '', '    for x in nums:', '        s += x', '    return s'].join('\n');

function codeDoc(text = SOURCE, extra: Partial<ElementOf<'text'>> = {}): BoardDoc {
  return addElement(EMPTY_DOC, { type: 'text', id: 'c', x: 0, y: 0, variant: 'code', text, w: 260, ...extra });
}

const code = (doc: BoardDoc) => findElement(doc, 'c') as ElementOf<'text'>;
const svgOf = (doc: BoardDoc) => boardToSvg(doc, undefined, { measure: estimateWidth, front: 'front', back: 'back' })!.svg;

describe('tracing code line by line', () => {
  it('starts on the first line with code and steps over blank lines', () => {
    let doc = setCodeTracing(codeDoc(), 'c', true);
    expect(code(doc).line).toBe(firstCodeLine(code(doc)));
    expect(code(doc).line).toBe(1);
    doc = traceCodeTo(doc, 'c', nextCodeLine(code(doc), 'next'), false);
    expect(code(doc).line).toBe(2);
    expect(nextCodeLine(code(doc), 'next')).toBe(4);
    expect(nextCodeLine(code(traceCodeTo(doc, 'c', 4, false)), 'prev')).toBe(2);
    // 最後一行往下、第一行往上都停在原地
    expect(nextCodeLine(code(traceCodeTo(doc, 'c', 6, false)), 'next')).toBe(6);
    expect(nextCodeLine(code(traceCodeTo(doc, 'c', 1, false)), 'prev')).toBe(1);
    expect(code(setCodeTracing(doc, 'c', false)).line).toBeUndefined();
  });

  it('records the board with the line that just ran before moving on', () => {
    let doc = setCodeTracing(codeDoc(), 'c', true);
    doc = traceCodeTo(doc, 'c', 2, true);
    doc = traceCodeTo(doc, 'c', 4, true);
    expect(doc.steps?.map((step) => (step.elements[0] as ElementOf<'text'>).line)).toEqual([1, 2]);
    expect(code(doc).line).toBe(4);
    // 同一行、超出範圍的行
    expect(traceCodeTo(doc, 'c', 4, true)).toBe(doc);
    expect(code(traceCodeTo(doc, 'c', 99, false)).line).toBe(6);
  });

  it('widens the box to fit the longest line when tracing starts, up to a limit', () => {
    expect(code(setCodeTracing(codeDoc(), 'c', true)).w).toBe(260);
    const long = 'x'.repeat(50);
    expect(code(setCodeTracing(codeDoc(long), 'c', true)).w).toBe(434);
    expect(code(setCodeTracing(codeDoc('y'.repeat(200)), 'c', true)).w).toBe(720);
  });

  it('only traces code boxes, and saves the line with the board', () => {
    const note = addElement(EMPTY_DOC, { type: 'text', id: 'c', x: 0, y: 0, variant: 'text', text: 'hi', w: 100 });
    expect(setCodeTracing(note, 'c', true)).toBe(note);
    expect(boardDocSchema.safeParse(setCodeTracing(codeDoc(), 'c', true)).success).toBe(true);
  });
});

describe('exporting traced code', () => {
  it('adds line numbers and highlights the current line, leaving plain code as it was', () => {
    const plain = svgOf(codeDoc());
    expect(plain).not.toContain('>7</text>');
    expect(plain).not.toContain('#e7edfa');
    const traced = svgOf(traceCodeTo(setCodeTracing(codeDoc(), 'c', true), 'c', 5, false));
    expect(traced).toContain('>7</text>');
    expect(traced.match(/fill="#e7edfa"/g)).toHaveLength(1);
    // 原本的每一行都還在，縮排也保留
    expect(traced).toContain('xml:space="preserve" dominant-baseline="middle">        s += x</text>');
  });
});
