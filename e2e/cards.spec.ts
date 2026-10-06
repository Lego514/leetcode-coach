import { expect, test, type Page } from '@playwright/test';

const cardsSheet = (page: Page) => page.getByRole('region', { name: /^Flashcards/ });

/** 答一張卡：選擇題點第一個選項（或「我不知道」），翻面卡翻開後選「I could」 */
async function answerCard(page: Page, { unknown = false } = {}) {
  const reveal = page.getByRole('button', { name: 'Show the reference' });
  if (await reveal.isVisible()) {
    await reveal.click();
    await page.getByRole('button', { name: /I could/ }).click();
    return;
  }
  if (unknown) {
    // 不知道就直接看答案，不用亂猜
    await page.getByRole('button', { name: 'I don’t know' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'No worries, here’s the answer' })).toHaveCount(1);
    await expect(page.getByText(/^Correct answer:/)).toBeVisible();
  } else {
    await page.getByRole('list').getByRole('button').first().click();
    const verdict = page.getByRole('status').filter({ hasText: /^(Correct|Not quite)$/ });
    await expect(verdict).toHaveCount(1);
    // 答錯時底部面板會寫出正確答案
    if ((await verdict.textContent()) === 'Not quite') await expect(page.getByText(/^Correct answer:/)).toBeVisible();
  }
  await page.getByRole('button', { name: /^(Next|See results)$/ }).click();
}

test('does a round of flashcards and counts it toward the streak', async ({ page }) => {
  await page.goto('/');
  await cardsSheet(page).getByRole('link', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Flashcards' })).toBeVisible();

  for (let i = 1; i <= 5; i += 1) {
    await expect(page.getByText(`Card ${i} of 5`)).toBeVisible();
    await answerCard(page, { unknown: i === 1 });
  }

  await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible();
  await expect(page.getByText('5 cards reviewed today')).toBeVisible();
  await expect(page.getByText('1-day streak')).toBeVisible();

  // 再來一回合會重新發牌
  await page.getByRole('button', { name: 'Another round' }).click();
  await expect(page.getByText('Card 1 of 5')).toBeVisible();

  // 中途離開，已經答的卡也算數
  await answerCard(page);
  await page.getByRole('link', { name: 'End' }).click();
  await expect(cardsSheet(page)).toContainText('6 cards reviewed today');
  await expect(page.getByRole('region', { name: /^Done today/ })).toContainText('1-day streak');
});

test('answers with the keyboard', async ({ page }) => {
  await page.goto('/#/cards');
  await expect(page.getByText('Card 1 of 5')).toBeVisible();
  const reveal = page.getByRole('button', { name: 'Show the reference' });
  if (await reveal.isVisible()) {
    await page.keyboard.press('Enter');
    await page.keyboard.press('1');
  } else {
    await page.keyboard.press('1');
    await expect(page.getByRole('status').filter({ hasText: /^(Correct|Not quite)$/ })).toHaveCount(1);
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText('Card 2 of 5')).toBeVisible();
});
