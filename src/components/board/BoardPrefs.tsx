import type { HeaderMenuItem } from 'dsa-whiteboard';
import { setLocale, useI18n } from '../../i18n';
import { HTML_LANG, LOCALE_NAMES, LOCALE_SHORT_NAMES, LOCALES } from '../../i18n/locale';
import { useResolvedTheme } from '../../lib/theme';

/**
 * 白板標題列上的語言和深淺色切換（寬的畫面是一排小按鈕，手機上收進白板的「⋯」選單）。
 * 白板是全螢幕的，看不到側邊欄；收到共用連結的人一打開就在白板裡，不知道要去哪裡換，所以直接放在這裡。
 * 改的是整個 App 的設定（跟側邊欄、設定頁共用同一份），關掉白板後也維持。
 */
export function useBoardPrefs(): HeaderMenuItem[] {
  const { t, locale } = useI18n();
  const { resolved, toggle } = useResolvedTheme();
  const other = LOCALES.find((id) => id !== locale) ?? locale;
  const dark = resolved === 'dark';
  return [
    // 寫的是要換成的語言，跟獨立網站的白板一樣
    { label: LOCALE_NAMES[other], icon: LOCALE_SHORT_NAMES[other], lang: HTML_LANG[other], onSelect: () => setLocale(other) },
    { label: dark ? t.common.toLight : t.common.toDark, icon: dark ? SUN_ICON : MOON_ICON, onSelect: toggle },
  ];
}

// 深色時顯示太陽：按下去換成淺色
const SUN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);

const MOON_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);
