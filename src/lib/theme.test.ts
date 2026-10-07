import { describe, expect, it } from 'vitest';
import { resolveTheme, toggledTheme } from './theme';

describe('theme', () => {
  it('follows the system until a theme is picked', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
    expect(resolveTheme('light', 'dark')).toBe('light');
  });

  it('toggles to the opposite look, and back to following the system', () => {
    // 系統是淺色：按一下變深色，再按一下回到跟隨系統
    expect(toggledTheme('system', 'light')).toBe('dark');
    expect(toggledTheme('dark', 'light')).toBe('system');
    // 系統是深色
    expect(toggledTheme('system', 'dark')).toBe('light');
    expect(toggledTheme('light', 'dark')).toBe('system');
    // 在設定頁選了和系統一樣的外觀，再按一下就換成相反的
    expect(toggledTheme('light', 'light')).toBe('dark');
  });
});
