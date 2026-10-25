import { describe, expect, it } from 'vitest';
import { LOGO_URLS, LOGOS, parseLogo } from './logo';

describe('logo', () => {
  it('reads the saved icon, and falls back to the grid for anything it does not know', () => {
    for (const id of LOGOS) expect(parseLogo(id)).toBe(id);
    expect(parseLogo(null)).toBe('grid');
    expect(parseLogo('rocket')).toBe('grid');
  });

  it('has a file for every icon, and the grid is the original favicon', () => {
    expect(LOGO_URLS.grid).toBe('./favicon.svg');
    // 小的 svg 打包時會直接內嵌成 data URL
    for (const id of LOGOS) expect(LOGO_URLS[id]).toMatch(/\.svg$|^data:image\/svg\+xml/);
    expect(new Set(Object.values(LOGO_URLS)).size).toBe(LOGOS.length);
  });
});
