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
  expect(policy).toContain("script-src 'self' https://static.cloudflareinsights.com;");

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

// Cloudflare 送網頁時會在 HTML 裡加流量統計的 <script src>；這裡用假的程式代替，確認它跑得起來、回報得出去，
// 別的網站的程式照樣被擋
test('Cloudflare analytics can run and report, other sites still cannot', async ({ page }) => {
  let reported = false;
  await page.route('https://static.cloudflareinsights.com/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: "window.analyticsRan = true; fetch('https://cloudflareinsights.com/cdn-cgi/rum', { method: 'POST', mode: 'no-cors', body: '{}' });",
    }),
  );
  await page.route('https://cloudflareinsights.com/**', (route) => {
    reported = true;
    return route.fulfill({ status: 204 });
  });
  await page.route('https://evil.example/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: 'window.evilRan = true;' }),
  );
  await page.goto('/');

  await page.evaluate(() => {
    for (const src of ['https://static.cloudflareinsights.com/beacon.min.js', 'https://evil.example/x.js']) {
      const script = document.createElement('script');
      script.src = src;
      document.body.append(script);
    }
  });
  const ran = (name: string) => page.evaluate((key) => (window as unknown as Record<string, unknown>)[key] === true, name);
  await expect.poll(() => ran('analyticsRan')).toBe(true);
  await expect.poll(() => reported).toBe(true);
  await expect.poll(() => page.evaluate(() => window.cspViolations)).toContainEqual('script-src-elem https://evil.example/x.js');
  expect(await ran('evilRan')).toBe(false);
  expect(await page.evaluate(() => window.cspViolations)).toEqual(['script-src-elem https://evil.example/x.js']);
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
