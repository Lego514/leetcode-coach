import { useMemo } from 'react';
import { problemsInList, skipPremium } from '../lib/catalog';
import { addDays, diffDays } from '../lib/dates';
import { planSprint, type SprintPlan, type SprintSettings } from '../lib/sprint';
import { problemsStartedOn } from '../lib/stats';
import { STUCK_SPRINT_DAYS, stuckPatterns } from '../lib/stuck';
import { retentionOf } from './progress';
import { useAttempts, useCatalog, useMetaMap, useProgressMap, useSettings, useToday } from './queries';

export interface SprintState {
  sprint: SprintSettings;
  /** 距離面試幾天；0 是面試當天，負的是已經過了 */
  daysLeft: number;
  plan: SprintPlan;
}

/** 目前的衝刺和照現在的進度算出來的計畫；沒有衝刺或資料還沒載入時是 null */
export function useSprint(): SprintState | null {
  const settings = useSettings();
  const day = useToday();
  const catalog = useCatalog();
  const { progress, loaded } = useProgressMap();
  const meta = useMetaMap();
  const attempts = useAttempts();
  const { sprint, activeList, skipPremium: skip } = settings;
  const retention = retentionOf(settings);

  return useMemo(() => {
    if (!sprint || !loaded || !attempts) return null;
    const startedToday = problemsStartedOn(attempts, day).flatMap((id) => catalog.byId.get(id) ?? []);
    const plan = planSprint({
      sprint,
      today: day,
      list: skipPremium(problemsInList(catalog, activeList), skip, (id) => progress.has(id)),
      all: skipPremium(catalog.problems, skip, (id) => progress.has(id)),
      progress,
      companiesOf: (id) => meta.get(id)?.companies ?? [],
      startedToday,
      retention,
      stuckPatterns: stuckPatterns(attempts, (id) => catalog.byId.get(id), addDays(day, -STUCK_SPRINT_DAYS)),
    });
    return { sprint, daysLeft: diffDays(day, sprint.date), plan };
  }, [sprint, loaded, attempts, day, catalog, activeList, skip, progress, meta, retention]);
}
