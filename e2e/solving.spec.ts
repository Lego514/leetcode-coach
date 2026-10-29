import { expect, test } from '@playwright/test';

test('writes solving steps during practice and finds them in the mock interview and on the problem page', async ({ page }) => {
  await page.goto('/#/practice/1');
  const steps = page.getByRole('region', { name: 'Solving steps' });
  // 一次只露出一步，從第一步開始
  await expect(steps).toContainText('Step 1 of 7');
  await steps.getByLabel('What the problem asks').fill('Find two indices whose values add up to target');
  await expect(steps.getByLabel('Edge cases')).toHaveCount(0);
  // 舉例拆成例子和邊界情況
  await steps.getByRole('button', { name: 'Next' }).click();
  await expect(steps).toContainText('Step 2 of 7');
  await steps.getByLabel('Edge cases').fill('Duplicates, negatives, exactly one answer');

  // 白板從「舉例」那一步就打得開
  await steps.getByRole('button', { name: 'Trace it on the whiteboard' }).click();
  const board = page.getByRole('dialog', { name: /Two Sum/ });
  await expect(board).toBeVisible();
  await board.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(board).toBeHidden();

  // 上面一排可以直接跳到任何一步；優化拆成三個問題
  await steps.getByRole('button', { name: 'Optimize', exact: true }).click();
  await steps.getByLabel('What’s slow?').fill('Rescanning the array for every number');
  await steps.getByLabel('What should I keep?').fill('A map from value to index');
  await expect(steps.getByText(/Saved at/)).toBeVisible();

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
  await steps.getByRole('button', { name: 'Optimize', exact: true }).click();
  await steps.getByLabel('What should I keep?').fill('A map from value to index');
  await steps.getByRole('button', { name: 'Examples', exact: true }).click();
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
  const steps = page.getByRole('region', { name: 'Solving steps' });
  await steps.getByRole('button', { name: 'Brute force', exact: true }).click();
  await steps.getByLabel('Brute force').fill('Try every pair, O(n²)');

  const hints = page.getByRole('region', { name: 'Hints' });
  const stuck = hints.getByRole('group', { name: 'Where are you stuck?' });
  await stuck.getByRole('button', { name: 'Optimize' }).click();
  // 先看自己寫的暴力解，加上這一步怎麼想；還不算用了提示
  await expect(hints).toContainText('Your “Brute force”: Try every pair, O(n²)');
  await expect(hints).toContainText('What’s repeated:');
  await expect(hints).toContainText('Stuck? Hints open one layer at a time');

  // 直接打開這一步需要的那層提示
  await hints.getByRole('button', { name: /Open the hint for this step \(hint 2/ }).click();
  await expect(hints).toContainText('2 of 4 layers open');
  await expect(hints).toContainText('Hint 2: Key insight');
  await expect(hints.getByRole('button', { name: /Open the hint for this step/ })).toHaveCount(0);

  // 卡在舉例：直接打開第三層的邊界情況，也可以開白板
  await stuck.getByRole('button', { name: 'Examples' }).click();
  await hints.getByRole('button', { name: /Open the hint for this step \(hint 3: Edge cases to check\)/ }).click();
  await expect(hints).toContainText('3 of 4 layers open');
  const edges = hints.locator('.hint').filter({ hasText: 'Hint 3: Edge cases to check' });
  await expect(edges.getByRole('listitem').first()).toContainText('The same value used twice must be two different indices');
  // 模板還沒打開
  await expect(hints).not.toContainText('Hint 4: Use the template');
  await hints.getByRole('button', { name: 'Trace it on the whiteboard' }).click();
  await expect(page.getByRole('dialog', { name: /Two Sum/ })).toBeVisible();
});

// 做題時「我卡住了」和「我做完了」固定在下方：卡住時提示直接看目前這一步；做完先記一句關鍵洞察，其他選填
test('keeps I’m stuck and I’m done at hand, and asks for one key insight at the end', async ({ page }) => {
  await page.goto('/#/practice/1');
  const steps = page.getByRole('region', { name: 'Solving steps' });
  // 每個圈圈下面寫短的名字，不用記第幾步是什麼
  await expect(steps.locator('.wizard-dot-label')).toHaveText(['Clarify', 'Examples', 'Brute', 'Optimize', 'Code', 'Test', 'Big-O']);
  await steps.getByRole('button', { name: 'Optimize', exact: true }).click();
  await expect(steps).toContainText('Step 4 of 7');

  const dock = page.getByRole('group', { name: 'While solving' });
  await expect(dock).toContainText(/^\d+:\d{2}/);
  // 暫停和繼續的按鈕有影音播放器的小圖示
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' }).locator('.play-pause-icon')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Pause' }).locator('.play-pause-icon')).toBeVisible();
  await dock.getByRole('button', { name: 'I’m stuck' }).click();
  const hints = page.getByRole('region', { name: 'Hints' });
  await expect(hints.getByRole('group', { name: 'Where are you stuck?' }).getByRole('button', { name: 'Optimize' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(hints).toContainText('What’s repeated:');

  await dock.getByRole('button', { name: 'I’m done' }).click();
  const record = page.getByRole('region', { name: 'Record this attempt' });
  // 關鍵洞察放第一個；卡在哪直接列出來，不用打開
  await expect(record.getByLabel('Key idea in one line')).toBeFocused();
  await expect(record.getByRole('button', { name: 'Couldn’t optimize', exact: true })).toBeVisible();

  // 時間可以調：計時器量到的是起點，按鈕加減、改回計時器的時間，也可以直接打
  const minutes = record.getByLabel('Minutes spent');
  await expect(minutes).toHaveValue('1');
  await expect(record).toContainText('The timer measured 1 minute.');
  await record.getByRole('button', { name: '5 minutes more' }).click();
  await record.getByRole('button', { name: '1 minute more' }).click();
  await expect(minutes).toHaveValue('7');
  await record.getByRole('button', { name: '1 minute less' }).click();
  await expect(minutes).toHaveValue('6');
  await record.getByRole('button', { name: 'Use the timer’s time' }).click();
  await expect(minutes).toHaveValue('1');
  await expect(record.getByRole('button', { name: 'Use the timer’s time' })).toHaveCount(0);
  // 不會少於 1 分鐘
  await record.getByRole('button', { name: '5 minutes less' }).click();
  await expect(minutes).toHaveValue('1');

  // 寫題時間算進記憶度：在目標（Easy 15 分鐘）以內不影響，超過就打折，下次早一點回來
  const solo = record.getByRole('button', { name: /^Solved alone/ });
  await expect(solo).toContainText('Review in 2 days');
  await minutes.fill('30');
  await expect(solo).toContainText('Review in 1 day');
  await expect(record).toContainText('Longer than the 15-minute target, so this attempt counts for less');
  await minutes.fill('15');
  await expect(solo).toContainText('Review in 2 days');
  await expect(record).not.toContainText('Longer than the 15-minute target');

  // 卡在記憶類的地方（沒看出模式）：說明這題一週內會回來確認；取消就收起來
  const pattern = record.getByRole('button', { name: 'Didn’t see the pattern', exact: true });
  await pattern.click();
  await expect(record).toContainText('comes back within a week to confirm');
  await pattern.click();
  await expect(record).not.toContainText('comes back within a week to confirm');
  await minutes.fill('25');
  // 選了評分就看得到為什麼是這幾天：第一次做、自己解出、花了目標的 1.7 倍
  await solo.click();
  await record.getByText(/^Why \d+ days?\?$/).click();
  const why = record.locator('.why-steps');
  await expect(why).toContainText('First attempt');
  await expect(why).toContainText('Took 1.7× the 15-minute target');
  await expect(why.locator('.why-weight')).toHaveText('×0.73');
  // 再勾「沒看出模式」：多一個權重，改成一週內確認
  await pattern.click();
  await expect(why.locator('.why-weight')).toHaveText(['×0.73', '×0.75']);
  await pattern.click();
  // 做完之後步驟變成選填，下方的工具列也收起來
  await expect(page.getByRole('region', { name: 'Solving steps (optional)' })).toBeVisible();
  await expect(dock).toHaveCount(0);

  // 存起來的是調過的時間
  await record.getByRole('button', { name: 'Save', exact: true }).click();
  // 存好之後練習頁會自己回上一頁；等它離開再去題目頁，不然會被拉回去
  await expect(page.getByRole('status')).toContainText('Saved. Next review');
  await expect(page).not.toHaveURL(/#\/practice\//);
  await page.goto('/#/problems/1');
  await expect(page.getByRole('region', { name: /^History/ })).toContainText('25 min');
});
