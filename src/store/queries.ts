import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import type { PatternId } from '../data/patterns';
import { buildCatalog, type Catalog } from '../lib/catalog';
import { today, type Day } from '../lib/dates';
import {
  db,
  DEFAULT_SETTINGS,
  type AttemptRecord,
  type MetaRecord,
  type MockRecord,
  type NoteRecord,
  type PatternNoteRecord,
  type ProgressRecord,
  type SettingsRecord,
} from './db';

// 所有讀取都集中在這裡；資料變動時 useLiveQuery 會自動重新渲染。
// 回傳 undefined 代表還在載入，null 代表資料不存在。

const EMPTY_PROGRESS: ReadonlyMap<number, ProgressRecord> = new Map();

export function useSettings(): SettingsRecord {
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  return settings ?? DEFAULT_SETTINGS;
}

export function useCatalog(): Catalog {
  const custom = useLiveQuery(() => db.customProblems.toArray(), []);
  return useMemo(() => buildCatalog(custom ?? [], custom !== undefined), [custom]);
}

export function useProgressMap(): { progress: ReadonlyMap<number, ProgressRecord>; loaded: boolean } {
  const rows = useLiveQuery(() => db.progress.toArray(), []);
  const progress = useMemo(() => (rows ? new Map(rows.map((r) => [r.problemId, r])) : EMPTY_PROGRESS), [rows]);
  return { progress, loaded: rows !== undefined };
}

export function useProgress(problemId: number): ProgressRecord | null | undefined {
  return useLiveQuery(async () => (await db.progress.get(problemId)) ?? null, [problemId]);
}

export function useAttempts(): AttemptRecord[] | undefined {
  return useLiveQuery(() => db.attempts.orderBy('day').toArray(), []);
}

export function useAttemptsFor(problemId: number): AttemptRecord[] | undefined {
  return useLiveQuery(
    async () => (await db.attempts.where('problemId').equals(problemId).sortBy('at')).reverse(),
    [problemId],
  );
}

export function useAttemptsOn(day: Day): AttemptRecord[] | undefined {
  return useLiveQuery(() => db.attempts.where('day').equals(day).sortBy('at'), [day]);
}

export function useNote(problemId: number): NoteRecord | null | undefined {
  return useLiveQuery(async () => (await db.notes.get(problemId)) ?? null, [problemId]);
}

export function useNoteMap(): ReadonlyMap<number, NoteRecord> | undefined {
  const rows = useLiveQuery(() => db.notes.toArray(), []);
  return useMemo(() => rows && new Map(rows.map((r) => [r.problemId, r])), [rows]);
}

export function useMetaMap(): ReadonlyMap<number, MetaRecord> {
  const rows = useLiveQuery(() => db.meta.toArray(), []);
  return useMemo(() => new Map((rows ?? []).map((r) => [r.problemId, r])), [rows]);
}

export function useCompanies(): string[] {
  const companies = useLiveQuery(() => db.meta.orderBy('companies').uniqueKeys(), []);
  return useMemo(
    () => ((companies ?? []) as string[]).slice().sort((a, b) => a.localeCompare(b)),
    [companies],
  );
}

export function usePatternNote(patternId: PatternId): PatternNoteRecord | null | undefined {
  return useLiveQuery(async () => (await db.patternNotes.get(patternId)) ?? null, [patternId]);
}

export function usePendingChanges(): number {
  return useLiveQuery(() => db.outbox.count(), []) ?? 0;
}

export function useMocks(): MockRecord[] | undefined {
  return useLiveQuery(async () => (await db.mocks.orderBy('id').toArray()).reverse(), []);
}

/** 目前的日期；跨過午夜或從背景回來時會更新 */
export function useToday(): Day {
  const [day, setDay] = useState(today);
  useEffect(() => {
    const refresh = () => setDay(today());
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return day;
}
