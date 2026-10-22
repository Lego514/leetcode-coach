import { expect, test } from '@playwright/test';

// 側邊欄依用途分組：每天都會用的、面試練習、查資料和工具、其他
test('groups the sidebar by how often each page is used @desktop', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const groups = nav.locator('.nav-list');
  await expect(groups).toHaveCount(4);
  const names = async (i: number) => (await groups.nth(i).getByRole('link').allTextContents()).map((s) => s.replace(/\d+$/, '').trim());
  expect(await names(0)).toEqual(['Today', 'Review', 'Flashcards', 'Progress']);
  expect(await names(1)).toEqual(['Mock interview', 'Behavioral', 'Interview sprint']);
  expect(await names(2)).toEqual(['Problems', 'Patterns', 'Phrases', 'Whiteboard']);
  expect(await names(3)).toEqual(['Settings', 'Report a problem']);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  // 分頁列：今天、複習、進度、題庫、更多；其他的都在「更多」裡
  test('shows Today, Review, Progress, Problems, and More in the tab bar', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('.tabbar .tab');
    await expect(tabs).toHaveText(['Today', /^Review/, 'Progress', 'Problems', 'More']);
    await tabs.nth(2).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Progress' })).toBeVisible();

    await tabs.nth(4).click();
    const more = page.getByRole('navigation', { name: 'More pages' });
    await expect(more.getByRole('link')).toHaveCount(9);
    await expect(more.getByRole('link').first()).toContainText('Flashcards');
    await expect(more.getByRole('link', { name: /^Mock interview/ })).toBeVisible();
    await expect(more.getByRole('link', { name: /^Progress/ })).toHaveCount(0);
  });
});
