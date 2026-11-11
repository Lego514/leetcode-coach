import { STUCK_NOTE_MAX, STUCK_REASONS, type StoredStuckReason } from '../../shared/constants';
import { useI18n } from '../i18n';
import { toggleStuck } from '../lib/stuck';

interface StuckPickerProps {
  value: readonly StoredStuckReason[];
  onChange: (value: StoredStuckReason[]) => void;
  /** 具體卡在哪的一句話；沒給 onNoteChange 就不顯示輸入框（模擬面試另有「反思」） */
  note?: string;
  onNoteChange?: (note: string) => void;
}

/**
 * 做完一題時勾「卡在哪」，可以複選，也可以不勾。只列現在的五類；
 * 改舊紀錄時，裡面已經沒有選項的「時間不夠」原樣留著，不會被清掉。
 * 下面一行可以寫具體卡在哪（例如「忘了陣列是空的」）：選項只說是哪一類，下次複習時看得到自己當時的原話
 */
export function StuckPicker({ value, onChange, note, onNoteChange }: StuckPickerProps) {
  const { t } = useI18n();
  return (
    <fieldset className="field stuck-picker">
      <legend className="field-label">{t.stuck.label}</legend>
      <div className="pill-group">
        {STUCK_REASONS.map((reason) => (
          <button key={reason} type="button" aria-pressed={value.includes(reason)} title={t.stuck.reasons[reason].hint} onClick={() => onChange(toggleStuck(value, reason))}>
            {t.stuck.reasons[reason].name}
          </button>
        ))}
      </div>
      {onNoteChange && (
        <input
          className="input stuck-note-input"
          type="text"
          value={note ?? ''}
          maxLength={STUCK_NOTE_MAX}
          aria-label={t.stuck.noteLabel}
          placeholder={t.stuck.notePlaceholder}
          onChange={(e) => onNoteChange(e.target.value)}
        />
      )}
    </fieldset>
  );
}
