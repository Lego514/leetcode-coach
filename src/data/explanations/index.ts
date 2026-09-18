import { EXPLANATIONS_PART_1 } from './part1';
import { EXPLANATIONS_PART_2 } from './part2';
import { EXPLANATIONS_PART_3 } from './part3';
import { EXPLANATIONS_PART_4 } from './part4';

/**
 * 每題一份英文參考講法，五句依序對應講解練習的五個重點：
 * 關鍵觀察、資料結構與原因、例子、複雜度與原因、邊界情況。
 * 為這個 App 撰寫，不含 LeetCode 的題目內容。
 */
export const EXPLANATIONS_EN: Record<number, string> = {
  ...EXPLANATIONS_PART_1,
  ...EXPLANATIONS_PART_2,
  ...EXPLANATIONS_PART_3,
  ...EXPLANATIONS_PART_4,
};
