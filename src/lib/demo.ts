import { addDays, type Day } from './dates';

// 示範資料：大約六週的練習紀錄，給第一次打開的人（例如看履歷的面試官）一鍵看到所有功能，
// README 的截圖也用這一份。全部是編出來的，跟任何人的真實紀錄無關。

export interface DemoData {
  attempts: Record<string, unknown>[];
  cardReviews: Record<string, unknown>[];
  mocks: Record<string, unknown>[];
  settings: Record<string, unknown>[];
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
  add(704, -4, 'solution', 'practice', { stuck: ['edge'], hints: 3 });
  add(74, -3, 'hint', 'practice', { hints: 2 });
  add(875, -2, 'fail', 'practice', { stuck: ['pattern', 'edge'], hints: 3 });
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

  return {
    attempts,
    cardReviews,
    mocks,
    settings: [{ key: 'app', activeList: 'neetcode150', dailyNew: 3, language: 'python', targetDate: addDays(today, 45) }],
  };
}
