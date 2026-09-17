import { useSyncExternalStore } from 'react';
import { createFormatters, type Formatters } from './format';
import { HTML_LANG, initialLocale, storeLocale, type Locale } from './locale';
import en from './messages/en';
import zhTW, { type Messages } from './messages/zh-TW';

export type { Locale } from './locale';
export type { Messages } from './messages/zh-TW';

export interface I18n {
  locale: Locale;
  t: Messages;
  fmt: Formatters;
}

const BUNDLES: Record<Locale, I18n> = {
  'zh-TW': { locale: 'zh-TW', t: zhTW, fmt: createFormatters('zh-TW') },
  en: { locale: 'en', t: en, fmt: createFormatters('en') },
};

let current: Locale = initialLocale();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 讓 <html lang> 與分頁標題跟著語言 */
export function applyLocaleToDocument(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = HTML_LANG[current];
  document.title = BUNDLES[current].t.app.name;
}

export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  storeLocale(locale);
  applyLocaleToDocument();
  for (const listener of listeners) listener();
}

/** 給 React 以外的程式使用（例如離開頁面時還原標題） */
export function getI18n(): I18n {
  return BUNDLES[current];
}

/** 目前語言的文字與格式化工具；切換語言時重新渲染 */
export function useI18n(): I18n {
  const locale = useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
  return BUNDLES[locale];
}
