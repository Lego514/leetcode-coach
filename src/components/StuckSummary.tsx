import { Link } from 'react-router';
import type { StuckReason } from '../../shared/constants';
import { getPattern } from '../data/patterns';
import { useI18n } from '../i18n';
import type { StuckSummary as Summary } from '../lib/stuck';
import { Sheet } from './ui';

/** 每種卡住原因去哪裡練 */
const PRACTICE_LINKS: Record<StuckReason, string> = {
  pattern: '/cards',
  optimize: '/patterns',
  implement: '/patterns',
  edge: '/mock',
  bug: '/board',
  time: '/mock',
};

/** 進度頁：最近最常卡在哪、在哪些模式卡住、怎麼練 */
export function StuckSummary({ attempts, reasons, days }: { attempts: number; reasons: Summary[]; days: number }) {
  const { t, locale } = useI18n();
  const s = t.stuck;
  const top = reasons[0]?.count ?? 1;
  return (
    <Sheet title={s.title} id="stuck" note={attempts > 0 ? s.note(days, attempts) : undefined}>
      {reasons.length === 0 ? (
        <p className="sheet-empty">{s.empty}</p>
      ) : (
        <ol className="sheet-body stuck-list">
          {reasons.map(({ reason, count, patterns }) => (
            <li key={reason}>
              <div className="stuck-row">
                <span className="stuck-name">{s.reasons[reason].name}</span>
                <span className="stuck-bar" aria-hidden>
                  <span style={{ width: `${(count / top) * 100}%` }} />
                </span>
                <span className="stuck-count">{s.count(count)}</span>
              </div>
              {patterns.length > 0 && (
                <p className="sheet-note">{s.mostIn(patterns.map((p) => getPattern(p.pattern, locale).name).join(s.joiner))}</p>
              )}
              <p className="stuck-tip">
                {s.reasons[reason].tip} <Link to={PRACTICE_LINKS[reason]}>{s.reasons[reason].action}</Link>
              </p>
            </li>
          ))}
        </ol>
      )}
    </Sheet>
  );
}
