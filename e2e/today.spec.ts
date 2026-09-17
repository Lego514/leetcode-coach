import { expect, test, type Page } from '@playwright/test';

const newList = (page: Page) => page.getByRole('region', { name: /^New problems for today/ });
const doneList = (page: Page) => page.getByRole('region', { name: /^Done today/ });

test('adds one more new problem after the daily goal', async ({ page }) => {
  await page.goto('/');
  await expect(newList(page).getByRole('listitem')).toHaveCount(3);
  await newList(page).getByRole('button', { name: 'One more problem' }).click();
  await expect(newList(page).getByRole('listitem')).toHaveCount(4);
});

test('records problems outside the daily list, adding missing ones first', async ({ page }) => {
  await page.goto('/');

  // 清單裡有的題目：貼網址就找得到
  await doneList(page).getByRole('button', { name: 'Record another problem' }).click();
  let dialog = page.getByRole('dialog', { name: 'Record another problem' });
  await dialog.getByLabel('Problem number, title, or LeetCode URL').fill('https://leetcode.com/problems/median-of-two-sorted-arrays/');
  await dialog.getByRole('button', { name: 'Find problem' }).click();
  await expect(dialog).toContainText('Median of Two Sorted Arrays');
  await dialog.getByRole('button', { name: /Solved alone/ }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(doneList(page)).toContainText('Median of Two Sorted Arrays');
  // 自己加練的新題也算進每天的目標
  await expect(newList(page).getByRole('listitem')).toHaveCount(2);

  // 題庫沒有的題目：先補資料再記錄
  await doneList(page).getByRole('button', { name: 'Record another problem' }).click();
  dialog = page.getByRole('dialog', { name: 'Record another problem' });
  await dialog.getByLabel('Problem number, title, or LeetCode URL').fill('3999');
  await dialog.getByRole('button', { name: 'Find problem' }).click();
  await expect(dialog).toContainText('This problem isn’t in your list yet');
  await expect(dialog.getByLabel('Number', { exact: true })).toHaveValue('3999');
  await dialog.getByLabel('Title', { exact: true }).fill('Practice Problem');
  await dialog.getByLabel('LeetCode URL').fill('https://leetcode.com/problems/practice-problem/');
  await dialog.getByRole('button', { name: 'Add problem' }).click();
  await dialog.getByRole('button', { name: /Needed a hint/ }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(doneList(page)).toContainText('Practice Problem');
  await expect(newList(page).getByRole('listitem')).toHaveCount(1);

  // 找不到時說明原因
  await doneList(page).getByRole('button', { name: 'Record another problem' }).click();
  dialog = page.getByRole('dialog', { name: 'Record another problem' });
  await dialog.getByLabel('Problem number, title, or LeetCode URL').fill('no such problem');
  await dialog.getByRole('button', { name: 'Find problem' }).click();
  await expect(dialog.getByRole('alert')).toContainText('No matching problem');
});

test('marks problems solved before without counting them as practice', async ({ page }) => {
  await page.goto('/#/problems?list=neetcode150');
  await page.getByRole('button', { name: 'Mark problems I solved before' }).click();

  const group = page.getByRole('region', { name: /^Arrays & Hashing/ });
  await group.getByRole('button', { name: 'Select all in this group' }).click();
  const bar = page.getByRole('region', { name: 'Mark problems you solved before' }).last();
  const total = await group.getByRole('checkbox').count();
  expect(total).toBeGreaterThan(2);
  await expect(bar).toContainText(`${total} problems selected`);
  await group.getByRole('checkbox', { name: 'Select Two Sum' }).uncheck();
  const marked = total - 1;
  await expect(bar).toContainText(`${marked} problems selected`);

  await bar.getByRole('button', { name: 'Roughly remember' }).click();
  await expect(bar).toContainText('First review in 2 days');
  await bar.getByRole('button', { name: `Mark ${marked} problems` }).click();
  await expect(page.getByRole('status')).toContainText(`Scheduled ${marked} problems for review.`);
  await expect(bar).toContainText('0 problems selected');
  // 標記過的題目不能再選
  await expect(group.getByRole('checkbox')).toHaveCount(1);
  await bar.getByRole('button', { name: 'Done' }).click();
  await expect(group).toContainText('Next review');

  // 不算今天的練習，也不佔新題額度：清單從還沒標記的 Two Sum 開始
  await page.goto('/');
  await expect(doneList(page)).toContainText('Nothing recorded yet');
  await expect(newList(page).getByRole('listitem')).toHaveCount(3);
  await expect(newList(page).getByRole('listitem').first()).toContainText('Two Sum');

  await page.goto('/#/progress');
  await expect(page.getByRole('region', { name: 'Overview' })).toContainText('Total sessions0');
});
