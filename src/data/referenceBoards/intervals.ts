import type { BoardDoc } from 'dsa-whiteboard';
import type { ReferenceBoards } from './index';
import { array, board, complexity, heap, intervals, lines, note, variable, walk, type CellColor } from './build';

// 參考板書：區間。版面橫著排，下面留給播放列；複雜度區塊和便利貼放右邊。

// ---------- 56. Merge Intervals ----------

function mergeIntervals(): BoardDoc {
  const [insight, structure, example, cost, edge] = lines(56);
  const input = (colors: ('green' | 'yellow' | undefined)[] = []) =>
    intervals('intervals', 0, 0, 'intervals', [
      [1, 3, colors[0]],
      [2, 6, colors[1]],
      [8, 10, colors[2]],
    ]);
  const done = [
    input(['green', 'green', 'green']),
    intervals('merged', 0, 170, 'merged', [
      [1, 6, 'green'],
      [8, 10, 'green'],
    ]),
  ];
  const result = complexity('cx', 460, 0, 'n log n', 'sorting dominates the single pass', 'n', 'the merged list');
  return board([
    { caption: insight, elements: [input()] },
    {
      caption: structure,
      elements: [input(), intervals('merged', 0, 170, 'merged', [])],
    },
    {
      caption: '[1, 3] starts the merged list. [2, 6] starts at 2, before 3 ends, so I extend the end to 6.',
      elements: [input(['green', 'yellow']), intervals('merged', 0, 170, 'merged', [[1, 6, 'green']])],
    },
    { caption: example, elements: done },
    { caption: cost, elements: [...done, result] },
    {
      caption: edge,
      elements: [...done, result, note('edge', 460, 140, 'Touching intervals like [1, 4] and [4, 5] merge into [1, 5].')],
    },
  ]);
}

// ---------- 252. Meeting Rooms ----------

function canAttendMeetings(): BoardDoc {
  const line = (colors: [CellColor?, CellColor?] = []) =>
    intervals('m', 0, 0, 'meetings, sorted by start', [
      [0, 30, colors[0]],
      [5, 10, colors[1]],
    ]);
  return walk(252, {
    open: [line()],
    setup: [line(['blue', 'blue'])],
    result: [line(['red', 'red']), variable('ans', 0, 150, '5 < 30', 'overlap: False')],
    cx: complexity('cx', 0, 210, 'n log n', 'sorting', '1', 'extra, besides sorting'),
    edge: note('edge', 380, 210, 'Starts exactly when another ends: fine.'),
  });
}

// ---------- 57. Insert Interval ----------

function insertInterval(): BoardDoc {
  const before = intervals('m', 0, 0, 'intervals + new [4, 8]', [
    [1, 2],
    [3, 5, 'yellow'],
    [6, 7, 'yellow'],
    [8, 10, 'yellow'],
    [12, 16],
    [4, 8, 'blue'],
  ]);
  const after = intervals('m', 0, 0, 'result', [
    [1, 2, 'green'],
    [3, 10, 'green'],
    [12, 16, 'green'],
  ]);
  return walk(57, {
    open: [before],
    setup: [before, variable('ph', 0, 270, 'phases', 'before, overlap, after')],
    result: [after, variable('ph', 0, 270, 'merged', '[3, 5] [6, 7] [8, 10] + [4, 8] = [3, 10]')],
    cx: complexity('cx', 600, 0, 'n', 'one pass', 'n', 'the output'),
    edge: note('edge', 600, 130, 'New interval before or after everything: same three phases.'),
  });
}

// ---------- 435. Non-overlapping Intervals ----------

function eraseOverlapIntervals(): BoardDoc {
  const line = (removed: boolean) =>
    intervals('m', 0, 0, 'sorted by end', [
      [1, 2, 'green'],
      [2, 3, 'green'],
      [1, 3, removed ? 'red' : undefined, removed],
      [3, 4, removed ? 'green' : undefined],
    ]);
  return walk(435, {
    open: [
      intervals('m', 0, 0, 'intervals', [
        [1, 2],
        [2, 3],
        [3, 4],
        [1, 3],
      ]),
    ],
    setup: [line(false), variable('end', 0, 230, 'last kept end', '3')],
    result: [line(true), variable('end', 0, 230, '[1, 3] starts before 3', 'remove: 1')],
    cx: complexity('cx', 380, 0, 'n log n', 'sorting by end', '1', 'one end value'),
    edge: note('edge', 380, 130, 'Touching intervals don’t overlap.'),
  });
}

// ---------- 253. Meeting Rooms II ----------

function minMeetingRooms(): BoardDoc {
  const line = (sweep?: number) =>
    intervals(
      'm',
      0,
      0,
      'meetings',
      [
        [0, 30, 'blue'],
        [5, 10, 'yellow'],
        [15, 20, 'yellow'],
      ],
      sweep,
    );
  const ends = (items: string[]) => heap('h', 0, 190, 'ends', items);
  return walk(253, {
    open: [line()],
    setup: [line(0), ends(['30'])],
    before: [{ caption: 'At 5: the earliest end, 30, is later, so a second room opens.', elements: [line(5), ends(['10', '30'])] }],
    result: [line(15), ends(['20', '30']), variable('ans', 200, 190, 'rooms', '2 (10 ≤ 15 frees one)')],
    cx: complexity('cx', 200, 250, 'n log n', 'sort plus heap', 'n', 'the heap'),
    edge: note('edge', 580, 250, 'One ends as another starts: reuse the room.'),
  });
}

// ---------- 1851. Minimum Interval to Include Each Query ----------

function minInterval(): BoardDoc {
  const line = (sweep?: number, colors: (CellColor | undefined)[] = []) =>
    intervals(
      'm',
      0,
      0,
      'intervals by start',
      [
        [1, 4, colors[0]],
        [2, 4, colors[1]],
        [3, 6, colors[2]],
        [4, 4, colors[3]],
      ],
      sweep,
    );
  const answers = (items: string[]) => array('ans', 0, 230, 'answers', items);
  return walk(1851, {
    open: [line(), array('q', 0, 230, 'queries', ['2', '3', '4', '5'])],
    setup: [line(2, ['blue', 'blue']), answers(['3', '', '', ''])],
    result: [line(3, ['blue', 'green', 'blue']), answers(['3', '3', '1', '4']), variable('h', 220, 252, 'heap at 3', 'sizes 3, 4, 4: top 3')],
    cx: complexity('cx', 460, 0, '(n+q) log n', 'sorting and heap pushes', 'n + q', 'heap and answers'),
    edge: note('edge', 460, 130, 'Nothing covers a query: -1.'),
  });
}

// ---------- 759. Employee Free Time ----------

function employeeFreeTime(): BoardDoc {
  const line = (gap: boolean) => intervals('m', 0, 0, 'busy, merged', [[1, 3, 'blue'], [4, 10, 'blue'], ...(gap ? ([[3, 4, 'green']] as [number, number, CellColor][]) : [])]);
  return walk(759, {
    open: [line(false)],
    setup: [line(false), variable('s', 0, 190, 'steps', 'flatten, sort, merge')],
    result: [line(true), variable('s', 0, 190, 'free', '[3, 4]')],
    cx: complexity('cx', 400, 0, 'n log n', 'sorting all intervals', 'n', 'the flattened list'),
    edge: note('edge', 400, 130, 'Touching intervals leave no gap.'),
  });
}

export const BOARDS: ReferenceBoards = {
  56: mergeIntervals,
  252: canAttendMeetings,
  57: insertInterval,
  435: eraseOverlapIntervals,
  253: minMeetingRooms,
  1851: minInterval,
  759: employeeFreeTime,
};
