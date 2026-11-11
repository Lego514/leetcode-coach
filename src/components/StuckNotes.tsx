import { useI18n } from '../i18n';
import { stuckKinds } from '../lib/stuck';
import { useAttemptsFor } from '../store/queries';

/** 複習時最多列幾次：最近的幾次就夠提醒自己，太多會蓋過筆記 */
const MAX_SHOWN = 3;

/**
 * 複習頁看完自己的筆記後：以前做這題時寫的「具體卡在哪」，最新的在上面。
 * 沒寫過就不出現。選項（沒思路、邏輯／邊界…）只是分類，這裡看得到當時自己的原話
 */
export function StuckNotes({ problemId }: { problemId: number }) {
  const { t, fmt } = useI18n();
  const attempts = useAttemptsFor(problemId);
  const noted = (attempts ?? []).filter((a) => a.stuckNote).slice(0, MAX_SHOWN);
  if (noted.length === 0) return null;
  return (
    <div className="review-step">
      <h3>{t.stuck.notesTitle}</h3>
      <ul className="stuck-notes">
        {noted.map((a) => (
          <li key={a.uid}>
            <span className="stuck-notes-meta">
              <span className="history-when">{fmt.day(a.day)}</span>
              {stuckKinds(a.stuck).map((reason) => (
                <span key={reason} className="chip">
                  {t.stuck.reasons[reason].name}
                </span>
              ))}
            </span>
            <q>{a.stuckNote}</q>
          </li>
        ))}
      </ul>
    </div>
  );
}
