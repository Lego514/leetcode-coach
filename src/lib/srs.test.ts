import { FSRSAlgorithm, generatorParameters } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import type { StuckReason } from '../../shared/constants';
import {
  CONFIRM_DAYS,
  DEFAULT_RETENTION,
  evidenceWeight,
  explainSchedule,
  intervalFor,
  MAX_INTERVAL,
  masteryOf,
  nextMemory,
  recallOn,
  replay,
  schedule,
  SLOW_WEIGHT,
  spreadDelays,
  stageOf,
  timeWeight,
  type Evidence,
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

describe('time spent and shaky solves', () => {
  it('weighs the time spent: full weight within the target, down to Hard-like 0.6 at twice the target', () => {
    expect(timeWeight(undefined)).toBe(1);
    expect(timeWeight(0.5)).toBe(1);
    expect(timeWeight(1)).toBe(1);
    expect(timeWeight(1.5)).toBeCloseTo(0.8);
    expect(timeWeight(2)).toBeCloseTo(SLOW_WEIGHT);
    expect(timeWeight(4)).toBeCloseTo(SLOW_WEIGHT);
  });

  it('remembers a slow solve less firmly, more so the slower it was', () => {
    const first = (pace?: number) => schedule(undefined, 'solo', DAY, 0, DEFAULT_RETENTION, { pace: pace }).stability;
    expect(first(1.5)).toBeLessThan(first(1));
    expect(first(2)).toBeLessThan(first(1.5));
    const prev = schedule(undefined, 'solo', DAY);
    const later = '2026-09-26';
    const again = (pace?: number) => schedule(prev, 'solo', later, 0, DEFAULT_RETENTION, { pace: pace });
    expect(again(1.3).stability).toBeLessThan(again(1).stability);
    expect(again(1.3).interval).toBeLessThanOrEqual(again(1).interval);
    // 忘了就是忘了，時間不影響
    expect(schedule(prev, 'fail', later, 0, DEFAULT_RETENTION, { pace: 3 })).toEqual(schedule(prev, 'fail', later));
  });

  it('brings a shaky solve back within a week to confirm, without throwing away what was learned', () => {
    // 很久以前做過、當時不太熟（穩定度約 1 天），隔了半年再寫：FSRS 會讓穩定度一口氣長很多
    const prev: ReviewState = { stability: 1, difficulty: 5, reps: 1, lapses: 0, interval: 1, lastReview: '2026-03-01', due: '2026-03-02' };
    const solo = schedule(prev, 'solo', DAY);
    const hint = schedule(prev, 'hint', DAY);
    expect(solo.interval).toBeGreaterThan(2 * CONFIRM_DAYS);
    // 看了提示：一週內先確認一次，但穩定度照 FSRS 算，確認寫得順就接著拉長
    expect(hint.interval).toBe(CONFIRM_DAYS);
    expect(hint.stability).toBeGreaterThan(CONFIRM_DAYS);
    // 沒看提示但花了兩倍以上的時間，也一樣先確認
    expect(schedule(prev, 'solo', DAY, 0, DEFAULT_RETENTION, { pace: 2 }).interval).toBe(CONFIRM_DAYS);
    expect(schedule(prev, 'solo', DAY, 0, DEFAULT_RETENTION, { pace: 1.5 }).interval).toBeGreaterThan(CONFIRM_DAYS);
    // 確認那次準時自己寫出來，就不再卡在一週
    expect(schedule(hint, 'solo', '2026-09-23').interval).toBeGreaterThan(CONFIRM_DAYS);
  });

  it('uses the minutes of each attempt against the target when replaying', () => {
    const quick = [{ rating: 'solo' as const, day: DAY, minutes: 10 }];
    const slow = [{ rating: 'solo' as const, day: DAY, minutes: 40 }];
    expect(replay(slow, DEFAULT_RETENTION, 15)!.stability).toBeLessThan(replay(quick, DEFAULT_RETENTION, 15)!.stability);
    // 不知道目標時間（或沒有時間）就不看時間
    expect(replay(slow)).toEqual(replay(quick));
  });
});

describe('hint depth and where you got stuck', () => {
  // 很久以前做過、當時不太熟（穩定度約 1 天），隔了半年再寫
  const prev: ReviewState = { stability: 1, difficulty: 5, reps: 1, lapses: 0, interval: 1, lastReview: '2026-03-01', due: '2026-03-02' };

  it('remembers less the deeper the hints went, and ignores hint depth when you rated it solved alone', () => {
    const layers = [1, 2, 3, 4].map((hintLayers) => schedule(prev, 'hint', DAY, 0, DEFAULT_RETENTION, { hintLayers }).stability);
    expect(layers.every((s, i) => i === 0 || s < layers[i - 1])).toBe(true);
    // 第 2 層（關鍵觀察）就是 FSRS 原本的 Hard
    expect(layers[1]).toBe(schedule(prev, 'hint', DAY).stability);
    // 只看了題型還是比自己解出少，看到模板也比忘了多
    expect(layers[0]).toBeLessThan(schedule(prev, 'solo', DAY).stability);
    expect(evidenceWeight('solo', { hintLayers: 4 })).toBe(1);
    // 看了提示都先在一週內確認
    for (const hintLayers of [1, 4]) expect(schedule(prev, 'hint', DAY, 0, DEFAULT_RETENTION, { hintLayers }).interval).toBe(CONFIRM_DAYS);
  });

  it('counts forgetting the idea more than slips in execution, and leaves running out of time to the time weight', () => {
    const solo = (stuck: StuckReason[]) => schedule(prev, 'solo', DAY, 0, DEFAULT_RETENTION, { stuck });
    const plain = solo([]);
    // 沒看出模式：記憶度扣比較多，而且一週內確認
    expect(solo(['pattern']).stability).toBeLessThan(solo(['bug']).stability);
    expect(solo(['pattern']).interval).toBe(CONFIRM_DAYS);
    expect(solo(['implement']).interval).toBe(CONFIRM_DAYS);
    // 有 bug、漏了邊界情況：小扣，不提早確認
    expect(solo(['edge']).stability).toBeLessThan(plain.stability);
    expect(solo(['edge']).interval).toBeGreaterThan(CONFIRM_DAYS);
    // 時間不夠：時間權重已經算了
    expect(solo(['time'])).toEqual(plain);
  });

  it('multiplies the weights', () => {
    expect(evidenceWeight('hint', { pace: 1.5, hintLayers: 2, stuck: ['bug'] })).toBeCloseTo(0.8 * 0.9);
    // 最壞的情況：兩倍時間、看到模板、沒看出模式
    expect(evidenceWeight('hint', { pace: 3, hintLayers: 4, stuck: ['pattern'] })).toBeCloseTo(0.6 * 0.7 * 0.75);
  });
});

describe('explainSchedule', () => {
  const prev: ReviewState = { stability: 10, difficulty: 5, reps: 2, lapses: 0, interval: 10, lastReview: '2026-09-06', due: '2026-09-16' };

  it('always lands on the same days as schedule', () => {
    const next = random(7);
    const ratings = ['solo', 'hint', 'solution', 'fail'] as const;
    for (let i = 0; i < 300; i++) {
      const before: ReviewState | undefined =
        next() < 0.2 ? undefined : { ...prev, stability: 0.5 + next() * 200, lastReview: '2026-01-01', due: '2026-01-02' };
      const day = `2026-${String(1 + Math.floor(next() * 9)).padStart(2, '0')}-1${Math.floor(next() * 9)}`;
      const rating = ratings[Math.floor(next() * 4)];
      const evidence: Evidence = {
        pace: next() < 0.5 ? undefined : next() * 3,
        hintLayers: Math.floor(next() * 5),
        stuck: next() < 0.5 ? [] : [(['pattern', 'bug', 'time'] as const)[Math.floor(next() * 3)]],
      };
      const retention = [0.8, 0.9, 0.95][Math.floor(next() * 3)];
      const e = explainSchedule(before, rating, day, 0, retention, evidence);
      const s = schedule(before, rating, day, 0, retention, evidence);
      expect(e.days).toBe(s.interval);
      expect(e.stabilityAfter).toBe(s.stability);
      // 權重乘起來就是 schedule 用的那個
      if (e.factors.length > 0) expect(e.factors.reduce((w, f) => w * f.weight, 1)).toBeCloseTo(evidenceWeight(rating, evidence));
    }
  });

  it('lists each weight with where it came from', () => {
    const e = explainSchedule(prev, 'hint', DAY, 0, DEFAULT_RETENTION, { pace: 1.5, hintLayers: 4, stuck: ['pattern'] });
    expect(e).toMatchObject({ first: false, gapDays: 10, stabilityBefore: 10, confirm: true, days: CONFIRM_DAYS });
    expect(e.recall).toBeCloseTo(0.9);
    expect(e.factors).toEqual([
      { kind: 'time', pace: 1.5, weight: 0.8 },
      { kind: 'hint', layers: 4, weight: 0.7 },
      { kind: 'memoryStuck', weight: 0.75 },
    ]);
    expect(e.fsrsDays).toBeGreaterThan(CONFIRM_DAYS);
    // 第 2 層提示的權重是 1，不列；在目標時間內也不列
    expect(explainSchedule(prev, 'hint', DAY, 0, DEFAULT_RETENTION, { pace: 0.8, hintLayers: 2 }).factors).toEqual([]);
    expect(explainSchedule(prev, 'solo', DAY, 0, DEFAULT_RETENTION, { stuck: ['edge'] }).factors).toEqual([
      { kind: 'executionStuck', weight: 0.9 },
    ]);
  });

  it('skips the weights when they don’t apply: forgetting, and the same day again', () => {
    const evidence = { pace: 3, stuck: ['pattern'] as const };
    expect(explainSchedule(prev, 'solution', DAY, 0, DEFAULT_RETENTION, evidence)).toMatchObject({ factors: [], confirm: false });
    const sameDay = explainSchedule({ ...prev, lastReview: DAY }, 'solo', DAY, 0, DEFAULT_RETENTION, evidence);
    expect(sameDay).toMatchObject({ gapDays: 0, factors: [] });
  });

  it('marks the first attempt, the longest interval, and days moved to spread out a batch', () => {
    expect(explainSchedule(undefined, 'solo', DAY)).toMatchObject({ first: true, gapDays: 0, recall: undefined, stabilityBefore: undefined });
    const long = explainSchedule({ ...prev, stability: 200, lastReview: '2026-01-01' }, 'solo', DAY);
    expect(long).toMatchObject({ maxed: true, fsrsDays: MAX_INTERVAL, days: MAX_INTERVAL });
    expect(explainSchedule(undefined, 'solo', DAY, 3)).toMatchObject({ delayDays: 3 });
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
