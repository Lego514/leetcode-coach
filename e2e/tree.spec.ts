import { expect, test } from '@playwright/test';

// 演算法樹：今天的目標卡裡的小樹和下一個目標，進度頁的完整樹（點葉子看是哪一題、分享成圖片）
test('grows the algorithm tree from practice, small on Today and in full on Progress', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();

  const card = page.getByRole('region', { name: 'Today’s goal' });
  // 示範資料做過 25 題：小樹，再做 35 題長成大樹
  await expect(card).toContainText('Young tree');
  await expect(card).toContainText('35 more problems and it is fully grown');
  await expect(card.getByRole('img', { name: /^Algorithm tree: \d+ of 150 problems solvable now$/ })).toBeVisible();
  await expect(card).toContainText(/Next goal: \d+ more problems? and /);
  // 小樹沒有題型名稱，也不能點葉子
  await expect(card.locator('.algo-label')).toHaveCount(0);
  await card.getByRole('link', { name: 'See the whole tree' }).last().click();

  const tree = page.getByRole('region', { name: 'Algorithm tree' });
  await expect(tree).toBeVisible();
  await expect(tree.locator('.algo-label')).toContainText(['Arrays & Hashing']);
  // 題型名稱整個在畫面裡（英文名稱比較長，以前左邊的「Arrays & Hashing」會被切掉）
  const clipped = await tree.locator('svg.algo-tree').evaluate((svg) => {
    const view = (svg as SVGSVGElement).viewBox.baseVal;
    return [...svg.querySelectorAll<SVGTextElement>('text.algo-label')]
      .filter((label) => {
        const box = label.getBBox();
        return box.x < view.x || box.x + box.width > view.x + view.width;
      })
      .map((label) => label.textContent);
  });
  expect(clipped).toEqual([]);
  // 示範資料做過的題目長了葉子，征服的結了果實，還沒做的是虛線上的小點
  expect(await tree.locator('.algo-leaf').count()).toBeGreaterThan(10);
  expect(await tree.locator('.algo-fruit').count()).toBeGreaterThan(0);
  // 還沒長成大樹：只畫做過的題型和接下來兩根，還沒做的題目是虛線上的小點
  await expect(tree).toContainText('Young tree');
  expect(await tree.locator('.algo-bud').count()).toBeGreaterThan(10);
  // 做過的題型有一團樹冠，樹幹有陰影，樹梢有新芽
  expect(await tree.locator('.algo-canopy').count()).toBeGreaterThan(0);
  await expect(tree.locator('.algo-trunk-shade')).toHaveCount(1);
  await expect(tree.locator('.algo-shoot')).toHaveCount(1);

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

// 新使用者：今天頁一開始就是一顆種子；做一題就發芽，跳出慶祝
test('starts as a seed and sprouts after the first problem', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('region', { name: 'Today’s goal' });
  await expect(card).toContainText('A seed');
  await expect(card).toContainText('1 more problem and it sprouts');
  await expect(card.locator('svg.algo-tree')).toHaveAttribute('data-stage', 'seed');
  // 一顆橡實半埋在土裡
  await expect(card.locator('.algo-nut')).toBeVisible();

  await page.goto('/#/practice/1');
  await page.getByRole('group', { name: 'While solving' }).getByRole('button', { name: 'I’m done' }).click();
  await page.getByRole('region', { name: 'Record this attempt' }).getByRole('button', { name: 'Save', exact: true }).click();
  // 同時也會收集到卡皮巴拉的頭飾，所以挑樹發芽的那一則
  const sprouted = page.locator('.toast-win').filter({ hasText: 'Your algorithm tree sprouted!' });
  await expect(sprouted).toBeVisible();
  // 慶祝訊息旁邊畫一根發芽的小莖
  await expect(sprouted.locator('.win-icon .algo-stem-sprout')).toBeVisible();

  await page.goto('/');
  await expect(card).toContainText('Sprouted');
  await expect(card).toContainText('4 more problems and it becomes a sapling');
  await expect(card.locator('svg.algo-tree')).toHaveAttribute('data-stage', 'sprout');
  await expect(card.locator('.algo-leaf')).toHaveCount(1);
  // 莖頂端是還在長的新芽，橡實的帽子還留在土上
  await expect(card.locator('.algo-shoot')).toHaveCount(1);
  await expect(card.locator('.algo-cap')).toHaveCount(1);
});

test('a problem you conquer bears fruit even while the tree is a sprout', async ({ page }) => {
  // 第一次看了提示才做出來
  await page.goto('/#/practice/1');
  await page.getByRole('button', { name: /Give me a hint/ }).click();
  await page.getByRole('group', { name: 'While solving' }).getByRole('button', { name: 'I’m done' }).click();
  await expect(page.getByRole('button', { name: /Needed a hint/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('region', { name: 'Record this attempt' }).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved. Next review');

  const card = page.getByRole('region', { name: 'Today’s goal' });
  await page.goto('/');
  await expect(card.locator('svg.algo-tree')).toHaveAttribute('data-stage', 'sprout');
  await expect(card.locator('.algo-sprout')).toHaveCount(1);
  await expect(card.locator('.algo-fruit')).toHaveCount(0);

  // 幾天後複習時自己寫出來：征服，結一顆果實
  await page.clock.setFixedTime(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Just recall it' }).click();
  await page.getByRole('button', { name: 'Show my notes' }).click();
  await page.getByRole('button', { name: /Solved alone/ }).click();
  await expect(page.getByRole('heading', { name: 'Reviewed 1 problem today' })).toBeVisible();

  await page.goto('/');
  await expect(card.locator('svg.algo-tree')).toHaveAttribute('data-stage', 'sprout');
  await expect(card.locator('.algo-leaf')).toHaveCount(1);
  await expect(card.locator('.algo-fruit')).toHaveCount(1);
});
