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
