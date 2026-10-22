import { expect, test } from '@playwright/test';

// 讓人想繼續刷：今天的目標和連續天數保護、上週回顧、征服一題的慶祝、準備度、題型地圖、每週回顧。
// 固定在星期一，上週回顧才會出現；示範資料照這一天編
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-19T12:00:00'));
});

test('shows today’s goal, the streak with shields, and last week’s recap', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();

  // 示範資料今天已經複習了一題：打卡了，但新題和其他複習還沒做；最近一週每天都有練
  const goal = page.getByRole('region', { name: 'Today’s goal' });
  await expect(goal).toContainText('Checked in, so your streak continues.');
  await expect(goal.getByRole('list', { name: 'Today’s progress' }).getByRole('listitem')).toHaveText([
    'Checked in today',
    'New 0/3',
    /^Review 1\/\d+$/,
  ]);
  await expect(goal).toContainText(/\d+-day streak/);
  await expect(goal.getByRole('listitem', { name: 'M: practiced' })).toBeVisible();
  await expect(goal.getByRole('listitem', { name: /: not yet$/ })).toHaveCount(6);

  const lastWeek = page.getByRole('region', { name: 'Last week' });
  await expect(lastWeek).toContainText(/Last week you practiced on \d+ days/);
  await lastWeek.getByRole('button', { name: 'Got it' }).click();
  await expect(lastWeek).toHaveCount(0);
  // 這週關掉就不再出現
  await page.reload();
  await expect(goal).toBeVisible();
  await expect(page.getByRole('region', { name: 'Last week' })).toHaveCount(0);
});

test('celebrates conquering a problem, and shows readiness, the pattern map, and the weekly recap', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();

  // 153 上次看了提示；這次自己解出就是征服
  await page.goto('/#/review');
  await page.getByRole('region', { name: /^Up next/ }).getByRole('button', { name: /Find Minimum in Rotated Sorted Array/ }).click();
  await page.getByRole('button', { name: 'Just recall it' }).click();
  await page.getByRole('button', { name: 'Show my notes' }).click();
  await page.getByRole('button', { name: /^Solved alone/ }).click();
  await expect(page.locator('.toast-win')).toContainText('Conquered! Find Minimum in Rotated Sorted Array: last time “Needed a hint”');

  await page.goto('/#/progress');
  const readiness = page.getByRole('region', { name: 'Interview readiness' });
  await expect(readiness).toContainText(/\d+%/);
  await expect(readiness.getByRole('meter', { name: 'Easy problems you can solve now' })).toBeVisible();
  await expect(readiness).toContainText('Tag companies on a problem’s details page');

  const map = page.getByRole('region', { name: 'Pattern map' });
  await expect(map.getByRole('link', { name: /^Arrays & Hashing: / })).toBeVisible();
  await map.getByRole('link', { name: /^Binary Search: / }).click();
  await expect(page).toHaveURL(/#\/patterns\/binary-search/);

  await page.goto('/#/progress');
  const recap = page.getByRole('region', { name: 'Weekly recap' });
  await expect(recap).toContainText(/Readiness: \d+% last Monday → \d+% now/);
  // 本週（星期一）：示範資料的一次複習加上剛剛征服的一題
  await expect(recap.getByRole('row', { name: /^Conquered/ })).toContainText('1');
  await expect(recap.getByRole('row', { name: /^Problems practiced/ })).toContainText('2');
});
