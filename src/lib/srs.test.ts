import { FSRSAlgorithm, generatorParameters } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETENTION,
  intervalFor,
  MAX_INTERVAL,
  masteryOf,
  nextMemory,
  recallOn,
  replay,
  schedule,
  spreadDelays,
  stageOf,
  type Grade,
  type Memory,
  type ReviewState,
} from './srs';

const DAY = '2026-09-16';

/** 固定種子的亂數，每次跑的序列都一樣 */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 官方的參考實作（只在測試裡用），參數跟 app 一樣：不加隨機擾動、最長 MAX_INTERVAL 天 */
function reference(retention = DEFAULT_RETENTION) {
  return new FSRSAlgorithm(generatorParameters({ enable_fuzz: false, maximum_interval: MAX_INTERVAL, request_retention: retention }));
}

describe('FSRS memory model', () => {
  it('matches the official ts-fsrs on hundreds of random review histories', () => {
    const next = random(42);
    const ref = reference();
    let checked = 0;
    for (let history = 0; history < 300; history += 1) {
      let ours: Memory | undefined;
      let theirs: Memory | null = null;
      const length = 1 + Math.floor(next() * 12);
      for (let i = 0; i < length; i += 1) {
        // 同一天再做、隔幾天、隔很久都有；自評只有 Again、Hard、Good 三種
        const days = i === 0 ? 0 : [0, 1, 2, 5, 13, 40, 90][Math.floor(next() * 7)];
        const g = (1 + Math.floor(next() * 3)) as Grade;
        ours = nextMemory(ours, days, g);
        theirs = ref.next_state(theirs, days, g);
        expect(ours.stability).toBeCloseTo(theirs.stability, 8);
        expect(ours.difficulty).toBeCloseTo(theirs.difficulty, 8);
        expect(intervalFor(ours.stability)).toBe(ref.next_interval(theirs.stability, days));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('turns stability into the same intervals for every target retention', () => {
    for (const retention of [0.8, 0.85, 0.9, 0.95]) {
      const ref = reference(retention);
      for (const stability of [0.212, 1.2931, 2.3065, 7.5, 30, 400]) {
        expect(intervalFor(stability, retention)).toBe(ref.next_interval(stability, 0));
      }
    }
  });
});

describe('schedule', () => {
  it('maps the four self-ratings onto FSRS grades for a first attempt', () => {
    expect(schedule(undefined, 'solo', DAY)).toMatchObject({ reps: 1, lapses: 0, interval: 2, lastReview: DAY, due: '2026-09-18' });
    expect(schedule(undefined, 'hint', DAY)).toMatchObject({ reps: 1, interval: 1, due: '2026-09-17' });
    expect(schedule(undefined, 'solution', DAY)).toMatchObject({ reps: 0, lapses: 1, interval: 1 });
    expect(schedule(undefined, 'fail', DAY).difficulty).toBe(schedule(undefined, 'solution', DAY).difficulty);
  });

  it('grows the interval on repeated solo solves, faster when the review came late', () => {
    const first = schedule(undefined, 'solo', DAY);
    const onTime = schedule(first, 'solo', first.due);
    const third = schedule(onTime, 'solo', onTime.due);
    expect(onTime.interval).toBeGreaterThan(first.interval);
    expect(third.interval).toBeGreaterThan(onTime.interval);
    // 隔了更久還記得，代表記得更牢
    const late = schedule(first, 'solo', '2026-09-28');
    expect(late.stability).toBeGreaterThan(onTime.stability);
  });

  it('brings a forgotten problem back within a couple of days and makes it harder', () => {
    const learned = schedule(schedule(undefined, 'solo', DAY), 'solo', '2026-09-18');
    const lapsed = schedule(learned, 'solution', '2026-09-30');
    expect(lapsed).toMatchObject({ reps: 0, lapses: 1 });
    expect(lapsed.interval).toBeLessThanOrEqual(2);
    expect(lapsed.difficulty).toBeGreaterThan(learned.difficulty);
    expect(lapsed.stability).toBeLessThan(learned.stability);
  });

  it('reviews more often when the target retention is higher', () => {
    const learned = replay(
      [
        { rating: 'solo', day: DAY },
        { rating: 'solo', day: '2026-09-18' },
      ],
      0.9,
    )!;
    expect(intervalFor(learned.stability, 0.95)).toBeLessThan(intervalFor(learned.stability, 0.9));
    expect(intervalFor(learned.stability, 0.8)).toBeGreaterThan(intervalFor(learned.stability, 0.9));
  });

  it('caps the interval, crosses month and year ends, and only delays the due date', () => {
    const strong: ReviewState = { stability: 900, difficulty: 3, reps: 8, lapses: 0, interval: 100, lastReview: '2026-06-01', due: DAY };
    expect(schedule(strong, 'solo', DAY).interval).toBe(MAX_INTERVAL);
    expect(schedule(undefined, 'solo', '2026-12-31').due).toBe('2027-01-02');
    expect(schedule(undefined, 'solo', DAY, 3)).toMatchObject({ interval: 2, due: '2026-09-21' });
  });

  it('treats a record from the old scheduler as a first attempt', () => {
    const old = { reps: 2, interval: 10, lapses: 0, due: DAY } as unknown as ReviewState;
    expect(schedule(old, 'solo', DAY)).toMatchObject({ stability: 2.3065, reps: 3, interval: 2 });
  });

  it('replays a history the same as scheduling one attempt at a time', () => {
    const history = [
      { rating: 'hint' as const, day: DAY },
      { rating: 'solo' as const, day: '2026-09-17' },
      { rating: 'fail' as const, day: '2026-09-25' },
      { rating: 'solo' as const, day: '2026-09-26', delayDays: 2 },
    ];
    let state: ReviewState | undefined;
    for (const a of history) state = schedule(state, a.rating, a.day, a.delayDays);
    expect(replay(history)).toEqual(state);
    expect(replay([])).toBeUndefined();
  });

  it('estimates how likely a problem is remembered today', () => {
    const state = schedule(undefined, 'solo', DAY);
    expect(recallOn(state, DAY)).toBe(1);
    // 穩定度那天剛好 90%，之後越來越低
    expect(recallOn({ stability: 10, lastReview: DAY }, '2026-09-26')).toBeCloseTo(0.9, 6);
    expect(recallOn(state, '2026-10-30')!).toBeLessThan(0.7);
    expect(recallOn(undefined, DAY)).toBeUndefined();
  });
});

describe('spreadDelays', () => {
  it('fills each day up to the limit before moving on', () => {
    expect(spreadDelays(12, DAY, new Map(), 5)).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2]);
  });

  it('counts reviews already due on those days', () => {
    const load = new Map([
      [DAY, 4],
      ['2026-09-17', 5],
    ]);
    expect(spreadDelays(3, DAY, load, 5)).toEqual([0, 2, 2]);
  });

  it('leaves small batches on the first day', () => {
    expect(spreadDelays(2, DAY)).toEqual([0, 0]);
    expect(spreadDelays(0, DAY)).toEqual([]);
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
