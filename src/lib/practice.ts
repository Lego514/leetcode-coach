import type { Rating } from './srs';

/** 內建提示的層數：方向、關鍵觀察、模板 */
export const HINT_LEVELS = 3;

/** 依提示的使用情況建議自評結果，使用者仍然可以改 */
export function suggestRating(hintsUsed: number, sawSolution: boolean): Rating {
  if (sawSolution) return 'solution';
  if (hintsUsed > 0) return 'hint';
  return 'solo';
}

export function solutionsUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/solutions/`;
}

export interface PracticeSnapshot {
  problemId: number;
  bankedMs: number;
  /** 計時中時為開始的時間（epoch 毫秒），暫停時為 null */
  runningSince: number | null;
  hints: number;
  sawSolution: boolean;
  finished: boolean;
}

const KEY = 'leetcode-coach:practice';

function isSnapshot(value: unknown): value is PracticeSnapshot {
  const v = value as Partial<PracticeSnapshot> | null;
  return (
    !!v &&
    typeof v.problemId === 'number' &&
    typeof v.bankedMs === 'number' &&
    (v.runningSince === null || typeof v.runningSince === 'number') &&
    typeof v.hints === 'number' &&
    typeof v.sawSolution === 'boolean' &&
    typeof v.finished === 'boolean'
  );
}

// 瀏覽器封鎖儲存空間時，連讀取 sessionStorage 這個屬性都可能丟出錯誤，所以放在 try 裡面取
function resolve(storage: Storage | null | undefined): Storage | null {
  return storage === undefined ? (globalThis.sessionStorage ?? null) : storage;
}

/**
 * 進行中的練習存在 sessionStorage，重新整理頁面後可以接著計時。
 * 無法使用儲存空間時（例如私密模式）就當作沒有存檔。
 */
export function loadPracticeSession(problemId: number, storage?: Storage | null): PracticeSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(resolve(storage)?.getItem(KEY) ?? 'null');
    return isSnapshot(parsed) && parsed.problemId === problemId ? parsed : null;
  } catch {
    return null;
  }
}

export function savePracticeSession(snapshot: PracticeSnapshot, storage?: Storage | null): void {
  try {
    resolve(storage)?.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // 存不了就只影響重新整理後的接續計時
  }
}

export function clearPracticeSession(storage?: Storage | null): void {
  try {
    resolve(storage)?.removeItem(KEY);
  } catch {
    // 同上
  }
}
