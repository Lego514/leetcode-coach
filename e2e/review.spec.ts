import { expect, test } from '@playwright/test';

// 複習：每天最多複習幾題，和複習頁的「接下來的題目」清單。用示範資料（有好幾題到期）
test('caps reviews per day, lists what is next, and lets me pick one or do more', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();
  const dueList = page.getByRole('region', { name: /^Due for review/ });
  // 示範資料寫進去之後清單才排出來，等清單有題目再數（count() 不會等）
  await expect.poll(() => dueList.getByRole('listitem').count()).toBeGreaterThan(5);

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
  const recallOnly = page.getByRole('button', { name: 'Just recall it' });
  const notes = page.getByRole('button', { name: 'Show my notes' });
  for (let i = 0; i < left; i += 1) {
    // 要重寫的題目先換回一般的回想
    await expect(recallOnly.or(notes)).toBeVisible();
    if (await recallOnly.isVisible()) await recallOnly.click();
    await notes.click();
    await page.getByRole('button', { name: /^Solved alone/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Done with today’s 5 reviews' })).toBeVisible();
  // 做完今天的份：澆水壺在幫小芽澆水
  await expect(page.locator('[data-spot="watered"]')).toBeVisible();
  await page.getByRole('button', { name: 'Review 5 more' }).click();
  await expect(page.locator('#review-title')).toBeVisible();
});

// 上次靠提示或解答的題目：今天頁和清單標「重寫」，複習卡請你計時重寫，也可以只回想
test('asks me to rewrite problems I needed help with last time', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  // 示範資料最近幾天有看了提示、看了解答、還不懂的題目
  const dueList = page.getByRole('region', { name: /^Due for review/ });
  await expect(dueList).toContainText(/marked “Rewrite” needed a hint or the solution/);
  const rewriteRow = dueList.getByRole('listitem').filter({ has: page.locator('.chip-rewrite') }).first();
  await expect(rewriteRow).toBeVisible();
  const rowTitle = (await rewriteRow.locator('.problem-title a').textContent())!.trim();

  await page.goto('/#/review');
  const queue = page.getByRole('region', { name: /^Up next/ });
  await queue.getByRole('button').filter({ hasText: rowTitle }).click();
  await expect(page.locator('#review-title')).toContainText(rowTitle);
  await expect(page.getByRole('heading', { name: 'Rewrite this one' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show my notes' })).toHaveCount(0);

  // 計時重寫：練習頁標成「重寫」
  await page.getByRole('link', { name: 'Rewrite with a timer' }).click();
  await expect(page.locator('.page-head .chip-rewrite')).toHaveText('Rewrite');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /^Review/ }).click();
  await page.getByRole('dialog', { name: 'Leave this practice session?' }).getByRole('button', { name: 'Leave without recording' }).click();

  // 只回想就好：換回一般的回想和筆記
  await queue.getByRole('button').filter({ hasText: rowTitle }).click();
  await page.getByRole('button', { name: 'Just recall it' }).click();
  await expect(page.getByRole('heading', { name: 'Recall first' })).toBeVisible();
  await page.getByRole('button', { name: 'Show my notes' }).click();
  await expect(page.getByRole('heading', { name: 'How well did you recall it?' })).toBeVisible();
});
