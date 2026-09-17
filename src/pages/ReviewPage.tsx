import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useToast } from '../components/toast';
import { DifficultyTag, PageHead, Sheet } from '../components/ui';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { rich } from '../i18n/rich';
import { diffDays } from '../lib/dates';
import { languageLabel } from '../lib/languages';
import { RATINGS, schedule, type Rating } from '../lib/srs';
import { dueProblems } from '../lib/stats';
import { recordAttempt } from '../store/actions';
import type { ProgressRecord } from '../store/db';
import { useCatalog, useNote, useProgressMap, useToday } from '../store/queries';

export function ReviewPage() {
  const { t, fmt } = useI18n();
  const day = useToday();
  const catalog = useCatalog();
  const { progress, loaded } = useProgressMap();
  const [skipped, setSkipped] = useState<number[]>([]);
  const [doneCount, setDoneCount] = useState(0);

  const due = useMemo(() => dueProblems(catalog.problems, progress, day), [catalog, progress, day]);
  // 評分後題目的到期日會往後移，自動離開佇列；跳過的題目排到最後
  const queue = [...due.filter((p) => !skipped.includes(p.id)), ...due.filter((p) => skipped.includes(p.id))];
  const current = queue[0];

  const nextDue = useMemo(() => {
    let min: string | null = null;
    for (const p of progress.values()) if (p.due > day && (!min || p.due < min)) min = p.due;
    return min;
  }, [progress, day]);

  return (
    <div className="page">
      <PageHead title={t.review.title} lede={t.review.lede} />
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
          onSkip={() => setSkipped((s) => [...s.filter((id) => id !== current.id), current.id])}
        />
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
    </div>
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
  const toast = useToast();
  const [showPattern, setShowPattern] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

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
        <Link to={`/problems/${problem.id}`}>{t.review.details}</Link>
      </div>

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
            <h3>{t.review.rateTitle}</h3>
            <div className="rating-grid">
              {RATINGS.map((r) => (
                <button key={r} className="rating-option" disabled={saving} onClick={() => void rate(r)}>
                  <span className="rating-label">{t.ratings[r].label}</span>
                  <span className="rating-detail">{t.ratings[r].detail}</span>
                  <span className="rating-next">{t.common.reviewIn(schedule(progress, r, today).interval)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
