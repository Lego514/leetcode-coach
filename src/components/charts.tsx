import { useState } from 'react';
import { addDays, formatDay, parseDay, startOfWeek, type Day } from '../lib/dates';
import type { WeekCount } from '../lib/stats';

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
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="最近 12 週每週練習次數的長條圖，數值請見下方表格">
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-axis" x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {t}
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
                aria-label={`${formatDay(w.start, false)} 那週：${w.count} 次`}
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
                  {i === last ? '本週' : formatDay(w.start, false)}
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
          <strong>{weeks[active].count} 次</strong>
          {formatDay(weeks[active].start, false)} 起的一週
        </div>
      )}
      <details className="table-toggle">
        <summary>顯示數據表</summary>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">週（週一開始）</th>
              <th scope="col" className="num">
                練習次數
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.start}>
                <td>{formatDay(w.start)}</td>
                <td className="num">{w.count}</td>
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

export function ActivityCalendar({ counts, today, weeks = 18 }: { counts: Map<Day, number>; today: Day; weeks?: number }) {
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)),
  );

  return (
    <div className="calendar" aria-hidden>
      {columns.map((days) => (
        <div key={days[0]} className="calendar-week">
          {days.map((day) => {
            const count = counts.get(day) ?? 0;
            const future = day > today;
            const date = parseDay(day);
            return (
              <span
                key={day}
                className="cell"
                data-level={activityLevel(count)}
                data-future={future}
                title={future ? undefined : `${date.getMonth() + 1}/${date.getDate()}：${count} 次`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
