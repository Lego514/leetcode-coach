import { useState, type FormEvent } from 'react';
import { getPatterns, type PatternId } from '../data/patterns';
import type { Difficulty, Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { validationMessage } from '../i18n/errors';
import { addCustomProblem, ValidationError } from '../store/actions';

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

interface AddProblemFormProps {
  /** 從別處已經知道的題號或網址，先幫忙填好 */
  initial?: { id?: number; url?: string };
  onAdded: (problem: Problem) => void;
  onCancel: () => void;
}

export function AddProblemForm({ initial, onAdded, onCancel }: AddProblemFormProps) {
  const { t, locale } = useI18n();
  const [id, setId] = useState(initial?.id ? String(initial.id) : '');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [pattern, setPattern] = useState<PatternId>('arrays');
  const [premium, setPremium] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const problem = await addCustomProblem({ id: Number(id), title, slug: url, difficulty, pattern, premium });
      onAdded(problem);
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
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          {t.common.cancel}
        </button>
        <button type="submit" className="btn btn-primary">
          {t.problems.add}
        </button>
      </div>
    </form>
  );
}
