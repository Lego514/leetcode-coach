import { describe, expect, it } from 'vitest';
import { MAX_INTERVAL, MIN_EASE, masteryOf, schedule, stageOf, type ReviewState } from './srs';

const DAY = '2026-09-16';

describe('schedule', () => {
  it('schedules a first solo solve four days out', () => {
    const s = schedule(undefined, 'solo', DAY);
    expect(s).toMatchObject({ reps: 1, interval: 4, lapses: 0, due: '2026-09-20' });
    expect(s.ease).toBeCloseTo(2.6);
  });

  it('grows the interval on repeated solo solves', () => {
    const first = schedule(undefined, 'solo', DAY);
    const second = schedule(first, 'solo', first.due);
    const third = schedule(second, 'solo', second.due);
    expect(second.interval).toBe(10);
    expect(third.interval).toBe(Math.round(10 * third.ease));
    expect(third.interval).toBeGreaterThan(second.interval);
  });

  it('brings a problem back tomorrow after reading the solution', () => {
    const learned = schedule(schedule(undefined, 'solo', DAY), 'solo', '2026-09-20');
    const lapsed = schedule(learned, 'solution', '2026-09-30');
    expect(lapsed).toMatchObject({ reps: 0, interval: 1, lapses: 1, due: '2026-10-01' });
    expect(lapsed.ease).toBeLessThan(learned.ease);
  });

  it('treats a hint as a short, still-growing interval', () => {
    const first = schedule(undefined, 'hint', DAY);
    expect(first).toMatchObject({ reps: 1, interval: 2, due: '2026-09-18' });
    const second = schedule(first, 'hint', first.due);
    expect(second.interval).toBe(3);
  });

  it('never drops ease below the floor', () => {
    let state: ReviewState | undefined;
    for (let i = 0; i < 20; i += 1) state = schedule(state, 'fail', DAY);
    expect(state!.ease).toBe(MIN_EASE);
    expect(state!.lapses).toBe(20);
  });

  it('caps the interval', () => {
    const state: ReviewState = { reps: 8, ease: 3, interval: 100, lapses: 0, due: DAY };
    expect(schedule(state, 'solo', DAY).interval).toBe(MAX_INTERVAL);
  });

  it('handles month and year boundaries', () => {
    expect(schedule(undefined, 'solo', '2026-12-30').due).toBe('2027-01-03');
  });
});

describe('stageOf / masteryOf', () => {
  it('maps intervals to stages', () => {
    expect(stageOf(undefined)).toBe('new');
    expect(stageOf({ interval: 1 })).toBe('learning');
    expect(stageOf({ interval: 10 })).toBe('reviewing');
    expect(stageOf({ interval: 30 })).toBe('mastered');
  });

  it('keeps mastery between 0 and 1 and increasing', () => {
    expect(masteryOf(undefined)).toBe(0);
    const values = [1, 4, 10, 30, 120].map((interval) => masteryOf({ interval }));
    expect(values.every((v, i) => i === 0 || v >= values[i - 1])).toBe(true);
    expect(values.at(-1)).toBe(1);
  });
});
