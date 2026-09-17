import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ProblemRow } from '../components/ProblemRow';
import { RecordDialog } from '../components/RecordDialog';
import { useToast } from '../components/toast';
import { Dialog, MasteryLegend, PageHead, Sheet } from '../components/ui';
import { getPattern, PATTERNS, type PatternId } from '../data/patterns';
import type { Difficulty, Problem } from '../data/problems';
import { inList, LIST_FILTER_LABELS, type ListFilter } from '../lib/catalog';
import { stageOf, STAGE_LABELS, type Stage } from '../lib/srs';
import { addCustomProblem, ValidationError } from '../store/actions';
import { useCatalog, useCompanies, useMetaMap, useProgressMap, useSettings, useToday } from '../store/queries';

type StatusFilter = 'any' | 'due' | Stage;

const STATUS_LABELS: Record<StatusFilter, string> = {
  any: '全部狀態',
  due: '該複習',
  ...STAGE_LABELS,
};

const LIST_OPTIONS: ListFilter[] = ['neetcode150', 'blind75', 'grind169', 'custom', 'all'];
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

function pick<T extends string, F extends string>(value: string | null, allowed: readonly T[], fallback: F): T | F {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function ProblemsPage() {
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
  const list = pick(params.get('list'), LIST_OPTIONS, settings.activeList);
  const pattern = pick(params.get('pattern'), PATTERNS.map((p) => p.id), 'any');
  const difficulty = pick(params.get('difficulty'), DIFFICULTIES, 'any');
  const status = pick(params.get('status'), Object.keys(STATUS_LABELS) as StatusFilter[], 'any');
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

  return (
    <div className="page">
      <PageHead
        title="題庫"
        lede={`${LIST_FILTER_LABELS[list]} 共 ${listTotal.length} 題，做過 ${listStarted} 題。按「開始」會計時並提供提示，題目本身在 LeetCode 作答。`}
      />

      <div className="filters" role="search">
        <label className="field">
          <span className="field-label">清單</span>
          <select className="select" value={list} onChange={(e) => setParam('list', e.target.value, settings.activeList)}>
            {LIST_OPTIONS.map((id) => (
              <option key={id} value={id}>
                {LIST_FILTER_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">解題模式</span>
          <select className="select" value={pattern} onChange={(e) => setParam('pattern', e.target.value, 'any')}>
            <option value="any">全部模式</option>
            {PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">難度</span>
          <select className="select" value={difficulty} onChange={(e) => setParam('difficulty', e.target.value, 'any')}>
            <option value="any">全部難度</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">狀態</span>
          <select className="select" value={status} onChange={(e) => setParam('status', e.target.value, 'any')}>
            {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        {companies.length > 0 && (
          <label className="field">
            <span className="field-label">公司</span>
            <select className="select" value={company} onChange={(e) => setParam('company', e.target.value, 'any')}>
              <option value="any">全部公司</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field field-search">
          <span className="field-label">搜尋</span>
          <input
            className="input"
            type="search"
            placeholder="題號或英文題名"
            value={query}
            onChange={(e) => setParam('q', e.target.value, '')}
          />
        </label>
      </div>

      <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <MasteryLegend />
        <button className="btn" onClick={() => setAdding(true)}>
          新增題目
        </button>
      </div>

      <div className="stack">
        {groups.length === 0 && (
          <Sheet title="沒有符合的題目" id="empty">
            <div className="sheet-empty">
              <p>
                {list === 'custom' && catalog.problems.every((p) => !p.custom)
                  ? '你還沒有新增自己的題目。清單以外的題目，可以用「新增題目」加進來。'
                  : '換個篩選條件試試，或清除搜尋文字。'}
              </p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => setParams({}, { replace: true })}>
                  清除篩選
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
              title={getPattern(patternId).name}
              note={`做過 ${started} / ${problems.length}`}
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
                              開始
                            </Link>
                            <button className="btn btn-small btn-quiet" onClick={() => setRecording(p)}>
                              記錄
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
  return (
    <Dialog open={open} onClose={onClose} title="新增題目" subtitle="加入清單以外的 LeetCode 題目，之後會出現在「我新增的題目」。">
      <AddProblemForm onDone={onClose} />
    </Dialog>
  );
}

function AddProblemForm({ onDone }: { onDone: () => void }) {
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
      toast(`已新增 ${problem.id}. ${problem.title}`);
      onDone();
      navigate(`/problems/${problem.id}`);
    } catch (err) {
      if (err instanceof ValidationError) setError(err.message);
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
          <span className="field-label">題號</span>
          <input className="input" type="number" inputMode="numeric" min={1} required value={id} onChange={(e) => setId(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">難度</span>
          <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {DIFFICULTIES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="field span-2">
          <span className="field-label">英文題名</span>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Two Sum" />
        </label>
        <label className="field span-2">
          <span className="field-label">LeetCode 網址</span>
          <input
            className="input"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://leetcode.com/problems/two-sum/"
          />
        </label>
        <label className="field span-2">
          <span className="field-label">解題模式</span>
          <select className="select" value={pattern} onChange={(e) => setPattern(e.target.value as PatternId)}>
            {PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />
          需要 LeetCode Premium
        </label>
      </div>
      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          新增題目
        </button>
      </div>
    </form>
  );
}
