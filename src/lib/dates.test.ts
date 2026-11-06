import { describe, expect, it } from 'vitest';
import { addDays, diffDays, formatDuration, isDay, msUntilNextDay, startOfWeek, toDay } from './dates';

describe('dates', () => {
  it('adds days across month ends and leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts whole days regardless of DST', () => {
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDays('2026-11-02', '2026-10-31')).toBe(-2);
  });

  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-09-16')).toBe('2026-09-14'); // Wednesday
    expect(startOfWeek('2026-09-20')).toBe('2026-09-14'); // Sunday
    expect(startOfWeek('2026-09-14')).toBe('2026-09-14');
  });

  it('validates day strings', () => {
    expect(isDay('2026-09-16')).toBe(true);
    expect(isDay('2026-9-16')).toBe(false);
    expect(isDay(20260916)).toBe(false);
  });

  it('counts the time left until the next local midnight', () => {
    const HOUR = 60 * 60 * 1000;
    expect(msUntilNextDay(new Date(2026, 10, 5, 23, 59, 30))).toBe(30_000);
    expect(msUntilNextDay(new Date(2026, 10, 5, 0, 0, 0))).toBe(24 * HOUR);
    // 不管這天有幾小時（日光節約時間），等完都剛好是隔天的 0 點
    for (const day of [new Date(2026, 2, 8, 12), new Date(2026, 10, 1, 12), new Date(2026, 11, 31, 18)]) {
      const next = new Date(day.getTime() + msUntilNextDay(day));
      expect([next.getHours(), next.getMinutes()]).toEqual([0, 0]);
      expect(toDay(next)).toBe(addDays(toDay(day), 1));
    }
  });

  it('formats durations', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(-5)).toBe('-0:05');
  });
});
