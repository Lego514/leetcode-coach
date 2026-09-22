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

/** 沒選過語言時用英文：面試用英文，介面也跟著用英文練習 */
export const DEFAULT_LOCALE: Locale = 'en';

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

/** 這台裝置選過的語言；沒選過就是英文，不看瀏覽器的語言設定 */
export function initialLocale(): Locale {
  return readStoredLocale() ?? DEFAULT_LOCALE;
}
