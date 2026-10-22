import { expect, test } from '@playwright/test';

// 演算法樹：今天頁的小樹和摘要，進度頁的完整樹（點葉子看是哪一題）
test('grows the algorithm tree from practice, small on Today and in full on Progress', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();

  const card = page.getByRole('region', { name: 'My algorithm tree' });
  await expect(card).toContainText(/\d+ problems solvable now/);
  await expect(card.getByRole('img', { name: /^Algorithm tree: \d+ of 150 problems solvable now$/ })).toBeVisible();
  // 小樹沒有題型名稱，也不能點葉子
  await expect(card.locator('.algo-label')).toHaveCount(0);
  await card.getByRole('link', { name: 'See the whole tree' }).last().click();

  const tree = page.getByRole('region', { name: 'Algorithm tree' });
  await expect(tree).toBeVisible();
  await expect(tree.locator('.algo-label')).toContainText(['Arrays & Hashing']);
  // 示範資料做過的題目長了葉子，征服的結了果實，還沒做的是虛線上的小點
  expect(await tree.locator('.algo-leaf').count()).toBeGreaterThan(10);
  expect(await tree.locator('.algo-fruit').count()).toBeGreaterThan(0);
  expect(await tree.locator('.algo-bud').count()).toBeGreaterThan(100);

  await expect(tree).toContainText('Tap a leaf, fruit, or sprout to see which problem it is.');
  await tree.locator('.algo-fruit').first().dispatchEvent('click');
  await expect(tree).toContainText('You conquered this one, so it bears fruit.');
  await expect(tree.locator('.algo-info a')).toHaveAttribute('href', /#\/problems\/\d+$/);

  await tree.locator('.algo-bud').first().dispatchEvent('click');
  await expect(tree).toContainText('Not done yet.');
});
