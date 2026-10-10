import { expect, test } from '@playwright/test';

test('writes STAR stories, tags their themes, and shows which questions still need one', async ({ page }) => {
  await page.goto('/#/stories');
  await expect(page.getByRole('heading', { level: 1, name: 'Behavioral interviews' })).toBeVisible();
  const coverage = page.getByRole('region', { name: 'Coverage' });
  await expect(coverage).toContainText('0 of 10 themes have a story');

  // 新增一個故事：標題、主題、STAR 四段；點開頭句會接在那一段後面
  await page.getByRole('button', { name: 'New story' }).click();
  await page.getByLabel('Title').fill('Fixing the flaky data pipeline');
  await page.getByRole('button', { name: 'Failure', exact: true }).click();
  await page.getByRole('button', { name: 'Deadlines', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Failure', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Situation', { exact: true }).fill('Our nightly jobs failed twice a week during my internship.');
  await page.getByLabel('Action', { exact: true }).fill('I traced the failures to a race and added retries with alerts.');
  await page.getByRole('button', { name: 'As a result, …' }).click();
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue('As a result, ');
  await expect(page.getByText(/words, about [\d.]+ min to say/)).toBeVisible();
  await expect(page.getByText('Saved', { exact: false })).toBeVisible();

  // 回到列表：兩個主題有故事了
  await page.getByRole('link', { name: '← All stories' }).click();
  await expect(coverage).toContainText('2 of 10 themes have a story');
  await expect(page.getByRole('region', { name: 'My stories' })).toContainText('Fixing the flaky data pipeline');
  await expect(coverage.getByRole('button', { name: /^Failure/ })).toContainText('1 story');

  // 還沒有故事的主題：看它的題目，直接幫它寫一個
  await coverage.getByRole('button', { name: /^Conflict/ }).click();
  const questions = page.getByRole('region', { name: 'Questions: Conflict' });
  await expect(questions.getByRole('listitem')).toHaveCount(3);
  await questions.getByRole('button', { name: 'Write a story for this' }).first().click();
  await expect(page.getByRole('button', { name: 'Conflict', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // 刪掉這個空白的故事
  await page.getByRole('button', { name: 'Delete story' }).click();
  await page.getByRole('dialog', { name: 'Delete this story?' }).getByRole('button', { name: 'Delete story' }).click();
  await expect(page.getByRole('status')).toContainText('Story deleted');
  await expect(page.getByRole('region', { name: 'My stories' }).getByRole('listitem')).toHaveCount(1);
});
