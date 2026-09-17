import { setLocale, useI18n } from '../i18n';
import { LOCALE_NAMES, LOCALE_SHORT_NAMES, LOCALES } from '../i18n/locale';

/** 語言切換：每個選項用該語言自己的名稱，按鈕標上 lang 讓螢幕閱讀器念對 */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  return (
    <div className={compact ? 'segmented segmented-compact' : 'segmented'} role="group" aria-label={t.common.languageLabel}>
      {LOCALES.map((id) => (
        <button
          key={id}
          type="button"
          lang={id === 'en' ? 'en' : 'zh-Hant'}
          title={LOCALE_NAMES[id]}
          aria-pressed={locale === id}
          onClick={() => setLocale(id)}
        >
          {compact ? LOCALE_SHORT_NAMES[id] : LOCALE_NAMES[id]}
        </button>
      ))}
    </div>
  );
}
