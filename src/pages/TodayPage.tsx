import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ProblemRow } from '../components/ProblemRow';
import { QuickRecordDialog } from '../components/QuickRecordDialog';
import { RecordDialog } from '../components/RecordDialog';
import { PageHead, Sheet } from '../components/ui';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { bold, rich } from '../i18n/rich';
import { nextNewProblems, problemsInList } from '../lib/catalog';
import { startOfWeek, type Day } from '../lib/dates';
import { dueProblems, finishDay, newProblemsStartedOn, planToTarget, practiceAttempts, practiceStreak } from '../lib/stats';
import type { AttemptMode } from '../store/db';
import { useAttempts, useCatalog, useProgressMap, useSettings, useToday } from '../store/queries';

const settingsLink = (text: string) => <Link to="/settings">{text}</Link>;

export function TodayPage() {
  const { t, fmt } = useI18n();
  const day = useToday();
  const settings = useSettings();
  const catalog = useCatalog();
  const { progress, loaded } = useProgressMap();
  const attempts = useAttempts();
  const [recording, setRecording] = useState<{ problem: Problem; mode: AttemptMode } | null>(null);
  const [quickRecord, setQuickRecord] = useState(false);
  // 「再來一題」多加的題數，只算當天
  const [extra, setExtra] = useState({ day, count: 0 });
  const extraToday = extra.day === day ? extra.count : 0;

  const listName = t.lists.labels[settings.activeList];
  const listProblems = useMemo(() => problemsInList(catalog, settings.activeList), [catalog, settings.activeList]);
  const due = useMemo(() => dueProblems(catalog.problems, progress, day), [catalog, progress, day]);

  // 不管是從今天頁、題庫還是「記錄其他題目」開始的新題，都算進每天的目標
  const startedToday = newProblemsStartedOn(attempts ?? [], day);
  const newRemaining = Math.max(0, settings.dailyNew + extraToday - startedToday);
  const newProblems = nextNewProblems(listProblems, (id) => progress.has(id), newRemaining);
  const untouched = listProblems.filter((p) => !progress.has(p.id)).length;
  const beyondGoal = Math.max(0, startedToday - settings.dailyNew);

  const practiced = practiceAttempts(attempts ?? []);
  const todayAttempts = practiced.filter((a) => a.day === day);
  const streak = practiceStreak(practiced.map((a) => a.day), day);
  const weekStart = startOfWeek(day);
  const thisWeek = practiced.filter((a) => a.day >= weekStart).length;

  const oneMore = () => setExtra({ day, count: extraToday + 1 });
  const firstRun = loaded && progress.size === 0;

  const rowActions = (p: Problem, mode: AttemptMode) => (
    <>
      <Link className="btn btn-small btn-primary" to={`/practice/${p.id}`}>
        {t.common.start}
      </Link>
      <button className="btn btn-small btn-quiet" onClick={() => setRecording({ problem: p, mode })}>
        {t.common.record}
      </button>
    </>
  );

  return (
    <div className="page">
      <PageHead title={t.today.title} lede={fmt.fullDay(day)}>
        {loaded && (
          <PlanSentence day={day} listName={listName} untouched={untouched} dailyNew={settings.dailyNew} targetDate={settings.targetDate} />
        )}
      </PageHead>

      <div className="stack">
        {firstRun && (
          <Sheet title={t.today.welcomeTitle} id="welcome">
            <div className="sheet-empty">
              <p>{rich(t.today.welcome(listName, settings.dailyNew), { b: bold })}</p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <Link className="btn" to="/settings">
                  {t.today.adjustPlan}
                </Link>
              </div>
            </div>
          </Sheet>
        )}

        <Sheet
          title={t.today.dueTitle}
          count={due.length}
          id="due"
          actions={
            due.length > 0 ? (
              <Link className="btn btn-primary btn-small" to="/review">
                {t.today.reviewAll}
              </Link>
            ) : undefined
          }
        >
          {due.length === 0 ? (
            <p className="sheet-empty">{firstRun ? t.today.dueEmptyFirstRun : t.today.dueEmpty}</p>
          ) : (
            <ul className="rows">
              {due.map((p) => (
                <li key={p.id}>
                  <ProblemRow problem={p} progress={progress.get(p.id)} today={day} marked showPattern actions={rowActions(p, 'review')} />
                </li>
              ))}
            </ul>
          )}
        </Sheet>

        <Sheet
          title={t.today.newTitle}
          count={newProblems.length}
          id="new"
          note={
            beyondGoal > 0
              ? t.today.extraNote(beyondGoal)
              : startedToday > 0
                ? t.today.startedToday(startedToday)
                : t.today.roadmapOrder(listName)
          }
          actions={
            newProblems.length > 0 && untouched > newProblems.length ? (
              <button className="btn btn-small btn-quiet" onClick={oneMore}>
                {t.today.oneMore}
              </button>
            ) : undefined
          }
        >
          {newProblems.length > 0 ? (
            <ul className="rows">
              {newProblems.map((p) => (
                <li key={p.id}>
                  <ProblemRow problem={p} progress={undefined} today={day} marked showPattern actions={rowActions(p, 'practice')} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="sheet-empty">
              <p>{untouched === 0 ? t.today.listFinished(listName) : t.today.newDone}</p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                {untouched > 0 && (
                  <button className="btn btn-primary" onClick={oneMore}>
                    {t.today.oneMore}
                  </button>
                )}
                <Link className="btn" to="/problems">
                  {t.today.openProblems}
                </Link>
              </div>
            </div>
          )}
        </Sheet>

        <Sheet
          title={t.today.doneTitle}
          count={todayAttempts.length}
          id="done"
          actions={
            <button className="btn btn-small" onClick={() => setQuickRecord(true)}>
              {t.today.recordOther}
            </button>
          }
        >
          {todayAttempts.length === 0 ? (
            <p className="sheet-empty">{t.today.doneEmpty}</p>
          ) : (
            <ul className="done-list">
              {todayAttempts.map((a) => {
                const p = catalog.byId.get(a.problemId);
                return (
                  <li key={a.id} className="chip">
                    <Link to={`/problems/${a.problemId}`}>{p?.title ?? `#${a.problemId}`}</Link>
                    {t.today.doneItem(t.ratings[a.rating].label)}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="inline-stats" style={{ padding: '0 20px 16px' }}>
            <span>{rich(t.today.streak(streak), { b: bold })}</span>
            <span>{rich(t.today.thisWeek(thisWeek), { b: bold })}</span>
          </div>
        </Sheet>
      </div>

      <RecordDialog problem={recording?.problem ?? null} mode={recording?.mode} onClose={() => setRecording(null)} />
      <QuickRecordDialog open={quickRecord} onClose={() => setQuickRecord(false)} />
    </div>
  );
}

interface PlanSentenceProps {
  day: Day;
  listName: string;
  untouched: number;
  dailyNew: number;
  targetDate?: Day;
}

function PlanSentence({ day, listName, untouched, dailyNew, targetDate }: PlanSentenceProps) {
  const { t, fmt, locale } = useI18n();
  const tags = { b: bold, link: settingsLink };
  // 英文句子之間要空格，中文不用
  const sep = locale === 'en' ? ' ' : '';

  if (untouched === 0) {
    return <p className="today-plan">{t.today.planAllDone(listName)}</p>;
  }

  if (targetDate) {
    const plan = planToTarget(untouched, day, targetDate);
    if (plan.perDay === null) {
      return <p className="today-plan">{rich(t.today.planTargetPassed(fmt.day(targetDate)), tags)}</p>;
    }
    return (
      <p className="today-plan">
        {rich(t.today.planTarget(fmt.day(targetDate), plan.daysLeft, listName, untouched, plan.perDay), tags)}
        {plan.perDay > dailyNew && (
          <>
            {sep}
            {rich(t.today.planRaise(dailyNew), tags)}
          </>
        )}
      </p>
    );
  }

  const finish = finishDay(untouched, dailyNew, day);
  return (
    <p className="today-plan">
      {rich(t.today.planRemaining(listName, untouched), tags)}
      {finish && (
        <>
          {sep}
          {rich(t.today.planFinish(dailyNew, fmt.day(finish)), tags)}
        </>
      )}{' '}
      {rich(t.today.planSetTarget, tags)}
    </p>
  );
}
