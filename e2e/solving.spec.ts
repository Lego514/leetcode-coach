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

test('writes the English explanation script from the steps', async ({ page }) => {
  await page.goto('/#/practice/1');
  const steps = page.getByRole('region', { name: 'Solving steps' });
  // 還沒寫步驟時沒有這個按鈕
  await expect(steps.getByRole('button', { name: 'Write the English script from these steps' })).toHaveCount(0);
  await steps.getByLabel('What should I keep?').fill('A map from value to index');
  await steps.getByLabel('Edge cases').fill('The same number can’t be used twice');

  await steps.getByRole('button', { name: 'Write the English script from these steps' }).click();
  const dialog = page.getByRole('dialog', { name: 'Write the script from your steps' });
  // 每一句上面列出相關步驟寫過的內容
  await expect(dialog.locator('.script-refs').first()).toContainText('A map from value to index');
  await dialog.getByLabel(/^1\./).fill('The key insight is that I can look up each complement in a map.');
  await dialog.getByLabel(/^5\./).fill('One edge case is using the same index twice, so I check before I insert.');
  await dialog.getByRole('button', { name: 'Use this script' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved as this problem’s explanation script' })).toBeVisible();

  // 題目頁的講解稿已經是這兩句；從講解稿旁邊再打開，會帶入原本的句子逐句修改
  await page.goto('/#/problems/1');
  const script = page.getByLabel('Explanation script');
  await expect(script).toHaveValue(
    'The key insight is that I can look up each complement in a map.\nOne edge case is using the same index twice, so I check before I insert.',
  );
  await page.getByRole('region', { name: 'My notes' }).getByRole('button', { name: 'Write the English script from these steps' }).click();
  const again = page.getByRole('dialog', { name: 'Write the script from your steps' });
  await expect(again.getByLabel(/^1\./)).toHaveValue('The key insight is that I can look up each complement in a map.');
  await expect(again).toContainText('This replaces the problem’s current explanation script.');
  await again.getByLabel(/^4\./).fill('This takes O(n) time and O(n) space for the map.');
  await again.getByRole('button', { name: 'Use this script' }).click();
  await expect(script).toHaveValue(/O\(n\) time and O\(n\) space/);
  await expect(page.getByRole('region', { name: 'My notes' }).getByText(/Saved at/)).toBeVisible();
});

test('points the hints at the step you are stuck on', async ({ page }) => {
  await page.goto('/#/practice/1');
  await page.getByRole('region', { name: 'Solving steps' }).getByLabel('Brute force').fill('Try every pair, O(n²)');

  const hints = page.getByRole('region', { name: 'Hints' });
  const stuck = hints.getByRole('group', { name: 'Where are you stuck?' });
  await stuck.getByRole('button', { name: 'Optimize' }).click();
  // 先看自己寫的暴力解，加上這一步怎麼想；還不算用了提示
  await expect(hints).toContainText('Your “Brute force”: Try every pair, O(n²)');
  await expect(hints).toContainText('What’s repeated:');
  await expect(hints).toContainText('Stuck? Hints open one layer at a time');

  // 直接打開這一步需要的那層提示
  await hints.getByRole('button', { name: /Open the hint for this step \(hint 2/ }).click();
  await expect(hints).toContainText('2 of 3 layers open');
  await expect(hints).toContainText('Hint 2: Key insight');
  await expect(hints.getByRole('button', { name: /Open the hint for this step/ })).toHaveCount(0);

  // 卡在舉例可以直接開白板
  await stuck.getByRole('button', { name: 'Examples' }).click();
  await hints.getByRole('button', { name: 'Trace it on the whiteboard' }).click();
  await expect(page.getByRole('dialog', { name: /Two Sum/ })).toBeVisible();
});
