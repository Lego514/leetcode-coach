import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlgorithmTree } from '../components/AlgorithmTree';
import { CompanionSheet } from '../components/Companion';
import { ExplainProgressSheet } from '../components/ExplainProgress';
import { ActivityHeatmap, WeeklyChart } from '../components/charts';
import { PatternMap, ReadinessSheet, useRecapNumbers, WeeklyRecap } from '../components/Motivation';
import { StuckSummary } from '../components/StuckSummary';
import { MasteryCell, MasteryLegend, PageHead, Sheet, stageLabel } from '../components/ui';
import { getPattern } from '../data/patterns';
import { useI18n } from '../i18n';
import { rich } from '../i18n/rich';
import { LIST_FILTERS, problemsInList, type ListFilter } from '../lib/catalog';
import { addDays, startOfWeek } from '../lib/dates';
import { isReady } from '../lib/motivation';
import { stageOf } from '../lib/srs';
import {
  countByDay,
  longestStreak,
  practiceAttempts,
  practiceStreak,
  streakDays,
  summarizePatterns,
  weeklyCounts,
} from '../lib/stats';
import { STUCK_WINDOW_DAYS, summarizeStuck } from '../lib/stuck';
import { fadeOf } from '../lib/tree';
import { retentionOf } from '../store/progress';
import { useAttempts, useCardReviews, useCatalog, useMetaMap, useMocks, useProgressMap, useRehearsals, useSettings, useToday } from '../store/queries';

const NO_ATTEMPTS: never[] = [];
const NO_MOCKS: never[] = [];

/** 熱度圖顯示一整年（含本週共 53 週） */
const HEATMAP_WEEKS = 53;

export function ProgressPage() {
  const { t, locale } = useI18n();
  const day = useToday();
  const settings = useSettings();
  const catalog = useCatalog();
  const { progress } = useProgressMap();
  const attempts = useAttempts();
  const mocks = useMocks();
  const cardReviews = useCardReviews();
  const rehearsals = useRehearsals();
  const meta = useMetaMap();
  const [listChoice, setListChoice] = useState<ListFilter | null>(null);
  const list = listChoice ?? settings.activeList;

  const problems = useMemo(() => problemsInList(catalog, list), [catalog, list]);
  const patterns = useMemo(() => summarizePatterns(problems, progress), [problems, progress]);
  // 批次標記的舊題不算練習次數
  const allAttempts = useMemo(() => practiceAttempts(attempts ?? []), [attempts]);
  const weeks = useMemo(() => weeklyCounts(allAttempts, day, 12), [allAttempts, day]);
  const byDay = useMemo(() => countByDay(allAttempts), [allAttempts]);
  const otherDays = useMemo(() => [...(cardReviews ?? []), ...(rehearsals ?? [])].map((r) => r.day), [cardReviews, rehearsals]);

  const started = problems.filter((p) => progress.has(p.id)).length;
  // 整個 App 只用三個詞：做過、會了（現在解得出來）、已熟練（階段），跟準備度、題型地圖、樹的數字一樣
  const ready = problems.filter((p) => isReady(progress.get(p.id), day)).length;
  const mastered = problems.filter((p) => stageOf(progress.get(p.id)) === 'mastered').length;
  // 有橘點（很久沒碰）的題數；複習清單本來就把最可能忘的排前面，這裡讓人看得到是哪幾題
  const fading = problems.filter((p) => fadeOf(progress.get(p.id), day) > 0).length;
  // 做過微複習的日子也算連續天數
  const streak = practiceStreak(streakDays(allAttempts, cardReviews ?? [], rehearsals ?? []), day);
  // 熱度圖的範圍：練題目或做微複習都算有練習的一天，和連續天數的算法一樣
  const yearStart = addDays(startOfWeek(day), -7 * (HEATMAP_WEEKS - 1));
  const inYear = (d: string) => d >= yearStart && d <= day;
  const cardDays = useMemo(() => new Set((cardReviews ?? []).map((r) => r.day)), [cardReviews]);
  const yearSessions = allAttempts.filter((a) => inYear(a.day)).length;
  const yearDays = [...new Set([...byDay.keys(), ...cardDays])].filter(inYear);
  const yearLongest = longestStreak(yearDays);
  const recap = useRecapNumbers({
    attempts: attempts ?? NO_ATTEMPTS,
    otherDays,
    problems,
    progress,
    retention: retentionOf(settings),
    today: day,
  });

  const weakest = patterns
    .filter((p) => p.started >= 2)
    .sort((a, b) => a.startedMastery - b.startedMastery)[0];

  // 最近常卡在哪；不分清單，所有做過的題目都算
  const stuck = useMemo(
    () => summarizeStuck(attempts ?? [], (id) => catalog.byId.get(id), addDays(day, -STUCK_WINDOW_DAYS)),
    [attempts, catalog, day],
  );


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
        <section className="sheet" aria-label={t.progress.overview}>
          <div className="stat-line">
            <div className="stat">
              <p className="stat-label">{t.words.attempted}</p>
              <p className="stat-value">
                {started}
                <small>/ {problems.length}</small>
              </p>
            </div>
            <div className="stat">
              <p className="stat-label">{t.words.ready}</p>
              <p className="stat-value">
                {ready}
                <Unit text={t.progress.unitProblems} />
              </p>
            </div>
            <div className="stat">
              <p className="stat-label">{t.words.mastered}</p>
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
          </div>
          <p className="stat-defs">{rich(t.words.defs, { b: (text) => <b>{text}</b> })}</p>
        </section>

        {attempts && problems.length > 0 && (
          <AlgorithmTree problems={problems} progress={progress} attempts={attempts} today={day} share={{ streak, recap }} />
        )}
        <CompanionSheet />
        <ReadinessSheet problems={problems} all={catalog.problems} progress={progress} meta={meta} today={day} />
        <PatternMap problems={problems} progress={progress} today={day} />
        <WeeklyRecap recap={recap} />

        <Sheet title={t.progress.heatmapTitle(yearSessions)} id="heatmap" note={t.progress.heatmapNote(yearDays.length, yearLongest)}>
          <div className="sheet-body">
            <ActivityHeatmap counts={byDay} cardDays={cardDays} today={day} weeks={HEATMAP_WEEKS} />
          </div>
        </Sheet>

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
                  {/* 右邊的數字是「做過」，寫在欄位上面一次就好 */}
                  <div className="mastery-row mastery-head" aria-hidden="true">
                    <span />
                    <span />
                    <span className="mastery-count">{t.words.attempted}</span>
                  </div>
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
                            const label = t.progress.cellLabel(p.title, stageLabel(t, state, day));
                            return (
                              <Link key={p.id} to={`/problems/${p.id}`} aria-label={label} title={label}>
                                <MasteryCell progress={state} today={day} />
                              </Link>
                            );
                          })}
                      </div>
                      <span className="mastery-count" aria-label={t.progress.masteryCount(s.started, s.total)}>
                        {s.started} / {s.total}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14 }}>
                  <MasteryLegend />
                  <p className="field-hint" style={{ marginTop: 6 }}>
                    {t.legend.hint}
                  </p>
                </div>
                {fading > 0 && (
                  <p className="sheet-note" style={{ marginTop: 10 }}>
                    {rich(t.progress.fading(fading), {
                      link: (text) => <Link to={`/problems?list=${list}&status=fading`}>{text}</Link>,
                    })}
                  </p>
                )}
                {weakest && (
                  <p className="sheet-note" style={{ marginTop: 10 }}>
                    {t.progress.weakestTip(getPattern(weakest.pattern, locale).name)}
                  </p>
                )}
              </>
            )}
          </div>
        </Sheet>

        <StuckSummary attempts={stuck.attempts} reasons={stuck.reasons} days={STUCK_WINDOW_DAYS} />

        <Sheet title={t.progress.weeklyTitle} id="weekly" note={t.progress.weeklyNote}>
          <div className="sheet-body">
            <WeeklyChart weeks={weeks} />
          </div>
        </Sheet>

        <ExplainProgressSheet mocks={mocks ?? NO_MOCKS} />
      </div>
    </div>
  );
}

/** 數字後的單位；英文不需要單位時就不輸出 */
function Unit({ text }: { text: string }) {
  return text ? <small>{text}</small> : null;
}
