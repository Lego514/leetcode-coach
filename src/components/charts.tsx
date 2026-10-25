import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { addDays, startOfWeek, type Day } from '../lib/dates';
import type { ExplainSession } from '../lib/explainProgress';
import { monthBlocks, type WeekCount } from '../lib/stats';

const WIDTH = 640;
const HEIGHT = 200;
const PAD = { top: 20, right: 8, bottom: 26, left: 32 };
const BAR_MAX = 24;
const RADIUS = 4;

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const step = value <= 10 ? 2 : value <= 25 ? 5 : value <= 50 ? 10 : 20;
  return Math.ceil(value / step) * step;
}

/** 只有頂端是圓角，底部貼齊基線 */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(RADIUS, h, w / 2);
  const bottom = y + h;
  return `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${bottom}Z`;
}

export function WeeklyChart({ weeks }: { weeks: WeekCount[] }) {
  const { t, fmt } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...weeks.map((w) => w.count)));
  const ticks = [0, max / 2, max];
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / weeks.length;
  const barW = Math.min(BAR_MAX, band * 0.6);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const peak = weeks.reduce((best, w, i) => (w.count > weeks[best].count ? i : best), 0);
  const last = weeks.length - 1;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t.charts.weeklyLabel}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="chart-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className="chart-axis" x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {tick}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const cx = PAD.left + band * i + band / 2;
          const top = y(w.count);
          const showLabel = w.count > 0 && (i === last || i === peak);
          const showAxis = i % 2 === last % 2;
          return (
            <g key={w.start}>
              <rect
                className="chart-hit"
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                tabIndex={0}
                aria-label={t.charts.weekBar(fmt.day(w.start, false), w.count)}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
              <path
                className={i === last ? 'chart-bar chart-bar-current' : 'chart-bar'}
                d={barPath(cx - barW / 2, top, barW, PAD.top + plotH - top)}
                opacity={active === null || active === i ? 1 : 0.55}
                pointerEvents="none"
              />
              {showLabel && (
                <text className="chart-value" x={cx} y={top - 6} textAnchor="middle" pointerEvents="none">
                  {w.count}
                </text>
              )}
              {showAxis && (
                <text className="chart-axis" x={cx} y={HEIGHT - 8} textAnchor="middle">
                  {i === last ? t.date.thisWeek : fmt.day(w.start, false)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {active !== null && (
        <div
          className="tooltip"
          style={{
            left: `${((PAD.left + band * active + band / 2) / WIDTH) * 100}%`,
            top: `${(y(weeks[active].count) / HEIGHT) * 100}%`,
          }}
        >
          <strong>{t.charts.count(weeks[active].count)}</strong>
          {t.charts.weekOf(fmt.day(weeks[active].start, false))}
        </div>
      )}
      <details className="table-toggle">
        <summary>{t.charts.showTable}</summary>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{t.charts.weekColumn}</th>
              <th scope="col" className="num">
                {t.charts.countColumn}
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.start}>
                <td>{fmt.day(w.start)}</td>
                <td className="num">{w.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

const EXPLAIN_PAD = { top: 16, right: 16, bottom: 26, left: 44 };

/**
 * 講解分數的變化：每一次講解一個點（AI 評的實心、自己勾的空心），
 * 加上一條最近三次平均的線，看得出是不是越講越好
 */
export function ExplainChart({ sessions, rolling }: { sessions: readonly ExplainSession[]; rolling: readonly number[] }) {
  const { t, fmt } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  const plotW = WIDTH - EXPLAIN_PAD.left - EXPLAIN_PAD.right;
  const plotH = HEIGHT - EXPLAIN_PAD.top - EXPLAIN_PAD.bottom;
  const n = sessions.length;
  const step = n > 1 ? (plotW - 24) / (n - 1) : plotW;
  const x = (i: number) => EXPLAIN_PAD.left + (n > 1 ? 12 + step * i : plotW / 2);
  const y = (v: number) => EXPLAIN_PAD.top + plotH - v * plotH;
  const pct = (v: number) => Math.round(v * 100);
  // 日期最多標六個，最後一次一定標
  const every = Math.max(1, Math.ceil(n / 6));
  const line = rolling.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t.charts.explainLabel(n)}>
        {[0, 0.5, 1].map((tick) => (
          <g key={tick}>
            <line className="chart-grid" x1={EXPLAIN_PAD.left} x2={WIDTH - EXPLAIN_PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className="chart-axis" x={EXPLAIN_PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {pct(tick)}%
            </text>
          </g>
        ))}
        {n > 1 && <path className="chart-line" d={line} />}
        {sessions.map((s, i) => (
          <g key={i}>
            <rect
              className="chart-hit"
              x={x(i) - Math.min(step, 48) / 2}
              y={EXPLAIN_PAD.top}
              width={Math.min(step, 48)}
              height={plotH}
              tabIndex={0}
              aria-label={t.charts.explainPoint(fmt.day(s.day, false), pct(s.score), t.charts.explainSource[s.source])}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
            <circle
              className="chart-dot"
              data-source={s.source}
              cx={x(i)}
              cy={y(s.score)}
              r={active === i ? 6 : 4.5}
              pointerEvents="none"
            />
            {i % every === (n - 1) % every && (
              <text className="chart-axis" x={x(i)} y={HEIGHT - 8} textAnchor="middle">
                {fmt.day(s.day, false)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {active !== null && (
        <div className="tooltip" style={{ left: `${(x(active) / WIDTH) * 100}%`, top: `${(y(sessions[active].score) / HEIGHT) * 100}%` }}>
          <strong>{pct(sessions[active].score)}%</strong>
          {fmt.day(sessions[active].day, false)} · {t.charts.explainSource[sessions[active].source]}
        </div>
      )}
      <ul className="chart-legend" aria-hidden>
        <li>
          <span className="chart-key" data-source="ai" />
          {t.charts.explainSource.ai}
        </li>
        <li>
          <span className="chart-key" data-source="self" />
          {t.charts.explainSource.self}
        </li>
        <li>
          <span className="chart-key chart-key-line" />
          {t.charts.explainAverage}
        </li>
      </ul>
      <details className="table-toggle">
        <summary>{t.charts.showTable}</summary>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{t.charts.dayColumn}</th>
              <th scope="col" className="num">
                {t.charts.scoreColumn}
              </th>
              <th scope="col">{t.charts.sourceColumn}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={i}>
                <td>{fmt.day(s.day)}</td>
                <td className="num">{pct(s.score)}%</td>
                <td>{t.charts.explainSource[s.source]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function activityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

interface ActivityHeatmapProps {
  /** 每天練習了幾次題目 */
  counts: ReadonlyMap<Day, number>;
  /** 有做微複習的日子；沒練題目的話用最淺的顏色，連續天數也算進去 */
  cardDays: ReadonlySet<Day>;
  today: Day;
  weeks?: number;
}

/** 一年的練習熱度圖：每格一天，一欄一週，練越多題顏色越深；跟 LeetCode 一樣照月份分塊 */
export function ActivityHeatmap({ counts, cardDays, today, weeks = 53 }: ActivityHeatmapProps) {
  const { t, fmt } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  const blocks = monthBlocks(first, today);

  // 手機放不下一整年，一打開就捲到最近幾週
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <div className="heatmap">
      <div className="heatmap-scroll" ref={scrollRef}>
        <div className="heatmap-grid" aria-hidden>
          {blocks.map((block) => (
            <div key={block.first} className="heatmap-block" style={{ flexGrow: block.weeks.length }}>
              <div className="heatmap-days" style={{ gridTemplateColumns: `repeat(${block.weeks.length}, minmax(0, 1fr))` }}>
                {block.weeks.map((days, w) =>
                  days.map((day, d) => {
                    // 依星期排：欄是週、列是星期幾
                    const place = { gridColumn: w + 1, gridRow: d + 1 };
                    if (!day) return <span key={`${w}-${d}`} className="cell-gap" style={place} />;
                    const count = counts.get(day) ?? 0;
                    const cardsOnly = count === 0 && cardDays.has(day);
                    return (
                      <span
                        key={day}
                        className="cell"
                        style={place}
                        data-level={cardsOnly ? 1 : activityLevel(count)}
                        title={cardsOnly ? t.charts.dayCards(fmt.day(day, false)) : t.charts.dayCell(fmt.day(day, false), count)}
                      />
                    );
                  }),
                )}
              </div>
              {/* 範圍開頭只剩一週的月份放不下名字 */}
              <span className="heatmap-month">{block.weeks.length > 1 && <span>{fmt.month(block.first)}</span>}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend" aria-hidden>
        <span>{t.charts.less}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className="cell" data-level={level} />
        ))}
        <span>{t.charts.more}</span>
      </div>
    </div>
  );
}
