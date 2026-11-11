import { expect, test, type Page } from '@playwright/test';

async function recordTwoSum(page: Page, rating: RegExp) {
  await page.goto('/');
  await page.getByRole('region', { name: /^Done today/ }).getByRole('button', { name: 'Record another problem' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record another problem' });
  await dialog.getByLabel('Problem number, title, or LeetCode URL').fill('1');
  await dialog.getByRole('button', { name: 'Find problem' }).click();
  await dialog.getByRole('button', { name: rating }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
}

test('edits and deletes past records on the problem page', async ({ page }) => {
  await recordTwoSum(page, /Needed a hint/);
  await recordTwoSum(page, /Solved alone/);

  await page.goto('/#/problems/1');
  const history = page.getByRole('region', { name: /^History/ });
  await expect(history.getByRole('listitem')).toHaveCount(2);

  // 改其中一筆：選錯了，其實還是卡住
  await history.getByRole('button', { name: /^Edit the record from/ }).first().click();
  const edit = page.getByRole('dialog', { name: 'Edit this record' });
  await expect(edit).toContainText('1. Two Sum ·');
  await edit.getByRole('button', { name: /Still stuck/ }).click();
  await edit.getByRole('button', { name: 'Logic / edge cases' }).click();
  await edit.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(history).toContainText('Still stuck');
  await expect(history).toContainText('Logic / edge cases');

  // 刪掉一筆，剩一筆
  await history.getByRole('button', { name: /^Edit the record from/ }).last().click();
  await edit.getByRole('button', { name: 'Delete this record' }).click();
  await edit.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(history.getByRole('listitem')).toHaveCount(1);
});

// 卡在哪的一句話：記錄時寫，題目頁的紀錄和之後複習時看得到，也可以改
test('writes where exactly I got stuck, and sees it again on the problem page and in review', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: /^Done today/ }).getByRole('button', { name: 'Record another problem' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record another problem' });
  await dialog.getByLabel('Problem number, title, or LeetCode URL').fill('1');
  await dialog.getByRole('button', { name: 'Find problem' }).click();
  await dialog.getByRole('button', { name: /Needed a hint/ }).click();
  await dialog.getByRole('button', { name: 'Logic / edge cases' }).click();
  await dialog.getByLabel('What exactly tripped you up (optional)').fill('  forgot the empty array  ');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.goto('/#/problems/1');
  const history = page.getByRole('region', { name: /^History/ });
  await expect(history.locator('q')).toHaveText('forgot the empty array');

  // 改紀錄時一起改
  await history.getByRole('button', { name: /^Edit the record from/ }).click();
  const edit = page.getByRole('dialog', { name: 'Edit this record' });
  const note = edit.getByLabel('What exactly tripped you up (optional)');
  await expect(note).toHaveValue('forgot the empty array');
  await note.fill('forgot the empty array and the single element');
  await edit.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(history.locator('q')).toHaveText('forgot the empty array and the single element');

  // 幾天後複習：看完自己的筆記，下面列出以前卡在哪
  await page.clock.setFixedTime(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Just recall it' }).click();
  await expect(page.getByRole('heading', { name: 'Where you got stuck before' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show my notes' }).click();
  const before = page.getByRole('heading', { name: 'Where you got stuck before' }).locator('..');
  await expect(before).toContainText('Logic / edge cases');
  await expect(before.locator('q')).toHaveText('forgot the empty array and the single element');
});
