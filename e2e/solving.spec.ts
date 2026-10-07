import { expect, test } from '@playwright/test';

test('writes solving steps during practice and finds them in the mock interview and on the problem page', async ({ page }) => {
  await page.goto('/#/practice/1');
  const steps = page.getByRole('region', { name: 'Solving steps' });
  await steps.getByLabel('What the problem asks').fill('Find two indices whose values add up to target');
  // 舉例拆成例子和邊界情況，優化拆成三個問題
  await steps.getByLabel('Edge cases').fill('Duplicates, negatives, exactly one answer');
  await steps.getByLabel('What’s slow?').fill('Rescanning the array for every number');
  await steps.getByLabel('What should I keep?').fill('A map from value to index');
  await expect(steps.getByText(/Saved at/)).toBeVisible();

  // 白板從「舉例」那一步就打得開
  await steps.getByRole('button', { name: 'Trace it on the whiteboard' }).click();
  const board = page.getByRole('dialog', { name: /Two Sum/ });
  await expect(board).toBeVisible();
  await board.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(board).toBeHidden();

  // 模擬面試同一題，每一步的欄位帶著剛才寫的內容
  await page.goto('/#/mock?problem=1');
  await page.getByLabel('Record my explanation').uncheck();
  await page.getByRole('button', { name: 'Start timer' }).click();
  const flow = page.getByRole('region', { name: 'Interview flow' });
  await expect(flow.getByLabel('What the problem asks')).toHaveValue('Find two indices whose values add up to target');
  await flow.getByLabel('What the problem asks').fill('Return the two indices that sum to target');
  await expect(flow.getByText(/Saved at/)).toBeVisible();

  // 題目頁看得到，也可以改
  await page.goto('/#/problems/1');
  const detail = page.getByRole('region', { name: 'How I solved it' });
  await expect(detail.getByLabel('What the problem asks')).toHaveValue('Return the two indices that sum to target');
  await expect(detail.getByLabel('Edge cases')).toHaveValue('Duplicates, negatives, exactly one answer');
  await expect(detail.getByLabel('What should I keep?')).toHaveValue('A map from value to index');
});

test('keeps the steps folded on a problem without any', async ({ page }) => {
  await page.goto('/#/problems/2');
  const detail = page.getByRole('region', { name: 'How I solved it' });
  await expect(detail.getByLabel('What the problem asks')).toHaveCount(0);
  await detail.getByRole('button', { name: 'Write it down' }).click();
  await detail.getByLabel('Brute force').fill('Add the two lists digit by digit');
  await expect(detail.getByText(/Saved at/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'How I solved it' }).getByLabel('Brute force')).toHaveValue('Add the two lists digit by digit');
});
