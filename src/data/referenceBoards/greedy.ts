import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, complexity, note, pointer, table, variable, walk, type CellColor, type Colors } from './build';

// 參考板書：貪婪。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 53. Maximum Subarray ----------

function maxSubArray(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['-2', '1', '-3', '4', '-1', '2', '1', '-5', '4'], colors);
  const state = (i: number, cur: string, best: string) => [pointer('i', 'i', 'nums', i), variable('cur', 0, 150, 'ending here', cur), variable('best', 0, 200, 'best', best)];
  return walk(53, {
    open: [nums()],
    setup: [nums(), ...state(0, '-2', '-2')],
    before: [{ caption: 'At 4: the running sum so far is -2, so starting fresh at 4 is better.', elements: [nums([null, null, null, 'yellow']), ...state(3, 'max(4, -2 + 4) = 4', '4')] }],
    result: [nums([null, null, null, 'green', 'green', 'green', 'green']), ...state(6, '6', '4 - 1 + 2 + 1 = 6')],
    cx: complexity('cx', 440, 0, 'n', 'one pass', '1', 'two sums'),
    edge: note('edge', 440, 130, 'All negative: the best is the largest single number.'),
  });
}

// ---------- 55. Jump Game ----------

function canJump(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['3', '2', '1', '0', '4'], colors);
  const far = (i: number, value: string) => [pointer('i', 'i', 'nums', i), variable('far', 260, 0, 'farthest', value)];
  return walk(55, {
    open: [nums()],
    setup: [nums(), ...far(0, '0 + 3 = 3')],
    before: [{ caption: 'i = 1, 2, 3: 1 + 2, 2 + 1, and 3 + 0 all reach only index 3.', elements: [nums([null, null, null, 'yellow']), ...far(3, '3')] }],
    result: [nums([null, null, null, 'red', 'gray']), ...far(4, '3 < 4: stuck'), variable('ans', 260, 50, 'return', 'False')],
    cx: complexity('cx', 260, 110, 'n', 'one pass', '1', 'one number'),
    edge: note('edge', 260, 250, 'One element: already at the end.'),
  });
}

// ---------- 45. Jump Game II ----------

function jump(): BoardDoc {
  const nums = (colors?: Colors) => array('nums', 0, 0, 'nums', ['2', '3', '1', '1', '4'], colors);
  const state = (i: number, end: string, far: string, jumps: string) => [
    pointer('i', 'i', 'nums', i),
    variable('end', 260, 0, 'range end', end),
    variable('far', 260, 50, 'farthest', far),
    variable('j', 260, 100, 'jumps', jumps),
  ];
  return walk(45, {
    open: [nums()],
    setup: [nums(), ...state(0, '0', '2', '0')],
    before: [{ caption: 'i = 0 is the end of range 1: jump once, and the new range ends at 2.', elements: [nums(['green', 'yellow', 'yellow']), ...state(0, '2', '2', '1')] }],
    result: [nums(['green', 'green', null, null, 'green']), ...state(2, '4', '1 + 3 = 4', '2')],
    cx: complexity('cx', 480, 0, 'n', 'one pass', '1', 'three numbers'),
    edge: note('edge', 480, 130, 'Stop before the last index: no extra jump.'),
  });
}

// ---------- 134. Gas Station ----------

function canCompleteCircuit(): BoardDoc {
  const gas = array('gas', 0, 0, 'gas', ['1', '2', '3', '4', '5']);
  const cost = array('cost', 0, 110, 'cost', ['3', '4', '5', '1', '2']);
  const diff = (colors?: Colors) => array('d', 0, 220, 'gas - cost', ['-2', '-2', '-2', '3', '3'], colors);
  return walk(134, {
    open: [gas, cost],
    setup: [gas, cost, diff(), variable('t', 260, 0, 'total', '15 - 15 = 0')],
    before: [{ caption: 'The tank goes negative at 0, 1, and 2, so the start moves past each.', elements: [gas, cost, diff(['red', 'red', 'red']), variable('t', 260, 0, 'start', '3')] }],
    result: [gas, cost, diff(['gray', 'gray', 'gray', 'green', 'green']), variable('t', 260, 0, 'start', '3'), variable('tank', 260, 50, 'tank from 3', '3 + 3 = 6')],
    cx: complexity('cx', 260, 110, 'n', 'one pass', '1', 'tank and total'),
    edge: note('edge', 260, 250, 'Total gas < total cost: return -1.'),
  });
}

// ---------- 846. Hand of Straights ----------

function isNStraightHand(): BoardDoc {
  const count = (values: string[]) => table('c', 0, 0, 'count', [['1', '2', '3', '4', '6', '7', '8'], values]);
  const groups = [array('g1', 0, 140, 'group 1', ['1', '2', '3']), array('g2', 160, 140, 'group 2', ['2', '3', '4']), array('g3', 320, 140, 'group 3', ['6', '7', '8'])];
  return walk(846, {
    open: [array('h', 0, 0, 'hand', ['1', '2', '3', '6', '2', '3', '4', '7', '8'])],
    setup: [count(['1', '2', '2', '1', '1', '1', '1'])],
    before: [{ caption: 'The smallest card, 1, starts a group: take 1, 2, 3.', elements: [count(['0', '1', '1', '1', '1', '1', '1']), groups[0]] }],
    result: [count(['0', '0', '0', '0', '0', '0', '0']), ...groups],
    cx: complexity('cx', 500, 0, 'n log n', 'sorting the cards', 'n', 'the counts'),
    edge: note('edge', 500, 130, 'Hand size not divisible by groupSize: False.'),
  });
}

// ---------- 1899. Merge Triplets to Form Target Triplet ----------

function mergeTriplets(): BoardDoc {
  const trips = (marks: string[]) =>
    table('t', 0, 0, 'triplets', [
      ['2', '5', '3', marks[0]],
      ['1', '8', '4', marks[1]],
      ['1', '7', '5', marks[2]],
    ]);
  const target = variable('target', 300, 0, 'target', '[2, 7, 5]');
  return walk(1899, {
    open: [trips(['', '', '']), target],
    setup: [trips(['', 'skip', '']), target, variable('why', 300, 50, '8 > 7', 'never usable')],
    result: [trips(['1', 'skip', '2 & 3']), target, variable('got', 300, 50, 'matched', 'all three: True')],
    cx: complexity('cx', 300, 110, 'n', 'one pass', '1', 'three flags'),
    edge: note('edge', 300, 250, 'Matches one value but exceeds another: skip it.'),
  });
}

// ---------- 763. Partition Labels ----------

function partitionLabels(): BoardDoc {
  const part = (id: string, y: number, label: string, text: string, color?: CellColor) => array(id, 0, y, label, [...text], color ? [...text].map(() => color) : undefined);
  const parts = [part('p1', 0, 'part 1', 'ababcbaca', 'blue'), part('p2', 110, 'part 2', 'defegde', 'yellow'), part('p3', 220, 'part 3', 'hijhklij', 'green')];
  return walk(763, {
    open: [variable('s', 0, 0, 's', '"ababcbacadefegdehijhklij"')],
    setup: [variable('s', 0, 0, 's', '"ababcbacadefegdehijhklij"'), variable('last', 0, 50, 'last index', 'a 8, b 5, c 7, d 14, e 15, …')],
    before: [{ caption: 'Start at a: its last index is 8, and nothing inside goes past 8, so part 1 ends there.', elements: [parts[0]] }],
    result: [...parts, variable('ans', 0, 330, 'sizes', '[9, 7, 8]')],
    cx: complexity('cx', 440, 0, 'n', 'two passes', '1', '26 last indices'),
    edge: note('edge', 440, 130, 'A letter that appears once can be a part alone.'),
  });
}

// ---------- 678. Valid Parenthesis String ----------

function checkValidString(): BoardDoc {
  const s = array('s', 0, 0, 's', ['(', '*', ')', ')']);
  const range = (lo: string[], hi: string[]) => [array('lo', 0, 110, 'low', lo), array('hi', 0, 220, 'high', hi)];
  return walk(678, {
    open: [s],
    setup: [s, ...range(['1'], ['1'])],
    before: [{ caption: 'The *: low drops to 0, high rises to 2.', elements: [s, ...range(['1', '0'], ['1', '2'])] }],
    result: [s, ...range(['1', '0', '0', '0'], ['1', '2', '1', '0']), variable('ans', 220, 0, 'low = 0 at the end', 'True')],
    cx: complexity('cx', 480, 0, 'n', 'one pass', '1', 'two counts'),
    edge: note('edge', 480, 130, 'high < 0: too many ), return False now.'),
  });
}

// ---------- 179. Largest Number ----------

function largestNumber(): BoardDoc {
  return walk(179, {
    open: [array('n', 0, 0, 'nums', ['3', '30', '34', '5', '9'])],
    setup: [array('n', 0, 0, 'nums', ['3', '30', '34', '5', '9']), variable('cmp', 260, 0, '"3" vs "30"', '"330" > "303": 3 first')],
    result: [array('n', 0, 0, 'sorted', ['9', '5', '34', '3', '30'], ['green', 'green', 'green', 'green', 'green']), variable('ans', 260, 0, 'joined', '"9534330"')],
    cx: complexity('cx', 260, 60, 'n log n', 'comparisons, k digits each', 'n', 'the strings'),
    edge: note('edge', 260, 200, '[0, 0]: return "0", not "00".'),
  });
}

export const BOARDS: ReferenceBoards = {
  53: maxSubArray,
  55: canJump,
  45: jump,
  134: canCompleteCircuit,
  846: isNStraightHand,
  1899: mergeTriplets,
  763: partitionLabels,
  678: checkValidString,
  179: largestNumber,
};
