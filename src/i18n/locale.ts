export const LOCALES = ['zh-TW', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** 語言選單裡用各語言自己的名稱 */
export const LOCALE_NAMES: Record<Locale, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
};

/** 側邊欄空間小，用縮寫 */
export const LOCALE_SHORT_NAMES: Record<Locale, string> = {
  'zh-TW': '中',
  en: 'EN',
};

/** <html lang> 的值 */
export const HTML_LANG: Record<Locale, string> = {
  'zh-TW': 'zh-Hant-TW',
  en: 'en',
};

const STORAGE_KEY = 'leetcode-coach:locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** 依瀏覽器偏好順序，第一個中文或英文決定介面語言；都沒有就用英文 */
export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const code = lang.toLowerCase();
    if (code.startsWith('zh')) return 'zh-TW';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

export function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // 存不了就只套用在這次的畫面
  }
}

export function initialLocale(): Locale {
  const stored = readStoredLocale();
  if (stored) return stored;
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  return detectLocale(languages.filter(Boolean));
}
