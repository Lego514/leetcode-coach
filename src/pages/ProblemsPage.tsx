import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AddProblemForm } from '../components/AddProblemForm';
import { ProblemRow } from '../components/ProblemRow';
import { RecordDialog } from '../components/RecordDialog';
import { useToast } from '../components/toast';
import { Dialog, MasteryLegend, PageHead, Sheet } from '../components/ui';
import { getPattern, getPatterns, PATTERN_ORDER, type PatternId } from '../data/patterns';
import type { Difficulty, Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { inList, LIST_FILTERS } from '../lib/catalog';
import { schedule, stageOf, STAGES, type Rating, type Stage } from '../lib/srs';
import { markSolvedBefore } from '../store/actions';
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
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());

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

  // 已經有紀錄的題目不能批次標記；標記完成後自動從選取中消失
  const selectedIds = [...selected].filter((id) => !progress.has(id));

  function toggle(ids: number[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

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
        {!selecting && (
          <div className="btn-row">
            <button className="btn" onClick={() => setSelecting(true)}>
              {t.problems.batchStart}
            </button>
            <button className="btn" onClick={() => setAdding(true)}>
              {t.problems.add}
            </button>
          </div>
        )}
      </div>

      {selecting && (
        <Sheet title={t.problems.batchTitle} id="batch">
          <p className="sheet-body sheet-note">{t.problems.batchIntro}</p>
        </Sheet>
      )}

      <div className="stack" style={selecting ? { marginTop: 16 } : undefined}>
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
          const selectable = problems.filter((p) => !progress.has(p.id)).map((p) => p.id);
          return (
            <Sheet
              key={patternId}
              id={`group-${patternId}`}
              title={getPattern(patternId, locale).name}
              note={t.problems.groupProgress(started, problems.length)}
              actions={
                selecting && selectable.length > 0 ? (
                  <button className="btn btn-small btn-quiet" onClick={() => toggle(selectable, true)}>
                    {t.problems.batchSelectGroup}
                  </button>
                ) : undefined
              }
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
                          selecting ? (
                            !state && (
                              <input
                                type="checkbox"
                                className="batch-check"
                                aria-label={t.problems.batchSelectLabel(p.title)}
                                checked={selected.has(p.id)}
                                onChange={(e) => toggle([p.id], e.target.checked)}
                              />
                            )
                          ) : (
                            <>
                              <Link className="btn btn-small" to={`/practice/${p.id}`}>
                                {t.common.start}
                              </Link>
                              <button className="btn btn-small btn-quiet" onClick={() => setRecording(p)}>
                                {t.common.record}
                              </button>
                            </>
                          )
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

      {selecting && <BatchBar day={day} selectedIds={selectedIds} onMarked={() => setSelected(new Set())} onExit={stopSelecting} />}

      <RecordDialog
        problem={recording}
        mode={recording && progress.get(recording.id) ? 'review' : 'practice'}
        onClose={() => setRecording(null)}
      />
      <AddProblemDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

const BATCH_RATINGS: { rating: Rating; label: 'batchRemember' | 'batchVague' }[] = [
  { rating: 'solo', label: 'batchRemember' },
  { rating: 'hint', label: 'batchVague' },
];

interface BatchBarProps {
  day: string;
  selectedIds: number[];
  onMarked: () => void;
  onExit: () => void;
}

function BatchBar({ day, selectedIds, onMarked, onExit }: BatchBarProps) {
  const { t } = useI18n();
  const toast = useToast();
  const [rating, setRating] = useState<Rating>('solo');
  const [busy, setBusy] = useState(false);
  const count = selectedIds.length;

  async function mark() {
    setBusy(true);
    try {
      const marked = await markSolvedBefore(selectedIds, rating);
      toast(t.problems.batchDone(marked));
      onMarked();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="batch-bar" role="region" aria-label={t.problems.batchTitle}>
      <span className="batch-count" aria-live="polite">
        {t.problems.batchSelected(count)}
      </span>
      <div className="segmented" role="group" aria-label={t.problems.batchRatingLabel}>
        {BATCH_RATINGS.map((option) => (
          <button
            key={option.rating}
            type="button"
            aria-pressed={rating === option.rating}
            title={t.problems.batchReviewIn(schedule(undefined, option.rating, day).interval)}
            onClick={() => setRating(option.rating)}
          >
            {t.problems[option.label]}
          </button>
        ))}
      </div>
      <span className="sheet-note">{t.problems.batchReviewIn(schedule(undefined, rating, day).interval)}</span>
      <div className="btn-row batch-actions">
        <button className="btn btn-primary" disabled={count === 0 || busy} onClick={() => void mark()}>
          {t.problems.batchMark(count)}
        </button>
        <button className="btn btn-quiet" onClick={onExit}>
          {t.problems.batchExit}
        </button>
      </div>
    </div>
  );
}

function AddProblemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  return (
    <Dialog open={open} onClose={onClose} title={t.problems.add} subtitle={t.problems.addSubtitle}>
      <AddProblemForm
        onCancel={onClose}
        onAdded={(problem) => {
          toast(t.problems.added(problem.id, problem.title));
          onClose();
          navigate(`/problems/${problem.id}`);
        }}
      />
    </Dialog>
  );
}
