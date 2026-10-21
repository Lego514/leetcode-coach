import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { FREEZE_EVERY, MAX_FREEZES, streakState } from '../../shared/streak';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { bold, rich } from '../i18n/rich';
import { problemsInList } from '../lib/catalog';
import { addDays, startOfWeek, type Day } from '../lib/dates';
import { patternLevels, percent, progressBefore, readiness, weekSummary, winsFor, type WeekSummary } from '../lib/motivation';
import type { AttemptRecord, MetaRecord, ProgressRecord } from '../store/db';
import { useCatalog, useProgressMap, useSettings, useToday } from '../store/queries';
import { useToast } from './toast';
import { Sheet } from './ui';

// 讓人想繼續刷的畫面：今天的目標和連續天數保護、做完一題的慶祝、準備度、題型地圖、每週回顧

type DayState = 'done' | 'frozen' | 'missed' | 'today' | 'later';

/** 今天的目標：做 1 題或一回合卡片就算；下面是這週七天和連續天數保護 */
export function StreakCard({ days, today }: { days: readonly Day[]; today: Day }) {
  const { t } = useI18n();
  const m = t.motivation;
  const state = useMemo(() => streakState(days, today), [days, today]);
  const practiced = useMemo(() => new Set(days), [days]);
  const frozen = new Set(state.frozen);
  const weekStart = startOfWeek(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const stateOf = (day: Day): DayState =>
    day > today ? 'later' : practiced.has(day) ? 'done' : frozen.has(day) ? 'frozen' : day === today ? 'today' : 'missed';

  return (
    <section className="sheet streak-card" aria-labelledby="streak-title">
      <div className="sheet-head">
        <h2 className="sheet-title" id="streak-title">
          {m.goalTitle}
        </h2>
        <p className="sheet-note" data-done={state.practicedToday || undefined}>
          {state.practicedToday ? m.goalDone : state.streak > 0 ? m.goalTodo : m.goalStart}
        </p>
      </div>
      <div className="sheet-body streak-body">
        {frozen.has(addDays(today, -1)) && <p className="streak-saved">{m.frozeYesterday}</p>}
        <ol className="streak-week" aria-label={m.weekLabel}>
          {week.map((day, i) => {
            const s = stateOf(day);
            return (
              <li key={day} className="streak-day" data-state={s} aria-label={m.dayLabel(m.weekdays[i], m.dayStates[s])}>
                <span className="streak-dot" aria-hidden />
                <span className="streak-weekday" aria-hidden>
                  {m.weekdays[i]}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="inline-stats">
          <span>{rich(m.streak(state.streak), { b: bold })}</span>
          <span>{rich(m.freezes(state.freezes), { b: bold })}</span>
          <span>{state.untilFreeze > 0 ? m.untilFreeze(state.untilFreeze) : m.freezesFull}</span>
        </div>
        <p className="field-hint">{m.freezesHint(FREEZE_EVERY, MAX_FREEZES)}</p>
      </div>
    </section>
  );
}

/**
 * 做完一題時慶祝：征服了這題（之前靠提示，這次自己解出），或題型升到「會了」「精通」。
 * 看的是排程的變化，所以練習、複習、模擬面試、補記錄都算；同步一次帶進很多筆時不慶祝
 */
export function WinWatcher() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { progress, loaded } = useProgressMap();
  const catalog = useCatalog();
  const { activeList } = useSettings();
  const day = useToday();
  const previous = useRef<ReadonlyMap<number, ProgressRecord> | null>(null);

  useEffect(() => {
    if (!loaded) return;
    const before = previous.current;
    previous.current = progress;
    if (!before || before === progress) return;
    const changed = [...progress.values()].filter((r) => (before.get(r.problemId)?.attempts ?? 0) !== r.attempts);
    if (changed.length !== 1) return;
    const record = changed[0];
    if (record.attempts !== (before.get(record.problemId)?.attempts ?? 0) + 1 || record.lastDay !== day) return;
    const problem = catalog.byId.get(record.problemId);
    if (!problem) return;
    for (const win of winsFor(problem, problemsInList(catalog, activeList), before, progress, day)) {
      toast(
        win.kind === 'conquered'
          ? t.motivation.conquered(problem.title, t.ratings[win.lastRating].label)
          : t.motivation.levelUp(getPattern(win.pattern, locale).name, t.motivation.levels[win.level]),
        'win',
      );
    }
  }, [progress, loaded, catalog, activeList, day, toast, t, locale]);

  return null;
}

/** 面試準備度：清單裡現在會的題目，分難度，也算你標記過的公司 */
export function ReadinessSheet({
  problems,
  all,
  progress,
  meta,
  today,
}: {
  problems: readonly Problem[];
  all: readonly Problem[];
  progress: ReadonlyMap<number, ProgressRecord>;
  meta: ReadonlyMap<number, MetaRecord>;
  today: Day;
}) {
  const { t } = useI18n();
  const m = t.motivation;
  const result = useMemo(() => readiness(problems, progress, today), [problems, progress, today]);
  // 標得最多的幾家公司；公司的題目不限目前的清單
  const companies = useMemo(() => {
    const byCompany = new Map<string, Problem[]>();
    for (const p of all) {
      for (const company of meta.get(p.id)?.companies ?? []) byCompany.set(company, [...(byCompany.get(company) ?? []), p]);
    }
    return [...byCompany]
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([company, list]) => ({ company, ...readiness(list, progress, today) }));
  }, [all, meta, progress, today]);

  return (
    <Sheet title={m.readinessTitle} id="readiness" note={m.readinessNote}>
      <div className="sheet-body readiness">
        <p className="readiness-value">
          <strong>{percent(result.ready, result.total)}%</strong>
          <span>{m.readinessValue(result.ready, result.total)}</span>
        </p>
        <div className="difficulty-bars">
          {result.byDifficulty
            .filter((d) => d.total > 0)
            .map((d) => (
              <Meter key={d.difficulty} label={m.readinessLabel(d.difficulty)} value={d.ready} max={d.total}>
                <span className="difficulty" data-level={d.difficulty}>
                  {d.difficulty}
                </span>
              </Meter>
            ))}
        </div>
        <h3 className="readiness-subtitle">{m.companiesTitle}</h3>
        {companies.length === 0 ? (
          <p className="sheet-note">{m.companiesHint}</p>
        ) : (
          <div className="difficulty-bars">
            {companies.map((c) => (
              <Meter key={c.company} label={m.companyLabel(c.company)} value={c.ready} max={c.total}>
                <span className="readiness-company">{c.company}</span>
              </Meter>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Meter({ label, value, max, children }: { label: string; value: number; max: number; children: ReactNode }) {
  return (
    <div className="meter-row">
      {children}
      <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className="meter-fill" style={{ width: `${percent(value, max)}%` }} />
      </div>
      <span className="meter-value">
        {value} / {max}
      </span>
    </div>
  );
}

/** 題型地圖：照學習路線排，每個題型一格，等級越高顏色越深 */
export function PatternMap({ problems, progress, today }: { problems: readonly Problem[]; progress: ReadonlyMap<number, ProgressRecord>; today: Day }) {
  const { t, locale } = useI18n();
  const m = t.motivation;
  const levels = useMemo(() => patternLevels(problems, progress, today), [problems, progress, today]);
  if (levels.length === 0) return null;
  return (
    <Sheet title={m.mapTitle} id="pattern-map" note={m.mapNote}>
      <ol className="sheet-body pattern-map">
        {levels.map((p) => {
          const name = getPattern(p.pattern, locale).name;
          return (
            <li key={p.pattern}>
              <Link
                className="pattern-tile"
                data-level={p.level}
                to={`/patterns/${p.pattern}`}
                aria-label={m.mapTile(name, m.levels[p.level], p.ready, p.total)}
              >
                <span className="pattern-tile-name">{name}</span>
                <span className="pattern-tile-level">
                  {m.levels[p.level]} · {p.ready} / {p.total}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}

interface RecapInput {
  attempts: readonly AttemptRecord[];
  /** 做過微複習、講解練習的日子，也算有練習 */
  otherDays: readonly Day[];
  problems: readonly Problem[];
  retention: number;
  today: Day;
}

/** 準備度在某一天開始時是多少 */
function readinessAt(input: RecapInput, day: Day): number {
  const result = readiness(input.problems, progressBefore(input.attempts, day, input.retention), day);
  return percent(result.ready, result.total);
}

const RECAP_ROWS: (keyof WeekSummary)[] = ['days', 'sessions', 'newProblems', 'conquered', 'solo', 'minutes'];

/** 每週回顧：本週（到今天）和上週並排，加上準備度從上週一到現在的變化 */
export function WeeklyRecap({ progress, ...input }: RecapInput & { progress: ReadonlyMap<number, ProgressRecord> }) {
  const { t } = useI18n();
  const m = t.motivation;
  const { attempts, otherDays, problems, retention, today } = input;
  const thisWeek = startOfWeek(today);
  const lastWeek = addDays(thisWeek, -7);
  const [current, previous] = useMemo(
    () => [weekSummary(attempts, otherDays, thisWeek), weekSummary(attempts, otherDays, lastWeek)],
    [attempts, otherDays, thisWeek, lastWeek],
  );
  const from = useMemo(() => readinessAt({ attempts, otherDays, problems, retention, today }, lastWeek), [attempts, otherDays, problems, retention, today, lastWeek]);
  const now = useMemo(() => {
    const r = readiness(problems, progress, today);
    return percent(r.ready, r.total);
  }, [problems, progress, today]);

  return (
    <Sheet title={m.recapTitle} id="weekly-recap" note={m.readinessChange(from, now)}>
      <div className="sheet-body">
        <table className="data-table recap-table">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">{m.recapThisWeek}</th>
              <th scope="col">{m.recapLastWeek}</th>
            </tr>
          </thead>
          <tbody>
            {RECAP_ROWS.map((key) => (
              <tr key={key}>
                <th scope="row">{m.recapRows[key]}</th>
                <td>{current[key]}</td>
                <td>{previous[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="field-hint" style={{ marginTop: 8 }}>
          {m.recapConqueredHint}
        </p>
      </div>
    </Sheet>
  );
}

const RECAP_DISMISS_KEY = 'leetcode-coach:last-week-dismissed';

function dismissedWeek(): string | null {
  try {
    return localStorage.getItem(RECAP_DISMISS_KEY);
  } catch {
    return null;
  }
}

/** 今天頁：每週的前三天放一張上週回顧，按「知道了」這週就不再出現 */
export function LastWeekCard(input: RecapInput) {
  const { t } = useI18n();
  const m = t.motivation;
  const { attempts, otherDays, today } = input;
  const thisWeek = startOfWeek(today);
  const lastWeek = addDays(thisWeek, -7);
  const [dismissed, setDismissed] = useState(() => dismissedWeek() === thisWeek);
  const summary = useMemo(() => weekSummary(attempts, otherDays, lastWeek), [attempts, otherDays, lastWeek]);
  const { problems, retention } = input;
  const change = useMemo(() => {
    const at = { attempts, otherDays, problems, retention, today };
    return [readinessAt(at, lastWeek), readinessAt(at, thisWeek)] as const;
  }, [attempts, otherDays, problems, retention, today, lastWeek, thisWeek]);

  if (dismissed || today >= addDays(thisWeek, 3) || summary.days === 0) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(RECAP_DISMISS_KEY, thisWeek);
    } catch {
      // 存不了就只在這次關掉
    }
    setDismissed(true);
  };
  return (
    <Sheet title={m.lastWeekTitle} id="last-week">
      <div className="sheet-empty">
        <p>
          {rich(m.lastWeek(summary.days, summary.sessions, summary.newProblems, summary.conquered), { b: bold })}{' '}
          {change[1] !== change[0] && m.lastWeekReadiness(change[0], change[1])}
        </p>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <Link className="btn" to="/progress">
            {m.seeProgress}
          </Link>
          <button type="button" className="btn btn-quiet" onClick={dismiss}>
            {m.dismiss}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
