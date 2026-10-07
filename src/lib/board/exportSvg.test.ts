import { describe, expect, it } from 'vitest';
import { boardToSvg, estimateWidth, wrapText } from './exportSvg';
import { createElement, EMPTY_DOC, type BoardDoc, type ElementOf } from './model';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };
const options = { measure: estimateWidth, front: 'front', back: 'back' };

describe('exporting a whiteboard', () => {
  it('has nothing to export on an empty board', () => {
    expect(boardToSvg(EMPTY_DOC, undefined, options)).toBeNull();
  });

  it('draws every element inside a padded white canvas sized to the content', () => {
    const array = { ...createElement('array', { x: 100, y: 100 }, 'arr', texts), items: ['a', 'b', 'c', 'a'], colors: [null, 'yellow', null, null] } as ElementOf<'list'>;
    const doc: BoardDoc = {
      elements: [
        array,
        { ...createElement('pointer', { x: 0, y: 0 }, 'pi', texts), attach: { id: 'arr', index: 1 } } as ElementOf<'pointer'>,
        createElement('graphNode', { x: 400, y: 100 }, 'g1', texts),
        createElement('graphNode', { x: 500, y: 100 }, 'g2', texts),
        { type: 'arrow', id: 'e', from: { id: 'g1' }, to: { id: 'g2' }, color: 'red', head: 'none' },
        { type: 'arrow', id: 'f', from: { x: 400, y: 200 }, to: { x: 500, y: 200 }, color: 'blue' },
        { ...createElement('sticky', { x: 100, y: 260 }, 's', texts), text: 'if a < b && c' } as ElementOf<'text'>,
      ],
    };
    const out = boardToSvg(doc, undefined, options)!;
    expect(out.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    // 內容從 (100, 100) 到 (548, 304) 左右，四周各留 32
    expect(out.svg).toContain('viewBox="68 68 ');
    expect(out.width).toBeGreaterThan(448 + 64 - 1);
    // 底色、指標名稱、轉義過的文字
    expect(out.svg).toContain('fill="#fff1a8"');
    expect(out.svg).toContain('>i</text>');
    expect(out.svg).toContain('if a &lt; b &amp;&amp; c');
    // 直線沒有箭頭，箭頭有
    expect(out.svg.match(/marker-end=/g)).toHaveLength(1);
    expect(out.svg).toContain('stroke="#c62828"');
  });

  it('wraps English by word and Chinese by character', () => {
    const font = '15px sans-serif';
    // 估計每個英文字元 9px
    expect(wrapText('two pointers move inward', 120, font, estimateWidth)).toEqual(['two pointers', 'move inward']);
    expect(wrapText('一二三四五六七八', 60, font, estimateWidth)).toEqual(['一二三四', '五六七八']);
    expect(wrapText('first\nsecond', 500, font, estimateWidth)).toEqual(['first', 'second']);
    expect(wrapText('abcdefghijklmnop', 45, font, estimateWidth)).toEqual(['abcde', 'fghij', 'klmno', 'p']);
  });
});
