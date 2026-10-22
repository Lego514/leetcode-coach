import { expect, test } from '@playwright/test';

// 演算法樹：今天的目標卡裡的小樹和下一個目標，進度頁的完整樹（點葉子看是哪一題、分享成圖片）
test('grows the algorithm tree from practice, small on Today and in full on Progress', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();

  const card = page.getByRole('region', { name: 'Today’s goal' });
  await expect(card).toContainText(/\d+ problems solvable now/);
  await expect(card.getByRole('img', { name: /^Algorithm tree: \d+ of 150 problems solvable now$/ })).toBeVisible();
  await expect(card).toContainText(/Next goal: \d+ more problems? and /);
  // 小樹沒有題型名稱，也不能點葉子
  await expect(card.locator('.algo-label')).toHaveCount(0);
  await card.getByRole('link', { name: 'See the whole tree' }).last().click();

  const tree = page.getByRole('region', { name: 'Algorithm tree' });
  await expect(tree).toBeVisible();
  await expect(tree.locator('.algo-label')).toContainText(['Arrays & Hashing']);
  // 示範資料做過的題目長了葉子，征服的結了果實，還沒做的是虛線上的小點
  expect(await tree.locator('.algo-leaf').count()).toBeGreaterThan(10);
  expect(await tree.locator('.algo-fruit').count()).toBeGreaterThan(0);
  expect(await tree.locator('.algo-bud').count()).toBeGreaterThan(100);

  await expect(tree).toContainText('Tap a leaf, fruit, or sprout to see which problem it is.');
  await tree.locator('.algo-fruit').first().dispatchEvent('click');
  await expect(tree).toContainText('You conquered this one, so it bears fruit.');
  await expect(tree.locator('.algo-info a')).toHaveAttribute('href', /#\/problems\/\d+$/);

  await tree.locator('.algo-bud').first().dispatchEvent('click');
  await expect(tree).toContainText('Not done yet.');

  // 分享成圖片：畫出一張 PNG，可以下載
  await tree.getByRole('button', { name: 'Share as image' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share your algorithm tree' });
  const image = dialog.getByRole('img', { name: /Share image of the algorithm tree/ });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /^blob:/);
  expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1080);
  await expect(dialog.getByRole('link', { name: 'Download image' })).toHaveAttribute('download', /^algorithm-tree-\d{4}-\d{2}-\d{2}\.png$/);
});

// 今天頁的順序：今天的目標卡之後馬上是該複習和新題，微複習、上週回顧、今天做過的在後面
test('puts reviews and new problems right after today’s goal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByRole('region', { name: 'Today’s goal' })).toBeVisible();
  const titles = await page.locator('.page .sheet-title').allTextContents();
  const order = ['Today’s goal', 'Due for review', 'New problems', 'Flashcards', 'Done today'].map((name) =>
    titles.findIndex((title) => title.startsWith(name)),
  );
  expect(order.every((i) => i >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});

// 自動調整難度：最近的 Medium 大多要看提示，今天少排 Medium、不排 Hard；設定裡關掉就照原本排
test('schedules fewer Mediums after recent Mediums needed help, unless turned off', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();
  const fresh = page.getByRole('region', { name: /^New problems/ });
  await expect(fresh).not.toContainText('fewer Mediums');

  // 複習幾題 Medium，都要看提示
  await page.goto('/#/review');
  const recallOnly = page.getByRole('button', { name: 'Just recall it' });
  const notes = page.getByRole('button', { name: 'Show my notes' });
  for (let i = 0; i < 5; i += 1) {
    await expect(recallOnly.or(notes)).toBeVisible();
    if (await recallOnly.isVisible()) await recallOnly.click();
    await notes.click();
    await page.getByRole('button', { name: /^Needed a hint/ }).click();
  }
  await page.goto('/');
  await expect(fresh).toContainText(/You solved \d+ of your last \d+ Medium problems on your own, so today has fewer Mediums/);
  await expect(fresh.locator('.difficulty[data-level="Hard"]')).toHaveCount(0);

  await page.goto('/#/settings');
  const adaptive = page.getByLabel('Adjust difficulty automatically');
  await expect(adaptive).toBeChecked();
  await adaptive.click();
  await expect(adaptive).not.toBeChecked();
  await page.goto('/');
  await expect(page.getByRole('region', { name: /^New problems/ })).not.toContainText('fewer Mediums');
});
