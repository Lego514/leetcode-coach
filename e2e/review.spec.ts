import { expect, test } from '@playwright/test';

// 複習：每天最多複習幾題，和複習頁的「接下來的題目」清單。用示範資料（有好幾題到期）
test('caps reviews per day, lists what is next, and lets me pick one or do more', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();
  const dueList = page.getByRole('region', { name: /^Due for review/ });
  const dueCount = await dueList.getByRole('listitem').count();
  expect(dueCount).toBeGreaterThan(5);

  // 上限 5 題：今天頁只列 5 題，其他的留到之後
  await page.goto('/#/settings');
  await page.getByLabel('Most reviews per day').selectOption('5');
  await expect(page.getByLabel('Most reviews per day')).toHaveValue('5');
  await page.goto('/');
  // 示範資料今天已經複習過幾題，會先扣掉
  await expect(dueList).toContainText(/can wait/);
  const left = await dueList.getByRole('listitem').count();
  expect(left).toBeGreaterThan(2);
  expect(left).toBeLessThanOrEqual(5);

  // 複習頁：清單列出今天剩下的題目，點第三題就先做它
  await page.goto('/#/review');
  const queue = page.getByRole('region', { name: /^Up next/ });
  await expect(queue.getByRole('button')).toHaveCount(left);
  const third = queue.getByRole('button').nth(2);
  const title = (await third.locator('.review-queue-title').textContent())!.trim();
  await third.click();
  await expect(page.locator('#review-title')).toHaveText(title);

  // 做完今天的上限就停，可以再多做 5 題
  for (let i = 0; i < left; i += 1) {
    await page.getByRole('button', { name: 'Show my notes' }).click();
    await page.getByRole('button', { name: /^Solved alone/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Done with today’s 5 reviews' })).toBeVisible();
  await page.getByRole('button', { name: 'Review 5 more' }).click();
  await expect(page.locator('#review-title')).toBeVisible();
});
