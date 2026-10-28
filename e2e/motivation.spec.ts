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
  // 征服的慶祝訊息旁邊是一顆果實，跟樹上的一樣
  await expect(page.locator('.toast-win .win-icon .algo-fruit')).toBeVisible();

  await page.goto('/#/progress');
  // 熟練度方格的圖例寫「較弱 → 較熟」：深色模式裡最熟的是最亮的，不能寫「越深越熟」
  const legend = page.locator('.sheet:has(#mastery)').getByLabel('Legend');
  await expect(legend).toContainText('Weaker');
  await expect(legend).toContainText('Stronger');
  await expect(legend).not.toContainText('Darker');
  const readiness = page.getByRole('region', { name: 'Interview readiness' });
  await expect(readiness).toContainText(/\d+%/);
  await expect(readiness.getByRole('meter', { name: 'Easy problems you can solve now' })).toBeVisible();
  await expect(readiness).toContainText('Tag companies on a problem’s details page');

  const map = page.getByRole('region', { name: 'Pattern map' });
  await expect(map.getByRole('link', { name: /^Arrays & Hashing: / })).toBeVisible();
  // 每一格有等級的小圖：做過的題型至少是小芽，還沒開始的是藍圖的一個點
  await expect(map.getByRole('link', { name: /^Arrays & Hashing: / }).locator('.pattern-tile-art')).toBeVisible();
  await expect(map.getByRole('link', { name: /^Bit Manipulation: / }).locator('.pattern-tile-art .algo-bud')).toBeVisible();
  await map.getByRole('link', { name: /^Binary Search: / }).click();
  await expect(page).toHaveURL(/#\/patterns\/binary-search/);

  await page.goto('/#/progress');
  const recap = page.getByRole('region', { name: 'Weekly recap' });
  await expect(recap).toContainText(/Readiness: \d+% last Monday → \d+% now/);
  // 本週（星期一）：示範資料的一次複習加上剛剛征服的一題
  await expect(recap.getByRole('row', { name: /^Conquered/ })).toContainText('1');
  await expect(recap.getByRole('row', { name: /^Problems practiced/ })).toContainText('2');
});

// 保護畫成盾牌：每練習一天存一個，最多兩個；漏掉一天用掉一個，那天在這週的圓點上是盾牌
test('shows shields, and uses one on a missed day', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  const goal = page.getByRole('region', { name: 'Today’s goal' });
  await expect(goal).toContainText('2 of 2 shields saved');
  await expect(goal.locator('.shield-row .shield-icon[data-filled]')).toHaveCount(2);

  // 兩天後再打開（示範資料最後一天是 10/19）：10/20 沒練，用掉一個
  await page.clock.setFixedTime(new Date('2026-10-21T12:00:00'));
  await page.reload();
  await expect(goal).toContainText('You missed yesterday, so a shield kept your streak alive.');
  await expect(goal).toContainText('1 of 2 shields saved');
  await expect(goal.locator('.shield-row .shield-icon[data-filled]')).toHaveCount(1);
  await expect(goal.getByRole('listitem', { name: 'T: shield used' })).toBeVisible();
  await expect(goal).toContainText('Practice today to earn a shield');
  await page.screenshot({ path: 'test-results/shield-used.png' });
});
