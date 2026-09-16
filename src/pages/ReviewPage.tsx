import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useToast } from '../components/toast';
import { DifficultyTag, LeetCodeLink, PageHead, Sheet } from '../components/ui';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { formatDay, relativeDay } from '../lib/dates';
import { languageLabel } from '../lib/languages';
import { RATINGS, ratingLabel, schedule, type Rating } from '../lib/srs';
import { dueProblems } from '../lib/stats';
import { recordAttempt } from '../store/actions';
import type { ProgressRecord } from '../store/db';
import { useCatalog, useNote, useProgressMap, useToday } from '../store/queries';

export function ReviewPage() {
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
      <PageHead
        title="複習"
        lede="先不看筆記，自己回想解法並用英文講一遍，再打開筆記對答案。能重寫一次最好。"
      />
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
        <Sheet title={doneCount > 0 ? `今天複習了 ${doneCount} 題` : '目前沒有要複習的題目'} id="review-empty">
          <div className="sheet-empty">
            <p>
              {progress.size === 0
                ? '先去做幾題新題並記錄結果，到期的題目就會出現在這裡。'
                : nextDue
                  ? `下一題會在 ${formatDay(nextDue)}到期，${relativeDay(nextDue, day)}。`
                  : '所有題目都還沒到期。'}
            </p>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <Link className="btn" to="/">
                回到今天
              </Link>
              <Link className="btn" to="/mock">
                做一次模擬面試
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
  const note = useNote(problem.id);
  const toast = useToast();
  const [showPattern, setShowPattern] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function rate(rating: Rating) {
    if (saving) return;
    setSaving(true);
    const record = await recordAttempt(problem.id, rating, { mode: 'review' });
    toast(`${problem.title}：下次複習 ${formatDay(record.due)}`);
    onRated();
  }

  const hasNote = note && (note.idea || note.explanation || note.code || note.pitfalls || note.time);

  return (
    <section className="sheet review-card" aria-labelledby="review-title">
      <p className="review-progress">
        還有 {remaining} 題{doneCount > 0 ? `，已完成 ${doneCount} 題` : ''}
        {progress.due < today && `，這題${relativeDay(progress.due, today)}`}
      </p>
      <h2 className="review-title" id="review-title">
        <span className="marked">
          {problem.id}. {problem.title}
        </span>
      </h2>
      <div className="detail-meta">
        <DifficultyTag difficulty={problem.difficulty} />
        {showPattern ? (
          <span>{getPattern(problem.pattern).name}</span>
        ) : (
          <button className="btn btn-quiet btn-small" onClick={() => setShowPattern(true)}>
            顯示解題模式
          </button>
        )}
        <span>上次：{ratingLabel(progress.lastRating)}</span>
        <LeetCodeLink slug={problem.slug}>在 LeetCode 重寫</LeetCodeLink>
        <Link to={`/problems/${problem.id}`}>題目詳情</Link>
      </div>

      <div className="review-step">
        <h3>先自己回想</h3>
        <ul className="bullets">
          <li>這題屬於哪個解題模式？為什麼？</li>
          <li>用英文說出核心思路，以及時間與空間複雜度。</li>
          <li>有哪些邊界情況要處理？</li>
        </ul>
        {!revealed && (
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => setRevealed(true)}>
              想好了，打開筆記
            </button>
            <button className="btn btn-quiet" onClick={onSkip}>
              先跳過
            </button>
          </div>
        )}
      </div>

      {revealed && (
        <>
          <div className="review-step">
            <h3>我的筆記</h3>
            {!hasNote ? (
              <p className="sheet-note">
                這題還沒有筆記。複習完到<Link to={`/problems/${problem.id}`}>題目詳情</Link>補上思路和講解稿，下次會更好複習。
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
                    時間 {note.time || '未填'}，空間 {note.space || '未填'}
                  </p>
                )}
                {note.pitfalls && <p className="prose-block">踩過的坑：{note.pitfalls}</p>}
                {note.code && (
                  <details>
                    <summary>顯示程式碼（{languageLabel(note.language)}）</summary>
                    <pre className="code-block" style={{ marginTop: 8 }}>
                      <code>{note.code}</code>
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="review-step">
            <h3>這次回想得怎麼樣？</h3>
            <div className="rating-grid">
              {RATINGS.map((r) => (
                <button key={r.id} className="rating-option" disabled={saving} onClick={() => void rate(r.id)}>
                  <span className="rating-label">{r.label}</span>
                  <span className="rating-detail">{r.detail}</span>
                  <span className="rating-next">{schedule(progress, r.id, today).interval} 天後再複習</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
