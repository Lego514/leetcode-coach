import type { BoardDoc } from 'dsa-whiteboard';

// 參考板書：哪些題目有（同步，給畫面決定要不要顯示「看參考板書」），板書本身用到才載入。
// 先試做 15 題（每種題型一兩題）；新增時 boards.ts 和這裡一起加（有測試檢查兩邊一樣）。

export const REFERENCE_BOARD_IDS: ReadonlySet<number> = new Set([1, 3, 11, 20, 56, 78, 102, 104, 200, 206, 207, 215, 322, 704, 739]);

export async function loadReferenceBoard(problemId: number): Promise<BoardDoc | undefined> {
  if (!REFERENCE_BOARD_IDS.has(problemId)) return undefined;
  const { REFERENCE_BOARDS } = await import('./boards');
  return REFERENCE_BOARDS[problemId]?.();
}
