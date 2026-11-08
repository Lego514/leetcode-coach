import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, bits, complexity, note, pointer, variable, walk, type CellColor, type Colors } from './build';

// 參考板書：位元運算。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 136. Single Number ----------

function singleNumber(): BoardDoc {
  const nums = (colors?: Colors) => array('n', 0, 0, 'nums', ['4', '1', '2', '1', '2'], colors);
  const x = (i: number, value: string) => [pointer('i', 'i', 'n', i), variable('x', 260, 0, 'xor', value)];
  return walk(136, {
    open: [nums()],
    setup: [nums(), ...x(0, '0 ^ 4 = 4')],
    before: [{ caption: '4 ^ 1 ^ 2 = 7 so far: the 1 and 2 are still waiting for their pairs.', elements: [nums(), ...x(2, '7')] }],
    result: [nums(['green', 'gray', 'gray', 'gray', 'gray']), ...x(4, '4')],
    cx: complexity('cx', 260, 60, 'n', 'one pass', '1', 'one number'),
    edge: note('edge', 260, 200, 'Negative numbers XOR the same way.'),
  });
}

// ---------- 191. Number of 1 Bits ----------

function hammingWeight(): BoardDoc {
  const n = (items: string[]) => bits('n', 0, 0, 'n', items);
  const count = (value: string) => variable('c', 220, 0, 'count', value);
  return walk(191, {
    open: [n(['1', '0', '1', '1'])],
    setup: [n(['1', '0', '1', '1']), variable('rule', 220, 0, 'n & (n - 1)', 'clears the lowest 1')],
    before: [{ caption: '1011 & 1010 = 1010: one bit gone.', elements: [n(['1', '0', '1', '0']), count('1')] }],
    result: [n(['0', '0', '0', '0']), count('3')],
    cx: complexity('cx', 220, 60, 'set bits', 'one loop per 1', '1', 'a counter'),
    edge: note('edge', 220, 200, 'Unsigned 32-bit input: no sign to handle in Python.'),
  });
}

// ---------- 338. Counting Bits ----------

function countBits(): BoardDoc {
  const out = (items: string[], colors?: Colors) => array('b', 0, 0, 'bits[i]', items, colors);
  return walk(338, {
    open: [variable('n', 0, 0, 'n', '5')],
    setup: [out(['0', '', '', '', '', '']), variable('rule', 0, 140, 'bits[i]', 'bits[i >> 1] + (i & 1)')],
    before: [{ caption: 'bits[2] = bits[1] + 0 = 1, bits[3] = bits[1] + 1 = 2.', elements: [out(['0', '1', '1', '2'])] }],
    result: [out(['0', '1', '1', '2', '1', '2'], [null, null, 'yellow', null, null, 'green']), variable('rule', 0, 140, 'bits[5]', 'bits[2] + 1 = 2')],
    cx: complexity('cx', 300, 0, 'n', 'one step per number', 'n', 'the output'),
    edge: note('edge', 300, 130, 'n = 0: [0].'),
  });
}

// ---------- 190. Reverse Bits ----------

function reverseBits(): BoardDoc {
  const input = '00000010100101000001111010011100';
  const output = [...input].reverse().join('');
  const row = (id: string, y: number, label: string, text: string, colors?: Colors) => bits(id, 0, y, label, [...text], colors);
  const half = (text: string, from: number) => text.slice(from, from + 16);
  const n = [row('n1', 0, 'n, bits 31–16', half(input, 0)), row('n2', 100, 'n, bits 15–0', half(input, 16), [...Array<CellColor | null>(15).fill(null), 'yellow'])];
  return walk(190, {
    open: n,
    setup: [...n, variable('loop', 0, 210, '32 times', 'res = (res << 1) | (n & 1); n >>= 1')],
    result: [...n, row('r1', 210, 'result, bits 31–16', half(output, 0), ['yellow']), row('r2', 310, 'result, bits 15–0', half(output, 16))],
    cx: complexity('cx', 0, 420, '1', 'always 32 steps', '1', 'one number'),
    edge: note('edge', 380, 420, 'Leading zeros become trailing zeros: loop all 32 times.'),
  });
}

// ---------- 268. Missing Number ----------

function missingNumber(): BoardDoc {
  const nums = array('n', 0, 0, 'nums', ['3', '0', '1']);
  return walk(268, {
    open: [nums],
    setup: [nums, variable('x', 180, 0, 'start', 'x = n = 3')],
    before: [{ caption: 'XOR each index with each value: 3 ^ (0 ^ 3) ^ (1 ^ 0) ^ (2 ^ 1).', elements: [nums, variable('x', 180, 0, 'pairs cancel', '0, 1, 3 twice')] }],
    result: [nums, variable('x', 180, 0, 'left over', '2')],
    cx: complexity('cx', 180, 60, 'n', 'one pass', '1', 'one number'),
    edge: note('edge', 180, 200, 'Missing n itself: starting from x = n covers it.'),
  });
}

// ---------- 67. Add Binary ----------

function addBinary(): BoardDoc {
  const a = bits('a', 44, 0, 'a', ['1', '1']);
  const b = bits('b', 44, 100, 'b', ['0', '1']);
  const sum = (items: string[], colors?: Colors) => bits('s', 0, 200, 'sum', items, colors);
  return walk(67, {
    open: [a, b],
    setup: [a, b, variable('c', 200, 0, 'carry', '0')],
    before: [{ caption: 'Last bits: 1 + 1 = 10, so write 0 and carry 1.', elements: [a, b, variable('c', 200, 0, 'carry', '1'), sum(['', '', '0'])] }],
    result: [a, b, variable('c', 200, 0, 'carry', '1 → new front bit'), sum(['1', '0', '0'], ['yellow'])],
    cx: complexity('cx', 200, 60, 'max(m, n)', 'one bit per step', 'max(m, n)', 'the result'),
    edge: note('edge', 200, 200, 'A final carry adds a 1 in front.'),
  });
}

// ---------- 371. Sum of Two Integers ----------

function getSum(): BoardDoc {
  const row = (id: string, y: number, label: string, items: string[]) => bits(id, 0, y, label, items);
  return walk(371, {
    open: [row('a', 0, 'a = 2', ['0', '1', '0']), row('b', 100, 'b = 3', ['0', '1', '1'])],
    setup: [row('a', 0, 'xor', ['0', '0', '1']), row('b', 100, 'carry', ['1', '0', '0'])],
    before: [{ caption: 'Round 1: 010 ^ 011 = 001, and the carry 010 shifts to 100.', elements: [row('a', 0, 'a', ['0', '0', '1']), row('b', 100, 'b', ['1', '0', '0'])] }],
    result: [row('a', 0, 'a', ['1', '0', '1']), row('b', 100, 'b', ['0', '0', '0']), variable('ans', 200, 22, 'answer', '101 = 5')],
    cx: complexity('cx', 200, 80, '1', 'at most 32 rounds', '1', 'two numbers'),
    edge: note('edge', 200, 220, 'Python ints are unbounded: mask to 32 bits.'),
  });
}

// ---------- 7. Reverse Integer ----------

function reverseInteger(): BoardDoc {
  const state = (x: string, rev: string) => [variable('x', 0, 0, 'x', x), variable('r', 0, 50, 'reversed', rev)];
  return walk(7, {
    open: [variable('x', 0, 0, 'x', '-123')],
    setup: [...state('123', '0'), variable('s', 0, 100, 'sign', '-1')],
    before: [{ caption: 'Pop 3, then 2: reversed = 32.', elements: [...state('1', '32'), variable('s', 0, 100, 'sign', '-1')] }],
    result: [...state('0', '321'), variable('s', 0, 100, 'answer', '-321')],
    cx: complexity('cx', 260, 0, 'log n', 'one step per digit', '1', 'two numbers'),
    edge: note('edge', 260, 130, 'Overflow, like 1534236469: return 0.'),
  });
}

export const BOARDS: ReferenceBoards = {
  136: singleNumber,
  191: hammingWeight,
  338: countBits,
  190: reverseBits,
  268: missingNumber,
  67: addBinary,
  371: getSum,
  7: reverseInteger,
};
