import { useId, type CSSProperties } from 'react';
import { useI18n } from '../i18n';
import { PIXEL_GRID, pixelDots } from '../lib/pixelIcon';
import { useResolvedTheme } from '../lib/theme';

/** 點點圖示的每一個點：位置固定算一次 */
const DOTS = pixelDots();
/** 點最多晚多久出發（毫秒）；整個圖示換完大約是這個加上一個點移動的時間 */
const MAX_LAG_MS = 180;

type DotStyle = CSSProperties & Record<'--lx' | '--ly' | '--dx' | '--dy' | '--lo' | '--do', number | string>;

/**
 * 深色模式的快速切換，放在語言切換旁邊；「跟隨系統」在設定頁。
 * 長得像一個開關：圓角的按鈕滑到另一邊，上面的太陽散成點、聚成月亮，按鈕邊緣亮起暖黃或藍色的光。
 * 點的位置都寫成 CSS 變數，深淺色由 aria-pressed 決定用哪一組，移動交給 CSS 的 transition
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const { resolved, toggle } = useResolvedTheme();
  const dark = resolved === 'dark';
  // 畫面淡入淡出時開關不跟著淡化，而是直接滑過去：每個開關要有自己的名字（側邊欄和「更多」頁可能同時在）
  const transitionName = `theme-toggle-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <button
      type="button"
      className={compact ? 'theme-toggle theme-toggle-compact' : 'theme-toggle'}
      aria-label={t.common.darkMode}
      aria-pressed={dark}
      title={dark ? t.common.toLight : t.common.toDark}
      onClick={toggle}
      style={{ viewTransitionName: transitionName }}
    >
      <span className="theme-knob" aria-hidden>
        <svg viewBox={`-0.5 -0.5 ${PIXEL_GRID} ${PIXEL_GRID}`}>
          {DOTS.map((dot, i) => {
            const style: DotStyle = {
              '--lx': `${dot.light.x}px`,
              '--ly': `${dot.light.y}px`,
              '--dx': `${dot.dark.x}px`,
              '--dy': `${dot.dark.y}px`,
              '--lo': dot.light.shown ? 1 : 0,
              '--do': dot.dark.shown ? 1 : 0,
              transitionDelay: `${Math.round(dot.lag * MAX_LAG_MS)}ms`,
            };
            return <rect key={i} className="theme-dot" x={-0.4} y={-0.4} width={0.8} height={0.8} rx={0.18} style={style} />;
          })}
        </svg>
      </span>
    </button>
  );
}
