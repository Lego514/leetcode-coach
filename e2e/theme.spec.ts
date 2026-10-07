import { expect, test } from '@playwright/test';

const html = (page: import('@playwright/test').Page) => page.locator('html');

test('switches dark mode from beside the language switch, in sync with Settings', async ({ page, isMobile }) => {
  // 系統是淺色
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(isMobile ? '/#/more' : '/');
  const toggle = page.getByRole('button', { name: 'Dark mode' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  // 網址列和 iPhone 狀態列也換成深色
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#0e1829');

  // 設定頁顯示同一個選擇，重新整理後也記得
  await page.goto('/#/settings');
  const appearance = page.getByRole('region', { name: 'Language & appearance' }).getByRole('group', { name: 'Theme' });
  await expect(appearance.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');

  // 再按一次回到跟隨系統
  await page.goto(isMobile ? '/#/more' : '/');
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expect(html(page)).not.toHaveAttribute('data-theme', /.+/);
  await page.goto('/#/settings');
  await expect(appearance.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
});

test('turns dark mode off when the system is dark', { tag: '@desktop' }, async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Dark mode' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // 設定頁改外觀，側邊欄的按鈕馬上跟著變
  await page.goto('/#/settings');
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'System' }).click();
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
});
