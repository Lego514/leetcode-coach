import { EMPTY_DOC, insertExample } from 'dsa-whiteboard';
import { describe, expect, it } from 'vitest';
import { PROBLEM_EXAMPLES } from './examples';
import { EXPLANATIONS_EN } from './explanations/index';
import { BUILTIN_PROBLEMS } from './problems';

/** 講解的「For example」那句裡第一個沒有巢狀的 [...]，去掉空白 */
function firstList(line: string): string | undefined {
  return /\[[^[\]]*\]/.exec(line)?.[0].replace(/\s+/g, '');
}

/**
 * 講解裡第一個 [...] 是答案、不是輸入的題目，或是故意用另一種寫法的（例如設計題放一開始的狀態），
 * 不檢查。新增題目時先試著讓範例跟講解一致，真的不行才加在這裡，寫清楚原因
 */
const ANSWER_FIRST = new Set<number>([
  131, // [["a","a","b"], ...] 是分割出來的答案
  138, // map[C] 是程式碼
  338, // bits[5] 是程式碼
  438, // [0, 6] 是答案
]);

describe('problem examples for the whiteboard', () => {
  it('has one for every built-in problem and nothing else', () => {
    const builtin = BUILTIN_PROBLEMS.map((p) => p.id).sort((a, b) => a - b);
    const written = Object.keys(PROBLEM_EXAMPLES)
      .map(Number)
      .sort((a, b) => a - b);
    expect(written).toEqual(builtin);
  });

  it('draws every example on the whiteboard without a parse error', () => {
    const broken = Object.entries(PROBLEM_EXAMPLES).flatMap(([id, text]) => {
      const result = insertExample(EMPTY_DOC, text, { x: 0, y: 0 });
      return 'error' in result ? [`${id}: ${result.error}`] : [];
    });
    expect(broken).toEqual([]);
  });

  it('uses the same data as the reference explanation’s example', () => {
    const differ = Object.entries(PROBLEM_EXAMPLES).flatMap(([id, text]) => {
      if (ANSWER_FIRST.has(Number(id))) return [];
      const line = EXPLANATIONS_EN[Number(id)].split('\n').find((l) => l.startsWith('For example')) ?? '';
      const list = firstList(line);
      return list && !text.replace(/\s+/g, '').includes(list) ? [`${id}: ${list}`] : [];
    });
    expect(differ).toEqual([]);
  });
});
