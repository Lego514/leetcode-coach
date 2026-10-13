import { expect, test } from '@playwright/test';

test('shows a year of practice as a heatmap', async ({ page, isMobile }) => {
  await page.goto('/#/problems/1');
  await page.getByRole('button', { name: 'Record without timer' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record this attempt' });
  await dialog.getByRole('button', { name: /Solved alone/ }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await page.goto('/#/progress');
  const heatmap = page.getByRole('region', { name: '1 practice session in the past year' });
  await expect(heatmap).toContainText('Active 1 day · Longest streak 1 day');
  // 今天那格亮起來，其他格是空的
  await expect(heatmap.locator('.heatmap-grid .cell[data-level="1"]')).toHaveCount(1);
  await expect(heatmap.locator('.heatmap-grid .heatmap-month span')).not.toHaveCount(0);

  if (isMobile) {
    // 手機放不下一整年，一打開就捲到最近的幾週
    const scroll = heatmap.locator('.heatmap-scroll');
    const atEnd = await scroll.evaluate((el) => el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    expect(atEnd).toBe(true);
  }
});

test('records where I got stuck and shows what I get stuck on most', async ({ page }) => {
  await page.goto('/#/progress');
  await expect(page.getByRole('region', { name: 'Where you get stuck' })).toContainText('Mark where you got stuck');

  // 兩題都卡在優化，其中一題也漏了邊界情況
  for (const [id, reasons] of [
    [70, ['Couldn’t optimize', 'Missed an edge case']],
    [746, ['Couldn’t optimize']],
  ] as const) {
    await page.goto(`/#/problems/${id}`);
    await page.getByRole('button', { name: 'Record without timer' }).click();
    const dialog = page.getByRole('dialog', { name: 'Record this attempt' });
    await dialog.getByRole('button', { name: /Needed a hint/ }).click();
    for (const reason of reasons) await dialog.getByRole('button', { name: reason, exact: true }).click();
    await expect(dialog.getByRole('button', { name: reasons[0], exact: true })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await expect(page.getByRole('region', { name: /^History/ })).toContainText('Couldn’t optimize');

  await page.goto('/#/progress');
  const stuck = page.getByRole('region', { name: 'Where you get stuck' });
  await expect(stuck).toContainText('Last 90 days, 2 sessions with a reason marked');
  const rows = stuck.getByRole('listitem');
  await expect(rows.nth(0)).toContainText('Couldn’t optimize');
  await expect(rows.nth(0)).toContainText('2 times');
  await expect(rows.nth(0)).toContainText('Most often in: 1-D Dynamic Programming');
  await expect(rows.nth(1)).toContainText('Missed an edge case');
  await rows.nth(0).getByRole('link', { name: 'Open pattern cards' }).click();
  await expect(page).toHaveURL(/#\/patterns$/);
});
