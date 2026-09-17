import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ProblemRow } from '../components/ProblemRow';
import { RecordDialog } from '../components/RecordDialog';
import { useToast } from '../components/toast';
import { Dialog, MasteryLegend, PageHead, Sheet } from '../components/ui';
import { getPattern, getPatterns, PATTERN_ORDER, type PatternId } from '../data/patterns';
import type { Difficulty, Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { validationMessage } from '../i18n/errors';
import { inList, LIST_FILTERS } from '../lib/catalog';
import { stageOf, STAGES, type Stage } from '../lib/srs';
import { addCustomProblem, ValidationError } from '../store/actions';
import { useCatalog, useCompanies, useMetaMap, useProgressMap, useSettings, useToday } from '../store/queries';

type StatusFilter = 'any' | 'due' | Stage;

const STATUS_FILTERS: StatusFilter[] = ['any', 'due', ...STAGES];
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

function pick<T extends string, F extends string>(value: string | null, allowed: readonly T[], fallback: F): T | F {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function ProblemsPage() {
  const { t, locale } = useI18n();
  const day = useToday();
  const settings = useSettings();
  const catalog = useCatalog();
  const { progress } = useProgressMap();
  const metaMap = useMetaMap();
  const companies = useCompanies();
  const [params, setParams] = useSearchParams();
  const [recording, setRecording] = useState<Problem | null>(null);
  const [adding, setAdding] = useState(false);

  // 網址參數可能被手動改過，不認得的值就退回預設
  const list = pick(params.get('list'), LIST_FILTERS, settings.activeList);
  const pattern = pick(params.get('pattern'), PATTERN_ORDER, 'any');
  const difficulty = pick(params.get('difficulty'), DIFFICULTIES, 'any');
  const status = pick(params.get('status'), STATUS_FILTERS, 'any');
  const company = params.get('company') ?? 'any';
  const query = params.get('q') ?? '';

  function setParam(key: string, value: string, fallback: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === fallback) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.problems.filter((p) => {
      if (!inList(catalog, p, list)) return false;
      if (pattern !== 'any' && p.pattern !== pattern) return false;
      if (difficulty !== 'any' && p.difficulty !== difficulty) return false;
      const state = progress.get(p.id);
      if (status === 'due' && !(state && state.due <= day)) return false;
      if (status !== 'any' && status !== 'due' && stageOf(state) !== status) return false;
      if (company !== 'any' && !metaMap.get(p.id)?.companies.includes(company)) return false;
      if (q && !p.title.toLowerCase().includes(q) && String(p.id) !== q) return false;
      return true;
    });
  }, [catalog, list, pattern, difficulty, status, company, query, progress, metaMap, day]);

  const groups = useMemo(() => {
    const map = new Map<PatternId, Problem[]>();
    for (const p of filtered) map.set(p.pattern, [...(map.get(p.pattern) ?? []), p]);
    return [...map.entries()];
  }, [filtered]);

  const listTotal = catalog.problems.filter((p) => inList(catalog, p, list));
  const listStarted = listTotal.filter((p) => progress.has(p.id)).length;
  const statusLabel = (s: StatusFilter) =>
    s === 'any' ? t.problems.statusAny : s === 'due' ? t.problems.statusDue : t.stages[s];

  return (
    <div className="page">
      <PageHead title={t.problems.title} lede={t.problems.lede(t.lists.labels[list], listTotal.length, listStarted)} />

      <div className="filters" role="search">
        <label className="field">
          <span className="field-label">{t.problems.list}</span>
          <select className="select" value={list} onChange={(e) => setParam('list', e.target.value, settings.activeList)}>
            {LIST_FILTERS.map((id) => (
              <option key={id} value={id}>
                {t.lists.labels[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t.problems.pattern}</span>
          <select className="select" value={pattern} onChange={(e) => setParam('pattern', e.target.value, 'any')}>
            <option value="any">{t.problems.allPatterns}</option>
            {getPatterns(locale).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t.problems.difficulty}</span>
          <select className="select" value={difficulty} onChange={(e) => setParam('difficulty', e.target.value, 'any')}>
            <option value="any">{t.problems.allDifficulties}</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t.problems.status}</span>
          <select className="select" value={status} onChange={(e) => setParam('status', e.target.value, 'any')}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        {companies.length > 0 && (
          <label className="field">
            <span className="field-label">{t.problems.company}</span>
            <select className="select" value={company} onChange={(e) => setParam('company', e.target.value, 'any')}>
              <option value="any">{t.problems.allCompanies}</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field field-search">
          <span className="field-label">{t.problems.search}</span>
          <input
            className="input"
            type="search"
            placeholder={t.problems.searchPlaceholder}
            value={query}
            onChange={(e) => setParam('q', e.target.value, '')}
          />
        </label>
      </div>

      <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <MasteryLegend />
        <button className="btn" onClick={() => setAdding(true)}>
          {t.problems.add}
        </button>
      </div>

      <div className="stack">
        {groups.length === 0 && (
          <Sheet title={t.problems.emptyTitle} id="empty">
            <div className="sheet-empty">
              <p>
                {list === 'custom' && catalog.problems.every((p) => !p.custom) ? t.problems.emptyCustom : t.problems.emptyFiltered}
              </p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => setParams({}, { replace: true })}>
                  {t.problems.clearFilters}
                </button>
              </div>
            </div>
          </Sheet>
        )}
        {groups.map(([patternId, problems]) => {
          const started = problems.filter((p) => progress.has(p.id)).length;
          return (
            <Sheet
              key={patternId}
              id={`group-${patternId}`}
              title={getPattern(patternId, locale).name}
              note={t.problems.groupProgress(started, problems.length)}
            >
              <ul className="rows">
                {problems.map((p) => {
                  const state = progress.get(p.id);
                  return (
                    <li key={p.id}>
                      <ProblemRow
                        problem={p}
                        progress={state}
                        today={day}
                        marked={!!state && state.due <= day}
                        companies={metaMap.get(p.id)?.companies}
                        actions={
                          <>
                            <Link className="btn btn-small" to={`/practice/${p.id}`}>
                              {t.common.start}
                            </Link>
                            <button className="btn btn-small btn-quiet" onClick={() => setRecording(p)}>
                              {t.common.record}
                            </button>
                          </>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </Sheet>
          );
        })}
      </div>

      <RecordDialog
        problem={recording}
        mode={recording && progress.get(recording.id) ? 'review' : 'practice'}
        onClose={() => setRecording(null)}
      />
      <AddProblemDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function AddProblemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={t.problems.add} subtitle={t.problems.addSubtitle}>
      <AddProblemForm onDone={onClose} />
    </Dialog>
  );
}

function AddProblemForm({ onDone }: { onDone: () => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [pattern, setPattern] = useState<PatternId>('arrays');
  const [premium, setPremium] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const problem = await addCustomProblem({ id: Number(id), title, slug: url, difficulty, pattern, premium });
      toast(t.problems.added(problem.id, problem.title));
      onDone();
      navigate(`/problems/${problem.id}`);
    } catch (err) {
      if (err instanceof ValidationError) setError(validationMessage(t, err));
      else throw err;
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t.problems.number}</span>
          <input className="input" type="number" inputMode="numeric" min={1} required value={id} onChange={(e) => setId(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t.problems.difficulty}</span>
          <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {DIFFICULTIES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="field span-2">
          <span className="field-label">{t.problems.englishTitle}</span>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Two Sum" />
        </label>
        <label className="field span-2">
          <span className="field-label">{t.problems.url}</span>
          <input
            className="input"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://leetcode.com/problems/two-sum/"
          />
        </label>
        <label className="field span-2">
          <span className="field-label">{t.problems.pattern}</span>
          <select className="select" value={pattern} onChange={(e) => setPattern(e.target.value as PatternId)}>
            {getPatterns(locale).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />
          {t.problems.needsPremium}
        </label>
      </div>
      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          {t.common.cancel}
        </button>
        <button type="submit" className="btn btn-primary">
          {t.problems.add}
        </button>
      </div>
    </form>
  );
}
