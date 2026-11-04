import { expect, test } from '@playwright/test';

// 很久沒碰的題目：方格顏色（曾經練到哪）不掉，右上角多一個橘點，滑過去寫幾天沒碰。門檻跟演算法樹的黃葉、枯葉一樣
const DAY = 24 * 60 * 60 * 1000;
const start = new Date('2026-10-19T12:00:00');

test('marks long-untouched problems with a dot on the mastery cell, without dropping its color', async ({ page }) => {
  await page.clock.setFixedTime(start);
  await page.goto('/#/practice/1');
  await page.getByRole('group', { name: 'While solving' }).getByRole('button', { name: 'I’m done' }).click();
  await page.getByRole('button', { name: /^Solved alone/ }).click();
  await page.getByRole('region', { name: 'Record this attempt' }).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved. Next review');

  // 剛做完：沒有點
  await page.goto('/#/problems/1');
  const cell = page.locator('.detail-meta .cell');
  await expect(cell).toHaveAttribute('data-level', '1');
  await expect(cell).not.toHaveAttribute('data-fade', /./);
  await expect(cell).toHaveAccessibleName('Learning');

  // 一個月沒碰：有點忘了（空心點），顏色還是學習中
  await page.clock.setFixedTime(new Date(start.getTime() + 30 * DAY));
  await page.reload();
  await expect(cell).toHaveAttribute('data-fade', '1');
  await expect(cell).toHaveAttribute('data-level', '1');
  await expect(cell).toHaveAccessibleName('Learning, not touched in 30 days, starting to fade');

  // 五個月沒碰：可能忘了（實心點）
  await page.clock.setFixedTime(new Date(start.getTime() + 150 * DAY));
  await page.reload();
  await expect(cell).toHaveAttribute('data-fade', '2');
  await expect(cell).toHaveAccessibleName('Learning, not touched in 150 days, probably forgotten some');

  // 題目列表、進度頁的方格也有，圖例寫出兩種點
  await page.goto('/#/problems');
  await expect(page.getByRole('img', { name: 'Learning, not touched in 150 days, probably forgotten some' })).toHaveAttribute('data-fade', '2');
  await page.goto('/#/progress');
  const mastery = page.locator('.sheet:has(#mastery)');
  await expect(mastery.getByRole('link', { name: 'Two Sum, Learning, not touched in 150 days, probably forgotten some' })).toBeVisible();
  const legend = mastery.getByLabel('Legend');
  await expect(legend).toContainText('Fading');
  await expect(legend).toContainText('Probably forgotten');

  // 進度頁寫有幾題很久沒碰，連到題目列表的「很久沒碰」篩選，只列出有橘點的題
  await expect(mastery).toContainText('1 problem hasn’t been touched in a while (orange dot).');
  await mastery.getByRole('link', { name: 'See which ones' }).click();
  await expect(page).toHaveURL(/#\/problems\?.*status=fading/);
  await expect(page.getByLabel('Status')).toHaveValue('fading');
  await expect(page.locator('.problem-row')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Two Sum', exact: true })).toBeVisible();
});

test('shows no fading note on Progress when nothing has faded', async ({ page }) => {
  await page.clock.setFixedTime(start);
  await page.goto('/#/practice/1');
  await page.getByRole('group', { name: 'While solving' }).getByRole('button', { name: 'I’m done' }).click();
  await page.getByRole('button', { name: /^Solved alone/ }).click();
  await page.getByRole('region', { name: 'Record this attempt' }).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved. Next review');
  await page.goto('/#/progress');
  await expect(page.locator('.sheet:has(#mastery)')).not.toContainText('touched in a while');
});
