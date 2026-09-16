import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'leetcode-coach:theme';

function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(choice: ThemeChoice = readTheme()): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
}

/** 外觀偏好只是個人便利設定，放在 localStorage 即可 */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [theme, setThemeState] = useState<ThemeChoice>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((choice: ThemeChoice) => {
    try {
      if (choice === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      // 無法儲存時仍然套用到這次的畫面
    }
    setThemeState(choice);
  }, []);

  return [theme, setTheme];
}
