import { addDays, type Day } from './dates';

// 示範資料：大約六週的練習紀錄，給第一次打開的人（例如看履歷的面試官）一鍵看到所有功能，
// README 的截圖也用這一份。全部是編出來的，跟任何人的真實紀錄無關。

export interface DemoData {
  attempts: Record<string, unknown>[];
  cardReviews: Record<string, unknown>[];
  mocks: Record<string, unknown>[];
  stories: Record<string, unknown>[];
  rehearsals: Record<string, unknown>[];
  boards: Record<string, unknown>[];
  settings: Record<string, unknown>[];
}

/** 白板上兩個元件之間的距離：陣列（標籤、格子、索引）加上指標，再空一點 */
const BELOW_ARRAY = 22 + 44 + 18 + 34 + 20;

/**
 * 兩題的白板：Two Sum 的雜湊表、Container With Most Water 的雙指標。
 * 不用 3（Longest Substring）：README 的截圖在那一題的白板上放滑動視窗的模板
 */
function demoBoards(today: Day): Record<string, unknown>[] {
  const at = (offset: number) => `${addDays(today, offset)}T21:40:00.000Z`;
  return [
    {
      id: 'p1',
      updatedAt: at(-38),
      doc: {
        elements: [
          { type: 'text', id: 'title', x: 0, y: -70, variant: 'heading', text: 'Two Sum: one pass with a hash map', w: 420 },
          { type: 'list', id: 'nums', x: 0, y: 0, variant: 'array', label: 'nums', items: ['2', '7', '11', '15'], colors: ['green', 'green', null, null] },
          { type: 'pointer', id: 'i', x: 0, y: 0, name: 'i', attach: { id: 'nums', index: 1 } },
          { type: 'table', id: 'seen', x: 0, y: BELOW_ARRAY, variant: 'dict', label: 'seen', rows: [['2', '0']] },
          { type: 'var', id: 'target', x: 200, y: BELOW_ARRAY + 22, name: 'target', value: '9' },
          { type: 'var', id: 'need', x: 200, y: BELOW_ARRAY + 80, name: 'need', value: '9 - 7 = 2' },
          { type: 'text', id: 'note', x: 260, y: 0, variant: 'sticky', text: 'Check seen before adding nums[i], so one number is never used twice.', w: 220 },
        ],
      },
    },
    {
      id: 'p11',
      updatedAt: at(-27),
      doc: {
        elements: [
          { type: 'text', id: 'title', x: 0, y: -70, variant: 'heading', text: 'Container With Most Water: two pointers', w: 460 },
          { type: 'list', id: 'height', x: 0, y: 0, variant: 'array', label: 'height', items: ['1', '8', '6', '2', '5', '4', '8', '3', '7'] },
          { type: 'pointer', id: 'l', x: 0, y: 0, name: 'l', attach: { id: 'height', index: 1 } },
          { type: 'pointer', id: 'r', x: 0, y: 0, name: 'r', attach: { id: 'height', index: 8 } },
          { type: 'range', id: 'window', from: 'l', to: 'r', color: 'orange' },
          { type: 'var', id: 'area', x: 0, y: BELOW_ARRAY, name: 'area', value: '7 * 7 = 49' },
          { type: 'var', id: 'best', x: 200, y: BELOW_ARRAY, name: 'best', value: '49' },
          { type: 'text', id: 'note', x: 0, y: BELOW_ARRAY + 60, variant: 'sticky', text: 'Move the shorter side: the width only shrinks, so only a taller line can help.', w: 300 },
        ],
      },
    },
  ];
}

/** 三個故事的 id：練習講一題的紀錄要指到用了哪個故事 */
interface StoryIds {
  latency: string;
  database: string;
  review: string;
}

/** 行為面試的三個故事，各自能回答兩三個主題；英文寫，面試時就是這樣講 */
function demoStories(today: Day, ids: StoryIds): Record<string, unknown>[] {
  const at = (offset: number) => `${addDays(today, offset)}T22:05:00.000Z`;
  return [
    {
      id: ids.latency,
      title: 'Cutting the course project’s API latency',
      situation: 'In my distributed systems course, our team’s booking service took over two seconds per request in the load test, a week before the demo.',
      task: 'I owned the backend, so it was on me to find out why and get it under our 300 ms goal.',
      action: 'I profiled the slowest endpoint, found an N+1 query in the seat lookup, replaced it with one joined query, and added an index. I wrote a small load script so the team could check it themselves.',
      result: 'Median latency dropped from 2.1 s to 180 ms, we passed the load test, and the professor used our profiling notes as an example in class.',
      themes: ['proud', 'deadline', 'learning'],
      updatedAt: at(-30),
    },
    {
      id: ids.database,
      title: 'Disagreeing on the database for the capstone',
      situation: 'In our capstone, a teammate wanted to move from PostgreSQL to MongoDB halfway through because the schema kept changing.',
      task: 'I thought the switch would cost us two weeks we did not have, but I did not want to just say no.',
      action: 'I asked what pain he was trying to fix, and it was migrations. I listed the queries we already had, showed that most were relational joins, and suggested a JSON column for the part that kept changing.',
      result: 'We kept PostgreSQL, shipped on time, and he later said the JSON column solved his problem. Since then I start a disagreement by asking what problem the other person sees.',
      themes: ['conflict', 'influence', 'teamwork'],
      updatedAt: at(-20),
    },
    {
      id: ids.review,
      title: 'Missing a bug in my internship code review',
      situation: 'During my internship, a change I reviewed broke time zone handling for users in Asia, and it reached production.',
      task: 'I had approved it, so I wanted to own the fix and make sure it did not happen again.',
      action: 'I told my manager right away, wrote the fix with tests for three time zones, and added a checklist item for date handling to our review template.',
      result: 'The fix shipped the same day, and the checklist caught two similar bugs in the next month. I learned to test the edge cases I would rather assume away.',
      themes: ['failure', 'feedback'],
      updatedAt: at(-9),
    },
  ];
}

/**
 * 練習講一題行為面試：兩次，各用一個故事。早的那次有 AI 回饋（講太多「我們」），
 * 昨天那次五個重點都講到、講得很順
 */
function demoRehearsals(today: Day, uuid: () => string, ids: StoryIds): Record<string, unknown>[] {
  const startedAt = (offset: number) => `${addDays(today, offset)}T21:20:00.000Z`;
  return [
    {
      uid: uuid(),
      questionId: 'conflict-disagree',
      storyId: ids.database,
      day: addDays(today, -12),
      startedAt: startedAt(-12),
      limitSec: 150,
      usedSec: 141,
      covered: ['situation', 'task', 'action', 'result'],
      clarity: 2,
      transcript:
        'In our capstone project a teammate wanted to switch from Postgres to MongoDB halfway through, because the schema kept changing. We thought it would take too long. So we looked at the queries together and we decided to keep Postgres and use a JSON column for the changing part. In the end we shipped on time and he was happy with it.',
      feedback: {
        summary: 'A clear story with a good result. Say more about what you did yourself: most of the answer is about “we”.',
        points: [
          { id: 'situation', score: 2, comment: 'Short and clear: the capstone, the switch, and why he wanted it.' },
          { id: 'task', score: 1, comment: 'Say why it was your call to make, and what the switch would have cost.' },
          { id: 'action', score: 2, comment: 'Looking at the queries and proposing a JSON column is a concrete step.' },
          { id: 'result', score: 2, comment: 'Shipping on time and him being happy is a real outcome.' },
          { id: 'ownership', score: 1, comment: '“We looked” and “we decided” hide what you did. Use “I”.' },
        ],
        strengths: ['You found a solution that addressed his real problem instead of just saying no.'],
        improvements: [
          {
            quote: 'So we looked at the queries together and we decided to keep Postgres',
            suggestion: 'Say what you did: “I asked what problem he was trying to fix, then I listed our queries and showed most were joins.”',
          },
          { quote: 'We thought it would take too long.', suggestion: 'Give the number: “I estimated the switch would cost us two of our last four weeks.”' },
        ],
        improvedAnswer:
          'In my capstone, a teammate wanted to move from PostgreSQL to MongoDB halfway through because the schema kept changing. I estimated the switch would cost two of our last four weeks, but I did not want to just say no. I asked what problem he saw, and it was migrations. I listed the queries we had, showed most were relational joins, and suggested a JSON column for the part that kept changing. We kept PostgreSQL, shipped on time, and he said the JSON column solved his problem. Now I start a disagreement by asking what problem the other person sees.',
      },
    },
    {
      uid: uuid(),
      questionId: 'failure-mistake',
      storyId: ids.review,
      day: addDays(today, -1),
      startedAt: startedAt(-1),
      limitSec: 150,
      usedSec: 118,
      covered: ['situation', 'task', 'action', 'result', 'ownership'],
      clarity: 1,
      transcript:
        'During my internship I approved a change that broke time zone handling for users in Asia, and it reached production. I had approved it, so I owned the fix. I told my manager right away, I wrote the fix with tests for three time zones, and I added a date handling item to our review checklist. The fix shipped the same day, and the checklist caught two similar bugs the next month.',
    },
  ];
}

/** 照 NeetCode 150 的順序：陣列、雙指標、滑動視窗、堆疊的前幾題 */
const ORDER = [217, 242, 1, 49, 347, 238, 36, 128, 125, 167, 15, 11, 121, 3, 424, 567, 20, 155, 150, 22, 739];
const FIRST_RATINGS = ['solo', 'hint', 'solo', 'solo', 'hint', 'solo', 'hint', 'solution'] as const;

/**
 * 做新題（大概兩天一題、每週休一天），之後照 3、10、24 天的間隔複習；
 * 最近一週每天都有練，二分搜尋卡住兩次，今天已經複習了一題。到期的複習只有幾題，跟平常用起來一樣。
 */
export function demoData(today: Day, uuid: () => string = () => crypto.randomUUID()): DemoData {
  const attempts: Record<string, unknown>[] = [];
  const cardReviews: Record<string, unknown>[] = [];
  const add = (problemId: number, offset: number, rating: string, mode: string, extra: Record<string, unknown> = {}) => {
    const day = addDays(today, offset);
    attempts.push({
      uid: uuid(),
      problemId,
      day,
      at: `${day}T${String(17 + (attempts.length % 5)).padStart(2, '0')}:15:00.000Z`,
      rating,
      mode,
      minutes: 16 + (attempts.length % 5) * 5,
      ...extra,
    });
  };

  const days = Array.from({ length: 36 }, (_, i) => -40 + i).filter((offset) => ((offset % 7) + 7) % 7 !== 2);
  ORDER.forEach((problemId, i) => {
    const offset = days[Math.min(days.length - 1, Math.round(i * 1.6))];
    const rating = FIRST_RATINGS[i % FIRST_RATINGS.length];
    add(problemId, offset, rating, 'practice', rating === 'solution' ? { stuck: ['optimize'], hints: 2 } : rating === 'hint' ? { hints: 2 } : {});
    for (const gap of [3, 10, 24]) if (offset + gap < -1) add(problemId, offset + gap, gap === 3 && rating !== 'solo' ? 'hint' : 'solo', 'review');
  });
  // 看了提示的紀錄看到第 2 層（關鍵觀察），也就是 FSRS 原本的 Hard
  // 卡在哪的一句話：二分搜尋的兩次都寫了，複習時看得到
  add(704, -4, 'solution', 'practice', { stuck: ['logic'], hints: 3, stuckNote: 'Used while l < r, then returned l without checking nums[l]' });
  add(74, -3, 'hint', 'practice', { hints: 2 });
  add(875, -2, 'fail', 'practice', { stuck: ['pattern', 'logic'], hints: 3, stuckNote: 'Didn’t see I could binary search on the eating speed' });
  add(153, -1, 'hint', 'practice', { hints: 2 });
  add(1, 0, 'solo', 'review');

  // 微複習：大部分的日子做一回合
  for (let offset = -40; offset <= 0; offset += 1) {
    if (offset % 3 === 0) continue;
    const day = addDays(today, offset);
    cardReviews.push({ uid: uuid(), cardId: `pattern:${ORDER[(offset + 40) % ORDER.length]}`, day, at: `${day}T07:30:00.000Z`, result: 'good' });
  }

  // 講解練習：大約一週一次，自己勾的重點越來越多，邊界情況最常漏；自評從講不出來到講得很順。
  // 238 記得住很久又講得清楚，是示範資料裡「已熟練」的那一題
  const mocks: Record<string, unknown>[] = (
    [
      [-38, 1, ['insight', 'structure'], 3],
      [-33, 217, ['insight', 'structure', 'complexity'], 2],
      [-27, 49, ['insight', 'structure', 'walkthrough'], 2],
      [-22, 125, ['insight', 'structure', 'complexity'], 2],
      [-16, 121, ['insight', 'structure', 'walkthrough', 'complexity'], 2],
      [-11, 3, ['insight', 'structure', 'walkthrough', 'complexity'], 1],
      [-6, 238, ['insight', 'structure', 'walkthrough', 'complexity', 'edge'], 1],
      [-2, 155, ['insight', 'structure', 'walkthrough', 'complexity'], 1],
    ] as const
  ).map(([offset, problemId, steps, clarity]) => {
    const day = addDays(today, offset);
    return {
      uid: uuid(),
      problemId,
      kind: 'explain',
      day,
      startedAt: `${day}T20:10:00.000Z`,
      limitSec: 120,
      usedSec: 150 - offset,
      steps: [...steps],
      clarity,
      reflection: '',
    };
  });

  const storyIds: StoryIds = { latency: uuid(), database: uuid(), review: uuid() };
  return {
    attempts,
    cardReviews,
    mocks,
    stories: demoStories(today, storyIds),
    rehearsals: demoRehearsals(today, uuid, storyIds),
    boards: demoBoards(today),
    settings: [{ key: 'app', activeList: 'neetcode150', dailyNew: 3, language: 'python', targetDate: addDays(today, 45) }],
  };
}
