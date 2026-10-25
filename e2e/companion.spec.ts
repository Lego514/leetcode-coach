import { expect, test } from '@playwright/test';

// 陪刷題的卡皮巴拉：今天卡的樹下面有一隻，還沒練習在打瞌睡、練了很開心；
// 收集到頭上的道具會慶祝，進度頁可以換著戴

test('dozes until I practice, then collects head items I can wear', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('region', { name: 'Today’s goal' });
  // 寬的畫面在右上角、窄的畫面在樹下，看得到的只有一隻
  const capybara = card.locator('svg.capybara:visible');
  await expect(capybara).toHaveCount(1);
  await expect(capybara).toHaveAttribute('data-stage', 'baby');
  await expect(capybara).toHaveAttribute('data-mood', 'sleepy');
  // 還沒練習：躺在床上
  await expect(capybara).toHaveAttribute('data-pose', 'bed');

  // 第一次練習：練習了一天（柚子）、自己解出（小芽），一次收集到兩個，放在同一則慶祝訊息
  await page.goto('/#/practice/1');
  await page.getByRole('group', { name: 'While solving' }).getByRole('button', { name: 'I’m done' }).click();
  await page.getByRole('region', { name: 'Record this attempt' }).getByRole('button', { name: 'Save', exact: true }).click();
  const items = page.locator('.toast-win').filter({ hasText: 'New head items: Yuzu and Sprout!' });
  await expect(items).toBeVisible();
  await expect(items.locator('svg[data-item="yuzu"]')).toBeVisible();
  await expect(items.locator('svg[data-item="sprout"]')).toBeVisible();
  // 「已儲存」沒有被擠掉
  await expect(page.getByRole('status')).toContainText('Saved. Next review');

  // 今天練習了：很開心，戴著第一個收集到的柚子；今天的新題還沒做完，在用電腦
  await page.goto('/');
  await expect(capybara).toHaveAttribute('data-mood', 'happy');
  await expect(capybara).toHaveAttribute('data-item', 'yuzu');
  await expect(capybara).toHaveAttribute('data-pose', 'laptop');

  // 進度頁：收藏 2 / 10，還沒收集到的寫著還差多少
  await page.goto('/#/progress');
  const sheet = page.getByRole('region', { name: 'Capybara' });
  await expect(sheet).toContainText('Baby capybara');
  await expect(sheet).toContainText('1 day of practice together. 6 more days to reach “Young capybara”');
  await expect(sheet).toContainText('Head items 2 / 10');
  await expect(sheet.getByRole('button', { name: /^Yuzu/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.locator('[data-locked]').filter({ hasText: 'Beanie' })).toContainText('1 / 7');

  // 換戴小芽，今天卡也跟著換；什麼都不戴就沒有
  await sheet.getByRole('button', { name: /^Sprout/ }).click();
  await expect(sheet.getByRole('button', { name: /^Sprout/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.locator('svg.capybara')).toHaveAttribute('data-item', 'sprout');
  await page.goto('/');
  await expect(capybara).toHaveAttribute('data-item', 'sprout');
  await page.goto('/#/progress');
  await sheet.getByRole('button', { name: 'Wear nothing' }).click();
  await expect(sheet.locator('svg.capybara')).not.toHaveAttribute('data-item');
});

test('loading demo data collects items quietly instead of celebrating each one', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();
  await expect(page.locator('.toast-win')).toHaveCount(0);

  await page.goto('/#/progress');
  const sheet = page.getByRole('region', { name: 'Capybara' });
  await expect(sheet.locator('svg.capybara')).toHaveAttribute('data-stage', 'grown');
  await expect(sheet).toContainText('Grown-up capybara');
  await expect(sheet).toContainText('Head items 6 / 10');
  // 講解練習 8 次，耳機還差 2 次
  await expect(sheet.locator('[data-locked]').filter({ hasText: 'Headphones' })).toContainText('8 / 10');
});

// 寬的畫面：今天卡右上角的卡皮巴拉旁邊有對話框，一句鼓勵的話、一則小知識（可以換）、下一個頭飾
test('says something encouraging and a tip next to the Today card on wide screens', { tag: '@desktop' }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const pet = page.getByRole('region', { name: 'Today’s goal' }).locator('.today-card-pet');
  await expect(pet).toBeVisible();
  // 還沒練習時說的話（每天換一句）
  await expect(pet.locator('.pet-bubble p').first()).toHaveText(/napping|So cozy|I dreamed/);
  await expect(pet).toContainText('Next head item: Yuzu (Practice one day, 0 / 1)');
  const tip = pet.locator('.pet-tip');
  await expect(tip).toContainText(/^Tip \(.+\): /);
  const first = await tip.textContent();
  await pet.getByRole('button', { name: 'Another tip' }).click();
  await expect(tip).not.toHaveText(first!);
  // 點卡皮巴拉到進度頁的收藏
  await pet.getByRole('link', { name: 'See your capybara’s collection' }).click();
  await expect(page).toHaveURL(/#\/progress#companion$/);
});

// 今天的目標做完了：喝珍奶或泡溫泉（每天輪流），說的話跟著動作
test('celebrates with bubble tea or a hot spring once today’s goal is done', { tag: '@desktop' }, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  // 新使用者今天的目標是 3 題新題
  for (const id of [1, 217, 242]) {
    await page.goto(`/#/problems/${id}`);
    await page.getByRole('button', { name: 'Record without timer' }).click();
    const dialog = page.getByRole('dialog', { name: 'Record this attempt' });
    await dialog.getByRole('button', { name: /Solved alone/ }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await page.goto('/');
  const pet = page.getByRole('region', { name: 'Today’s goal' }).locator('.today-card-pet');
  const capybara = pet.locator('svg.capybara');
  await expect(capybara).toHaveAttribute('data-pose', /^(boba|onsen)$/);
  const pose = await capybara.getAttribute('data-pose');
  await expect(pet.locator('.pet-bubble p').first()).toHaveText(pose === 'boba' ? /bubble tea|pearls/i : /hot spring|soak/i);
});
