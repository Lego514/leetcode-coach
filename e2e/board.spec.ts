import { expect, test } from '@playwright/test';

test('sketches an array with a pointer and keeps it after reloading', async ({ page }) => {
  await page.goto('/#/board/scratch');
  const board = page.getByRole('dialog', { name: 'Scratch whiteboard' });
  await expect(board).toContainText('Click or drag in an element');

  // 先加陣列，陣列還選著時加指標，指標會放在第一格
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  await page.getByRole('button', { name: 'Pointer', exact: true }).click();
  const pointer = page.getByRole('group', { name: /^Pointer i/ });
  await expect(pointer).toHaveAccessibleName('Pointer i at index 0');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(pointer).toHaveAccessibleName('Pointer i at index 2');

  // 第二個指標自動叫 j
  await page.getByRole('group', { name: /^Array nums/ }).click();
  await page.getByRole('button', { name: 'Pointer', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Pointer j at index 0' })).toBeVisible();

  // 雙擊編輯格子，Enter 結束；復原一次會回到編輯前
  const array = page.getByRole('group', { name: /^Array nums/ });
  await array.dblclick();
  await page.getByRole('textbox', { name: 'Cell 0' }).fill('x');
  await page.keyboard.press('Enter');
  await expect(array).toHaveAccessibleName('Array nums: x, 2, 3, 4');
  await page.getByRole('button', { name: 'Undo (Ctrl+Z)' }).click();
  await expect(page.getByRole('group', { name: 'Array nums: 1, 2, 3, 4' })).toBeVisible();
  await page.getByRole('button', { name: 'Redo (Ctrl+Shift+Z)' }).click();
  await expect(page.getByRole('group', { name: 'Array nums: x, 2, 3, 4' })).toBeVisible();

  await expect(page.getByText('Saved on this device')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('group', { name: 'Array nums: x, 2, 3, 4' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Pointer i at index 2' })).toBeVisible();
});

test('opens a problem’s whiteboard from practice without stopping the timer', async ({ page }) => {
  await page.goto('/#/practice/1');
  await expect(page.getByRole('heading', { name: '1. Two Sum' })).toBeVisible();
  await page.getByRole('button', { name: 'Sketch it on the whiteboard' }).click();
  const board = page.getByRole('dialog', { name: '1. Two Sum' });
  await page.getByRole('button', { name: 'Dict', exact: true }).click();
  await expect(board.getByRole('group', { name: /^Dict count/ })).toBeVisible();
  await expect(board.getByText('Saved on this device')).toBeVisible();
  await board.getByRole('button', { name: 'Close' }).click();
  await expect(board).toBeHidden();
  await expect(page.getByRole('region', { name: 'Timer' })).toBeVisible();

  // 從題目頁打開的是同一張白板（開新分頁，練習頁的離開確認才不會擋住）
  const other = await page.context().newPage();
  await other.goto('/#/problems/1');
  await other.getByRole('main').getByRole('link', { name: 'Whiteboard', exact: true }).click();
  await expect(other.getByRole('dialog', { name: '1. Two Sum' }).getByRole('group', { name: /^Dict count/ })).toBeVisible();
  await other.getByRole('button', { name: 'Close' }).click();
  await expect(other.getByRole('heading', { name: '1. Two Sum' })).toBeVisible();
});

test('adds, highlights, and inserts single cells of an array', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  const array = page.getByRole('group', { name: /^Array nums/ });

  // 陣列最後的「＋」多一格，直接輸入
  await page.getByRole('button', { name: 'Add cell' }).click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(array).toHaveAccessibleName('Array nums: 1, 2, 3, 4, 5');

  // 點一格：上底色、在這格加指標
  await array.getByTitle('3', { exact: true }).click();
  const cellBar = page.getByRole('toolbar', { name: 'Selected element' });
  await expect(cellBar).toContainText('Cell 2');
  await cellBar.getByRole('button', { name: 'Yellow' }).click();
  await cellBar.getByRole('button', { name: '+ Pointer' }).click();
  await expect(page.getByRole('group', { name: 'Pointer i at index 2' })).toBeVisible();

  // 在第 1 格左邊插入：指標跟著原本的值往後一格
  await array.getByTitle('2', { exact: true }).click();
  await cellBar.getByRole('button', { name: 'Insert left' }).click();
  await page.keyboard.type('9');
  await page.keyboard.press('Enter');
  await expect(array).toHaveAccessibleName('Array nums: 1, 9, 2, 3, 4, 5');
  await expect(page.getByRole('group', { name: 'Pointer i at index 3' })).toBeVisible();
});

test('keeps the view where it is after adding something', async ({ page }) => {
  await page.goto('/#/board/scratch');
  const canvas = page.getByRole('region', { name: 'Whiteboard canvas' });
  const world = canvas.locator('.board-world');
  await page.getByRole('button', { name: 'Heading', exact: true }).click();
  await expect(page.getByText('Saved on this device')).toBeVisible();

  // 拖曳空白處平移畫面，再放一個元件；存檔之後畫面不應該跳回中間
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + box.height - 120);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + box.height - 220, { steps: 5 });
  await page.mouse.up();
  const panned = await world.getAttribute('style');

  await page.getByRole('button', { name: 'Variable', exact: true }).click();
  await expect(page.getByText('Saving…')).toBeVisible();
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await page.waitForTimeout(300);
  expect(await world.getAttribute('style')).toBe(panned);
});

test('clears the canvas after confirming, and undo brings it back', async ({ page }) => {
  await page.goto('/#/board/scratch');
  const clear = page.getByRole('button', { name: 'Clear canvas' });
  await expect(clear).toBeDisabled();
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  await page.getByRole('button', { name: 'Sticky note', exact: true }).click();

  // 先問一次；取消就什麼都不動
  await clear.click();
  const confirm = page.getByRole('dialog', { name: 'Clear the whole whiteboard?' });
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('group', { name: /^Array nums/ })).toBeVisible();

  await clear.click();
  await confirm.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByText('Click or drag in an element')).toBeVisible();
  await expect(clear).toBeDisabled();

  await page.getByRole('button', { name: 'Undo (Ctrl+Z)' }).click();
  await expect(page.getByRole('group', { name: /^Array nums/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Sticky note/ })).toBeVisible();
});

test('frames part of an array with a rectangle without blocking it', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  const array = page.getByRole('group', { name: /^Array nums/ });
  const first = (await array.getByTitle('2', { exact: true }).boundingBox())!;
  const second = (await array.getByTitle('3', { exact: true }).boundingBox())!;

  // R 畫矩形框，框住第 1、2 格
  await page.keyboard.press('r');
  await page.mouse.move(first.x - 12, first.y - 12);
  await page.mouse.down();
  await page.mouse.move(second.x + second.width + 12, second.y + second.height + 12, { steps: 5 });
  await page.mouse.up();
  const frame = page.getByRole('group', { name: 'Rectangle' });
  await expect(frame).toBeVisible();

  // 框住的格子照樣點得到
  await array.getByTitle('2', { exact: true }).click();
  await expect(page.getByRole('toolbar', { name: 'Selected element' })).toContainText('Cell 1');

  // 點框線選取框框，拖右下角變大，Delete 刪掉
  const box = (await frame.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + 1);
  await expect(page.getByRole('toolbar', { name: 'Selected element' })).not.toContainText('Cell');
  await page.mouse.move(box.x + box.width + 2, box.y + box.height + 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 42, box.y + box.height + 22, { steps: 4 });
  await page.mouse.up();
  expect((await frame.boundingBox())!.width).toBeGreaterThan(box.width + 30);
  await page.keyboard.press('Delete');
  await expect(frame).toBeHidden();
  await expect(array).toBeVisible();
});

test('lists my whiteboards and says where they are stored', async ({ page }) => {
  // 先在第 1 題的白板放一個東西
  await page.goto('/#/board/1');
  const board = page.getByRole('dialog', { name: '1. Two Sum' });
  await expect(board).toContainText('Problem whiteboard');
  await page.getByRole('button', { name: 'Variable', exact: true }).click();
  await expect(board.getByText('Saved on this device')).toBeVisible();

  await page.goto('/#/board');
  await expect(page.getByRole('heading', { level: 1, name: 'My whiteboards' })).toBeVisible();
  await expect(page.getByText('Whiteboards are stored in this browser on this device')).toBeVisible();
  const list = page.getByRole('region', { name: /^Problem whiteboards/ });
  await expect(list).toContainText('1 element');

  await list.getByRole('link', { name: '1. Two Sum' }).click();
  await expect(page.getByRole('dialog', { name: '1. Two Sum' }).getByRole('group', { name: /^Variable ans/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  // 刪除前先確認
  await list.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog', { name: 'Delete this whiteboard?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(list).toContainText('No problem whiteboards yet');
});

test('switching straight from one whiteboard to another never mixes them up', async ({ page }) => {
  await page.goto('/#/board/1');
  await page.getByRole('button', { name: 'Variable', exact: true }).click();
  await expect(page.getByText('Saved on this device')).toBeVisible();

  // 在同一個分頁直接換網址到另一題的白板（像按瀏覽器的上一頁、下一頁）
  await page.evaluate(() => (window.location.hash = '#/board/3'));
  const other = page.getByRole('dialog', { name: /^3\. / });
  await expect(other).toContainText('Click or drag in an element');
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  await expect(other.getByText('Saved on this device')).toBeVisible();
  await expect(other.getByRole('group')).toHaveCount(1);

  await page.goBack();
  const first = page.getByRole('dialog', { name: '1. Two Sum' });
  await expect(first.getByRole('group', { name: /^Variable ans/ })).toBeVisible();
  await expect(first.getByRole('group')).toHaveCount(1);
});
