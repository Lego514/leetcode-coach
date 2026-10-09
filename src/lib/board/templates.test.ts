import { describe, expect, it } from 'vitest';
import { boardDocSchema } from '../../../shared/protocol';
import { addElement, createElement, EMPTY_DOC, findElement, isPlaced, rectOf, type BoardDoc, type ElementOf } from './model';
import { insertTemplate, TEMPLATES, templateElements } from './templates';

const texts = { heading: 'Title', text: 'Text', sticky: 'Idea' };

function counter() {
  let n = 0;
  return () => `t${(n += 1)}`;
}

describe('whiteboard templates', () => {
  it('builds every template with content the server accepts and pointers that land on its own elements', () => {
    for (const kind of TEMPLATES) {
      const els = templateElements(kind, counter());
      const doc: BoardDoc = { elements: els };
      expect(boardDocSchema.safeParse(doc).success, kind).toBe(true);
      for (const el of els) {
        if (el.type === 'pointer' && el.attach) expect(findElement(doc, el.attach.id), kind).toBeDefined();
      }
    }
  });

  it('names the pointers for the pattern', () => {
    const names = (kind: (typeof TEMPLATES)[number]) =>
      templateElements(kind, counter()).flatMap((el) => (el.type === 'pointer' ? [el.name] : []));
    expect(names('twoPointers')).toEqual(['l', 'r']);
    expect(names('reverseList')).toEqual(['prev', 'curr', 'next']);
    expect(names('treeDfs')).toEqual(['node']);
  });

  it('drops the whole group into free space and returns its ids', () => {
    const existing = createElement('array', { x: -100, y: -40 }, 'old', texts);
    const doc = addElement(EMPTY_DOC, existing);
    const { doc: next, ids } = insertTemplate(doc, 'slidingWindow', { x: 0, y: 0 });
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
    expect(next.elements).toHaveLength(7);

    const old = rectOf(next, existing);
    for (const id of ids) {
      const el = findElement(next, id)!;
      if (!isPlaced(el)) continue;
      const r = rectOf(next, el);
      const overlap = r.x < old.x + old.w && old.x < r.x + r.w && r.y < old.y + old.h && old.y < r.y + r.h;
      expect(overlap, `${el.type} overlaps the existing array`).toBe(false);
    }
    // 指標還是吸附在新的陣列上
    const pointers = ids.map((id) => findElement(next, id)).filter((el): el is ElementOf<'pointer'> => el?.type === 'pointer');
    expect(pointers.every((p) => p.attach && ids.includes(p.attach.id))).toBe(true);
  });
});
