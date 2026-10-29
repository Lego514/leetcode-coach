import { useI18n } from '../i18n';
import { CONFIRM_DAYS, MAX_INTERVAL, type ScheduleExplanation, type WeightFactor } from '../lib/srs';

/** 記憶度（穩定度）的天數：短的留一位小數，看得出 1.3 跟 2.3 的差別 */
const daysText = (stability: number) => String(stability < 10 ? Math.round(stability * 10) / 10 : Math.round(stability));

/**
 * 為什麼排這天：把 explainSchedule 的每一步照順序寫出來。
 * 規則（時間、提示、卡在哪、一週內確認）一多，看得到怎麼算才信得過，也看得出有沒有算錯
 */
export function ScheduleWhy({ explanation: e, target }: { explanation: ScheduleExplanation; target: number }) {
  const { t } = useI18n();
  const factorText = (f: WeightFactor) =>
    f.kind === 'time'
      ? t.why.time(String(Math.round(f.pace * 10) / 10), target)
      : f.kind === 'hint'
        ? t.why.hint(f.layers)
        : t.why[f.kind];
  return (
    <details className="schedule-why">
      <summary>{t.why.title(e.days + e.delayDays)}</summary>
      <ol className="why-steps">
        <li>
          {e.first
            ? t.why.first
            : e.gapDays === 0
              ? t.why.sameDay
              : t.why.gap(e.gapDays, Math.round((e.recall ?? 1) * 100))}
        </li>
        <li>{t.why.rating[e.rating]}</li>
        {e.factors.map((f) => (
          <li key={f.kind}>
            <span>{factorText(f)}</span>
            <span className="why-weight">×{Math.round(f.weight * 100) / 100}</span>
          </li>
        ))}
        <li>{t.why.memory(daysText(e.stabilityAfter), e.stabilityBefore === undefined ? undefined : daysText(e.stabilityBefore))}</li>
        <li>
          {t.why.fsrs(Math.round(e.retention * 100), e.fsrsDays)}
          {e.maxed && t.why.maxed(MAX_INTERVAL)}
        </li>
        {e.confirm && <li className="why-result">{t.why.confirm(CONFIRM_DAYS)}</li>}
        {e.delayDays > 0 && <li>{t.why.delay(e.delayDays)}</li>}
      </ol>
    </details>
  );
}
