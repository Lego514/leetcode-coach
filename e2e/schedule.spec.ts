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
