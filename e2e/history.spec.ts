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
  await edit.getByRole('button', { name: 'Missed an edge case' }).click();
  await edit.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(history).toContainText('Still stuck');
  await expect(history).toContainText('Missed an edge case');

  // 刪掉一筆，剩一筆
  await history.getByRole('button', { name: /^Edit the record from/ }).last().click();
  await edit.getByRole('button', { name: 'Delete this record' }).click();
  await edit.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(history.getByRole('listitem')).toHaveCount(1);
});
