import { describe, expect, it } from 'vitest';
import { PATTERN_ORDER } from '../data/patterns';
import { buildCatalog, problemsInList } from './catalog';
import { addDays } from './dates';
import {
  INTERVIEW_RECALL,
  NEW_MINUTES,
  planSprint,
  rankNewProblems,
  REVIEW_MINUTES,
  type SprintInput,
  type SprintSettings,
} from './sprint';
import { recallOn, schedule, type ReviewState } from './srs';

const catalog = buildCatalog([]);
const list = problemsInList(catalog, 'neetcode150');
const all = catalog.problems;
// 2026-10-12 是星期一
const MONDAY = '2026-10-12';

function input(overrides: Partial<Omit<SprintInput, 'sprint'>> & { sprint?: Partial<SprintSettings> } = {}): SprintInput {
  const { sprint, ...rest } = overrides;
  return {
    today: MONDAY,
    list,
    all,
    progress: new Map(),
    companiesOf: () => [],
    ...rest,
    sprint: { date: addDays(MONDAY, 14), weekdayMinutes: 90, weekendMinutes: 180, reviewDays: 2, ...sprint },
  };
}

describe('rankNewProblems', () => {
  it('puts the company’s problems first, then one problem for each untouched pattern, then the list', () => {
    const tagged = new Set([146, 200]);
    const picks = rankNewProblems(input({ sprint: { company: 'Google' }, companiesOf: (id) => (tagged.has(id) ? ['google'] : []) }));
    expect(picks.slice(0, 2).map((p) => [p.problem.id, p.reason])).toEqual([
      [146, 'company'],
      [200, 'company'],
    ]);
    const newPatterns = picks.filter((p) => p.reason === 'newPattern');
    // 公司題已經碰到 graphs 和 linked-list，其他模式各一題
    expect(new Set(newPatterns.map((p) => p.problem.pattern)).size).toBe(newPatterns.length);
    expect(newPatterns.map((p) => p.problem.pattern)).not.toContain('graphs');
    expect(newPatterns[0].problem.pattern).toBe('arrays');
    expect(picks.at(-1)?.reason).toBe('list');
    expect(new Set(picks.map((p) => p.problem.id)).size).toBe(picks.length);
  });

  it('adds two more problems from a pattern I keep forgetting, and skips what I already did', () => {
    const progress = new Map([[217, schedule(undefined, 'fail', MONDAY)]]);
    const picks = rankNewProblems(input({ progress }));
    expect(picks.some((p) => p.problem.id === 217)).toBe(false);
    const weak = picks.filter((p) => p.reason === 'weakPattern');
    expect(weak).toHaveLength(2);
    expect(weak.every((p) => p.problem.pattern === 'arrays')).toBe(true);
    expect(picks.filter((p) => p.reason === 'newPattern').map((p) => p.problem.pattern)).not.toContain('arrays');
  });
});

describe('planSprint', () => {
  it('plans every day until the day before the interview, and the last days are review only', () => {
    const plan = planSprint(input());
    expect(plan.days).toHaveLength(14);
    expect(plan.days[0].day).toBe(MONDAY);
    expect(plan.days.at(-1)!.daysBefore).toBe(1);
    expect(plan.days.slice(-2).every((d) => d.phase === 'review' && d.newProblems.length === 0)).toBe(true);
    // 複習多的日子可能排不下下一題，但大部分的日子都有新題
    expect(plan.days.slice(0, -2).every((d) => d.phase === 'learn')).toBe(true);
    expect(plan.days.slice(0, -2).filter((d) => d.newProblems.length > 0).length).toBeGreaterThanOrEqual(10);
  });

  it('fits each day into its time, with more on weekends', () => {
    const plan = planSprint(input());
    for (const d of plan.days) {
      const fixed = d.reviews * REVIEW_MINUTES + (d.mock ? 45 : 0) + (d.story ? 15 : 0);
      const fresh = d.newProblems.reduce((sum, p) => sum + NEW_MINUTES[p.problem.difficulty], 0);
      if (d.newProblems.length > 0) expect(fixed + fresh).toBeLessThanOrEqual(d.budget);
      expect(d.minutes).toBe(fixed + fresh + d.pulled.length * REVIEW_MINUTES);
    }
    const saturday = plan.days.find((d) => d.day === '2026-10-17')!;
    expect(saturday.budget).toBe(180);
    expect(plan.days[0].budget).toBe(90);
  });

  it('schedules a mock two days before and behavioral practice the day before', () => {
    const plan = planSprint(input());
    expect(plan.days.filter((d) => d.mock).map((d) => d.daysBefore)).toEqual([9, 2]);
    expect(plan.days.at(-1)!.story).toBe(true);
  });

  it('expects the first review of each new problem two days later', () => {
    const plan = planSprint(input());
    expect(plan.days[0].reviews).toBe(0);
    expect(plan.days[2].reviews).toBe(plan.days[0].newProblems.length);
  });

  it('pulls problems I’d forget by the interview into the review-only days', () => {
    // 目標記憶率 0.8 時，到期日在面試之後，面試那天卻已經低於 0.9
    const interview = addDays(MONDAY, 14);
    let fading: ReviewState | undefined;
    for (let i = 0; i < 90 && !fading; i += 1) {
      const s = schedule(schedule(undefined, 'solo', '2026-07-01', 0, 0.8), 'solo', addDays('2026-07-05', i), 0, 0.8);
      if (s.due >= interview && recallOn(s, interview)! < INTERVIEW_RECALL) fading = s;
    }
    expect(fading).toBeDefined();
    const plan = planSprint(input({ progress: new Map([[1, fading!]]), retention: 0.8 }));
    const pulled = plan.days.flatMap((d) => d.pulled.map((p) => ({ daysBefore: d.daysBefore, id: p.id })));
    expect(pulled.map((p) => p.id)).toContain(1);
    expect(pulled.every((p) => p.daysBefore <= 2)).toBe(true);
  });

  it('starts today with what I already started counted against the time', () => {
    const started = [all.find((p) => p.id === 1)!, all.find((p) => p.id === 217)!];
    const plan = planSprint(input({ startedToday: started }));
    expect(plan.days[0].budget).toBe(90 - 2 * NEW_MINUTES.Easy);
  });

  it('says how much does not fit, and tracks company and pattern coverage', () => {
    const plan = planSprint(input({ sprint: { date: addDays(MONDAY, 4), company: 'Meta' }, companiesOf: (id) => (id === 1 ? ['Meta'] : []) }));
    expect(plan.unscheduled.length).toBeGreaterThan(100);
    expect(plan.days.flatMap((d) => d.newProblems)).toEqual(plan.queue.slice(0, plan.queue.length - plan.unscheduled.length));
    expect(plan.company).toEqual({ total: 1, started: 0, planned: 1 });
    expect(plan.patterns.covered).toBe(0);
    expect(plan.patterns.planned).toBeGreaterThan(0);
    expect(plan.patterns.total).toBe(PATTERN_ORDER.length);
  });

  it('has nothing left to plan on or after the interview day', () => {
    expect(planSprint(input({ sprint: { date: MONDAY } })).days).toEqual([]);
    expect(planSprint(input({ sprint: { date: addDays(MONDAY, -3) } })).days).toEqual([]);
  });
});
