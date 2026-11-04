import { expect, test } from '@playwright/test';

test('schedules reviews with FSRS and reschedules them when the target retention changes', async ({ page }) => {
  // 先標記一題「記得很清楚」：第一次自己解出，FSRS 排在 2 天後
  await page.goto('/#/problems?list=neetcode150');
  await page.getByRole('button', { name: 'Mark problems I solved before' }).click();
  const group = page.getByRole('region', { name: /^Arrays & Hashing/ });
  await group.getByRole('checkbox', { name: 'Select Two Sum' }).check();
  const bar = page.getByRole('region', { name: 'Mark problems you solved before' }).last();
  await expect(bar).toContainText('First review in 2 days');
  await bar.getByRole('button', { name: 'Mark 1 problem' }).click();
  await expect(page.getByRole('status')).toContainText('Scheduled 1 problem for review');

  // 題目頁顯示記憶的狀態
  await page.goto('/#/problems/1');
  const schedule = page.getByRole('region', { name: 'Review schedule' });
  await expect(schedule).toContainText('Remember it now100%');
  await expect(schedule).toContainText('Holds for about 2 days');
  await expect(schedule).toContainText('in 2 days');
  // 為什麼排這天：一步一步算給你看
  await schedule.getByText('Why 2 days?').click();
  const why = schedule.locator('.why-steps');
  await expect(why).toContainText('First attempt');
  await expect(why).toContainText('Solved alone (FSRS “Good”): memory grows.');
  await expect(why).toContainText('Memory: holds about 2.3 days');
  await expect(why).toContainText('Recall drops to 90% in 2 days.');

  // 目標記憶率調低：比較晚才需要複習，每一題都重新排程
  await page.goto('/#/settings');
  await page.getByLabel('Target retention').selectOption('0.8');
  await page.goto('/#/problems/1');
  await expect(schedule).toContainText('in 8 days');
  await schedule.getByText('Why 8 days?').click();
  await expect(schedule.locator('.why-steps')).toContainText('Recall drops to 80% in 8 days.');
  await expect(schedule).toContainText('Holds for about 2 days');
});

// 最熟的情況：很快解出，而且講得清楚。很快但還沒講，說明會提示去講一次；講清楚之後這題重排、隔更久
test('counts a fast solve as Easy once it is explained clearly', async ({ page }) => {
  await page.goto('/#/problems/1');
  await page.getByRole('button', { name: 'Record without timer' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Minutes spent/).fill('5');
  await dialog.getByRole('button', { name: /^Solved alone/ }).click();
  await dialog.getByText(/^Why \d+ days?\?$/).click();
  await expect(dialog.locator('.why-steps')).toContainText('Fast solve! Explain it clearly in English within 3 days');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  const schedule = page.getByRole('region', { name: 'Review schedule' });
  await expect(schedule).toContainText('in 2 days');

  // 用英文講一次：五個重點都講到、講得很順
  await page.goto('/#/mock?problem=1&kind=explain');
  await page.getByLabel('Record my explanation').uncheck();
  await page.getByRole('button', { name: 'Start timer' }).click();
  for (const label of [
    'The key insight, i.e. why the approach works',
    'Which data structure you used, and why',
    'A walk through a small example',
    'Time and space complexity',
    'At least one edge case',
  ]) {
    await page.getByLabel(label).check();
  }
  await page.getByRole('button', { name: 'Finish and review' }).click();
  await page.getByRole('button', { name: /^Smooth/ }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.goto('/#/problems/1');
  await expect(schedule).toContainText('in 8 days');
  await schedule.getByText('Why 8 days?').click();
  await expect(schedule.locator('.why-steps')).toContainText('Solved fast and explained clearly (FSRS “Easy”)');
});

// 寫得不順被提早拉回來確認：到期後照記憶曲線還記得很多，寫「該確認了」、不用紅字；過了 FSRS 本來的那天才算逾期。
// 「為什麼隔 N 天？」裡提示那一行跟自己解出比，不寫乘在 Hard 上的倍數
test('calls a shaky solve that came back early a check, not overdue, and compares hints with solving alone', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 2, 1, 9, 0));
  await page.goto('/#/problems?list=neetcode150');
  await page.getByRole('button', { name: 'Mark problems I solved before' }).click();
  await page.getByRole('region', { name: /^Arrays & Hashing/ }).getByRole('checkbox', { name: 'Select Two Sum' }).check();
  await page.getByRole('region', { name: 'Mark problems you solved before' }).last().getByRole('button', { name: 'Mark 1 problem' }).click();
  await expect(page.getByRole('status')).toContainText('Scheduled 1 problem for review');

  // 半年後再寫，看了第一層提示（方向）
  await page.clock.setFixedTime(new Date(2026, 8, 16, 9, 0));
  await page.goto('/#/practice/1');
  await page.reload();
  await page.getByRole('button', { name: /Give me a hint/ }).click();
  await page.getByRole('group', { name: 'While solving' }).getByRole('button', { name: 'I’m done' }).click();
  const record = page.getByRole('region', { name: 'Record this attempt' });
  await expect(record.getByRole('button', { name: /Needed a hint/ })).toHaveAttribute('aria-pressed', 'true');
  await record.getByText('Why 7 days?').click();
  const why = record.locator('.why-steps');
  await expect(why).toContainText('Needed a hint (FSRS “Hard”), up to the direction: memory grows about 80% as much as solving it alone.');
  await expect(why).not.toContainText('×1.3');
  await expect(why).toContainText('Not smooth this time, so check again in 7 days.');
  await record.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved. Next review');
  await expect(page).not.toHaveURL(/#\/practice\//);

  // 隔 8 天：已經過了到期日，但照記憶曲線還記得九成以上，寫「該確認了」，不用紅字
  await page.clock.setFixedTime(new Date(2026, 8, 24, 9, 0));
  await page.goto('/#/problems');
  await page.reload();
  const row = page.locator('.problem-row').filter({ has: page.getByRole('link', { name: 'Two Sum', exact: true }) });
  await expect(row).toContainText('Time to check (last try wasn’t smooth)');
  await expect(row.locator('.overdue')).toHaveCount(0);
  await expect(row.locator('.chip-recall')).toHaveText(/^9\d% recall$/);
  await page.goto('/#/problems/1');
  const schedule = page.getByRole('region', { name: 'Review schedule' });
  await expect(schedule).toContainText('came back early to check');
  await expect(schedule).toContainText(', time to check');
  await expect(schedule).not.toContainText('overdue');
  await expect(schedule.locator('.overdue')).toHaveCount(0);
  await page.goto('/#/review');
  await expect(page.locator('.review-progress')).toContainText('this one is back early because the last try wasn’t smooth');

  // 過了 FSRS 本來會排的那天，就跟一般的逾期一樣是紅字
  await page.clock.setFixedTime(new Date(2027, 2, 1, 9, 0));
  await page.goto('/#/problems');
  await page.reload();
  await expect(row.locator('.overdue')).toContainText('Due for review (');
});
