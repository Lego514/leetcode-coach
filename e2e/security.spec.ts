import { expect, test } from '@playwright/test';

// 網頁的安全標頭和 Content-Security-Policy（src/lib/csp.ts、shared/securityHeaders.ts）：
// 規則有效，而且 App 自己的每一頁都不會被它擋到

declare global {
  interface Window {
    cspViolations: string[];
  }
}

const PAGES = [
  '#/',
  '#/problems',
  '#/problems/1',
  '#/practice/1',
  '#/review',
  '#/mock',
  '#/board/1',
  '#/board/206?view=reference',
  '#/cards',
  '#/stories',
  '#/patterns',
  '#/progress',
  '#/settings',
  '#/account',
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.cspViolations.push(`${event.effectiveDirective} ${event.blockedURI}`);
    });
  });
});

test('the page is served with security headers and a strict script policy', async ({ page }) => {
  const res = await page.goto('/');
  const headers = res!.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['content-security-policy']).toBe("frame-ancestors 'none'");

  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(policy).toContain("script-src 'self';");

  // 別人塞進頁面的 inline script 不會執行
  const ran = await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.injected = true';
    document.body.append(script);
    return (window as Window & { injected?: boolean }).injected === true;
  });
  expect(ran).toBe(false);
  await expect.poll(() => page.evaluate(() => window.cspViolations)).toContainEqual(expect.stringMatching(/^script-src-elem inline/));
});

test('no page of the app is blocked by the policy', async ({ page }) => {
  await page.goto('/?demo');
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();
  for (const hash of PAGES) {
    await page.goto(`/${hash}`);
    await expect(page.locator('main')).toBeVisible();
    // 延遲載入的畫面（白板、參考板書）也要載完；換頁可能重新載入，所以每一頁都檢查
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => window.cspViolations), hash).toEqual([]);
  }
});
