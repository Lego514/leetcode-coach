import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HINTS } from '../data/hints';
import { HINTS_EN } from '../data/hints.en';
import { getPatterns } from '../data/patterns';
import { BUILTIN_PROBLEMS } from '../data/problems';
import { ValidationError } from '../store/actions';
import { validationMessage } from './errors';
import { createFormatters } from './format';
import { detectLocale } from './locale';
import en from './messages/en';
import zhTW from './messages/zh-TW';
import { bold, rich } from './rich';

// 中日韓文字與全形標點；用字元碼組出範圍，原始碼裡才不會出現全形空白
const range = (from: number, to: number) => `${String.fromCharCode(from)}-${String.fromCharCode(to)}`;
const CJK = new RegExp(`[${range(0x3000, 0x303f)}${range(0x4e00, 0x9fff)}${range(0xff00, 0xffef)}]`);

/** 把字典攤平成字串；函式用幾組假參數呼叫，檢查產生的句子 */
function collectStrings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    return [1, 2, 0, -3].flatMap((n) =>
      [true, false].flatMap((flag) => {
        const args = Array.from({ length: fn.length }, (_, i) => (i % 2 === 0 ? n : flag));
        return collectStrings(fn(...args), `${path}()`);
      }),
    );
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => collectStrings(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => collectStrings(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe('detectLocale', () => {
  it('follows the first Chinese or English preference', () => {
    expect(detectLocale(['zh-TW', 'en-US'])).toBe('zh-TW');
    expect(detectLocale(['zh-CN'])).toBe('zh-TW');
    expect(detectLocale(['en-US', 'zh-TW'])).toBe('en');
    expect(detectLocale(['ja', 'zh-HK'])).toBe('zh-TW');
    expect(detectLocale(['fr'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });
});

describe('rich', () => {
  it('turns tags into elements and keeps the surrounding text', () => {
    const html = renderToStaticMarkup(
      <>{rich('Go <link>sign in</link> and <b>sync</b>.', { link: (text) => <a href="#/">{text}</a>, b: bold })}</>,
    );
    expect(html).toBe('Go <a href="#/">sign in</a> and <strong>sync</strong>.');
  });

  it('prints unknown tags as plain text', () => {
    expect(renderToStaticMarkup(<>{rich('a <x>b</x> c', {})}</>)).toBe('a b c');
  });
});

describe('formatters', () => {
  it('formats days in each language', () => {
    const zh = createFormatters('zh-TW');
    const english = createFormatters('en');
    expect(zh.day('2026-09-16')).toBe('9/16（三）');
    expect(zh.day('2026-09-16', false)).toBe('9/16');
    expect(zh.fullDay('2026-09-16')).toBe('2026 年 9 月 16 日（三）');
    expect(english.day('2026-09-16')).toBe('Wed, Sep 16');
    expect(english.day('2026-09-16', false)).toBe('Sep 16');
    expect(english.fullDay('2026-09-16')).toBe('Wednesday, September 16, 2026');
  });
});

describe('dictionaries', () => {
  it('has no empty strings', () => {
    for (const dict of [zhTW, en]) {
      const empty = collectStrings(dict).filter(
        ([path, text]) => text.trim() === '' && !path.startsWith('progress.unit'),
      );
      expect(empty).toEqual([]);
    }
  });

  it('keeps Chinese out of the English dictionary', () => {
    expect(collectStrings(en).filter(([, text]) => CJK.test(text))).toEqual([]);
  });

  it('fills in the problem number for validation errors', () => {
    const err = new ValidationError('builtin_exists', 15);
    expect(validationMessage(en, err)).toContain('15');
    expect(validationMessage(zhTW, err)).toContain('15');
    expect(validationMessage(en, err)).not.toContain('{id}');
  });
});

describe('English content', () => {
  it('has an English hint for every built-in hint', () => {
    expect(Object.keys(HINTS_EN).sort()).toEqual(Object.keys(HINTS).sort());
    for (const problem of BUILTIN_PROBLEMS) expect(HINTS_EN[problem.id], `hint ${problem.id}`).toBeTruthy();
    expect(Object.values(HINTS_EN).filter((hint) => CJK.test(hint))).toEqual([]);
  });

  it('translates every pattern card', () => {
    const zh = getPatterns('zh-TW');
    const english = getPatterns('en');
    expect(english.map((p) => p.id)).toEqual(zh.map((p) => p.id));
    for (const pattern of english) {
      expect(collectStrings(pattern).filter(([, text]) => CJK.test(text)), pattern.id).toEqual([]);
    }
  });
});

describe('source code', () => {
  // 介面文字都要放在字典；註解不算
  it('has no hard-coded Chinese outside the dictionaries', () => {
    const files = import.meta.glob<string>(
      ['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../i18n/**', '!../data/**', '!../test/**'],
      { query: '?raw', import: 'default', eager: true },
    );
    expect(Object.keys(files).length).toBeGreaterThan(20);
    const offenders: string[] = [];
    for (const [path, source] of Object.entries(files)) {
      const code = source
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      code.split('\n').forEach((line, i) => {
        if (CJK.test(line)) offenders.push(`${path}:${i + 1} ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
