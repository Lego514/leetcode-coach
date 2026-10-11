import { useMemo } from 'react';
import { problemsInList } from '../lib/catalog';
import { diffDays } from '../lib/dates';
import { planSprint, type SprintPlan, type SprintSettings } from '../lib/sprint';
import { problemsStartedOn } from '../lib/stats';
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
  const { sprint, activeList } = settings;
  const retention = retentionOf(settings);

  return useMemo(() => {
    if (!sprint || !loaded || !attempts) return null;
    const startedToday = problemsStartedOn(attempts, day).flatMap((id) => catalog.byId.get(id) ?? []);
    const plan = planSprint({
      sprint,
      today: day,
      list: problemsInList(catalog, activeList),
      all: catalog.problems,
      progress,
      companiesOf: (id) => meta.get(id)?.companies ?? [],
      startedToday,
      retention,
    });
    return { sprint, daysLeft: diffDays(day, sprint.date), plan };
  }, [sprint, loaded, attempts, day, catalog, activeList, progress, meta, retention]);
}
