import { expect, test } from '@playwright/test';

// 進度頁的講解能力：每一次講解的分數畫成曲線，五個重點各講到幾成、最常漏掉哪一個

test('starts empty, then charts an explanation drill from the points I ticked', async ({ page }) => {
  await page.goto('/#/progress');
  const sheet = page.getByRole('region', { name: 'Explaining' });
  await expect(sheet).toContainText('No explanation drills yet.');
  await expect(sheet.getByRole('link', { name: 'Do an explanation drill' })).toHaveAttribute('href', '#/mock?kind=explain');

  // 講一題，勾了兩個重點
  await page.goto('/#/mock?problem=1&kind=explain');
  await page.getByLabel('Record my explanation').uncheck();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.getByLabel('The key insight, i.e. why the approach works').check();
  await page.getByLabel('Which data structure you used, and why').check();
  await page.getByRole('button', { name: 'Finish and review' }).click();
  await page.getByRole('button', { name: /^Smooth/ }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // 過去的練習旁邊有連結，直接跳到進度頁的講解能力
  await page.getByRole('region', { name: /Past sessions/ }).getByRole('link', { name: 'See your progress' }).click();
  await expect(page).toHaveURL(/#\/progress#explain-progress$/);
  await expect(sheet).toBeInViewport();
  await expect(sheet).toContainText('40%');
  await expect(sheet.locator('.chart-dot[data-source="self"]')).toHaveCount(1);
  // 五個重點：沒勾的是 0%，照順序第一個沒講到的是走一遍例子
  await expect(sheet.getByRole('meter', { name: 'Key insight coverage' })).toHaveAttribute('aria-valuenow', '100');
  await expect(sheet.getByRole('meter', { name: 'Edge cases coverage' })).toHaveAttribute('aria-valuenow', '0');
  await expect(sheet).toContainText('Lately you skip “Walkthrough” the most.');
  await expect(sheet).toContainText('Felt smooth: 1 of the last 1.');
});

test('shows the demo explanations getting better, with edge cases missed the most', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();
  await page.goto('/#/progress');
  const sheet = page.getByRole('region', { name: 'Explaining' });
  await expect(sheet.locator('.chart-dot')).toHaveCount(8);
  await expect(sheet).toContainText('80%');
  await expect(sheet).toContainText('average of the last 5 sessions, 53% before that');
  await expect(sheet).toContainText('Lately you skip “Edge cases” the most.');
  // 數據表列出每一次
  await sheet.getByText('Show data table').click();
  await expect(sheet.getByRole('row')).toHaveCount(9);
});
