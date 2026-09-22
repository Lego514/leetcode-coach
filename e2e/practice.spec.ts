import { expect, test } from '@playwright/test';

const DAY_MS = 24 * 60 * 60 * 1000;

test('practice a new problem with hints, then review it once it is due', async ({ page }) => {
  await page.goto('/#/practice/1');
  await expect(page.getByRole('heading', { level: 1, name: '1. Two Sum' })).toBeVisible();
  // 在 LeetCode 分頁也看得到計時
  await expect(page).toHaveTitle(/^\d+:\d{2} Two Sum \| LeetCode Coach$/);

  await page.getByRole('button', { name: /Give me a hint/ }).click();
  await expect(page.getByText('Hint 1: Which direction to think')).toBeVisible();
  await page.getByRole('button', { name: /Another hint/ }).click();
  await expect(page.getByText('Hint 2: Key insight')).toBeVisible();

  // 離開前會先確認
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Problems' }).click();
  const leave = page.getByRole('dialog', { name: 'Leave this practice session?' });
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: 'Stay' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '1. Two Sum' })).toBeVisible();

  await page.getByRole('button', { name: 'I’m done' }).click();
  // 用過提示，評分預先選好「Needed a hint」
  await expect(page.getByRole('button', { name: /Needed a hint/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Key idea in one line').fill('Hash map from value to index');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('Saved. Next review');
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Done today' })).toContainText('Two Sum');

  // 幾天後題目到期，出現在複習佇列
  await page.clock.setFixedTime(new Date(Date.now() + 5 * DAY_MS));
  await page.goto('/#/review');
  await expect(page.getByRole('heading', { level: 2, name: '1. Two Sum' })).toBeVisible();
  await page.getByRole('button', { name: 'Show my notes' }).click();
  await expect(page.getByText('Hash map from value to index', { exact: true })).toBeVisible();
  // 參考講法預設收起，自己想過再展開
  const reference = page.getByText('The key insight is that for each number x');
  await expect(reference).toBeHidden();
  await page.getByText('Show reference explanation').click();
  await expect(reference).toBeVisible();
  await page.getByRole('button', { name: /Solved alone/ }).click();
  await expect(page.getByRole('heading', { name: 'Reviewed 1 problem today' })).toBeVisible();
});

test('filters the problem list and keeps filters in the URL', async ({ page }) => {
  await page.goto('/#/problems');
  await page.getByLabel('Difficulty').first().selectOption('Hard');
  await page.getByRole('searchbox', { name: 'Search' }).fill('median');
  await expect(page).toHaveURL(/difficulty=Hard/);
  await expect(page.getByRole('link', { name: 'Find Median from Data Stream' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Two Sum' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('median');
});

test('filters the problem list by a tagged company', async ({ page }) => {
  await page.goto('/#/problems/1');
  const companies = page.getByRole('region', { name: /^Companies/ });
  await companies.getByLabel('Add company').fill('Google');
  await companies.getByLabel('Add company').press('Enter');
  await expect(companies).toContainText('Google');

  await page.goto('/#/problems');
  await expect(page.getByRole('heading', { level: 1, name: 'Problems' })).toBeVisible();
  await page.getByLabel('Company').selectOption('Google');
  await expect(page.getByRole('link', { name: 'Two Sum' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Valid Anagram' })).toHaveCount(0);
});
