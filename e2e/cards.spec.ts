import { expect, test, type Page } from '@playwright/test';

const cardsSheet = (page: Page) => page.getByRole('region', { name: /^Flashcards/ });
const verdict = (page: Page) => page.getByRole('status').filter({ hasText: /^(Correct|Not quite|No worries, here’s the answer)$/ });

/**
 * 答一張卡，記下看過的正確答案：重考時選對的那個，其他時候選第一個或按「我不知道」。
 * 翻面卡翻開後選「I could」。
 */
async function answerCard(page: Page, known: Map<string, string>, { unknown = false } = {}) {
  const reveal = page.getByRole('button', { name: 'Show the reference' });
  if (await reveal.isVisible()) {
    await reveal.click();
    await page.getByRole('button', { name: /I could/ }).click();
    return;
  }
  const key = await page.locator('.flash-card').innerText();
  const answer = known.get(key);
  // 無障礙名稱會把換行壓成空白（多行的輸出選項）
  if (answer) await page.getByRole('list').getByRole('button', { name: answer.split(String.fromCharCode(10)).join(' '), exact: true }).click();
  else if (unknown) await page.getByRole('button', { name: 'I don’t know' }).click();
  else await page.getByRole('list').getByRole('button').first().click();

  await expect(verdict(page)).toHaveCount(1);
  if ((await verdict(page).textContent()) !== 'Correct') {
    // 答錯或不知道時，底部面板會寫出正確答案
    const solution = page.locator('.flash-solution .flash-option-text');
    await expect(solution).toBeVisible();
    known.set(key, await solution.innerText());
  }
  await page.getByRole('button', { name: /^(Next|See results)$/ }).click();
}

/** 一直答到結果頁；答錯的卡會在最後重考 */
async function finishRound(page: Page, known: Map<string, string>) {
  const done = page.getByRole('heading', { name: 'Round complete' });
  for (let i = 0; i < 20 && !(await done.isVisible()); i += 1) await answerCard(page, known);
  await expect(done).toBeVisible();
}

test('does a round, retries the missed card, and counts it toward the streak', async ({ page }) => {
  await page.goto('/');
  await cardsSheet(page).getByRole('link', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Flashcards' })).toBeVisible();
  await expect(page.getByText('Card 1 of 5')).toBeVisible();

  const known = new Map<string, string>();
  // 第一張按「我不知道」，五張答完之後會重考它
  await answerCard(page, known, { unknown: true });
  for (let i = 2; i <= 5; i += 1) {
    await expect(page.getByText(`Card ${i} of 5`)).toBeVisible();
    await answerCard(page, known);
  }
  await expect(page.getByText(/^Retry: \d+ left$/)).toBeVisible();
  await finishRound(page, known);

  const missed = page.getByRole('region', { name: 'Cards you missed this round' });
  await expect(missed).toContainText('Correct answer:');
  await expect(missed.getByRole('listitem')).toHaveCount(known.size);
  await expect(page.getByText('1-day streak')).toBeVisible();

  // 再來一回合會重新發牌；中途離開，已經答的卡也算數
  await page.getByRole('button', { name: 'Another round' }).click();
  await expect(page.getByText('Card 1 of 5')).toBeVisible();
  await answerCard(page, known);
  await page.getByRole('link', { name: 'End' }).click();
  await expect(cardsSheet(page)).toContainText(/\d+ cards reviewed today/);
  const goal = page.getByRole('region', { name: 'Today’s goal' });
  await expect(goal).toContainText('1-day streak');
  // 只做了卡片：打卡了，但新題還沒做，不能說今天都完成了
  const tasks = goal.getByRole('list', { name: 'Today’s progress' });
  await expect(tasks.getByRole('listitem')).toHaveText(['Checked in today', 'New 0/3']);
  await expect(goal).toContainText('Checked in, so your streak continues. New problems and reviews are still left.');
  await expect(goal).not.toContainText('all done');
});

test('practices one topic and remembers the choice', async ({ page }) => {
  await page.goto('/#/cards');
  await page.getByLabel('Topic').selectOption({ label: 'Python tips' });
  await expect(page.getByText('Card 1 of 5')).toBeVisible();
  await expect(page.locator('.flash-kind')).toHaveText('Python tip');

  // 還沒做過這個模式的題目時，說明為什麼沒有卡片
  await page.getByLabel('Topic').selectOption({ label: 'Bit Manipulation' });
  await expect(page.getByRole('heading', { name: 'No cards here yet' })).toBeVisible();

  await page.getByLabel('Topic').selectOption({ label: 'Python tips' });
  await page.reload();
  await expect(page.getByLabel('Topic')).toHaveValue('tips');
  await expect(page.locator('.flash-kind')).toHaveText('Python tip');
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
    await expect(verdict(page)).toHaveCount(1);
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText('Card 2 of 5')).toBeVisible();
});

test('counts down a rest between sets', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/cards');
  await page.getByRole('combobox', { name: 'Rest' }).selectOption({ label: '60 seconds' });
  await page.getByRole('button', { name: 'Start a 60-second rest timer' }).click();
  await expect(page.getByRole('button', { name: 'Stop the rest timer' })).toContainText('1:00');

  await page.clock.fastForward('00:30');
  await expect(page.getByRole('button', { name: 'Stop the rest timer' })).toContainText('0:30');
  // 計時中照樣答題
  await page.getByRole('button', { name: 'I don’t know' }).click();

  await page.clock.fastForward('00:31');
  await expect(page.getByRole('alert')).toContainText('Rest is over');
  await expect(page.getByRole('button', { name: 'Start a 60-second rest timer' })).toBeVisible();
  await page.getByRole('alert').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('alert')).toBeHidden();
});

test('does not repeat cards answered today, and offers everything when a topic runs out', async ({ page }) => {
  // 做過一題堆疊的題目：這個模式只有三張卡
  await page.goto('/');
  await page.getByRole('region', { name: /^Done today/ }).getByRole('button', { name: 'Record another problem' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record another problem' });
  await dialog.getByLabel('Problem number, title, or LeetCode URL').fill('20');
  await dialog.getByRole('button', { name: 'Find problem' }).click();
  await dialog.getByRole('button', { name: /Solved alone/ }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.goto('/#/cards');
  await page.getByLabel('Topic').selectOption({ label: 'Stack' });
  await expect(page.getByText('Card 1 of 3')).toBeVisible();
  await expect(page.getByText('Only 3 cards in this topic are left for today.')).toBeVisible();

  // 答錯的卡今天還會再出；全部答對之後，這個範圍今天就沒有卡了
  const known = new Map<string, string>();
  const allDone = page.getByRole('heading', { name: 'You’ve done every card in this topic today' });
  for (let round = 0; round < 4 && !(await allDone.isVisible()); round += 1) {
    await finishRound(page, known);
    await page.getByRole('button', { name: 'Another round' }).click();
    await expect(page.getByText(/^Card 1 of \d$/).or(allDone)).toBeVisible();
  }
  await expect(allDone).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Everything' }).click();
  await expect(page.getByLabel('Topic')).toHaveValue('all');
  await expect(page.getByText('Card 1 of 5')).toBeVisible();
});
