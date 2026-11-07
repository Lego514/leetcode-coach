import type { BoardDoc } from 'dsa-whiteboard';
import { binarySearch, containerWithMostWater, dailyTemperatures, longestSubstring, twoSum, validParentheses } from './arrays';
import { coinChange, courseSchedule, mergeIntervals, numberOfIslands } from './graphs';
import { kthLargest, levelOrder, maximumDepth, reverseLinkedList, subsets } from './structures';

// 參考板書：每一題一塊做好的白板，逐步播放時字幕就是參考講解的那一句。
// 講解的五句（關鍵想法 → 用什麼結構 → 範例 → 複雜度 → 邊界情況）各是一步，
// 「範例」那句前面可以多幾步把範例走完。這個檔案（和 arrays、structures、graphs）第一次打開參考板書時才載入。

/** 做好參考板書的題目；index.ts 的 REFERENCE_BOARD_IDS 要跟這裡一樣 */
export const REFERENCE_BOARDS: Record<number, () => BoardDoc> = {
  1: twoSum,
  11: containerWithMostWater,
  3: longestSubstring,
  20: validParentheses,
  739: dailyTemperatures,
  704: binarySearch,
  206: reverseLinkedList,
  104: maximumDepth,
  102: levelOrder,
  215: kthLargest,
  78: subsets,
  200: numberOfIslands,
  207: courseSchedule,
  56: mergeIntervals,
  322: coinChange,
};
