import { expect, test } from '@playwright/test';

// 空白和做完的時候的小插畫，和題目頁、模板卡上跟演算法樹同一套的小圖

test('shows a picture where a page is still empty', async ({ page }) => {
  // 還沒有要複習的題目：澆水壺放在一旁
  await page.goto('/#/review');
  await expect(page.getByRole('heading', { name: 'Nothing to review right now' })).toBeVisible();
  await expect(page.locator('.sheet-empty-art [data-spot="watering"]')).toBeVisible();

  // 還沒有故事、還沒有題目白板
  await page.goto('/#/stories');
  await expect(page.locator('[data-spot="notebook"]')).toBeVisible();
  await page.goto('/#/board');
  await expect(page.locator('[data-spot="easel"]')).toBeVisible();

  // 找不到頁面：還沒長出來的樹和問號路標
  await page.goto('/#/no-such-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.locator('[data-spot="lost"]')).toBeVisible();

  // 登入前：電腦和手機上同一棵樹
  await page.goto('/#/account');
  await expect(page.locator('.account-intro [data-spot="sync"]')).toBeVisible();
});

test('shows where a problem is on the tree, and each pattern’s level as the tree draws it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();

  // 自己解出的題目是一片葉子；上次看了提示的是小芽
  await page.goto('/#/problems/1');
  const schedule = page.locator('.sheet').filter({ has: page.locator('#schedule') });
  await expect(schedule).toContainText('On your tree');
  await expect(schedule.locator('.node-icon .algo-leaf')).toBeVisible();
  await page.goto('/#/problems/153');
  await expect(schedule.locator('.node-icon .algo-sprout')).toBeVisible();

  // 模板卡：做過的題型有小圖，還沒開始的是藍圖的一個點
  await page.goto('/#/patterns');
  await expect(page.getByRole('link', { name: /^Arrays & Hashing/ }).locator('.pattern-art')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Bit Manipulation/ }).locator('.pattern-art .algo-bud')).toBeVisible();
});
