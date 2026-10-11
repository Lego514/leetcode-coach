import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ProblemRow } from '../components/ProblemRow';
import { QuickRecordDialog } from '../components/QuickRecordDialog';
import { RecordDialog } from '../components/RecordDialog';
import { SprintSummary } from '../components/SprintSummary';
import { PageHead, Sheet } from '../components/ui';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { bold, rich } from '../i18n/rich';
import { nextNewProblems, problemsInList } from '../lib/catalog';
import { startOfWeek, type Day } from '../lib/dates';
import {
  dueProblems,
  finishDay,
  newProblemsStartedOn,
  planToTarget,
  practiceAttempts,
  practiceStreak,
  streakDays,
} from '../lib/stats';
import { useCloud } from '../store/cloud';
import { useSprint } from '../store/sprint';
import type { AttemptMode } from '../store/db';
import { useAttempts, useCardReviews, useCatalog, useProgressMap, useRehearsals, useSettings, useToday } from '../store/queries';

const BANNER_KEY = 'coach:signin-banner-dismissed';

function bannerDismissed(): boolean {
  try {
    return localStorage.getItem(BANNER_KEY) === '1';
  } catch {
    return false;
  }
}

/** 手機上沒登入時的提醒；桌面版側邊欄已經有登入按鈕，所以用 CSS 藏起來 */
function SignInBanner() {
  const { t } = useI18n();
  const { account } = useCloud();
  const [dismissed, setDismissed] = useState(bannerDismissed);
  if (account.kind !== 'signed-out' || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(BANNER_KEY, '1');
    } catch {
      // 存不了就只在這次隱藏
    }
  };

  return (
    <aside className="signin-banner" aria-labelledby="signin-banner-title">
      <div className="signin-banner-text">
        <p className="signin-banner-title" id="signin-banner-title">
          {t.today.signInTitle}
        </p>
        <p className="signin-banner-body">{t.today.signInBody}</p>
      </div>
      <div className="btn-row">
        <Link className="btn btn-primary btn-small" to="/account">
          {t.nav.signIn}
        </Link>
        <button type="button" className="btn btn-quiet btn-small" onClick={dismiss}>
          {t.today.signInLater}
        </button>
      </div>
    </aside>
  );
}

export function TodayPage() {
  const { t, fmt } = useI18n();
  const day = useToday();
  const settings = useSettings();
  const catalog = useCatalog();
  const { progress, loaded } = useProgressMap();
  const attempts = useAttempts();
  const cardReviews = useCardReviews();
  const rehearsals = useRehearsals();
  const sprint = useSprint();
  /** 衝刺中今天的計畫；面試當天和之後沒有 */
  const sprintDay = sprint && sprint.daysLeft > 0 ? sprint.plan.days[0] : null;
  const [recording, setRecording] = useState<{ problem: Problem; mode: AttemptMode } | null>(null);
  const [quickRecord, setQuickRecord] = useState(false);
  // 「再來一題」多加的題數，只算當天
  const [extra, setExtra] = useState({ day, count: 0 });
  const extraToday = extra.day === day ? extra.count : 0;

  const listName = t.lists.labels[settings.activeList];
  const listProblems = useMemo(() => problemsInList(catalog, settings.activeList), [catalog, settings.activeList]);
  const dueNow = useMemo(() => dueProblems(catalog.problems, progress, day), [catalog, progress, day]);
  // 衝刺時，面試那天會忘記的題目提前到最後幾天複習
  const pulled = (sprintDay?.pulled ?? []).filter((p) => !dueNow.some((d) => d.id === p.id));
  const due = pulled.length > 0 ? [...dueNow, ...pulled] : dueNow;

  // 不管是從今天頁、題庫還是「記錄其他題目」開始的新題，都算進每天的目標
  const startedToday = newProblemsStartedOn(attempts ?? [], day);
  const newRemaining = Math.max(0, settings.dailyNew + extraToday - startedToday);
  // 衝刺時照衝刺的順序（公司題、還沒碰過的模式優先），數量照每天的時間
  const newProblems =
    sprint && sprintDay
      ? sprint.plan.queue.slice(0, sprintDay.newProblems.length + extraToday).map((pick) => pick.problem)
      : nextNewProblems(listProblems, (id) => progress.has(id), newRemaining);
  const untouched = listProblems.filter((p) => !progress.has(p.id)).length;
  const moreAvailable = sprint && sprintDay ? sprint.plan.queue.length > newProblems.length : untouched > newProblems.length;
  const beyondGoal = Math.max(0, startedToday - settings.dailyNew);

  const practiced = practiceAttempts(attempts ?? []);
  const todayAttempts = practiced.filter((a) => a.day === day);
  // 做過微複習的日子也算連續天數
  const streak = practiceStreak(streakDays(practiced, cardReviews ?? [], rehearsals ?? []), day);
  const cardsToday = (cardReviews ?? []).filter((r) => r.day === day).length;
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
      <PageHead title={t.today.title} lede={t.today.lede(fmt.fullDay(day), listName)}>
        {loaded && sprint && <SprintSummary state={sprint} day={day} />}
        {loaded && !sprint && (
          <PlanSummary
            day={day}
            listName={listName}
            total={listProblems.length}
            untouched={untouched}
            dailyNew={settings.dailyNew}
            targetDate={settings.targetDate}
          />
        )}
      </PageHead>

      <div className="stack">
        <SignInBanner />
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
          title={t.today.cardsTitle}
          id="cards"
          note={cardsToday > 0 ? t.today.cardsDone(cardsToday) : undefined}
          actions={
            <Link className="btn btn-primary btn-small" to="/cards">
              {t.common.start}
            </Link>
          }
        >
          <p className="sheet-empty">{t.today.cardsLede}</p>
        </Sheet>

        <Sheet
          title={t.today.dueTitle}
          count={due.length}
          id="due"
          note={pulled.length > 0 ? t.today.sprint.pulledNote(pulled.length) : undefined}
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
            sprintDay
              ? t.today.sprint.newNote
              : beyondGoal > 0
                ? t.today.extraNote(beyondGoal)
                : startedToday > 0
                  ? t.today.startedToday(startedToday)
                  : t.today.roadmapOrder(listName)
          }
          actions={
            newProblems.length > 0 && moreAvailable ? (
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
              <p>
                {sprintDay?.phase === 'review'
                  ? t.today.sprint.reviewOnly
                  : sprintDay && sprintDay.newProblems.length === 0 && startedToday === 0
                    ? t.today.sprint.noTime
                    : untouched === 0 && !moreAvailable
                      ? t.today.listFinished(listName)
                      : t.today.newDone}
              </p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                {moreAvailable && (
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

interface PlanSummaryProps {
  day: Day;
  listName: string;
  total: number;
  untouched: number;
  dailyNew: number;
  targetDate?: Day;
}

interface PlanStat {
  label: string;
  value: string;
  unit?: string;
  /** 每天要做的題數超過設定時標出來 */
  warn?: boolean;
}

/** 清單進度：剩幾題、每天幾題、哪天做完（或距離目標日幾天），用一排數字卡一眼看完 */
function PlanSummary({ day, listName, total, untouched, dailyNew, targetDate }: PlanSummaryProps) {
  const { t, fmt } = useI18n();
  const p = t.today.plan;
  const progress = <PlanProgress listName={listName} done={total - untouched} total={total} />;

  if (untouched === 0) {
    return (
      <>
        {progress}
        <p className="today-plan">{t.today.planAllDone(listName)}</p>
      </>
    );
  }

  const problems = (n: number) => (n === 1 ? p.unitProblem : p.unitProblems);
  const days = (n: number) => (n === 1 ? p.unitDay : p.unitDays);
  const left: PlanStat = { label: p.left, value: String(untouched), unit: problems(untouched) };
  let stats: PlanStat[];
  let note: string | undefined;
  let action: { to: string; label: string; primary?: boolean; calendar?: boolean };

  const plan = targetDate ? planToTarget(untouched, day, targetDate) : null;
  if (targetDate && plan && plan.perDay !== null) {
    const behind = plan.perDay > dailyNew;
    stats = [
      { label: p.untilTarget(fmt.day(targetDate)), value: String(plan.daysLeft), unit: days(plan.daysLeft) },
      left,
      { label: p.needed, value: String(plan.perDay), unit: problems(plan.perDay), warn: behind },
    ];
    note = behind ? p.behind(dailyNew) : undefined;
    action = behind ? { to: '/settings', label: p.raise, primary: true } : { to: '/settings', label: p.changeTarget, calendar: true };
  } else if (targetDate) {
    // 目標日已經到了
    return (
      <>
        {progress}
        <p className="today-plan">{t.today.planTargetPassed(fmt.day(targetDate))}</p>
        <PlanAction to="/settings" label={p.newTarget} calendar />
      </>
    );
  } else {
    const finish = finishDay(untouched, dailyNew, day);
    stats = [left, { label: p.perDay, value: String(dailyNew), unit: problems(dailyNew) }];
    if (finish) stats.push({ label: p.finish, value: fmt.day(finish) });
    action = { to: '/settings', label: p.setTarget, calendar: true };
  }

  return (
    <>
      {progress}
      <dl className="plan-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="plan-stat" data-warn={stat.warn ? '' : undefined}>
            <dt>{stat.label}</dt>
            <dd>
              {stat.value}
              {stat.unit && (
                <>
                  {' '}
                  <span className="plan-stat-unit">{stat.unit}</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <PlanAction note={note} {...action} />
    </>
  );
}

interface PlanActionProps {
  to: string;
  label: string;
  note?: string;
  primary?: boolean;
  /** 跟目標日期有關的按鈕加上日曆圖示 */
  calendar?: boolean;
}

function PlanAction({ to, label, note, primary, calendar }: PlanActionProps) {
  return (
    <div className="plan-actions">
      {note && <p>{note}</p>}
      <Link className={primary ? 'btn btn-small btn-primary' : 'btn btn-small'} to={to}>
        {calendar && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6.5h16M8 3v4M16 3v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
          </svg>
        )}
        {label}
      </Link>
    </div>
  );
}

/** 清單完成度：已完成幾題 / 全部幾題 */
function PlanProgress({ listName, done, total }: { listName: string; done: number; total: number }) {
  const { t } = useI18n();
  const p = t.today.plan;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="plan-progress">
      <span className="plan-progress-label" aria-hidden>
        {p.done} <strong>{done}</strong> / {total}
      </span>
      <div
        className="plan-progress-track"
        role="progressbar"
        aria-label={p.progressLabel(listName)}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={p.progressText(done, total)}
      >
        <div className="plan-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
