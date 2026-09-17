import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { HintPanel } from '../components/HintPanel';
import { LeaveGuard } from '../components/LeaveGuard';
import { RecordForm } from '../components/RecordDialog';
import { DifficultyTag, LeetCodeLink, PageHead, Sheet } from '../components/ui';
import { MOCK_MINUTES } from '../data/interview';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { formatDuration } from '../lib/dates';
import {
  clearPracticeSession,
  HINT_LEVELS,
  loadPracticeSession,
  savePracticeSession,
  suggestRating,
} from '../lib/practice';
import { useStopwatch } from '../lib/session';
import { ratingLabel } from '../lib/srs';
import { useCatalog, useProgress } from '../store/queries';

const APP_TITLE = '刷題教練';

export function PracticePage() {
  const { id } = useParams();
  const catalog = useCatalog();
  const problem = catalog.byId.get(Number(id));

  if (!problem && !catalog.loaded) return null;
  if (!problem) {
    return (
      <div className="page">
        <PageHead title="找不到這一題" lede={`題庫裡沒有第 ${id} 題。`}>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Link className="btn" to="/problems">
              回到題庫
            </Link>
          </div>
        </PageHead>
      </div>
    );
  }
  return <PracticeSession key={problem.id} problem={problem} />;
}

function PracticeSession({ problem }: { problem: Problem }) {
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
    document.title = `${formatDuration(elapsedSec)}${running ? '' : '（暫停）'} ${problem.title}｜${APP_TITLE}`;
  }, [elapsedSec, running, problem.title]);
  useEffect(() => () => void (document.title = APP_TITLE), []);

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
  const pattern = getPattern(problem.pattern);

  return (
    <div className="page">
      <PageHead title={`${problem.id}. ${problem.title}`}>
        <div className="detail-meta">
          <span className="chip">{isReview ? '複習' : '新題'}</span>
          <DifficultyTag difficulty={problem.difficulty} />
          {showPattern || hints > 0 ? (
            <span>{pattern.name}</span>
          ) : (
            <button className="btn btn-quiet btn-small" onClick={() => setShowPattern(true)}>
              顯示解題模式
            </button>
          )}
          {progress && <span>上次：{ratingLabel(progress.lastRating)}</span>}
          {problem.premium && <span>需要 Premium</span>}
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <LeetCodeLink slug={problem.slug} className="btn">
            在 LeetCode 作答
          </LeetCodeLink>
          <span className="sheet-note">分頁標題會顯示計時，切過去寫也看得到。</span>
        </div>
      </PageHead>

      <div className="stack">
        <section className="sheet sheet-body" aria-label="計時">
          <div className="timer">
            <span className="timer-value" data-over={over}>
              {formatDuration(elapsedSec)}
            </span>
            <span className="timer-limit">
              目標 {MOCK_MINUTES[problem.difficulty]} 分鐘，
              {over ? `已超過 ${formatDuration(elapsedSec - targetSec)}` : `還剩 ${formatDuration(targetSec - elapsedSec)}`}
              {!running && !finished && '，已暫停'}
            </span>
          </div>
          <div
            className="timer-track"
            role="progressbar"
            aria-label="已用時間"
            aria-valuemin={0}
            aria-valuemax={targetSec}
            aria-valuenow={Math.min(elapsedSec, targetSec)}
          >
            <div className="timer-fill" data-over={over} style={{ width: `${Math.min(100, (elapsedSec / targetSec) * 100)}%` }} />
          </div>
          {!finished && (
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn" onClick={togglePause}>
                {running ? '暫停' : '繼續計時'}
              </button>
              <button className="btn btn-primary" onClick={finish}>
                寫完了
              </button>
            </div>
          )}
        </section>

        {finished ? (
          <Sheet
            title="記錄這次練習"
            id="record"
            note={`花了 ${minutes} 分鐘${hints > 0 ? `，打開 ${hints} 層提示` : '，沒有用提示'}${sawSolution ? '，看過解答' : ''}`}
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
                cancelLabel="還沒寫完，繼續計時"
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
          title="離開這次練習？"
          message="計時會停止，這次不會留下紀錄。想保留的話，先按「寫完了」再儲存。"
          leaveLabel="離開，不記錄"
          onLeave={clearPracticeSession}
        />
      )}
    </div>
  );
}
