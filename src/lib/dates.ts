/** 日期一律用本地時區的 YYYY-MM-DD 字串存放，避免跨時區時「今天」算錯 */
export type Day = string;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDay(date: Date): Day {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(): Day {
  return toDay(new Date());
}

export function parseDay(day: Day): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isDay(value: unknown): value is Day {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDay(value).getTime());
}

export function addDays(day: Day, n: number): Day {
  const date = parseDay(day);
  date.setDate(date.getDate() + n);
  return toDay(date);
}

/** b 減 a 的天數；用 UTC 計算以避開日光節約時間的 23/25 小時 */
export function diffDays(a: Day, b: Day): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** 以週一為一週的開始 */
export function startOfWeek(day: Day): Day {
  const weekday = parseDay(day).getDay();
  return addDays(day, -((weekday + 6) % 7));
}

export function formatDuration(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const s = Math.abs(Math.round(totalSeconds));
  return `${sign}${Math.floor(s / 60)}:${pad(s % 60)}`;
}
