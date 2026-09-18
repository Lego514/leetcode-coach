import { useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { SaveStatus, useAutosave } from '../components/autosave';
import { CodeTextarea } from '../components/CodeTextarea';
import { RecordDialog } from '../components/RecordDialog';
import { ReferenceExplanation, useHasExplanation } from '../components/ReferenceExplanation';
import { useToast } from '../components/toast';
import { DifficultyTag, Dialog, LeetCodeLink, MasteryCell, PageHead, Sheet } from '../components/ui';
import { EXPLANATION_SCAFFOLD } from '../data/interview';
import { STUDY_LISTS } from '../data/lists';
import { getPattern } from '../data/patterns';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { diffDays } from '../lib/dates';
import { LANGUAGES } from '../lib/languages';
import { stageOf } from '../lib/srs';
import { deleteCustomProblem, resetProgress, saveNote, setCompanies } from '../store/actions';
import type { NoteRecord } from '../store/db';
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

export function ProblemDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const catalog = useCatalog();
  const problem = catalog.byId.get(Number(id));

  if (!problem && !catalog.loaded) return null;
  if (!problem) {
    return (
      <div className="page">
        <Link className="back-link" to="/problems">
          {t.common.backToProblems}
        </Link>
        <PageHead title={t.common.problemNotFound} lede={t.detail.notFoundLede(id ?? '')} />
      </div>
    );
  }
  return <ProblemDetail key={problem.id} problem={problem} />;
}

function ProblemDetail({ problem }: { problem: Problem }) {
  const { t, fmt, locale } = useI18n();
  const day = useToday();
  const progress = useProgress(problem.id);
  const [recording, setRecording] = useState(false);
  const pattern = getPattern(problem.pattern, locale);
  const lists = STUDY_LISTS.filter((l) => l.problemIds.includes(problem.id));

  return (
    <div className="page">
      <Link className="back-link" to="/problems">
        {t.common.backToProblems}
      </Link>
      <PageHead title={`${problem.id}. ${problem.title}`}>
        <div className="detail-meta">
          <MasteryCell progress={progress} label={t.stages[stageOf(progress ?? undefined)]} />
          <DifficultyTag difficulty={problem.difficulty} />
          <Link to={`/patterns/${pattern.id}`}>{pattern.name}</Link>
          {lists.map((l) => (
            <span key={l.id} className="chip">
              {l.name}
            </span>
          ))}
          {problem.custom && <span className="chip">{t.common.customTag}</span>}
          {problem.premium && <span>{t.common.premium}</span>}
          <LeetCodeLink slug={problem.slug}>{t.common.solveOnLeetCode}</LeetCodeLink>
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" to={`/practice/${problem.id}`}>
            {t.detail.startPractice}
          </Link>
          <button className="btn" onClick={() => setRecording(true)}>
            {t.detail.recordDirectly}
          </button>
          <Link className="btn" to={`/mock?problem=${problem.id}`}>
            {t.detail.mockThis}
          </Link>
          <Link className="btn" to={`/mock?problem=${problem.id}&kind=explain`}>
            {t.detail.explainThis}
          </Link>
        </div>
      </PageHead>

      <div className="split">
        <div className="stack">
          <NotesEditor problemId={problem.id} />
          <ReferenceSheet problemId={problem.id} />
        </div>
        <div className="stack">
          <Sheet title={t.detail.scheduleTitle} id="schedule">
            <div className="sheet-body">
              {progress ? (
                <dl className="facts">
                  <dt>{t.detail.stage}</dt>
                  <dd>{t.stages[stageOf(progress)]}</dd>
                  <dt>{t.detail.nextReview}</dt>
                  <dd className={progress.due < day ? 'overdue' : undefined}>
                    {t.detail.nextReviewValue(fmt.day(progress.due), t.date.relative(diffDays(day, progress.due)))}
                  </dd>
                  <dt>{t.detail.lastResult}</dt>
                  <dd>{t.ratings[progress.lastRating].label}</dd>
                  <dt>{t.detail.attempts}</dt>
                  <dd>{t.detail.times(progress.attempts)}</dd>
                  <dt>{t.detail.lapses}</dt>
                  <dd>{t.detail.times(progress.lapses)}</dd>
                  <dt>{t.detail.firstDone}</dt>
                  <dd>{fmt.day(progress.firstDay)}</dd>
                </dl>
              ) : (
                <p className="sheet-note">{t.detail.notStarted}</p>
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

function ReferenceSheet({ problemId }: { problemId: number }) {
  const { t } = useI18n();
  const hasExplanation = useHasExplanation(problemId);
  if (!hasExplanation) return null;
  return (
    <Sheet title={t.reference.title} id="reference">
      <div className="sheet-body">
        <ReferenceExplanation problemId={problemId} />
      </div>
    </Sheet>
  );
}

type NoteDraft = Omit<NoteRecord, 'problemId' | 'updatedAt'>;

function NotesEditor({ problemId }: { problemId: number }) {
  const { t } = useI18n();
  const note = useNote(problemId);
  const settings = useSettings();
  if (note === undefined) {
    return (
      <Sheet title={t.detail.notesTitle} id="notes">
        <p className="sheet-empty">{t.common.loading}</p>
      </Sheet>
    );
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
  const { t } = useI18n();
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
    <Sheet title={t.detail.notesTitle} id="notes" actions={<SaveStatus status={status} />}>
      <div className="sheet-body stack" style={{ gap: 18 }}>
        <label className="field">
          <span className="field-label">{t.detail.idea}</span>
          <input
            className="input"
            value={draft.idea}
            onChange={(e) => update({ idea: e.target.value })}
            placeholder={t.detail.ideaPlaceholder}
          />
        </label>

        <div className="field">
          <label className="field-label" htmlFor="explanation">
            {t.detail.explanation}
          </label>
          <span className="field-hint" id="explanation-hint">
            {t.detail.explanationHint}
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
                {t.detail.insertScaffold}
              </button>
            </div>
          )}
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t.detail.time}</span>
            <input className="input" value={draft.time} onChange={(e) => update({ time: e.target.value })} placeholder="O(n)" />
          </label>
          <label className="field">
            <span className="field-label">{t.detail.space}</span>
            <input className="input" value={draft.space} onChange={(e) => update({ space: e.target.value })} placeholder="O(n)" />
          </label>
        </div>

        <label className="field">
          <span className="field-label">{t.detail.pitfalls}</span>
          <textarea
            className="textarea"
            rows={3}
            value={draft.pitfalls}
            onChange={(e) => update({ pitfalls: e.target.value })}
            placeholder={t.detail.pitfallsPlaceholder}
          />
        </label>

        <div className="field">
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <label className="field-label" htmlFor="code">
              {t.detail.code}
            </label>
            <label className="visually-hidden" htmlFor="code-language">
              {t.detail.codeLanguage}
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
            placeholder={t.detail.codePlaceholder}
          />
          <span className="field-hint" id="code-hint">
            {t.detail.codeHint}
          </span>
        </div>
      </div>
    </Sheet>
  );
}

function CompanyEditor({ problemId }: { problemId: number }) {
  const { t } = useI18n();
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
    <Sheet title={t.detail.companiesTitle} id="companies" note={t.detail.companiesNote}>
      <div className="sheet-body">
        <div className="tag-editor">
          {companies.map((c) => (
            <span key={c} className="chip">
              {c}
              <button
                type="button"
                className="chip-remove"
                aria-label={t.detail.removeCompany(c)}
                onClick={() => void setCompanies(problemId, companies.filter((x) => x !== c))}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="input"
            list="company-options"
            aria-label={t.detail.addCompany}
            placeholder={t.detail.companyPlaceholder}
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
  const { t, fmt } = useI18n();
  const attempts = useAttemptsFor(problemId);
  return (
    <Sheet title={t.detail.historyTitle} count={attempts?.length} id="history">
      <div className="sheet-body">
        {!attempts?.length ? (
          <p className="sheet-note">{t.detail.historyEmpty}</p>
        ) : (
          <ul className="history">
            {attempts.map((a) => (
              <li key={a.id}>
                <span>
                  {t.ratings[a.rating].label}
                  <span className="history-when">{t.detail.historyDetail(t.modes[a.mode], a.minutes, a.hints, a.sawSolution)}</span>
                </span>
                <span className="history-when history-date">{fmt.day(a.day)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}

function DangerZone({ problem, hasProgress }: { problem: Problem; hasProgress: boolean }) {
  const { t } = useI18n();
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  if (!hasProgress && !problem.custom) return null;

  async function run() {
    if (confirm === 'reset') {
      await resetProgress(problem.id);
      toast(t.detail.resetDone);
    } else if (confirm === 'delete') {
      await deleteCustomProblem(problem.id);
      toast(t.detail.deleted(problem.title));
      navigate('/problems?list=custom');
    }
    setConfirm(null);
  }

  return (
    <Sheet title={t.detail.resetTitle} id="danger">
      <div className="sheet-body btn-row">
        {hasProgress && (
          <button className="btn btn-danger" onClick={() => setConfirm('reset')}>
            {t.detail.resetProgress}
          </button>
        )}
        {problem.custom && (
          <button className="btn btn-danger" onClick={() => setConfirm('delete')}>
            {t.detail.deleteProblem}
          </button>
        )}
      </div>
      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'delete' ? t.detail.confirmDeleteTitle : t.detail.confirmResetTitle}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setConfirm(null)}>
              {t.common.cancel}
            </button>
            <button className="btn btn-danger" onClick={() => void run()}>
              {confirm === 'delete' ? t.detail.deleteProblem : t.detail.resetProgress}
            </button>
          </>
        }
      >
        <p>{confirm === 'delete' ? t.detail.confirmDelete : t.detail.confirmReset}</p>
      </Dialog>
    </Sheet>
  );
}
