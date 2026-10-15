import { useState, type FormEvent } from 'react';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { diffDays } from '../lib/dates';
import { RATINGS, type Rating } from '../lib/srs';
import { deleteAttempt, updateAttempt } from '../store/actions';
import type { AttemptRecord } from '../store/db';
import { useToday } from '../store/queries';
import type { StuckReason } from '../../shared/constants';
import { StuckPicker } from './StuckPicker';
import { useToast } from './toast';
import { Dialog } from './ui';

// 改今天記過的一筆練習：選錯結果、時間打錯、卡在哪漏勾，或整筆記錯題目要刪掉。

interface EditAttemptDialogProps {
  edit: { problem: Problem; attempt: AttemptRecord } | null;
  onClose: () => void;
}

export function EditAttemptDialog({ edit, onClose }: EditAttemptDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog
      open={edit !== null}
      onClose={onClose}
      title={t.editAttempt.title}
      subtitle={edit ? `${edit.problem.id}. ${edit.problem.title}` : undefined}
    >
      {edit && <EditAttemptForm key={edit.attempt.uid} attempt={edit.attempt} onDone={onClose} />}
    </Dialog>
  );
}

function EditAttemptForm({ attempt, onDone }: { attempt: AttemptRecord; onDone: () => void }) {
  const { t, fmt } = useI18n();
  const day = useToday();
  const toast = useToast();
  const [rating, setRating] = useState<Rating>(attempt.rating);
  const [minutes, setMinutes] = useState(attempt.minutes ? String(attempt.minutes) : '');
  const [stuck, setStuck] = useState<StuckReason[]>(attempt.stuck ?? []);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const progress = await updateAttempt(attempt.uid, { rating, minutes: Number(minutes) || undefined, stuck });
      if (progress) toast(t.editAttempt.saved(fmt.day(progress.due), t.date.relative(diffDays(day, progress.due))));
      onDone();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await deleteAttempt(attempt.uid);
      toast(t.editAttempt.deleted);
      onDone();
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
        <div className="rating-grid">
          {RATINGS.map((id) => (
            <button key={id} type="button" className="rating-option" aria-pressed={rating === id} onClick={() => setRating(id)}>
              <span className="rating-label">{t.ratings[id].label}</span>
              <span className="rating-detail">{t.ratings[id].detail}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <StuckPicker value={stuck} onChange={setStuck} />

      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t.record.minutesOptional}</span>
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
      </div>

      {confirming ? (
        <div className="edit-attempt-confirm" role="alert">
          <p>{t.editAttempt.deleteConfirm}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-quiet" onClick={() => setConfirming(false)}>
              {t.common.cancel}
            </button>
            <button type="button" className="btn btn-danger" disabled={saving} onClick={() => void remove()}>
              {t.editAttempt.deleteYes}
            </button>
          </div>
        </div>
      ) : (
        <div className="btn-row edit-attempt-actions">
          <button type="button" className="btn btn-quiet btn-danger-text" onClick={() => setConfirming(true)}>
            {t.editAttempt.delete}
          </button>
          <button type="button" className="btn btn-quiet" onClick={onDone}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {t.common.saveRecord}
          </button>
        </div>
      )}
    </form>
  );
}
