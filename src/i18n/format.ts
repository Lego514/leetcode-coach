import { parseDay, type Day } from '../lib/dates';
import type { Locale } from './locale';

const ZH_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export interface Formatters {
  /** 9/16（三） 或 Wed, Sep 16 */
  day: (day: Day, withWeekday?: boolean) => string;
  /** 2026 年 9 月 16 日（三） 或 Wednesday, September 16, 2026 */
  fullDay: (day: Day) => string;
  /** 時:分 */
  time: (ms: number) => string;
  /** 日期加時間，用在備份時間這類地方 */
  dateTime: (iso: string) => string;
}

export function createFormatters(locale: Locale): Formatters {
  if (locale === 'en') {
    const short = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    const shortWithWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const full = new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    return {
      day: (day, withWeekday = true) => (withWeekday ? shortWithWeekday : short).format(parseDay(day)),
      fullDay: (day) => full.format(parseDay(day)),
      time: (ms) => time.format(ms),
      dateTime: (iso) => dateTime.format(new Date(iso)),
    };
  }

  const time = new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateTime = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short', hour12: false });
  return {
    day: (day, withWeekday = true) => {
      const date = parseDay(day);
      const base = `${date.getMonth() + 1}/${date.getDate()}`;
      return withWeekday ? `${base}（${ZH_WEEKDAYS[date.getDay()]}）` : base;
    },
    fullDay: (day) => {
      const date = parseDay(day);
      return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日（${ZH_WEEKDAYS[date.getDay()]}）`;
    },
    time: (ms) => time.format(ms),
    dateTime: (iso) => dateTime.format(new Date(iso)),
  };
}
