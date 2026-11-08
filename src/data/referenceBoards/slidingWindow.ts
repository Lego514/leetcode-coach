import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, dict, lines, note, pointer, queue, range, table, variable, walk, type CellColor, type Colors } from './build';

// 參考板書：滑動視窗。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 3. Longest Substring Without Repeating Characters ----------

function longestSubstring(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(3);
  const s = (colors?: (CellColor | null)[]) => array('s', 0, 0, 's', ['a', 'b', 'c', 'a', 'b', 'c', 'b', 'b'], colors);
  const window = (l: number, r: number) => [pointer('l', 'l', 's', l), pointer('r', 'r', 's', r), range('window', 'l', 'r')];
  const grown = [
    s(),
    ...window(0, 2),
    dict('last', 420, 0, 'last', [
      ['a', '0'],
      ['b', '1'],
      ['c', '2'],
    ]),
    variable('best', 0, 140, 'best', '3'),
  ];
  const moved = [
    s(['gray', null, null, 'yellow', null, null, null, null]),
    ...window(1, 3),
    dict('last', 420, 0, 'last', [
      ['a', '3'],
      ['b', '1'],
      ['c', '2'],
    ]),
    variable('best', 0, 140, 'best', '3'),
  ];
  const result = complexity('cx', 620, 0, 'n', 'each index enters and leaves once', 'k', 'one entry per letter of the alphabet');
  return board([
    { caption: insight, elements: [s()] },
    {
      caption: structure,
      elements: [s(), variable('empty', 420, 22, 'last', '{}')],
    },
    {
      caption: 'r = 0 to 2: a, b, and c are all new, so the window grows to "abc" and best becomes 3.',
      elements: grown,
    },
    { caption: example, elements: moved },
    { caption: cost, elements: [...moved, result] },
    {
      caption: edge,
      elements: [...moved, result, note('edge', 620, 140, 'l = max(l, last[c] + 1): l only moves forward.')],
    },
  ]);
}

// ---------- 121. Best Time to Buy and Sell Stock ----------

function bestTimeToBuy(): BoardDoc {
  const prices = (colors?: Colors) => array('prices', 0, 0, 'prices', ['7', '1', '5', '3', '6', '4'], colors);
  const state = (i: number, low: string, best: string) => [pointer('i', 'i', 'prices', i), variable('low', 300, 0, 'min_price', low), variable('best', 300, 50, 'best', best)];
  return walk(121, {
    open: [prices()],
    setup: [prices(), ...state(0, '7', '0')],
    before: [{ caption: 'i = 1: 1 is a new minimum. i = 2: selling at 5 would make 4.', elements: [prices([null, 'yellow', 'green', null, null, null]), ...state(2, '1', '5 - 1 = 4')] }],
    result: [prices([null, 'yellow', null, null, 'green', null]), ...state(4, '1', '6 - 1 = 5')],
    cx: complexity('cx', 520, 0, 'n', 'one pass', '1', 'a minimum and a best'),
    edge: note('edge', 520, 130, 'Prices only go down: best stays 0.'),
  });
}

// ---------- 424. Longest Repeating Character Replacement ----------

function characterReplacement(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['A', 'A', 'B', 'A', 'B', 'B', 'A'], colors);
  const window = (l: number, r: number) => [pointer('l', 'l', 's', l), pointer('r', 'r', 's', r), range('window', 'l', 'r')];
  const count = (a: string, b: string) =>
    table('count', 0, 170, 'count', [
      ['A', 'B'],
      [a, b],
    ]);
  const k = variable('k', 340, 0, 'k', '1');
  return walk(424, {
    open: [s(), k],
    setup: [s(), k, ...window(0, 0), count('1', '0')],
    before: [{ caption: 'r = 2: "AAB" has 2 As, so 3 - 2 = 1 letter must change. That’s within k.', elements: [s(), k, ...window(0, 2), count('2', '1'), variable('best', 160, 170, 'best', '3')] }],
    result: [s(['green', 'green', 'yellow', 'green']), k, ...window(0, 3), count('3', '1'), variable('chg', 160, 170, 'changes', '4 - 3 = 1'), variable('best', 160, 225, 'best', '4')],
    cx: complexity('cx', 480, 0, 'n', 'each pointer moves forward only', '1', '26 counts'),
    edge: note('edge', 480, 130, 'A stale max count is fine: the answer only grows with a bigger count.'),
  });
}

// ---------- 567. Permutation in String ----------

function permutationInString(): BoardDoc {
  const s2 = (colors?: Colors) => array('s2', 0, 0, 's2', ['e', 'i', 'd', 'b', 'a', 'o', 'o', 'o'], colors);
  const window = (l: number) => [pointer('l', 'l', 's2', l), pointer('r', 'r', 's2', l + 1), range('window', 'l', 'r')];
  const need = table('need', 0, 150, 'need (s1 = "ab")', [
    ['a', 'b'],
    ['1', '1'],
  ]);
  const have = (a: string, b: string) =>
    table('have', 160, 150, 'window', [
      ['a', 'b'],
      [a, b],
    ]);
  return walk(567, {
    open: [s2(), variable('s1', 0, 150, 's1', '"ab"')],
    setup: [s2(), ...window(0), need, have('0', '0')],
    before: [{ caption: 'Slide to "db": only b matches, a is still 0.', elements: [s2(), ...window(2), need, have('0', '1')] }],
    result: [s2([null, null, null, 'green', 'green', null, null, null]), ...window(3), need, have('1', '1'), variable('ans', 320, 172, 'return', 'True')],
    cx: complexity('cx', 400, 0, 'n', 'each slide updates two counts', '1', '26 counts'),
    edge: note('edge', 520, 150, 's1 longer than s2: never a match.', 200),
  });
}

// ---------- 438. Find All Anagrams in a String ----------

function findAnagrams(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['c', 'b', 'a', 'e', 'b', 'a', 'b', 'a', 'c', 'd'], colors);
  const window = (l: number) => [pointer('l', 'l', 's', l), pointer('r', 'r', 's', l + 2), range('window', 'l', 'r')];
  const need = table('need', 0, 150, 'need (p = "abc")', [
    ['a', 'b', 'c'],
    ['1', '1', '1'],
  ]);
  return walk(438, {
    open: [s(), variable('p', 0, 150, 'p', '"abc"')],
    setup: [s(['green', 'green', 'green']), ...window(0), need, variable('ans', 220, 172, 'answer', '[0]')],
    before: [{ caption: 'Windows starting at 1 to 5 each have an e, or two of one letter: no match.', elements: [s(), ...window(4), need, variable('ans', 220, 172, 'answer', '[0]')] }],
    result: [s([null, null, null, null, null, null, 'green', 'green', 'green', null]), ...window(6), need, variable('ans', 220, 172, 'answer', '[0, 6]')],
    cx: complexity('cx', 480, 0, 'n', 'each slide updates two counts', '1', '26 counts'),
    edge: note('edge', 480, 140, 'p longer than s: return [].'),
  });
}

// ---------- 76. Minimum Window Substring ----------

function minWindow(): BoardDoc {
  const chars = [...'ADOBECODEBANC'];
  const s = (colors?: Colors) => array('s', 0, 0, 's', chars, colors);
  const window = (l: number, r: number) => [pointer('l', 'l', 's', l), pointer('r', 'r', 's', r), range('window', 'l', 'r')];
  const need = table('need', 0, 170, 'need (t = "ABC")', [
    ['A', 'B', 'C'],
    ['1', '1', '1'],
  ]);
  const status = (have: string, best: string) => [variable('have', 230, 170, 'have', have), variable('best', 230, 225, 'best', best)];
  const abc = (from: number, to: number): Colors => chars.map((c, i) => (i >= from && i <= to && 'ABC'.includes(c) ? 'green' : null));
  return walk(76, {
    open: [s(), variable('t', 0, 170, 't', '"ABC"')],
    setup: [s(), ...window(0, 0), need, ...status('1 of 3', '—')],
    before: [{ caption: 'r = 5: "ADOBEC" covers A, B, and C. Moving l would drop the A, so this window is 6 long.', elements: [s(abc(0, 5)), ...window(0, 5), need, ...status('3 of 3', '"ADOBEC"')] }],
    result: [s(abc(9, 12)), ...window(9, 12), need, ...status('3 of 3', '"BANC"')],
    cx: complexity('cx', 610, 0, 'm + n', 'both pointers only move forward', 'k', 'counts of needed letters'),
    edge: note('edge', 610, 130, 't = "AA" needs counts, not a set.'),
  });
}

// ---------- 239. Sliding Window Maximum ----------

function maxSlidingWindow(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['1', '3', '-1', '-3', '5', '3', '6', '7'], colors);
  const window = (r: number) => [pointer('l', 'l', 'nums', r - 2), pointer('r', 'r', 'nums', r), range('window', 'l', 'r')];
  const deque = (items: string[]) => queue('dq', 0, 150, 'deque', items);
  const out = (items: string[]) => array('out', 200, 150, 'max', items);
  return walk(239, {
    open: [nums(), variable('k', 390, 0, 'k', '3')],
    setup: [nums(), deque([]), out([])],
    before: [
      { caption: 'i = 0 to 2: 3 pops 1, and -1 is smaller so it waits behind. The front, 3, is the first max.', elements: [nums([null, 'green']), ...window(2), deque(['1', '2']), out(['3'])] },
      { caption: 'i = 4: 5 pops -3, -1, and 3, so it is alone at the front.', elements: [nums([null, null, null, null, 'green']), ...window(4), deque(['4']), out(['3', '3', '5'])] },
    ],
    result: [nums([null, null, null, null, null, null, null, 'green']), ...window(7), deque(['7']), out(['3', '3', '5', '5', '6', '7'])],
    cx: complexity('cx', 390, 0, 'n', 'each index pushed and popped once', 'k', 'the deque'),
    edge: note('edge', 500, 140, 'Drop the front once it slides out of the window.', 220),
  });
}

export const BOARDS: ReferenceBoards = {
  3: longestSubstring,
  121: bestTimeToBuy,
  424: characterReplacement,
  567: permutationInString,
  438: findAnagrams,
  76: minWindow,
  239: maxSlidingWindow,
};
