import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useToast } from '../components/toast';
import { ReferenceExplanation } from '../components/ReferenceExplanation';
import { DifficultyTag, PageHead, Sheet } from '../components/ui';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { rich } from '../i18n/rich';
import { diffDays } from '../lib/dates';
import { languageLabel } from '../lib/languages';
import { RATINGS, recallOn, schedule, type Rating } from '../lib/srs';
import { capDue, dueProblems, needsRewrite, reviewsDoneOn } from '../lib/stats';
import { recordAttempt } from '../store/actions';
import type { ProgressRecord } from '../store/db';
import { retentionOf } from '../store/progress';
import { useAttempts, useCatalog, useNote, useProgressMap, useSettings, useToday } from '../store/queries';

export function ReviewPage() {
  const { t, fmt } = useI18n();
  const day = useToday();
  const catalog = useCatalog();
  const { progress, loaded } = useProgressMap();
  const settings = useSettings();
  const attempts = useAttempts();
  const [skipped, setSkipped] = useState<number[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  // 在清單上點了哪一題，就先做它
  const [picked, setPicked] = useState<number | null>(null);
  // 做完今天的上限後，按「再複習 5 題」加上去（只算這次打開的時候）
  const [extra, setExtra] = useState(0);

  const due = useMemo(() => dueProblems(catalog.problems, progress, day), [catalog, progress, day]);
  const cap = settings.maxReviews === undefined ? undefined : settings.maxReviews + extra;
  const { shown, later } = capDue(due, cap, reviewsDoneOn(attempts ?? [], day));
  // 評分後題目的到期日會往後移，自動離開佇列；跳過的題目排到最後；點了清單上的題目就排到最前面
  const ordered = [...shown.filter((p) => !skipped.includes(p.id)), ...shown.filter((p) => skipped.includes(p.id))];
  const first = ordered.find((p) => p.id === picked);
  const queue = first ? [first, ...ordered.filter((p) => p !== first)] : ordered;
  const current = queue[0];

  const nextDue = useMemo(() => {
    let min: string | null = null;
    for (const p of progress.values()) if (p.due > day && (!min || p.due < min)) min = p.due;
    return min;
  }, [progress, day]);

  return (
    <div className="page">
      <PageHead title={t.review.title} lede={t.review.lede} />
      <div className="stack">
        {!loaded ? null : current ? (
          <ReviewCard
            key={current.id}
            problem={current}
            progress={progress.get(current.id)!}
            remaining={queue.length}
            doneCount={doneCount}
            today={day}
            onRated={() => {
              setDoneCount((n) => n + 1);
              setSkipped((s) => s.filter((id) => id !== current.id));
            }}
            onSkip={() => {
              setPicked(null);
              setSkipped((s) => [...s.filter((id) => id !== current.id), current.id]);
            }}
          />
        ) : later > 0 && settings.maxReviews !== undefined ? (
          <Sheet title={t.review.capTitle(settings.maxReviews + extra)} id="review-cap">
            <div className="sheet-empty">
              <p>{t.review.capBody(later)}</p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn-primary" onClick={() => setExtra((n) => n + 5)}>
                  {t.review.more}
                </button>
                <Link className="btn" to="/">
                  {t.common.backToToday}
                </Link>
              </div>
            </div>
          </Sheet>
        ) : (
          <Sheet title={doneCount > 0 ? t.review.doneTitle(doneCount) : t.review.emptyTitle} id="review-empty">
            <div className="sheet-empty">
              <p>
                {progress.size === 0
                  ? t.review.emptyFirstRun
                  : nextDue
                    ? t.review.nextDue(fmt.day(nextDue), t.date.relative(diffDays(day, nextDue)))
                    : t.review.nothingDue}
              </p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <Link className="btn" to="/">
                  {t.common.backToToday}
                </Link>
                <Link className="btn" to="/mock">
                  {t.review.doMock}
                </Link>
              </div>
            </div>
          </Sheet>
        )}
        {loaded && queue.length > 1 && (
          <ReviewQueue
            queue={queue}
            progress={progress}
            today={day}
            onPick={(id) => {
              setPicked(id);
              window.scrollTo({ top: 0 });
            }}
          />
        )}
      </div>
    </div>
  );
}

/** 接下來的題目：看得到還有哪幾題、各剩多少機率記得、逾期多久，點一題就先做它 */
function ReviewQueue({
  queue,
  progress,
  today,
  onPick,
}: {
  queue: Problem[];
  progress: ReadonlyMap<number, ProgressRecord>;
  today: string;
  onPick: (id: number) => void;
}) {
  const { t } = useI18n();
  return (
    <Sheet title={t.review.queueTitle(queue.length)} id="review-queue" note={t.review.queueHint}>
      <ol className="rows review-queue">
        {queue.map((p, i) => {
          const state = progress.get(p.id)!;
          const recall = recallOn(state, today);
          return (
            <li key={p.id}>
              <button type="button" className="review-queue-item" aria-current={i === 0 || undefined} onClick={() => onPick(p.id)}>
                <span className="review-queue-title">
                  {p.id}. {p.title}
                </span>
                <DifficultyTag difficulty={p.difficulty} />
                {needsRewrite(state) && <span className="chip chip-rewrite">{t.common.rewriteTag}</span>}
                {recall !== undefined && <span className="review-queue-meta">{t.common.recallChance(Math.round(recall * 100))}</span>}
                {state.due < today && <span className="review-queue-meta">{t.date.relative(diffDays(today, state.due))}</span>}
                {i === 0 && <span className="review-queue-now">{t.review.current}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}

interface ReviewCardProps {
  problem: Problem;
  progress: ProgressRecord;
  remaining: number;
  doneCount: number;
  today: string;
  onRated: () => void;
  onSkip: () => void;
}

function ReviewCard({ problem, progress, remaining, doneCount, today, onRated, onSkip }: ReviewCardProps) {
  const { t, fmt, locale } = useI18n();
  const note = useNote(problem.id);
  const retention = retentionOf(useSettings());
  const recall = recallOn(progress, today);
  const toast = useToast();
  const [showPattern, setShowPattern] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  // 上次靠提示或解答的題目先請你重寫；按「只回想就好」才換回一般的回想
  const [recallOnly, setRecallOnly] = useState(false);
  const rewrite = needsRewrite(progress) && !recallOnly;

  async function rate(rating: Rating) {
    if (saving) return;
    setSaving(true);
    const record = await recordAttempt(problem.id, rating, { mode: 'review' });
    toast(t.review.rated(problem.title, fmt.day(record.due)));
    onRated();
  }

  const hasNote = note && (note.idea || note.explanation || note.code || note.pitfalls || note.time);

  return (
    <section className="sheet review-card" aria-labelledby="review-title">
      <p className="review-progress">
        {t.review.remaining(remaining)}
        {doneCount > 0 && t.review.doneCount(doneCount)}
        {progress.due < today && t.review.thisOverdue(t.date.relative(diffDays(today, progress.due)))}
      </p>
      <h2 className="review-title" id="review-title">
        <span className="marked">
          {problem.id}. {problem.title}
        </span>
      </h2>
      <div className="detail-meta">
        <DifficultyTag difficulty={problem.difficulty} />
        {showPattern ? (
          <span>{getPattern(problem.pattern, locale).name}</span>
        ) : (
          <button className="btn btn-quiet btn-small" onClick={() => setShowPattern(true)}>
            {t.common.showPattern}
          </button>
        )}
        <span>{t.common.lastResult(t.ratings[progress.lastRating].label)}</span>
        {recall !== undefined && <span>{t.common.recallChance(Math.round(recall * 100))}</span>}
        <Link to={`/problems/${problem.id}`}>{t.review.details}</Link>
      </div>

      {rewrite ? (
        <div className="review-step review-rewrite">
          <h3>{t.review.rewriteTitle}</h3>
          <p>{t.review.rewriteBody(t.ratings[progress.lastRating].label)}</p>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" to={`/practice/${problem.id}`}>
              {t.review.rewriteStart}
            </Link>
            <button className="btn" onClick={() => setRecallOnly(true)}>
              {t.review.recallInstead}
            </button>
            <button className="btn btn-quiet" onClick={onSkip}>
              {t.review.skip}
            </button>
          </div>
        </div>
      ) : (
        <div className="review-step">
          <h3>{t.review.recallTitle}</h3>
          <ul className="bullets">
            {t.review.recall.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {!revealed && (
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => setRevealed(true)}>
                {t.review.reveal}
              </button>
              <Link className="btn" to={`/practice/${problem.id}`}>
                {t.review.redo}
              </Link>
              <button className="btn btn-quiet" onClick={onSkip}>
                {t.review.skip}
              </button>
            </div>
          )}
        </div>
      )}

      {revealed && (
        <>
          <div className="review-step">
            <h3>{t.review.notesTitle}</h3>
            {!hasNote ? (
              <p className="sheet-note">
                {rich(t.review.noNotes, {
                  link: (text) => <Link to={`/problems/${problem.id}`}>{text}</Link>,
                })}
              </p>
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                {note.idea && <p className="prose-block">{note.idea}</p>}
                {note.explanation && (
                  <p className="prose-block" lang="en">
                    {note.explanation}
                  </p>
                )}
                {(note.time || note.space) && (
                  <p className="sheet-note">
                    {t.review.complexity(note.time || t.common.notFilled, note.space || t.common.notFilled)}
                  </p>
                )}
                {note.pitfalls && <p className="prose-block">{t.review.pitfalls(note.pitfalls)}</p>}
                {note.code && (
                  <details>
                    <summary>{t.review.showCode(languageLabel(note.language))}</summary>
                    <pre className="code-block" style={{ marginTop: 8 }}>
                      <code>{note.code}</code>
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="review-step">
            <ReferenceExplanation problemId={problem.id} />
          </div>

          <div className="review-step">
            <h3>{t.review.rateTitle}</h3>
            <div className="rating-grid">
              {RATINGS.map((r) => (
                <button key={r} className="rating-option" disabled={saving} onClick={() => void rate(r)}>
                  <span className="rating-label">{t.ratings[r].label}</span>
                  <span className="rating-detail">{t.ratings[r].detail}</span>
                  <span className="rating-next">{t.common.reviewIn(schedule(progress, r, today, 0, retention).interval)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
