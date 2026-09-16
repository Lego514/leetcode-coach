import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ProblemRow } from '../components/ProblemRow';
import { RecordDialog } from '../components/RecordDialog';
import { PageHead, Sheet } from '../components/ui';
import type { Problem } from '../data/problems';
import { LIST_FILTER_LABELS, nextNewProblems, problemsInList } from '../lib/catalog';
import { formatDay, formatFullDay, startOfWeek } from '../lib/dates';
import { ratingLabel } from '../lib/srs';
import { dueProblems, finishDay, planToTarget, practiceStreak } from '../lib/stats';
import type { AttemptMode } from '../store/db';
import { useAttempts, useCatalog, useProgressMap, useSettings, useToday } from '../store/queries';

export function TodayPage() {
  const day = useToday();
  const settings = useSettings();
  const catalog = useCatalog();
  const { progress, loaded } = useProgressMap();
  const attempts = useAttempts();
  const [recording, setRecording] = useState<{ problem: Problem; mode: AttemptMode } | null>(null);

  const listName = LIST_FILTER_LABELS[settings.activeList];
  const listProblems = useMemo(() => problemsInList(catalog, settings.activeList), [catalog, settings.activeList]);
  const due = useMemo(() => dueProblems(catalog.problems, progress, day), [catalog, progress, day]);

  let startedToday = 0;
  for (const p of progress.values()) if (p.firstDay === day) startedToday += 1;
  const newRemaining = Math.max(0, settings.dailyNew - startedToday);
  const newProblems = nextNewProblems(listProblems, (id) => progress.has(id), newRemaining);
  const untouched = listProblems.filter((p) => !progress.has(p.id)).length;

  const todayAttempts = (attempts ?? []).filter((a) => a.day === day);
  const streak = practiceStreak((attempts ?? []).map((a) => a.day), day);
  const weekStart = startOfWeek(day);
  const thisWeek = (attempts ?? []).filter((a) => a.day >= weekStart).length;
  const firstRun = loaded && progress.size === 0;

  return (
    <div className="page">
      <PageHead title="今天要做的事" lede={formatFullDay(day)}>
        {loaded && <PlanSentence day={day} listName={listName} untouched={untouched} dailyNew={settings.dailyNew} targetDate={settings.targetDate} />}
      </PageHead>

      <div className="stack">
        {firstRun && (
          <Sheet title="開始之前" id="welcome">
            <div className="sheet-empty">
              <p>
                目前的清單是 <strong>{listName}</strong>，每天 {settings.dailyNew} 題新題。以前做過但忘記的題目，就當成新題重做，照實評分，系統會幫你排好複習日。
              </p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <Link className="btn" to="/settings">
                  調整清單和每日題數
                </Link>
              </div>
            </div>
          </Sheet>
        )}

        <Sheet
          title="該複習的題目"
          count={due.length}
          id="due"
          actions={
            due.length > 0 ? (
              <Link className="btn btn-primary btn-small" to="/review">
                逐題複習
              </Link>
            ) : undefined
          }
        >
          {due.length === 0 ? (
            <p className="sheet-empty">
              {firstRun ? '做完新題後，系統會依你的表現排好複習日，到期的題目會出現在這裡。' : '今天沒有到期的題目。'}
            </p>
          ) : (
            <ul className="rows">
              {due.map((p) => (
                <li key={p.id}>
                  <ProblemRow
                    problem={p}
                    progress={progress.get(p.id)}
                    today={day}
                    marked
                    showPattern
                    actions={
                      <>
                        <Link className="btn btn-small btn-primary" to={`/practice/${p.id}`}>
                          開始
                        </Link>
                        <button className="btn btn-small btn-quiet" onClick={() => setRecording({ problem: p, mode: 'review' })}>
                          記錄
                        </button>
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Sheet>

        <Sheet
          title="今天的新題"
          count={newProblems.length}
          id="new"
          note={startedToday > 0 ? `今天已開始 ${startedToday} 題新題` : `依 ${listName} 的模式順序`}
        >
          {newProblems.length > 0 ? (
            <ul className="rows">
              {newProblems.map((p) => (
                <li key={p.id}>
                  <ProblemRow
                    problem={p}
                    progress={undefined}
                    today={day}
                    marked
                    showPattern
                    actions={
                      <>
                        <Link className="btn btn-small btn-primary" to={`/practice/${p.id}`}>
                          開始
                        </Link>
                        <button className="btn btn-small btn-quiet" onClick={() => setRecording({ problem: p, mode: 'practice' })}>
                          記錄
                        </button>
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="sheet-empty">
              {untouched === 0 ? (
                <p>{listName} 的題目都做過一輪了。可以到設定換一份清單，或專心把複習做完。</p>
              ) : (
                <p>今天的新題做完了。想多做的話，可以到題庫挑題。</p>
              )}
              <div className="btn-row" style={{ marginTop: 12 }}>
                <Link className="btn" to="/problems">
                  打開題庫
                </Link>
              </div>
            </div>
          )}
        </Sheet>

        <Sheet title="今天做過的" count={todayAttempts.length} id="done">
          {todayAttempts.length === 0 ? (
            <p className="sheet-empty">還沒有紀錄。按「開始」會計時並提供提示；已經在 LeetCode 寫完的話，直接按「記錄」。</p>
          ) : (
            <ul className="done-list">
              {todayAttempts.map((a) => {
                const p = catalog.byId.get(a.problemId);
                return (
                  <li key={a.id} className="chip">
                    <Link to={`/problems/${a.problemId}`}>{p?.title ?? `#${a.problemId}`}</Link>（{ratingLabel(a.rating)}）
                  </li>
                );
              })}
            </ul>
          )}
          <div className="inline-stats" style={{ padding: '0 20px 16px' }}>
            <span>
              連續練習 <strong>{streak}</strong> 天
            </span>
            <span>
              本週練習 <strong>{thisWeek}</strong> 次
            </span>
          </div>
        </Sheet>
      </div>

      <RecordDialog problem={recording?.problem ?? null} mode={recording?.mode} onClose={() => setRecording(null)} />
    </div>
  );
}

function PlanSentence({
  day,
  listName,
  untouched,
  dailyNew,
  targetDate,
}: {
  day: string;
  listName: string;
  untouched: number;
  dailyNew: number;
  targetDate?: string;
}) {
  if (untouched === 0) {
    return <p className="today-plan">{listName} 的每一題都做過了，接下來以複習為主。</p>;
  }

  if (targetDate) {
    const plan = planToTarget(untouched, day, targetDate);
    if (plan.perDay === null) {
      return (
        <p className="today-plan">
          目標日 {formatDay(targetDate)} 已經到了。<Link to="/settings">設定新的目標日期</Link>
        </p>
      );
    }
    return (
      <p className="today-plan">
        距離目標日 {formatDay(targetDate)} 還有 <strong>{plan.daysLeft}</strong> 天，{listName} 還有 <strong>{untouched}</strong> 題沒做，每天要做{' '}
        <strong>{plan.perDay}</strong> 題新題才來得及。
        {plan.perDay > dailyNew && (
          <>
            {' '}目前設定是每天 {dailyNew} 題，<Link to="/settings">調高每日題數</Link>。
          </>
        )}
      </p>
    );
  }

  const finish = finishDay(untouched, dailyNew, day);
  return (
    <p className="today-plan">
      {listName} 還有 <strong>{untouched}</strong> 題沒做。
      {finish && (
        <>
          照每天 {dailyNew} 題的速度，會在 <strong>{formatDay(finish)}</strong>做完第一輪。
        </>
      )}{' '}
      <Link to="/settings">設定目標日期</Link>
    </p>
  );
}
