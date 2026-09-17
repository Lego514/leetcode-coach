import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { HintPanel } from '../components/HintPanel';
import { LeaveGuard } from '../components/LeaveGuard';
import { RecordForm } from '../components/RecordDialog';
import { DifficultyTag, LeetCodeLink, PageHead, Sheet } from '../components/ui';
import { MOCK_MINUTES } from '../data/interview';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { getI18n, useI18n } from '../i18n';
import { formatDuration } from '../lib/dates';
import {
  clearPracticeSession,
  HINT_LEVELS,
  loadPracticeSession,
  savePracticeSession,
  suggestRating,
} from '../lib/practice';
import { useStopwatch } from '../lib/session';
import { useCatalog, useProgress } from '../store/queries';

export function PracticePage() {
  const { t } = useI18n();
  const { id } = useParams();
  const catalog = useCatalog();
  const problem = catalog.byId.get(Number(id));

  if (!problem && !catalog.loaded) return null;
  if (!problem) {
    return (
      <div className="page">
        <PageHead title={t.common.problemNotFound} lede={t.common.problemNotFoundLede(id ?? '')}>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Link className="btn" to="/problems">
              {t.common.backToProblems}
            </Link>
          </div>
        </PageHead>
      </div>
    );
  }
  return <PracticeSession key={problem.id} problem={problem} />;
}

function PracticeSession({ problem }: { problem: Problem }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const progress = useProgress(problem.id);
  const [restored] = useState(() => loadPracticeSession(problem.id));
  const { elapsedSec, running, start, pause, snapshot } = useStopwatch(restored ?? undefined);
  const [hints, setHints] = useState(restored?.hints ?? 0);
  const [sawSolution, setSawSolution] = useState(restored?.sawSolution ?? false);
  const [finished, setFinished] = useState(restored?.finished ?? false);
  const [saved, setSaved] = useState(false);
  const [showPattern, setShowPattern] = useState(false);
  const autoStarted = useRef(false);

  const targetSec = MOCK_MINUTES[problem.difficulty] * 60;
  const over = elapsedSec > targetSec;
  const isReview = !!progress;

  // 打開頁面就開始計時；重新整理後則照原本的狀態接續
  useEffect(() => {
    if (autoStarted.current || restored) return;
    autoStarted.current = true;
    start();
  }, [restored, start]);

  // 計時狀態或提示改變時存檔，重新整理不會遺失
  useEffect(() => {
    if (saved) return;
    savePracticeSession({ problemId: problem.id, ...snapshot(), hints, sawSolution, finished });
  }, [problem.id, running, hints, sawSolution, finished, saved, snapshot]);

  // 在 LeetCode 分頁作答時，從分頁標題就能看到時間
  useEffect(() => {
    document.title = t.practice.tabTitle(formatDuration(elapsedSec), !running, problem.title, t.app.name);
  }, [elapsedSec, running, problem.title, t]);
  useEffect(() => () => void (document.title = getI18n().t.app.name), []);

  // 儲存後等離開保護卸載，再回到上一頁
  useEffect(() => {
    if (!saved) return;
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  }, [saved, navigate]);

  function togglePause() {
    if (running) pause();
    else start();
  }

  function finish() {
    pause();
    setFinished(true);
  }

  function keepGoing() {
    setFinished(false);
    start();
  }

  function revealHint() {
    setHints((n) => Math.min(HINT_LEVELS, n + 1));
    setShowPattern(true);
  }

  const minutes = Math.max(1, Math.round(elapsedSec / 60));
  const pattern = getPattern(problem.pattern, locale);

  return (
    <div className="page">
      <PageHead title={`${problem.id}. ${problem.title}`}>
        <div className="detail-meta">
          <span className="chip">{isReview ? t.practice.reviewChip : t.practice.newChip}</span>
          <DifficultyTag difficulty={problem.difficulty} />
          {showPattern || hints > 0 ? (
            <span>{pattern.name}</span>
          ) : (
            <button className="btn btn-quiet btn-small" onClick={() => setShowPattern(true)}>
              {t.common.showPattern}
            </button>
          )}
          {progress && <span>{t.common.lastResult(t.ratings[progress.lastRating].label)}</span>}
          {problem.premium && <span>{t.common.premium}</span>}
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <LeetCodeLink slug={problem.slug} className="btn">
            {t.common.solveOnLeetCode}
          </LeetCodeLink>
          <span className="sheet-note">{t.practice.tabHint}</span>
        </div>
      </PageHead>

      <div className="stack">
        <section className="sheet sheet-body" aria-label={t.common.timer}>
          <div className="timer">
            <span className="timer-value" data-over={over}>
              {formatDuration(elapsedSec)}
            </span>
            <span className="timer-limit">
              {t.practice.target(MOCK_MINUTES[problem.difficulty])}
              {over
                ? t.practice.over(formatDuration(elapsedSec - targetSec))
                : t.practice.left(formatDuration(targetSec - elapsedSec))}
              {!running && !finished && t.practice.paused}
            </span>
          </div>
          <div
            className="timer-track"
            role="progressbar"
            aria-label={t.common.elapsed}
            aria-valuemin={0}
            aria-valuemax={targetSec}
            aria-valuenow={Math.min(elapsedSec, targetSec)}
          >
            <div className="timer-fill" data-over={over} style={{ width: `${Math.min(100, (elapsedSec / targetSec) * 100)}%` }} />
          </div>
          {!finished && (
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn" onClick={togglePause}>
                {running ? t.common.pause : t.practice.resume}
              </button>
              <button className="btn btn-primary" onClick={finish}>
                {t.practice.finish}
              </button>
            </div>
          )}
        </section>

        {finished ? (
          <Sheet
            title={t.record.title}
            id="record"
            note={t.practice.summary(minutes, hints, sawSolution)}
          >
            <div className="sheet-body">
              <RecordForm
                problem={problem}
                mode={isReview ? 'review' : 'practice'}
                askIdea
                initialRating={suggestRating(hints, sawSolution)}
                initialMinutes={minutes}
                hints={hints}
                sawSolution={sawSolution}
                cancelLabel={t.practice.keepGoing}
                onCancel={keepGoing}
                onSaved={() => {
                  clearPracticeSession();
                  setSaved(true);
                }}
              />
            </div>
          </Sheet>
        ) : (
          <HintPanel
            problem={problem}
            used={hints}
            sawSolution={sawSolution}
            onReveal={revealHint}
            onSolution={() => setSawSolution(true)}
          />
        )}
      </div>

      {!saved && (
        <LeaveGuard
          title={t.leave.practiceTitle}
          message={t.leave.practiceMessage}
          leaveLabel={t.leave.practiceLeave}
          onLeave={clearPracticeSession}
        />
      )}
    </div>
  );
}
