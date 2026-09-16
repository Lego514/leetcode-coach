import { describe, expect, it } from 'vitest';
import { addDays, diffDays, formatDuration, isDay, relativeDay, startOfWeek } from './dates';

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

  it('describes relative days', () => {
    expect(relativeDay('2026-09-16', '2026-09-16')).toBe('今天');
    expect(relativeDay('2026-09-17', '2026-09-16')).toBe('明天');
    expect(relativeDay('2026-09-20', '2026-09-16')).toBe('4 天後');
    expect(relativeDay('2026-09-13', '2026-09-16')).toBe('逾期 3 天');
  });

  it('validates day strings', () => {
    expect(isDay('2026-09-16')).toBe(true);
    expect(isDay('2026-9-16')).toBe(false);
    expect(isDay(20260916)).toBe(false);
  });

  it('formats durations', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(-5)).toBe('-0:05');
  });
});
