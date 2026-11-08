import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, dict, lines, note, pointer, recursion, stack, table, variable, walk, type CellColor, type Colors } from './build';

// 參考板書：堆疊。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 20. Valid Parentheses ----------

function validParentheses(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(20);
  const s = (colors?: (CellColor | null)[]) => array('s', 0, 0, 's', ['(', '[', ']', ')'], colors);
  const done = [s(['green', 'green', 'green', 'green']), pointer('i', 'i', 's', 3), stack('stack', 240, 0, 'stack', []), variable('valid', 320, 22, 'valid', 'True')];
  const result = complexity('cx', 480, 0, 'n', 'each bracket is pushed or popped once', 'n', 'the stack can hold every opener');
  return board([
    { caption: insight, elements: [s()] },
    {
      caption: structure,
      elements: [s(), stack('stack', 240, 0, 'stack', [])],
    },
    {
      caption: 'i = 0, 1: ( and [ are openers, so I push them.',
      elements: [s(), pointer('i', 'i', 's', 1), stack('stack', 240, 0, 'stack', ['(', '['])],
    },
    {
      caption: 'i = 2: ] matches the [ on top, so I pop it.',
      elements: [s([null, 'green', 'green', null]), pointer('i', 'i', 's', 2), stack('stack', 240, 0, 'stack', ['('])],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    {
      caption: edge,
      elements: [...done, result, note('edge', 480, 140, 'A closer with an empty stack, or openers left at the end: invalid.', 300)],
    },
  ]);
}

// ---------- 739. Daily Temperatures ----------

function dailyTemperatures(): BoardDoc {
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
    {
      caption: structure,
      elements: [temps(), stack('stack', 400, 0, 'stack', []), answer(['0', '0', '0', '0', '0', '0', '0', '0'])],
    },
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
    {
      caption: edge,
      elements: [...waiting, result, note('edge', 470, 140, 'Days still on the stack at the end never warm up: answer stays 0.')],
    },
  ]);
}

// ---------- 232. Implement Queue using Stacks ----------

function queueWithStacks(): BoardDoc {
  const stacks = (input: string[], output: string[]) => [stack('in', 0, 0, 'in', input), stack('out', 90, 0, 'out', output)];
  return walk(232, {
    open: stacks(['1', '2', '3'], []),
    setup: [...stacks(['1', '2', '3'], []), variable('rule', 190, 0, 'pour', 'only when out is empty')],
    before: [{ caption: 'pop(): out is empty, so I pour. 3, 2, 1 move over and 1 ends up on top.', elements: stacks([], ['3', '2', '1']) }],
    result: [...stacks([], ['3', '2']), variable('pop', 190, 0, 'pop()', '1')],
    cx: complexity('cx', 400, 0, '1', 'amortized: each value moves once', 'n', 'two stacks'),
    edge: note('edge', 400, 130, 'peek() pours first too, just like pop().'),
  });
}

// ---------- 844. Backspace String Compare ----------

function backspaceCompare(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['a', 'b', '#', 'c'], colors);
  const t = (colors?: Colors) => array('t', 0, 140, 't', ['a', 'd', '#', 'c'], colors);
  const at = (i: number, j: number) => [pointer('i', 'i', 's', i), pointer('j', 'j', 't', j)];
  return walk(844, {
    open: [s(), t()],
    setup: [s(), t(), ...at(3, 3), variable('skip', 220, 0, 'skip', '0')],
    before: [{ caption: 'c matches c. Then each # means skip one more: b and d are skipped.', elements: [s([null, 'gray', 'gray', 'green']), t([null, 'gray', 'gray', 'green']), ...at(0, 0)] }],
    result: [s(['green', 'gray', 'gray', 'green']), t(['green', 'gray', 'gray', 'green']), ...at(0, 0), variable('ans', 220, 0, 'return', 'True')],
    cx: complexity('cx', 400, 0, 'm + n', 'both pointers move backward once', '1', 'no new strings'),
    edge: note('edge', 400, 130, 'More # than letters: just an empty string.'),
  });
}

// ---------- 155. Min Stack ----------

function minStack(): BoardDoc {
  const pairs = (vals: string[], mins: string[]) => [stack('val', 0, 0, 'val', vals), stack('min', 70, 0, 'min', mins)];
  return walk(155, {
    open: pairs(['-2', '0', '-3'], ['', '', '']),
    setup: pairs(['-2'], ['-2']),
    before: [{ caption: 'push 0: the min stays -2. push -3: the new min is -3.', elements: [...pairs(['-2', '0', '-3'], ['-2', '-2', '-3']), variable('get', 180, 0, 'getMin()', '-3')] }],
    result: [...pairs(['-2', '0'], ['-2', '-2']), variable('get', 180, 0, 'getMin()', '-2')],
    cx: complexity('cx', 380, 0, '1', 'getMin reads the top', 'n', 'one pair per value'),
    edge: note('edge', 380, 130, 'Duplicate minimums: each entry keeps its own.'),
  });
}

// ---------- 150. Evaluate Reverse Polish Notation ----------

function evalRPN(): BoardDoc {
  const tokens = (colors?: Colors) => array('tokens', 0, 0, 'tokens', ['2', '1', '+', '3', '*'], colors);
  return walk(150, {
    open: [tokens()],
    setup: [tokens(), pointer('i', 'i', 'tokens', 1), stack('st', 260, 0, 'stack', ['2', '1'])],
    before: [{ caption: '+ pops 1 and 2 and pushes 2 + 1 = 3.', elements: [tokens(['green', 'green', 'green']), pointer('i', 'i', 'tokens', 2), stack('st', 260, 0, 'stack', ['3'])] }],
    result: [tokens(['green', 'green', 'green', 'green', 'green']), pointer('i', 'i', 'tokens', 4), stack('st', 260, 0, 'stack', ['9']), variable('ans', 330, 0, '3 * 3', '9')],
    cx: complexity('cx', 470, 0, 'n', 'one pass over the tokens', 'n', 'the stack of numbers'),
    edge: note('edge', 470, 130, 'The second pop is the left operand; / truncates toward 0.'),
  });
}

// ---------- 22. Generate Parentheses ----------

function generateParentheses(): BoardDoc {
  const all = [
    { text: '""', parent: -1 },
    { text: '(', parent: 0, edge: '(' },
    { text: '((', parent: 1, edge: '(' },
    { text: '(()', parent: 2, edge: ')' },
    { text: '(())', parent: 3, edge: ')', color: 'green' as const },
    { text: '()', parent: 1, edge: ')' },
    { text: '()(', parent: 5, edge: '(' },
    { text: '()()', parent: 6, edge: ')', color: 'green' as const },
  ];
  const tree = (count: number) => recursion('calls', 0, 0, 'calls', all.slice(0, count));
  const rules = [variable('open', 360, 0, 'add (', 'if open < n'), variable('close', 360, 50, 'add )', 'if close < open')];
  return walk(22, {
    open: [tree(1), variable('n', 360, 0, 'n', '2')],
    setup: [tree(2), ...rules],
    before: [{ caption: 'Going down "((": open is now 2 = n, so only ) can follow, twice.', elements: [tree(5), ...rules] }],
    result: [tree(8), variable('ans', 360, 0, 'result', '["(())", "()()"]')],
    cx: complexity('cx', 360, 50, '4ⁿ/√n', 'the Catalan number of answers', 'n', 'recursion depth'),
    edge: note('edge', 360, 190, 'n = 1: just "()".'),
  });
}

// ---------- 853. Car Fleet ----------

function carFleet(): BoardDoc {
  const position = (colors?: Colors) => array('pos', 0, 0, 'position (closest first)', ['10', '8', '5', '3', '0'], colors);
  const time = (colors?: Colors) => array('time', 0, 130, 'hours to target', ['1', '1', '7', '3', '12'], colors);
  const fleets = (items: string[]) => stack('st', 260, 0, 'fleet', items);
  const target = variable('target', 330, 0, 'target', '12');
  return walk(853, {
    open: [position(), target],
    setup: [position(), time(), target, fleets([])],
    before: [
      { caption: '10 and 8 both arrive at hour 1, so the car at 8 joins the first fleet.', elements: [position(['green', 'green']), time(['green', 'green']), target, fleets(['1'])] },
      { caption: 'The car at 5 needs 7 hours: slower, so it starts a new fleet.', elements: [position([null, null, 'yellow']), time([null, null, 'yellow']), target, fleets(['1', '7'])] },
    ],
    result: [position([null, null, 'yellow', 'yellow', null]), time([null, null, 'yellow', 'yellow', null]), target, fleets(['1', '7', '12']), variable('ans', 330, 50, 'fleets', '3')],
    cx: complexity('cx', 480, 0, 'n log n', 'sorting by position', 'n', 'the stack of fleet times'),
    edge: note('edge', 480, 130, 'Same arrival time: one fleet.'),
  });
}

// ---------- 394. Decode String ----------

function decodeString(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['3', '[', 'a', '2', '[', 'c', ']', ']'], colors);
  const saved = (rows: string[][]) => table('st', 0, 150, 'stack', [['prev', 'count'], ...rows]);
  const cur = (value: string) => variable('cur', 160, 150, 'cur', value);
  return walk(394, {
    open: [s()],
    setup: [s(), pointer('i', 'i', 's', 1), saved([['""', '3']]), cur('""')],
    before: [
      {
        caption: 'At 2[: push ("a", 2) and start fresh. Inside, cur = "c".',
        elements: [
          s(),
          pointer('i', 'i', 's', 5),
          saved([
            ['""', '3'],
            ['"a"', '2'],
          ]),
          cur('"c"'),
        ],
      },
      {
        caption: 'First ]: pop ("a", 2), so cur = "a" + "c" × 2 = "acc".',
        elements: [s([null, null, null, null, 'green', 'green', 'green']), pointer('i', 'i', 's', 6), saved([['""', '3']]), cur('"acc"')],
      },
    ],
    result: [s(Array<CellColor>(8).fill('green')), pointer('i', 'i', 's', 7), saved([]), cur('"accaccacc"')],
    cx: complexity('cx', 400, 0, 'output', 'each character is built once', 'n', 'the stack of saved states'),
    edge: note('edge', 400, 220, '"12[a]": collect every digit before the [.'),
  });
}

// ---------- 735. Asteroid Collision ----------

function asteroidCollision(): BoardDoc {
  const rocks = (colors?: Colors) => array('ast', 0, 0, 'asteroids', ['5', '10', '-5'], colors);
  return walk(735, {
    open: [rocks()],
    setup: [rocks(), stack('st', 180, 0, 'stack', [])],
    before: [{ caption: '5 and 10 move right, so both go on the stack.', elements: [rocks(['green', 'green', null]), pointer('i', 'i', 'ast', 1), stack('st', 180, 0, 'stack', ['5', '10'])] }],
    result: [rocks(['green', 'green', 'red']), pointer('i', 'i', 'ast', 2), stack('st', 180, 0, 'stack', ['5', '10']), variable('ans', 250, 0, 'return', '[5, 10]')],
    cx: complexity('cx', 420, 0, 'n', 'each pushed and popped once', 'n', 'the survivors'),
    edge: note('edge', 420, 130, 'Equal sizes: both explode.'),
  });
}

// ---------- 227. Basic Calculator II ----------

function basicCalculatorII(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', ['3', '+', '2', '*', '2'], colors);
  return walk(227, {
    open: [s()],
    setup: [s(), pointer('i', 'i', 's', 0), stack('st', 260, 0, 'terms', ['3'])],
    before: [{ caption: '+2: push 2 as its own term.', elements: [s(), pointer('i', 'i', 's', 2), stack('st', 260, 0, 'terms', ['3', '2'])] }],
    result: [s([null, null, 'green', 'green', 'green']), pointer('i', 'i', 's', 4), stack('st', 260, 0, 'terms', ['3', '4']), variable('sum', 0, 150, 'sum', '3 + 4 = 7')],
    cx: complexity('cx', 340, 0, 'n', 'one pass', 'n', 'or 1 with just the last term'),
    edge: note('edge', 340, 130, 'Division truncates toward 0, even when negative.'),
  });
}

// ---------- 84. Largest Rectangle in Histogram ----------

function largestRectangle(): BoardDoc {
  const heights = (colors?: Colors) => array('h', 0, 0, 'heights', ['2', '1', '5', '6', '2', '3'], colors);
  const st = (items: string[]) => stack('st', 300, 0, 'stack', items);
  const best = (value: string) => variable('best', 380, 0, 'best', value);
  return walk(84, {
    open: [heights()],
    setup: [heights(), pointer('i', 'i', 'h', 0), st(['0'])],
    before: [
      { caption: 'i = 1: 1 is shorter than 2, so 2 pops: height 2 × width 1 = 2.', elements: [heights(['yellow']), pointer('i', 'i', 'h', 1), st(['1']), best('2')] },
      { caption: '5 and 6 are taller, so they wait on the stack.', elements: [heights(), pointer('i', 'i', 'h', 3), st(['1', '2', '3']), best('2')] },
    ],
    result: [heights([null, null, 'green', 'green', null, null]), pointer('i', 'i', 'h', 4), st(['1', '4']), best('5 × 2 = 10')],
    cx: complexity('cx', 380, 50, 'n', 'each bar pushed and popped once', 'n', 'the stack'),
    edge: note('edge', 380, 190, 'Add a height-0 bar at the end to pop what’s left.'),
  });
}

// ---------- 224. Basic Calculator ----------

function basicCalculator(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's (spaces skipped)', ['1', '+', '(', '2', '-', '3', ')'], colors);
  const saved = (rows: string[][]) => table('st', 0, 150, 'stack', [['result', 'sign'], ...rows]);
  const result = (value: string) => variable('res', 160, 150, 'result', value);
  return walk(224, {
    open: [s()],
    setup: [s(), pointer('i', 'i', 's', 2), saved([['1', '+']]), result('0')],
    before: [{ caption: 'Inside the parentheses: result = 2 - 3 = -1.', elements: [s([null, null, null, 'green', 'green', 'green']), pointer('i', 'i', 's', 5), saved([['1', '+']]), result('-1')] }],
    result: [s(Array<CellColor>(7).fill('green')), pointer('i', 'i', 's', 6), saved([]), result('1 + -1 = 0')],
    cx: complexity('cx', 360, 0, 'n', 'one pass', 'n', 'one saved pair per level'),
    edge: note('edge', 400, 150, '"-(2+3)": the saved sign makes it -5.', 220),
  });
}

// ---------- 895. Maximum Frequency Stack ----------

function freqStack(): BoardDoc {
  const groups = (one: string[], two: string[], three: string[]) => [stack('f1', 0, 0, 'f=1', one), stack('f2', 70, 0, 'f=2', two), stack('f3', 140, 0, 'f=3', three)];
  const freq = (a: string, b: string, c: string) =>
    dict('freq', 220, 0, 'freq', [
      ['5', a],
      ['7', b],
      ['4', c],
    ]);
  const max = (value: string) => variable('max', 0, 190, 'max_freq', value);
  return walk(895, {
    open: [array('push', 0, 0, 'pushes', ['5', '7', '5', '7', '4', '5'])],
    setup: [...groups(['5', '7', '4'], ['5', '7'], ['5']), freq('3', '2', '1'), max('3')],
    before: [
      {
        caption: 'pop(): the top of freq 3 is 5. That stack empties, so max_freq drops to 2.',
        elements: [...groups(['5', '7', '4'], ['5', '7'], []), freq('2', '2', '1'), max('2'), variable('out', 160, 190, 'popped', '5')],
      },
    ],
    result: [...groups(['5', '7', '4'], [], []), freq('1', '1', '1'), max('1'), variable('out', 160, 190, 'popped', '5, 7, 5')],
    cx: complexity('cx', 400, 0, '1', 'push and pop touch two maps', 'n', 'every pushed value'),
    edge: note('edge', 400, 130, 'Top frequency stack empty: max_freq goes down by one.'),
  });
}

// ---------- 32. Longest Valid Parentheses ----------

function longestValidParentheses(): BoardDoc {
  const s = (colors?: Colors) => array('s', 0, 0, 's', [')', '(', ')', '(', ')', ')'], colors);
  const st = (items: string[]) => stack('st', 300, 0, 'stack', items);
  const best = (value: string) => variable('best', 380, 0, 'best', value);
  return walk(32, {
    open: [s()],
    setup: [s(), st(['-1'])],
    before: [
      { caption: 'i = 0: an unmatched ) pops -1, so its index 0 becomes the new base.', elements: [s(['gray']), pointer('i', 'i', 's', 0), st(['0'])] },
      { caption: 'i = 2 matches i = 1: length 2 - 0 = 2.', elements: [s(['gray', 'green', 'green']), pointer('i', 'i', 's', 2), st(['0']), best('2')] },
    ],
    result: [s(['gray', 'green', 'green', 'green', 'green', 'gray']), pointer('i', 'i', 's', 4), st(['0']), best('4 - 0 = 4')],
    cx: complexity('cx', 380, 50, 'n', 'one pass', 'n', 'the stack of indices'),
    edge: note('edge', 380, 190, 'Stack empties: push this index as the new base.'),
  });
}

export const BOARDS: ReferenceBoards = {
  20: validParentheses,
  739: dailyTemperatures,
  232: queueWithStacks,
  844: backspaceCompare,
  155: minStack,
  150: evalRPN,
  22: generateParentheses,
  853: carFleet,
  394: decodeString,
  735: asteroidCollision,
  227: basicCalculatorII,
  84: largestRectangle,
  224: basicCalculator,
  895: freqStack,
  32: longestValidParentheses,
};
