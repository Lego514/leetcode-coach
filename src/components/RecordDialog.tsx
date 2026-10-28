import { useState, type FormEvent } from 'react';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { diffDays } from '../lib/dates';
import { MOCK_MINUTES } from '../data/interview';
import { paceOf, RATINGS, schedule, type Rating } from '../lib/srs';
import { recordAttempt, saveNote } from '../store/actions';
import type { AttemptMode, ProgressRecord } from '../store/db';
import { retentionOf } from '../store/progress';
import { useNote, useProgress, useSettings, useToday } from '../store/queries';
import type { StuckReason } from '../../shared/constants';
import { StuckPicker } from './StuckPicker';
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
  /** 練習頁：關鍵洞察放最上面，卡在哪、花多久收起來（選填） */
  insightFirst?: boolean;
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
  insightFirst = false,
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
  const retention = retentionOf(useSettings());
  const note = useNote(problem.id);
  const toast = useToast();
  const [rating, setRating] = useState<Rating | null>(initialRating ?? null);
  const [minutes, setMinutes] = useState(initialMinutes ? String(initialMinutes) : '');
  const [idea, setIdea] = useState<string | null>(null);
  const [stuck, setStuck] = useState<StuckReason[]>([]);
  const [saving, setSaving] = useState(false);

  const currentIdea = idea ?? note?.idea ?? '';
  // 寫題時間算進記憶度：超過這題的目標時間，記得的那幾個選項會排得早一點
  const target = MOCK_MINUTES[problem.difficulty];
  const pace = paceOf(Number(minutes) || undefined, target);

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
        stuck,
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

  const minutesField = (
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
  );
  // 練習頁：計時器量到的時間可以調，例如中途離開座位、忘了按暫停
  const adjust = (delta: number) => setMinutes(String(Math.min(600, Math.max(1, (Number(minutes) || initialMinutes || 1) + delta))));
  const timeField = (
    <div className="field">
      <label className="field-label" htmlFor={`${problem.id}-minutes`}>
        {t.record.minutes}
      </label>
      <div className="time-adjust">
        <button type="button" className="btn btn-small" aria-label={t.record.minusMinutes(5)} onClick={() => adjust(-5)}>
          −5
        </button>
        <button type="button" className="btn btn-small" aria-label={t.record.minusMinutes(1)} onClick={() => adjust(-1)}>
          −1
        </button>
        <input
          id={`${problem.id}-minutes`}
          className="input time-adjust-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <button type="button" className="btn btn-small" aria-label={t.record.plusMinutes(1)} onClick={() => adjust(1)}>
          +1
        </button>
        <button type="button" className="btn btn-small" aria-label={t.record.plusMinutes(5)} onClick={() => adjust(5)}>
          +5
        </button>
      </div>
      <span className="field-hint">
        {initialMinutes ? t.record.timerMeasured(initialMinutes) : t.record.timeHintNoTimer}{' '}
        {initialMinutes !== undefined && Number(minutes) !== initialMinutes && (
          <button type="button" className="link-button" onClick={() => setMinutes(String(initialMinutes))}>
            {t.record.resetTime}
          </button>
        )}
      </span>
    </div>
  );
  const ideaField = (first: boolean) => (
    <label className={first ? 'field' : 'field span-2'}>
      <span className="field-label">{t.record.idea}</span>
      <input
        className="input"
        value={currentIdea}
        placeholder={t.record.ideaPlaceholder}
        autoFocus={first}
        onChange={(e) => setIdea(e.target.value)}
      />
      <span className="field-hint">{first ? t.record.ideaFirstHint : t.record.ideaHint}</span>
    </label>
  );

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
      {askIdea && insightFirst && ideaField(true)}
      {insightFirst && timeField}
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 8 }}>
          {t.record.question}
        </legend>
        {initialRating && (
          <p className="field-hint" style={{ marginTop: -4, marginBottom: 8 }}>
            {t.record.suggested}
          </p>
        )}
        {pace !== undefined && pace > 1 && (
          <p className="field-hint" style={{ marginTop: -4, marginBottom: 8 }}>
            {t.record.slowNote(target)}
          </p>
        )}
        <div className="rating-grid">
          {RATINGS.map((id) => {
            const next = progress !== undefined ? schedule(progress ?? undefined, id, day, 0, retention, pace) : null;
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

      {/* 卡在哪直接列出來：點一下就好，不用再打開 */}
      {insightFirst ? (
        <StuckPicker value={stuck} onChange={setStuck} />
      ) : (
        <>
          <StuckPicker value={stuck} onChange={setStuck} />
          <div className="form-grid">
            {minutesField}
            {askIdea && ideaField(false)}
          </div>
        </>
      )}

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
