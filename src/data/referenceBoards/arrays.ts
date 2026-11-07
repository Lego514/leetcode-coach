import type { BoardDoc } from 'dsa-whiteboard';
import { array, board, complexity, dict, lines, note, pointer, range, stack, variable, type CellColor } from './build';

// 參考板書：陣列與雜湊、雙指標、滑動視窗、堆疊、二分搜尋。
// 版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 1. Two Sum ----------

export function twoSum(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(1);
  const target = variable('target', 220, 22, 'target', '9');
  const nums = (colors?: (CellColor | null)[]) => array('nums', 0, 0, 'nums', ['2', '7', '11', '15'], colors);
  const result = complexity('cx', 440, 110, 'n', 'one pass through the array', 'n', 'seen holds up to n numbers');
  const found = [
    nums(['green', 'green', null, null]),
    target,
    pointer('i', 'i', 'nums', 1),
    variable('need', 220, 72, 'need', '9 - 7 = 2'),
    dict('seen', 0, 150, 'seen', [['2', '0']]),
    variable('ans', 220, 122, 'return', '[0, 1]'),
  ];
  return board([
    { caption: insight, elements: [nums(), target] },
    { caption: structure, elements: [nums(), target, variable('empty', 0, 170, 'seen', '{}')] },
    {
      caption: 'i = 0: need is 9 - 2 = 7, which isn’t in seen yet, so I store 2 → 0 and move on.',
      elements: [
        nums(['yellow', null, null, null]),
        target,
        pointer('i', 'i', 'nums', 0),
        variable('need', 220, 72, 'need', '9 - 2 = 7'),
        dict('seen', 0, 150, 'seen', [['2', '0']]),
      ],
    },
    { caption: example, elements: found },
    { caption: cost, elements: [...found, result] },
    { caption: edge, elements: [...found, result, note('edge', 460, 22, 'Look up first, then insert: x never pairs with itself.')] },
  ]);
}

// ---------- 11. Container With Most Water ----------

export function containerWithMostWater(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(11);
  const items = ['1', '8', '6', '2', '5', '4', '8', '3', '7'];
  const height = (colors?: (CellColor | null)[]) => array('height', 0, 0, 'height', items, colors);
  const at = (l: number, r: number) => [pointer('l', 'l', 'height', l), pointer('r', 'r', 'height', r), range('window', 'l', 'r')];
  const best = [
    height([null, 'green', null, null, null, null, null, null, 'green']),
    ...at(1, 8),
    variable('area', 440, 22, 'area', 'min(8, 7) * 7 = 49'),
    variable('best', 440, 72, 'best', '49'),
  ];
  const result = complexity('cx', 440, 130, 'n', 'each step moves one pointer inward', '1', 'just two pointers and best');
  return board([
    { caption: insight, elements: [height()] },
    { caption: structure, elements: [height(), ...at(0, 8)] },
    {
      caption: 'l = 0, r = 8: area is min(1, 7) × 8 = 8. The 1 is the shorter line, so l moves right.',
      elements: [height(['yellow', null, null, null, null, null, null, null, null]), ...at(0, 8), variable('area', 440, 22, 'area', 'min(1, 7) * 8 = 8'), variable('best', 440, 72, 'best', '8')],
    },
    { caption: example, elements: best },
    { caption: cost, elements: [...best, result] },
    { caption: edge, elements: [...best, result, note('edge', 0, 150, 'Equal heights: moving either pointer is fine.')] },
  ]);
}

// ---------- 3. Longest Substring Without Repeating Characters ----------

export function longestSubstring(): BoardDoc {
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
    { caption: structure, elements: [s(), variable('empty', 420, 22, 'last', '{}')] },
    { caption: 'r = 0 to 2: a, b, and c are all new, so the window grows to "abc" and best becomes 3.', elements: grown },
    { caption: example, elements: moved },
    { caption: cost, elements: [...moved, result] },
    { caption: edge, elements: [...moved, result, note('edge', 620, 120, 'l = max(l, last[c] + 1): l only moves forward.')] },
  ]);
}

// ---------- 20. Valid Parentheses ----------

export function validParentheses(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(20);
  const s = (colors?: (CellColor | null)[]) => array('s', 0, 0, 's', ['(', '[', ']', ')'], colors);
  const done = [s(['green', 'green', 'green', 'green']), pointer('i', 'i', 's', 3), stack('stack', 240, 0, 'stack', []), variable('valid', 320, 22, 'valid', 'True')];
  const result = complexity('cx', 480, 0, 'n', 'each bracket is pushed or popped once', 'n', 'the stack can hold every opener');
  return board([
    { caption: insight, elements: [s()] },
    { caption: structure, elements: [s(), stack('stack', 240, 0, 'stack', [])] },
    { caption: 'i = 0, 1: ( and [ are openers, so I push them.', elements: [s(), pointer('i', 'i', 's', 1), stack('stack', 240, 0, 'stack', ['(', '['])] },
    {
      caption: 'i = 2: ] matches the [ on top, so I pop it.',
      elements: [s([null, 'green', 'green', null]), pointer('i', 'i', 's', 2), stack('stack', 240, 0, 'stack', ['('])],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    { caption: edge, elements: [...done, result, note('edge', 480, 120, 'A closer with an empty stack, or openers left at the end: invalid.', 300)] },
  ]);
}

// ---------- 739. Daily Temperatures ----------

export function dailyTemperatures(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(739);
  const items = ['73', '74', '75', '71', '69', '72', '76', '73'];
  const temps = (colors?: (CellColor | null)[]) => array('temps', 0, 0, 'temperatures', items, colors);
  const answer = (values: string[]) => array('answer', 0, 150, 'answer', values);
  const waiting = [
    temps(['green', null, null, 'yellow', null, 'green', null, null]),
    pointer('i', 'i', 'temps', 5),
    stack('stack', 400, 0, 'stack', ['2', '5']),
    answer(['1', '1', '0', '2', '1', '0', '0', '0']),
  ];
  const result = complexity('cx', 470, 0, 'n', 'each index is pushed and popped once', 'n', 'the stack of indices');
  return board([
    { caption: insight, elements: [temps()] },
    { caption: structure, elements: [temps(), stack('stack', 400, 0, 'stack', []), answer(['0', '0', '0', '0', '0', '0', '0', '0'])] },
    {
      caption: 'i = 1, 2: each day is warmer than the index on top, so I pop it and record the wait: answer[0] = 1, answer[1] = 1.',
      elements: [temps(), pointer('i', 'i', 'temps', 2), stack('stack', 400, 0, 'stack', ['2']), answer(['1', '1', '0', '0', '0', '0', '0', '0'])],
    },
    {
      caption: 'i = 3, 4: 71 and 69 are colder, so their indices wait on the stack.',
      elements: [temps(), pointer('i', 'i', 'temps', 4), stack('stack', 400, 0, 'stack', ['2', '3', '4']), answer(['1', '1', '0', '0', '0', '0', '0', '0'])],
    },
    { caption: example, elements: waiting },
    { caption: cost, elements: [...waiting, result] },
    { caption: edge, elements: [...waiting, result, note('edge', 470, 130, 'Days still on the stack at the end never warm up: answer stays 0.')] },
  ]);
}

// ---------- 704. Binary Search ----------

export function binarySearch(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(704);
  const nums = (colors?: (CellColor | null)[]) => array('nums', 0, 0, 'nums', ['-1', '0', '3', '5', '9', '12'], colors);
  const target = variable('target', 300, 22, 'target', '9');
  const bounds = (l: number, r: number) => [pointer('left', 'left', 'nums', l), pointer('right', 'right', 'nums', r), range('window', 'left', 'right')];
  const found = [nums(['gray', 'gray', 'gray', null, 'green', null]), target, ...bounds(3, 5), pointer('mid', 'mid', 'nums', 4), variable('midv', 300, 72, 'mid', '(3 + 5) // 2 = 4')];
  const result = complexity('cx', 540, 0, 'log n', 'each step halves the range', '1', 'just three indices');
  return board([
    { caption: insight, elements: [nums(), target] },
    { caption: structure, elements: [nums(), target, ...bounds(0, 5)] },
    {
      caption: 'mid = (0 + 5) // 2 = 2: nums[2] is 3, smaller than 9, so the answer can’t be at or left of 2. left = mid + 1.',
      elements: [nums(['gray', 'gray', 'gray', null, null, null]), target, ...bounds(0, 5), pointer('mid', 'mid', 'nums', 2), variable('midv', 300, 72, 'mid', '(0 + 5) // 2 = 2')],
    },
    { caption: example, elements: found },
    { caption: cost, elements: [...found, result] },
    { caption: edge, elements: [...found, result, note('edge', 540, 120, 'Not there: left passes right and I return -1.')] },
  ]);
}
