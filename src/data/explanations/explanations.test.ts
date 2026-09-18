import { describe, expect, it } from 'vitest';
import { BUILTIN_PROBLEMS } from '../problems';
import { EXPLANATIONS_EN } from './index';

// 中日韓文字與全形標點；用字元碼組出範圍，原始碼裡才不會出現全形空白
const range = (from: number, to: number) => `${String.fromCharCode(from)}-${String.fromCharCode(to)}`;
const CJK = new RegExp(`[${range(0x3000, 0x303f)}${range(0x4e00, 0x9fff)}${range(0xff00, 0xffef)}]`);

describe('reference explanations', () => {
  it('covers every built-in problem and nothing else', () => {
    const builtin = BUILTIN_PROBLEMS.map((p) => p.id).sort((a, b) => a - b);
    const written = Object.keys(EXPLANATIONS_EN)
      .map(Number)
      .sort((a, b) => a - b);
    expect(written).toEqual(builtin);
  });

  it('follows the five-line outline for every problem', () => {
    const problems: string[] = [];
    for (const [id, text] of Object.entries(EXPLANATIONS_EN)) {
      const lines = text.split('\n');
      const ok =
        lines.length === 5 &&
        lines[0].startsWith('The key insight') &&
        lines[1].startsWith('So ') &&
        lines[2].startsWith('For example') &&
        lines[3].includes('O(') &&
        lines[4].startsWith('One edge case');
      if (!ok) problems.push(id);
    }
    expect(problems).toEqual([]);
  });

  it('is plain English without leftover whitespace', () => {
    for (const [id, text] of Object.entries(EXPLANATIONS_EN)) {
      expect(CJK.test(text), `problem ${id}`).toBe(false);
      for (const line of text.split('\n')) expect(line, `problem ${id}`).toBe(line.trim());
    }
  });
});
