import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ActivityCalendar, WeeklyChart } from '../components/charts';
import { MasteryCell, MasteryLegend, PageHead, Sheet } from '../components/ui';
import { CLARITY_OPTIONS } from '../data/interview';
import { getPattern } from '../data/patterns';
import { useI18n } from '../i18n';
import { bold, rich } from '../i18n/rich';
import { LIST_FILTERS, problemsInList, type ListFilter } from '../lib/catalog';
import { addDays, startOfWeek } from '../lib/dates';
import { stageOf } from '../lib/srs';
import {
  countByDay,
  practiceAttempts,
  practiceStreak,
  summarizeDifficulty,
  summarizePatterns,
  weeklyCounts,
} from '../lib/stats';
import { useAttempts, useCatalog, useMocks, useProgressMap, useSettings, useToday } from '../store/queries';

const CALENDAR_WEEKS = 18;

export function ProgressPage() {
  const { t, locale } = useI18n();
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
  // 批次標記的舊題不算練習次數
  const allAttempts = useMemo(() => practiceAttempts(attempts ?? []), [attempts]);
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
  const smoothExplains = explainMocks.filter((m) => m.clarity === CLARITY_OPTIONS[0]).length;

  return (
    <div className="page">
      <PageHead title={t.progress.title} lede={t.progress.lede} />

      <div className="filters">
        <label className="field" style={{ flex: '0 1 220px' }}>
          <span className="field-label">{t.progress.list}</span>
          <select className="select" value={list} onChange={(e) => setListChoice(e.target.value as ListFilter)}>
            {LIST_FILTERS.map((id) => (
              <option key={id} value={id}>
                {t.lists.labels[id]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="stack">
        <section className="sheet stat-line" aria-label={t.progress.overview}>
          <div className="stat">
            <p className="stat-label">{t.progress.started}</p>
            <p className="stat-value">
              {started}
              <small>/ {problems.length}</small>
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">{t.progress.mastered}</p>
            <p className="stat-value">
              {mastered}
              <Unit text={t.progress.unitProblems} />
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">{t.progress.streak}</p>
            <p className="stat-value">
              {streak}
              <Unit text={t.progress.unitDays} />
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">{t.progress.total}</p>
            <p className="stat-value">
              {allAttempts.length}
              <Unit text={t.progress.unitTimes} />
            </p>
          </div>
        </section>

        <Sheet
          title={t.progress.masteryTitle}
          id="mastery"
          note={
            weakest
              ? rich(t.progress.weakest(getPattern(weakest.pattern, locale).name), {
                  link: (text) => <Link to={`/patterns/${weakest.pattern}`}>{text}</Link>,
                })
              : undefined
          }
        >
          <div className="sheet-body">
            {problems.length === 0 ? (
              <p className="sheet-note">{t.progress.emptyList}</p>
            ) : (
              <>
                <div className="mastery-rows">
                  {patterns.map((s) => (
                    <div key={s.pattern} className="mastery-row">
                      <Link className="mastery-name" to={`/patterns/${s.pattern}`}>
                        {getPattern(s.pattern, locale).name}
                      </Link>
                      <div className="mastery-cells">
                        {problems
                          .filter((p) => p.pattern === s.pattern)
                          .map((p) => {
                            const state = progress.get(p.id);
                            return (
                              <Link key={p.id} to={`/problems/${p.id}`} aria-label={t.progress.cellLabel(p.title, t.stages[stageOf(state)])}>
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
                    {t.progress.weakestTip(getPattern(weakest.pattern, locale).name)}
                  </p>
                )}
              </>
            )}
          </div>
        </Sheet>

        <div className="split split-even">
          <Sheet title={t.progress.weeklyTitle} id="weekly" note={t.progress.weeklyNote}>
            <div className="sheet-body">
              <WeeklyChart weeks={weeks} />
            </div>
          </Sheet>
          <div className="stack">
            <Sheet title={t.progress.calendarTitle} id="calendar" note={t.progress.calendarNote(CALENDAR_WEEKS, activeDays)}>
              <div className="sheet-body">
                <ActivityCalendar counts={byDay} today={day} weeks={CALENDAR_WEEKS} />
              </div>
            </Sheet>
            <Sheet title={t.progress.difficultyTitle} id="difficulty">
              <div className="sheet-body difficulty-bars">
                {difficulty.map((d) => (
                  <div key={d.difficulty} className="meter-row">
                    <span className="difficulty" data-level={d.difficulty}>
                      {d.difficulty}
                    </span>
                    <div
                      className="meter"
                      role="meter"
                      aria-label={t.progress.difficultyLabel(d.difficulty)}
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

        <Sheet title={t.progress.mockTitle} id="mock-stats">
          <div className="sheet-body inline-stats">
            <span>{rich(t.progress.mockFull(fullMocks.length), { b: bold })}</span>
            <span>{rich(t.progress.mockExplain(explainMocks.length, smoothExplains), { b: bold })}</span>
            <Link to="/mock">{t.progress.startMock}</Link>
          </div>
        </Sheet>
      </div>
    </div>
  );
}

/** 數字後的單位；英文不需要單位時就不輸出 */
function Unit({ text }: { text: string }) {
  return text ? <small>{text}</small> : null;
}
