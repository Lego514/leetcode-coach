import { STUDY_LISTS, type ListId } from '../data/lists';
import { PATTERN_ORDER } from '../data/patterns';
import { BUILTIN_PROBLEMS, type Difficulty, type Problem } from '../data/problems';

export type ListFilter = ListId | 'custom' | 'all';

export const LIST_FILTER_LABELS: Record<ListFilter, string> = {
  neetcode150: 'NeetCode 150',
  blind75: 'Blind 75',
  grind169: 'Grind 169',
  custom: '我新增的題目',
  all: '全部題目',
};

export interface Catalog {
  problems: Problem[];
  byId: Map<number, Problem>;
  membership: Map<number, ListId[]>;
}

const DIFFICULTY_ORDER: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };
const PATTERN_INDEX = new Map(PATTERN_ORDER.map((id, i) => [id, i]));
const BUILTIN_INDEX = new Map(BUILTIN_PROBLEMS.map((p, i) => [p.id, i]));

const MEMBERSHIP = (() => {
  const map = new Map<number, ListId[]>();
  for (const list of STUDY_LISTS) {
    for (const id of list.problemIds) {
      map.set(id, [...(map.get(id) ?? []), list.id]);
    }
  }
  return map;
})();

/** 依路線圖順序：模式 → 難度 → 內建順序；自訂題目排在同組最後 */
export function roadmapCompare(a: Problem, b: Problem): number {
  return (
    (PATTERN_INDEX.get(a.pattern) ?? 99) - (PATTERN_INDEX.get(b.pattern) ?? 99) ||
    DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
    (BUILTIN_INDEX.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (BUILTIN_INDEX.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
    a.id - b.id
  );
}

export function buildCatalog(custom: Problem[]): Catalog {
  const builtinIds = new Set(BUILTIN_PROBLEMS.map((p) => p.id));
  const problems = [...BUILTIN_PROBLEMS, ...custom.filter((p) => !builtinIds.has(p.id))].sort(roadmapCompare);
  return {
    problems,
    byId: new Map(problems.map((p) => [p.id, p])),
    membership: MEMBERSHIP,
  };
}

export function inList(catalog: Catalog, problem: Problem, filter: ListFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'custom') return problem.custom;
  return catalog.membership.get(problem.id)?.includes(filter) ?? false;
}

export function problemsInList(catalog: Catalog, filter: ListFilter): Problem[] {
  return catalog.problems.filter((p) => inList(catalog, p, filter));
}

/** 下一批還沒做過的題目，依路線圖順序 */
export function nextNewProblems(problems: Problem[], started: (id: number) => boolean, count: number): Problem[] {
  if (count <= 0) return [];
  const result: Problem[] = [];
  for (const p of problems) {
    if (!started(p.id)) {
      result.push(p);
      if (result.length === count) break;
    }
  }
  return result;
}
