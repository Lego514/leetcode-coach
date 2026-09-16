import { useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { SaveStatus, useAutosave } from '../components/autosave';
import { CodeTextarea } from '../components/CodeTextarea';
import { RecordDialog } from '../components/RecordDialog';
import { useToast } from '../components/toast';
import { DifficultyTag, Dialog, LeetCodeLink, MasteryCell, PageHead, Sheet } from '../components/ui';
import { EXPLANATION_SCAFFOLD } from '../data/interview';
import { STUDY_LISTS } from '../data/lists';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { LANGUAGES } from '../lib/languages';
import { formatDay, relativeDay } from '../lib/dates';
import { ratingLabel, stageOf, STAGE_LABELS } from '../lib/srs';
import { deleteCustomProblem, resetProgress, saveNote, setCompanies } from '../store/actions';
import type { AttemptMode, NoteRecord } from '../store/db';
import {
  useAttemptsFor,
  useCatalog,
  useCompanies,
  useMetaMap,
  useNote,
  useProgress,
  useSettings,
  useToday,
} from '../store/queries';

const MODE_LABELS: Record<AttemptMode, string> = {
  practice: '練習',
  review: '複習',
  mock: '模擬面試',
  explain: '講解練習',
};

export function ProblemDetailPage() {
  const { id } = useParams();
  const catalog = useCatalog();
  const problem = catalog.byId.get(Number(id));

  if (!problem) {
    return (
      <div className="page">
        <Link className="back-link" to="/problems">
          回到題庫
        </Link>
        <PageHead title="找不到這一題" lede={`題庫裡沒有第 ${id} 題。可以到題庫用「新增題目」把它加進來。`} />
      </div>
    );
  }
  return <ProblemDetail key={problem.id} problem={problem} />;
}

function ProblemDetail({ problem }: { problem: Problem }) {
  const day = useToday();
  const progress = useProgress(problem.id);
  const [recording, setRecording] = useState(false);
  const pattern = getPattern(problem.pattern);
  const lists = STUDY_LISTS.filter((l) => l.problemIds.includes(problem.id));

  return (
    <div className="page">
      <Link className="back-link" to="/problems">
        回到題庫
      </Link>
      <PageHead title={`${problem.id}. ${problem.title}`}>
        <div className="detail-meta">
          <MasteryCell progress={progress} label={STAGE_LABELS[stageOf(progress ?? undefined)]} />
          <DifficultyTag difficulty={problem.difficulty} />
          <Link to={`/patterns/${pattern.id}`}>{pattern.name}</Link>
          {lists.map((l) => (
            <span key={l.id} className="chip">
              {l.name}
            </span>
          ))}
          {problem.custom && <span className="chip">我新增的</span>}
          {problem.premium && <span>需要 Premium</span>}
          <LeetCodeLink slug={problem.slug}>在 LeetCode 作答</LeetCodeLink>
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => setRecording(true)}>
            記錄這次練習
          </button>
          <Link className="btn" to={`/mock?problem=${problem.id}`}>
            模擬面試這題
          </Link>
          <Link className="btn" to={`/mock?problem=${problem.id}&kind=explain`}>
            練習講解這題
          </Link>
        </div>
      </PageHead>

      <div className="split">
        <NotesEditor problemId={problem.id} />
        <div className="stack">
          <Sheet title="複習排程" id="schedule">
            <div className="sheet-body">
              {progress ? (
                <dl className="facts">
                  <dt>狀態</dt>
                  <dd>{STAGE_LABELS[stageOf(progress)]}</dd>
                  <dt>下次複習</dt>
                  <dd className={progress.due < day ? 'overdue' : undefined}>
                    {formatDay(progress.due)}，{relativeDay(progress.due, day)}
                  </dd>
                  <dt>上次結果</dt>
                  <dd>{ratingLabel(progress.lastRating)}</dd>
                  <dt>做過</dt>
                  <dd>{progress.attempts} 次</dd>
                  <dt>沒解出來</dt>
                  <dd>{progress.lapses} 次</dd>
                  <dt>第一次做</dt>
                  <dd>{formatDay(progress.firstDay)}</dd>
                </dl>
              ) : (
                <p className="sheet-note">還沒做過。做完後按「記錄這次練習」，系統會排好複習日。</p>
              )}
            </div>
          </Sheet>
          <CompanyEditor problemId={problem.id} />
          <History problemId={problem.id} />
          <DangerZone problem={problem} hasProgress={!!progress} />
        </div>
      </div>

      <RecordDialog
        problem={recording ? problem : null}
        mode={progress ? 'review' : 'practice'}
        askIdea={false}
        onClose={() => setRecording(false)}
      />
    </div>
  );
}

type NoteDraft = Omit<NoteRecord, 'problemId' | 'updatedAt'>;

function NotesEditor({ problemId }: { problemId: number }) {
  const note = useNote(problemId);
  const settings = useSettings();
  if (note === undefined) {
    return <Sheet title="我的筆記" id="notes"><p className="sheet-empty">載入中…</p></Sheet>;
  }
  return <NotesForm problemId={problemId} initial={note} defaultLanguage={settings.language} />;
}

function NotesForm({
  problemId,
  initial,
  defaultLanguage,
}: {
  problemId: number;
  initial: NoteRecord | null;
  defaultLanguage: string;
}) {
  const [draft, setDraft] = useState<NoteDraft>(() => ({
    idea: initial?.idea ?? '',
    explanation: initial?.explanation ?? '',
    time: initial?.time ?? '',
    space: initial?.space ?? '',
    pitfalls: initial?.pitfalls ?? '',
    code: initial?.code ?? '',
    language: initial?.language ?? defaultLanguage,
  }));
  const status = useAutosave(draft, (value) => saveNote(problemId, value));
  const update = (patch: Partial<NoteDraft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Sheet title="我的筆記" id="notes" actions={<SaveStatus status={status} />}>
      <div className="sheet-body stack" style={{ gap: 18 }}>
        <label className="field">
          <span className="field-label">一句話的核心思路</span>
          <input
            className="input"
            value={draft.idea}
            onChange={(e) => update({ idea: e.target.value })}
            placeholder="例如：排序後用雙指標，固定一個數再夾擠另外兩個"
          />
        </label>

        <div className="field">
          <label className="field-label" htmlFor="explanation">
            英文講解稿
          </label>
          <span className="field-hint" id="explanation-hint">
            面試時要說出口的版本。寫完後到「模擬面試」用講解練習念一遍。
          </span>
          <textarea
            id="explanation"
            className="textarea"
            rows={5}
            lang="en"
            aria-describedby="explanation-hint"
            value={draft.explanation}
            onChange={(e) => update({ explanation: e.target.value })}
            placeholder={EXPLANATION_SCAFFOLD}
          />
          {!draft.explanation && (
            <div>
              <button type="button" className="btn btn-small" onClick={() => update({ explanation: EXPLANATION_SCAFFOLD })}>
                填入講解架構
              </button>
            </div>
          )}
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">時間複雜度</span>
            <input className="input" value={draft.time} onChange={(e) => update({ time: e.target.value })} placeholder="O(n)" />
          </label>
          <label className="field">
            <span className="field-label">空間複雜度</span>
            <input className="input" value={draft.space} onChange={(e) => update({ space: e.target.value })} placeholder="O(n)" />
          </label>
        </div>

        <label className="field">
          <span className="field-label">踩過的坑</span>
          <textarea
            className="textarea"
            rows={3}
            value={draft.pitfalls}
            onChange={(e) => update({ pitfalls: e.target.value })}
            placeholder="例如：忘了跳過重複值；邊界 l < r 寫成 l <= r"
          />
        </label>

        <div className="field">
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <label className="field-label" htmlFor="code">
              我的程式碼
            </label>
            <label className="visually-hidden" htmlFor="code-language">
              程式語言
            </label>
            <select
              id="code-language"
              className="select"
              style={{ width: 'auto', minHeight: 30, padding: '2px 8px' }}
              value={draft.language}
              onChange={(e) => update({ language: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <CodeTextarea
            id="code"
            value={draft.code}
            onChange={(code) => update({ code })}
            aria-describedby="code-hint"
            placeholder="把通過的解法貼在這裡"
          />
          <span className="field-hint" id="code-hint">
            Tab 會插入空白。要離開輸入框，先按 Esc 再按 Tab。
          </span>
        </div>
      </div>
    </Sheet>
  );
}

function CompanyEditor({ problemId }: { problemId: number }) {
  const metaMap = useMetaMap();
  const known = useCompanies();
  const [text, setText] = useState('');
  const companies = metaMap.get(problemId)?.companies ?? [];

  function add() {
    const name = text.trim();
    if (!name) return;
    void setCompanies(problemId, [...companies, name]);
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  }

  return (
    <Sheet title="公司標籤" id="companies" note="自己記錄哪些公司考過">
      <div className="sheet-body">
        <div className="tag-editor">
          {companies.map((c) => (
            <span key={c} className="chip">
              {c}
              <button
                type="button"
                className="chip-remove"
                aria-label={`移除 ${c}`}
                onClick={() => void setCompanies(problemId, companies.filter((x) => x !== c))}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="input"
            list="company-options"
            aria-label="新增公司"
            placeholder="輸入公司後按 Enter"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <datalist id="company-options">
            {known
              .filter((c) => !companies.includes(c))
              .map((c) => (
                <option key={c} value={c} />
              ))}
          </datalist>
        </div>
      </div>
    </Sheet>
  );
}

function History({ problemId }: { problemId: number }) {
  const attempts = useAttemptsFor(problemId);
  return (
    <Sheet title="練習紀錄" count={attempts?.length} id="history">
      <div className="sheet-body">
        {!attempts?.length ? (
          <p className="sheet-note">還沒有紀錄。</p>
        ) : (
          <ul className="history">
            {attempts.map((a) => (
              <li key={a.id}>
                <span>
                  {ratingLabel(a.rating)}
                  <span className="history-when">
                    （{MODE_LABELS[a.mode]}
                    {a.minutes ? `，${a.minutes} 分鐘` : ''}）
                  </span>
                </span>
                <span className="history-when history-date">{formatDay(a.day)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}

function DangerZone({ problem, hasProgress }: { problem: Problem; hasProgress: boolean }) {
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  if (!hasProgress && !problem.custom) return null;

  async function run() {
    if (confirm === 'reset') {
      await resetProgress(problem.id);
      toast('已清除這題的練習紀錄，筆記仍然保留。');
    } else if (confirm === 'delete') {
      await deleteCustomProblem(problem.id);
      toast(`已刪除 ${problem.title}`);
      navigate('/problems?list=custom');
    }
    setConfirm(null);
  }

  return (
    <Sheet title="重來" id="danger">
      <div className="sheet-body btn-row">
        {hasProgress && (
          <button className="btn btn-danger" onClick={() => setConfirm('reset')}>
            清除練習紀錄
          </button>
        )}
        {problem.custom && (
          <button className="btn btn-danger" onClick={() => setConfirm('delete')}>
            刪除這題
          </button>
        )}
      </div>
      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'delete' ? '刪除這題？' : '清除練習紀錄？'}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setConfirm(null)}>
              取消
            </button>
            <button className="btn btn-danger" onClick={() => void run()}>
              {confirm === 'delete' ? '刪除這題' : '清除練習紀錄'}
            </button>
          </>
        }
      >
        <p>
          {confirm === 'delete'
            ? '題目、筆記、練習紀錄和模擬面試紀錄都會一起刪除，無法復原。'
            : '複習排程和練習紀錄會清掉，這題會回到「還沒做」。筆記會保留。'}
        </p>
      </Dialog>
    </Sheet>
  );
}
