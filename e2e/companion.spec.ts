import { expect, test } from '@playwright/test';

// 陪刷題的卡皮巴拉：今天卡的樹下面有一隻，還沒練習在打瞌睡、練了很開心；
// 收集到頭上的道具會慶祝，進度頁可以換著戴

test('dozes until I practice, then collects head items I can wear', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('region', { name: 'Today’s goal' });
  const capybara = card.locator('svg.capybara');
  await expect(capybara).toHaveAttribute('data-stage', 'baby');
  await expect(capybara).toHaveAttribute('data-mood', 'sleepy');

  // 第一次練習：練習了一天（柚子）、自己解出（小芽），一次收集到兩個，放在同一則慶祝訊息
  await page.goto('/#/practice/1');
  await page.getByRole('group', { name: 'While solving' }).getByRole('button', { name: 'I’m done' }).click();
  await page.getByRole('region', { name: 'Record this attempt' }).getByRole('button', { name: 'Save', exact: true }).click();
  const items = page.locator('.toast-win').filter({ hasText: 'New head items: Yuzu and Sprout!' });
  await expect(items).toBeVisible();
  await expect(items.locator('svg[data-item="yuzu"]')).toBeVisible();
  await expect(items.locator('svg[data-item="sprout"]')).toBeVisible();
  // 「已儲存」沒有被擠掉
  await expect(page.getByRole('status')).toContainText('Saved. Next review');

  // 今天練習了：很開心，戴著第一個收集到的柚子
  await page.goto('/');
  await expect(capybara).toHaveAttribute('data-mood', 'happy');
  await expect(capybara).toHaveAttribute('data-item', 'yuzu');

  // 進度頁：收藏 2 / 10，還沒收集到的寫著還差多少
  await page.goto('/#/progress');
  const sheet = page.getByRole('region', { name: 'Capybara' });
  await expect(sheet).toContainText('Baby capybara');
  await expect(sheet).toContainText('1 day of practice together. 6 more days to reach “Young capybara”');
  await expect(sheet).toContainText('Head items 2 / 10');
  await expect(sheet.getByRole('button', { name: /^Yuzu/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.locator('[data-locked]').filter({ hasText: 'Beanie' })).toContainText('1 / 7');

  // 換戴小芽，今天卡也跟著換；什麼都不戴就沒有
  await sheet.getByRole('button', { name: /^Sprout/ }).click();
  await expect(sheet.getByRole('button', { name: /^Sprout/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.locator('svg.capybara')).toHaveAttribute('data-item', 'sprout');
  await page.goto('/');
  await expect(capybara).toHaveAttribute('data-item', 'sprout');
  await page.goto('/#/progress');
  await sheet.getByRole('button', { name: 'Wear nothing' }).click();
  await expect(sheet.locator('svg.capybara')).not.toHaveAttribute('data-item');
});

test('loading demo data collects items quietly instead of celebrating each one', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();
  await expect(page.locator('.toast-win')).toHaveCount(0);

  await page.goto('/#/progress');
  const sheet = page.getByRole('region', { name: 'Capybara' });
  await expect(sheet.locator('svg.capybara')).toHaveAttribute('data-stage', 'grown');
  await expect(sheet).toContainText('Grown-up capybara');
  await expect(sheet).toContainText('Head items 6 / 10');
  // 講解練習 8 次，耳機還差 2 次
  await expect(sheet.locator('[data-locked]').filter({ hasText: 'Headphones' })).toContainText('8 / 10');
});
