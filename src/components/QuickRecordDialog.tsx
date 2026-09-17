import { useState, type FormEvent } from 'react';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { lookupProblem } from '../lib/catalog';
import { useCatalog, useProgressMap } from '../store/queries';
import { AddProblemForm } from './AddProblemForm';
import { RecordForm } from './RecordDialog';
import { useToast } from './toast';
import { DifficultyTag, Dialog } from './ui';

/** 記錄清單以外、或不在今天推薦裡的題目：找到題目就記錄，題庫沒有就先新增 */
export function QuickRecordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={t.today.recordOther} subtitle={t.today.quickSubtitle}>
      <QuickRecord onDone={onClose} />
    </Dialog>
  );
}

type Step = { name: 'find' } | { name: 'add'; id?: number; url?: string } | { name: 'record'; problem: Problem };

function QuickRecord({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const catalog = useCatalog();
  const { progress } = useProgressMap();
  const [step, setStep] = useState<Step>({ name: 'find' });
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  function find(e: FormEvent) {
    e.preventDefault();
    const result = lookupProblem(catalog, query);
    setError('');
    if (result.kind === 'found') setStep({ name: 'record', problem: result.problem });
    else if (result.kind === 'missing') setStep({ name: 'add', id: result.id, url: result.url });
    else if (result.kind === 'unknown') setError(t.today.quickUnknown);
  }

  if (step.name === 'record') {
    const { problem } = step;
    return (
      <div className="stack" style={{ gap: 16 }}>
        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          <p className="problem-title">
            <span className="problem-num">{problem.id}</span>
            <span>{problem.title}</span>
            <DifficultyTag difficulty={problem.difficulty} />
          </p>
          <button type="button" className="btn btn-small btn-quiet" onClick={() => setStep({ name: 'find' })}>
            {t.today.quickChange}
          </button>
        </div>
        <RecordForm
          key={problem.id}
          problem={problem}
          mode={progress.has(problem.id) ? 'review' : 'practice'}
          askIdea
          onCancel={onDone}
          onSaved={onDone}
        />
      </div>
    );
  }

  if (step.name === 'add') {
    return (
      <div className="stack" style={{ gap: 16 }}>
        <p className="sheet-note">{t.today.quickMissing}</p>
        <AddProblemForm
          initial={{ id: step.id, url: step.url }}
          onCancel={() => setStep({ name: 'find' })}
          onAdded={(problem) => {
            toast(t.problems.added(problem.id, problem.title));
            setStep({ name: 'record', problem });
          }}
        />
      </div>
    );
  }

  return (
    <form className="stack" style={{ gap: 16 }} onSubmit={find}>
      <label className="field">
        <span className="field-label">{t.today.quickLabel}</span>
        <input
          className="input"
          list="quick-record-options"
          autoFocus
          aria-describedby="quick-record-hint"
          placeholder={t.today.quickPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <datalist id="quick-record-options">
          {catalog.problems.map((p) => (
            <option key={p.id} value={`${p.id}. ${p.title}`} />
          ))}
        </datalist>
        {error ? (
          <span className="form-error" role="alert">
            {error}
          </span>
        ) : (
          <span className="field-hint" id="quick-record-hint">
            {t.today.quickHint}
          </span>
        )}
      </label>
      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          {t.common.cancel}
        </button>
        <button type="submit" className="btn btn-primary" disabled={!query.trim()}>
          {t.today.quickFind}
        </button>
      </div>
    </form>
  );
}
