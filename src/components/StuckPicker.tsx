import { STUCK_REASONS, type StuckReason } from '../../shared/constants';
import { useI18n } from '../i18n';

/** 做完一題時勾「卡在哪」，可以複選，也可以不勾 */
export function StuckPicker({ value, onChange }: { value: readonly StuckReason[]; onChange: (value: StuckReason[]) => void }) {
  const { t } = useI18n();
  const toggle = (reason: StuckReason) =>
    onChange(STUCK_REASONS.filter((r) => (r === reason ? !value.includes(r) : value.includes(r))));
  return (
    <fieldset className="field stuck-picker">
      <legend className="field-label">{t.stuck.label}</legend>
      <div className="pill-group">
        {STUCK_REASONS.map((reason) => (
          <button key={reason} type="button" aria-pressed={value.includes(reason)} title={t.stuck.reasons[reason].hint} onClick={() => toggle(reason)}>
            {t.stuck.reasons[reason].name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
