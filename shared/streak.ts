// 連續天數和「連續天數保護」：前後端共用（今天頁、進度頁、每日提醒的文字）。
// 都從練習過的日子算出來，不另外存，換裝置或收到同步的紀錄時自然一致。

/** 最多存幾次保護 */
export const MAX_FREEZES = 2;

export interface StreakState {
  /** 連續練習的天數；用了保護的日子不算進天數，但不會中斷 */
  streak: number;
  /** 現在存著幾次保護 */
  freezes: number;
  /** 今天練了沒 */
  practicedToday: boolean;
  /** 用掉保護的日子，由舊到新 */
  frozen: string[];
}

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * 從第一天練習開始往後走：每練習一天存一次保護（最多存 MAX_FREEZES 次）；
 * 沒練的日子有保護就用掉一次，連續天數不會斷，沒有就歸零。
 * 今天還沒練不算漏掉，所以早上打開不會先扣保護或歸零
 */
export function streakState(days: Iterable<string>, today: string): StreakState {
  const set = new Set([...days].filter((day) => day <= today));
  let streak = 0;
  let freezes = 0;
  const frozen: string[] = [];
  const practice = () => {
    streak += 1;
    freezes = Math.min(MAX_FREEZES, freezes + 1);
  };
  const first = [...set].sort()[0];
  if (first !== undefined) {
    for (let day = first; day < today; day = nextDay(day)) {
      if (set.has(day)) practice();
      else if (streak > 0 && freezes > 0) {
        freezes -= 1;
        frozen.push(day);
      } else {
        streak = 0;
      }
    }
  }
  const practicedToday = set.has(today);
  if (practicedToday) practice();
  return { streak, freezes, practicedToday, frozen };
}
