import { useI18n } from '../i18n';
import { useResolvedTheme } from '../lib/theme';

/** 深色模式的快速切換，放在語言切換旁邊；「跟隨系統」在設定頁 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const { resolved, toggle } = useResolvedTheme();
  const dark = resolved === 'dark';
  return (
    <button
      type="button"
      className={compact ? 'theme-toggle theme-toggle-compact' : 'theme-toggle'}
      aria-label={t.common.darkMode}
      aria-pressed={dark}
      title={dark ? t.common.toLight : t.common.toDark}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dark ? (
          // 深色時顯示太陽：按下去換成淺色
          <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  );
}
