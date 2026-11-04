import { expect, test } from '@playwright/test';

test('plans a sprint to an interview, puts the company’s problems first, and ends it', async ({ page }) => {
  // 星期一；面試在 10 天後
  await page.clock.setFixedTime(new Date(2026, 9, 12, 9, 0));
  await page.goto('/#/sprint');
  await page.getByLabel('Interview date').fill('2026-10-22');
  await page.getByLabel('Company (optional)').fill('Acme');
  await expect(page.getByLabel('Each weekday')).toHaveValue('90');
  await expect(page.getByLabel('Review only for the last')).toHaveValue('2');
  await page.getByRole('button', { name: 'Start the sprint' }).click();
  await expect(page.getByRole('status')).toContainText('Sprint plan saved');

  const summary = page.getByRole('region', { name: /^Acme interview:/ });
  await expect(summary).toContainText('10 days');
  await expect(summary).toContainText('8 days left for new problems, then 2 days of review only.');
  const days = page.getByRole('region', { name: 'Day by day' }).getByRole('listitem');
  await expect(days).toHaveCount(10);
  await expect(days.first()).toContainText('Today');
  await expect(days.first()).toContainText('/ 90 min');
  // 最後兩天只複習，面試前兩天有一場模擬面試
  await expect(days.nth(8)).toContainText('Mock interview');
  await expect(days.nth(8)).not.toContainText('new');
  await expect(days.nth(9)).toContainText('Behavioral');

  // 貼上這家公司考過的題目
  const tag = page.getByRole('region', { name: 'Tag problems Acme asks' });
  await tag.getByLabel('Problems to tag with Acme').fill('1, 15\nhttps://leetcode.com/problems/lru-cache/\nnope');
  await tag.getByRole('button', { name: 'Tag with Acme' }).click();
  await expect(tag).toContainText('Tagged 3 problems with Acme. Not found: nope');
  await expect(summary).toContainText('Company problems');
  // 新題照順序排、下一題放不下就留到隔天；今天剩的 20 分鐘建議練講解，連到講解練習
  await expect(page.getByRole('region', { name: 'Day by day' })).toContainText('instead of a shorter one jumping ahead');
  const spare = days.first().getByRole('link', { name: '20 min spare to practice explaining' });
  await expect(spare).toHaveAttribute('href', '#/mock?kind=explain');
  // 排不進去的題目：寫出加起來要多久、為什麼排不進去；清單的題目標「清單的下一題」
  const unscheduled = page.getByRole('region', { name: /^Problems that don’t fit/ });
  await expect(unscheduled).toContainText(/These \d+ problems need about \d+ hours\. After reviews and higher-priority problems, no day has enough time left for the next one/);
  await expect(unscheduled.locator('.chip').first()).toHaveText('Next on list');

  // 今天頁：倒數，新題照衝刺的順序（公司題先），數量照今天的時間
  await page.goto('/#/');
  await expect(page.getByText('Acme interview in 10 days')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Practice a behavioral question' })).toBeVisible();
  const fresh = page.getByRole('region', { name: 'New problems for today' });
  await expect(fresh).toContainText('the company’s problems and untouched patterns first');
  await expect(fresh.getByRole('listitem')).toHaveCount(2);
  await expect(fresh.getByRole('listitem').nth(0)).toContainText('Two Sum');
  await expect(fresh.getByRole('listitem').nth(1)).toContainText('3Sum');
  await fresh.getByRole('button', { name: 'One more' }).click();
  await expect(fresh.getByRole('listitem').nth(2)).toContainText('LRU Cache');

  // 結束衝刺，回到平常的計畫
  await page.getByRole('link', { name: 'Sprint plan' }).click();
  await page.getByRole('button', { name: 'End the sprint' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End the sprint' }).click();
  await expect(page.getByRole('button', { name: 'Start the sprint' })).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByText('Acme interview in 10 days')).toBeHidden();
  await expect(page.getByRole('region', { name: 'New problems for today' })).toContainText('Contains Duplicate');
});
