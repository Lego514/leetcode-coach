import { useState, type FormEvent } from 'react';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { diffDays } from '../lib/dates';
import { RATINGS, schedule, type Rating } from '../lib/srs';
import { recordAttempt, saveNote } from '../store/actions';
import type { AttemptMode, ProgressRecord } from '../store/db';
import { useNote, useProgress, useToday } from '../store/queries';
import { useToast } from './toast';
import { Dialog } from './ui';

interface RecordDialogProps {
  problem: Problem | null;
  mode?: AttemptMode;
  /** 題目詳情頁已經有筆記編輯器，就不在這裡重複詢問思路 */
  askIdea?: boolean;
  onClose: () => void;
}

export function RecordDialog({ problem, mode = 'practice', askIdea = true, onClose }: RecordDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog
      open={problem !== null}
      onClose={onClose}
      title={t.record.title}
      subtitle={problem ? `${problem.id}. ${problem.title}` : undefined}
    >
      {problem && (
        <RecordForm key={problem.id} problem={problem} mode={mode} askIdea={askIdea} onSaved={onClose} onCancel={onClose} />
      )}
    </Dialog>
  );
}

interface RecordFormProps {
  problem: Problem;
  mode: AttemptMode;
  askIdea: boolean;
  /** 計時練習會依提示使用情況預先選好 */
  initialRating?: Rating;
  initialMinutes?: number;
  hints?: number;
  sawSolution?: boolean;
  cancelLabel?: string;
  onCancel: () => void;
  onSaved: (record: ProgressRecord) => void;
}

export function RecordForm({
  problem,
  mode,
  askIdea,
  initialRating,
  initialMinutes,
  hints,
  sawSolution,
  cancelLabel,
  onCancel,
  onSaved,
}: RecordFormProps) {
  const { t, fmt } = useI18n();
  const day = useToday();
  const progress = useProgress(problem.id);
  const note = useNote(problem.id);
  const toast = useToast();
  const [rating, setRating] = useState<Rating | null>(initialRating ?? null);
  const [minutes, setMinutes] = useState(initialMinutes ? String(initialMinutes) : '');
  const [idea, setIdea] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentIdea = idea ?? note?.idea ?? '';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!rating || saving) return;
    setSaving(true);
    try {
      const record = await recordAttempt(problem.id, rating, {
        mode,
        minutes: Number(minutes) || undefined,
        hints,
        sawSolution,
      });
      if (idea !== null && idea !== (note?.idea ?? '')) {
        await saveNote(problem.id, { idea: idea.trim() });
      }
      toast(t.record.saved(fmt.day(record.due), t.date.relative(diffDays(day, record.due))));
      onSaved(record);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 8 }}>
          {t.record.question}
        </legend>
        {initialRating && (
          <p className="field-hint" style={{ marginTop: -4, marginBottom: 8 }}>
            {t.record.suggested}
          </p>
        )}
        <div className="rating-grid">
          {RATINGS.map((id) => {
            const next = progress !== undefined ? schedule(progress ?? undefined, id, day) : null;
            return (
              <button key={id} type="button" className="rating-option" aria-pressed={rating === id} onClick={() => setRating(id)}>
                <span className="rating-label">{t.ratings[id].label}</span>
                <span className="rating-detail">{t.ratings[id].detail}</span>
                {next && <span className="rating-next">{t.common.reviewIn(next.interval)}</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="form-grid">
        <label className="field">
          <span className="field-label">{initialMinutes ? t.record.minutes : t.record.minutesOptional}</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
        {askIdea && (
          <label className="field span-2">
            <span className="field-label">{t.record.idea}</span>
            <input
              className="input"
              value={currentIdea}
              placeholder={t.record.ideaPlaceholder}
              onChange={(e) => setIdea(e.target.value)}
            />
            <span className="field-hint">{t.record.ideaHint}</span>
          </label>
        )}
      </div>

      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          {cancelLabel ?? t.common.cancel}
        </button>
        <button type="submit" className="btn btn-primary" disabled={!rating || saving}>
          {t.common.saveRecord}
        </button>
      </div>
    </form>
  );
}
