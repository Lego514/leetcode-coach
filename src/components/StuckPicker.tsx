import { STUCK_REASONS, type StoredStuckReason } from '../../shared/constants';
import { useI18n } from '../i18n';
import { toggleStuck } from '../lib/stuck';

/**
 * 做完一題時勾「卡在哪」，可以複選，也可以不勾。只列現在的五類；
 * 改舊紀錄時，裡面已經沒有選項的「時間不夠」原樣留著，不會被清掉
 */
export function StuckPicker({ value, onChange }: { value: readonly StoredStuckReason[]; onChange: (value: StoredStuckReason[]) => void }) {
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
    </fieldset>
  );
}
