import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 網址貼到 LinkedIn、Slack 時的預覽卡片：index.html 的 og 標籤，圖在 public/og.png
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function meta(property: string): string | undefined {
  const match = html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`));
  return match?.[1];
}

describe('share preview', () => {
  it('has a title, description and large image card', () => {
    expect(meta('og:title')).toBe('LeetCode Coach');
    expect(meta('og:description')?.length).toBeGreaterThan(40);
    expect(meta('twitter:card')).toBe('summary_large_image');
  });

  it('points the image at an absolute URL that exists in public/', () => {
    const image = meta('og:image');
    expect(image).toMatch(/^https:\/\/[^/]+\/og\.png$/);
    expect(statSync(new URL('../public/og.png', import.meta.url)).size).toBeGreaterThan(10_000);
  });
});
