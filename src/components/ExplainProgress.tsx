import { useMemo } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../i18n';
import { bold, rich } from '../i18n/rich';
import { explainProgress, explainSessions } from '../lib/explainProgress';
import type { MockRecord } from '../store/db';
import { ExplainChart } from './charts';
import { Sheet } from './ui';

// 進度頁的「講解能力」：每一次講解的分數畫成曲線，五個重點各講到幾成、最常漏掉哪一個，
// 加上自評講得順不順和面試官追問答得怎麼樣。講解是面試最需要練的部分，看得到進步才練得下去

const WINDOW = 5;

const pct = (v: number) => Math.round(v * 100);

export function ExplainProgressSheet({ mocks }: { mocks: readonly MockRecord[] }) {
  const { t } = useI18n();
  const e = t.explainProgress;
  const result = useMemo(() => explainProgress(explainSessions(mocks), WINDOW), [mocks]);
  const full = mocks.filter((m) => m.kind === 'full').length;
  const drills = mocks.filter((m) => m.kind === 'explain').length;
  const shown = Math.min(WINDOW, result.sessions.length);
  const { smooth, followUps } = result;

  return (
    <Sheet title={e.title} id="explain-progress" note={e.note}>
      <div className="sheet-body explain-progress">
        <p className="inline-stats">
          <span>{rich(t.progress.mockFull(full), { b: bold })}</span>
          <span>{rich(e.drills(drills), { b: bold })}</span>
          <Link to="/mock?kind=explain">{e.start}</Link>
        </p>
        {result.recent === null ? (
          <p className="sheet-note">{e.empty}</p>
        ) : (
          <>
            <p className="explain-score">
              <strong>{pct(result.recent)}%</strong>
              <span>
                {e.recent(shown)}
                {result.previous !== null && e.previous(pct(result.previous))}
              </span>
            </p>
            <ExplainChart sessions={result.sessions} rolling={result.rolling} />

            <h3 className="readiness-subtitle">{e.pointsTitle(shown)}</h3>
            <div className="difficulty-bars explain-points">
              {result.points.map((p) => {
                const now = pct(p.recent ?? 0);
                const diff = p.previous === null ? null : now - pct(p.previous);
                return (
                  <div key={p.id} className="meter-row" data-weakest={p.id === result.weakest || undefined}>
                    <span>{e.points[p.id]}</span>
                    <div className="meter" role="meter" aria-label={e.pointLabel(e.points[p.id])} aria-valuemin={0} aria-valuemax={100} aria-valuenow={now}>
                      <div className="meter-fill" style={{ width: `${now}%` }} />
                    </div>
                    <span className="meter-value">
                      {now}%
                      {diff !== null && diff !== 0 && (
                        <span className="explain-delta" data-up={diff > 0 || undefined}>
                          {e.delta(diff)}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {result.weakest && <p className="explain-tip">{e.weakest(e.points[result.weakest])}</p>}
            {smooth.recentOf > 0 && <p>{e.smooth(smooth.recent, smooth.recentOf, smooth.previous, smooth.previousOf)}</p>}
            {followUps.count > 0 && followUps.recent !== null && (
              <p>
                {e.followUps(pct(followUps.recent), followUps.count)}
                {followUps.weakestKind && e.hardestKind(t.followUp.kinds[followUps.weakestKind])}
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
