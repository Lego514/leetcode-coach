import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ActivityCalendar, WeeklyChart } from '../components/charts';
import { MasteryCell, MasteryLegend, PageHead, Sheet } from '../components/ui';
import { CLARITY_OPTIONS } from '../data/interview';
import { getPattern } from '../data/patterns';
import { LIST_FILTER_LABELS, problemsInList, type ListFilter } from '../lib/catalog';
import { addDays, startOfWeek } from '../lib/dates';
import { STAGE_LABELS, stageOf } from '../lib/srs';
import { countByDay, practiceStreak, summarizeDifficulty, summarizePatterns, weeklyCounts } from '../lib/stats';
import { useAttempts, useCatalog, useMocks, useProgressMap, useSettings, useToday } from '../store/queries';

const LIST_OPTIONS: ListFilter[] = ['neetcode150', 'blind75', 'grind169', 'custom', 'all'];
const CALENDAR_WEEKS = 18;

export function ProgressPage() {
  const day = useToday();
  const settings = useSettings();
  const catalog = useCatalog();
  const { progress } = useProgressMap();
  const attempts = useAttempts();
  const mocks = useMocks();
  const [listChoice, setListChoice] = useState<ListFilter | null>(null);
  const list = listChoice ?? settings.activeList;

  const problems = useMemo(() => problemsInList(catalog, list), [catalog, list]);
  const patterns = useMemo(() => summarizePatterns(problems, progress), [problems, progress]);
  const difficulty = useMemo(() => summarizeDifficulty(problems, progress), [problems, progress]);
  const allAttempts = useMemo(() => attempts ?? [], [attempts]);
  const weeks = useMemo(() => weeklyCounts(allAttempts, day, 12), [allAttempts, day]);
  const byDay = useMemo(() => countByDay(allAttempts), [allAttempts]);

  const started = problems.filter((p) => progress.has(p.id)).length;
  const mastered = problems.filter((p) => stageOf(progress.get(p.id)) === 'mastered').length;
  const streak = practiceStreak(byDay.keys(), day);
  const calendarStart = addDays(startOfWeek(day), -7 * (CALENDAR_WEEKS - 1));
  const activeDays = [...byDay.keys()].filter((d) => d >= calendarStart && d <= day).length;

  const weakest = patterns
    .filter((p) => p.started >= 2)
    .sort((a, b) => a.startedMastery - b.startedMastery)[0];

  const fullMocks = (mocks ?? []).filter((m) => m.kind === 'full');
  const explainMocks = (mocks ?? []).filter((m) => m.kind === 'explain');
  const smoothExplains = explainMocks.filter((m) => m.clarity === CLARITY_OPTIONS[0].id).length;

  return (
    <div className="page">
      <PageHead title="進度" lede="每個方格是一題，顏色越深代表複習間隔越長、記得越牢。" />

      <div className="filters">
        <label className="field" style={{ flex: '0 1 220px' }}>
          <span className="field-label">清單</span>
          <select className="select" value={list} onChange={(e) => setListChoice(e.target.value as ListFilter)}>
            {LIST_OPTIONS.map((id) => (
              <option key={id} value={id}>
                {LIST_FILTER_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="stack">
        <section className="sheet stat-line" aria-label="總覽">
          <div className="stat">
            <p className="stat-label">做過的題目</p>
            <p className="stat-value">
              {started}
              <small>/ {problems.length}</small>
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">已熟練</p>
            <p className="stat-value">
              {mastered}
              <small>題</small>
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">連續練習</p>
            <p className="stat-value">
              {streak}
              <small>天</small>
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">累計練習</p>
            <p className="stat-value">
              {allAttempts.length}
              <small>次</small>
            </p>
          </div>
        </section>

        <Sheet
          title="各模式熟練度"
          id="mastery"
          note={
            weakest ? (
              <>
                目前最弱：<Link to={`/patterns/${weakest.pattern}`}>{getPattern(weakest.pattern).name}</Link>
              </>
            ) : undefined
          }
        >
          <div className="sheet-body">
            {problems.length === 0 ? (
              <p className="sheet-note">這份清單沒有題目。</p>
            ) : (
              <>
                <div className="mastery-rows">
                  {patterns.map((s) => (
                    <div key={s.pattern} className="mastery-row">
                      <Link className="mastery-name" to={`/patterns/${s.pattern}`}>
                        {getPattern(s.pattern).name}
                      </Link>
                      <div className="mastery-cells">
                        {problems
                          .filter((p) => p.pattern === s.pattern)
                          .map((p) => {
                            const state = progress.get(p.id);
                            return (
                              <Link key={p.id} to={`/problems/${p.id}`} aria-label={`${p.title}，${STAGE_LABELS[stageOf(state)]}`}>
                                <MasteryCell progress={state} />
                              </Link>
                            );
                          })}
                      </div>
                      <span className="mastery-count">
                        {s.started} / {s.total}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14 }}>
                  <MasteryLegend />
                </div>
                {weakest && (
                  <p className="sheet-note" style={{ marginTop: 10 }}>
                    建議到模擬面試選「做過但最不熟的題目」，並把模式限定為{getPattern(weakest.pattern).name}。
                  </p>
                )}
              </>
            )}
          </div>
        </Sheet>

        <div className="split split-even">
          <Sheet title="每週練習次數" id="weekly" note="含新題、複習與模擬面試">
            <div className="sheet-body">
              <WeeklyChart weeks={weeks} />
            </div>
          </Sheet>
          <div className="stack">
            <Sheet title="練習日曆" id="calendar" note={`最近 ${CALENDAR_WEEKS} 週，共 ${activeDays} 天有練習`}>
              <div className="sheet-body">
                <ActivityCalendar counts={byDay} today={day} weeks={CALENDAR_WEEKS} />
              </div>
            </Sheet>
            <Sheet title="難度分布" id="difficulty">
              <div className="sheet-body difficulty-bars">
                {difficulty.map((d) => (
                  <div key={d.difficulty} className="meter-row">
                    <span className="difficulty" data-level={d.difficulty}>
                      {d.difficulty}
                    </span>
                    <div
                      className="meter"
                      role="meter"
                      aria-label={`${d.difficulty} 做過的題數`}
                      aria-valuemin={0}
                      aria-valuemax={d.total}
                      aria-valuenow={d.started}
                    >
                      <div className="meter-fill" style={{ width: d.total ? `${(d.started / d.total) * 100}%` : 0 }} />
                    </div>
                    <span className="meter-value">
                      {d.started} / {d.total}
                    </span>
                  </div>
                ))}
              </div>
            </Sheet>
          </div>
        </div>

        <Sheet title="模擬面試" id="mock-stats">
          <div className="sheet-body inline-stats">
            <span>
              完整模擬 <strong>{fullMocks.length}</strong> 次
            </span>
            <span>
              講解練習 <strong>{explainMocks.length}</strong> 次，其中講得很順的有 <strong>{smoothExplains}</strong> 次
            </span>
            <Link to="/mock">開始一次練習</Link>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
