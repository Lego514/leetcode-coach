import { expect, test } from '@playwright/test';

// 設定裡可以換 App 的圖示：側邊欄的 logo 和瀏覽器分頁的小圖示跟著換，重新整理後還記得。
// 側邊欄只在桌面版出現
test('lets me pick the app icon for the sidebar and the browser tab', { tag: '@desktop' }, async ({ page }) => {
  await page.goto('/#/settings');
  const icons = page.getByRole('group', { name: 'Icon' });
  await expect(icons.getByRole('button')).toHaveText(['Grid', 'Grid tree', 'Sprout', 'Acorn']);
  // 預設是原本的方格
  await expect(icons.getByRole('button', { name: 'Grid', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const wordmark = page.getByRole('navigation', { name: 'Main' }).locator('.wordmark');
  await expect(wordmark.locator('.wordmark-glyph')).toBeVisible();

  await icons.getByRole('button', { name: 'Acorn' }).click();
  await expect(icons.getByRole('button', { name: 'Acorn' })).toHaveAttribute('aria-pressed', 'true');
  await expect(wordmark.locator('img[data-logo="acorn"]')).toBeVisible();
  const favicon = page.locator('link[rel="icon"]');
  await expect(favicon).not.toHaveAttribute('href', './favicon.svg');

  // 重新整理後還是橡實
  await page.reload();
  await expect(wordmark.locator('img[data-logo="acorn"]')).toBeVisible();
  await expect(favicon).not.toHaveAttribute('href', './favicon.svg');

  // 換回方格
  await page.getByRole('group', { name: 'Icon' }).getByRole('button', { name: 'Grid', exact: true }).click();
  await expect(wordmark.locator('.wordmark-glyph')).toBeVisible();
  await expect(favicon).toHaveAttribute('href', './favicon.svg');
});
