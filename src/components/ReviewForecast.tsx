import { useI18n } from '../i18n';
import type { ForecastDay } from '../lib/stats';
import { Sheet } from './ui';

/**
 * 接下來 7 天每天要複習幾題：新規則會讓不熟的題早點回來，看得到預估量，才知道要不要調每天的上限。
 * 一天一根長條；有上限時，超過、延後的題數用虛線疊在上面（跟演算法樹「還沒做到」的藍圖一樣）
 */
export function ReviewForecast({ days, cap }: { days: ForecastDay[]; cap: number | undefined }) {
  const { t, fmt } = useI18n();
  const max = Math.max(1, ...days.map((d) => d.load + d.waiting));
  const anyWaiting = days.some((d) => d.waiting > 0);
  const total = days.reduce((sum, d) => sum + d.load, 0);
  const peak = days.reduce((best, d) => (d.load > best.load ? d : best), days[0]);
  // 長條下面寫星期幾（手機上「明天」的英文太長）；句子裡用今天、明天
  const label = (d: ForecastDay, i: number) => (i === 0 ? t.review.forecastToday : fmt.weekday(d.day));
  const inSentence = (d: ForecastDay, i: number) => (i <= 1 ? t.date.relative(i) : fmt.weekday(d.day));
  return (
    <Sheet title={t.review.forecastTitle} id="forecast" note={t.review.forecastSummary(total, inSentence(peak, days.indexOf(peak)), peak.load)}>
      <div className="sheet-body">
        <ol className="forecast" aria-label={t.review.forecastLabel}>
          {days.map((d, i) => (
            <li key={d.day} className="forecast-day" data-today={i === 0 || undefined}>
              <span className="visually-hidden">{t.review.forecastDay(inSentence(d, i), d.load, d.waiting)}</span>
              <span className="forecast-count" aria-hidden>
                {d.load}
              </span>
              <span className="forecast-track" aria-hidden>
                {d.waiting > 0 && <span className="forecast-waiting" style={{ height: `${(d.waiting / max) * 100}%` }} />}
                <span className="forecast-bar" style={{ height: `${(d.load / max) * 100}%` }} />
              </span>
              <span className="forecast-label" aria-hidden>
                {label(d, i)}
              </span>
            </li>
          ))}
        </ol>
        {anyWaiting && (
          <p className="forecast-key">
            <span className="forecast-key-swatch" aria-hidden />
            {t.review.forecastWaitingKey}
          </p>
        )}
        <p className="field-hint" style={{ marginTop: 12 }}>
          {cap !== undefined && `${t.review.forecastCap(cap)} `}
          {t.review.forecastNote}
        </p>
      </div>
    </Sheet>
  );
}
