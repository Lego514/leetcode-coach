import { expect, test } from '@playwright/test';

test.describe('with a Chinese browser', () => {
  test.use({ locale: 'zh-TW' });

  test('starts in Traditional Chinese', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: '今天' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant-TW');
    await expect(page).toHaveTitle('刷題教練');
  });
});

test('switches language and remembers the choice', { tag: '@desktop' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();

  await page.getByRole('button', { name: '中', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: '今天' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant-TW');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: '今天' })).toBeVisible();

  // 模板卡與提示內容也跟著切換
  await page.goto('/#/patterns/two-pointers');
  await expect(page.getByRole('heading', { level: 1, name: /雙指標/ })).toBeVisible();
  await page.goto('/#/settings');
  await page.getByRole('region', { name: '語言與外觀' }).getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await page.goto('/#/patterns/two-pointers');
  await expect(page.getByRole('heading', { level: 1, name: 'Two Pointers' })).toBeVisible();
});
