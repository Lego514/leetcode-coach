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

  // 用手掌工具平移畫面，再放一個元件；存檔之後畫面不應該跳回中間
  await page.keyboard.press('h');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + box.height - 120);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + box.height - 220, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press('v');
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
  await expect(other.getByRole('group', { name: /^Array nums/ })).toHaveCount(1);
  await expect(other.getByRole('group', { name: /^Variable/ })).toHaveCount(0);

  await page.goBack();
  const first = page.getByRole('dialog', { name: '1. Two Sum' });
  await expect(first.getByRole('group', { name: /^Variable ans/ })).toBeVisible();
  await expect(first.getByRole('group', { name: /^Array nums/ })).toHaveCount(0);
});

test('connects nodes with a plain line, then selects, duplicates, and deletes a group with a box', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Graph node', exact: true }).click();
  await page.getByRole('button', { name: 'Graph node', exact: true }).click();
  const nodes = page.getByRole('group', { name: /^Graph node/ });
  const a = (await nodes.nth(0).boundingBox())!;
  const b = (await nodes.nth(1).boundingBox())!;

  // L 畫直線（沒有箭頭），點一下可以選取並改成箭頭
  await page.keyboard.press('l');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.press('v');
  const selection = page.getByRole('toolbar', { name: 'Selected element' });
  const midX = (a.x + a.width / 2 + b.x + b.width / 2) / 2;
  const midY = (a.y + a.height / 2 + b.y + b.height / 2) / 2;
  await page.mouse.click(midX, midY);
  await expect(selection.getByRole('button', { name: 'Add an arrowhead' })).toBeVisible();

  // 在空白處拖曳框住兩個節點和直線：一起複製，再一起刪掉
  const left = Math.min(a.x, b.x) - 24;
  const top = Math.min(a.y, b.y) - 24;
  const right = Math.max(a.x + a.width, b.x + b.width) + 24;
  const bottom = Math.max(a.y + a.height, b.y + b.height) + 24;
  await page.mouse.move(left, top);
  await page.mouse.down();
  await page.mouse.move(right, bottom, { steps: 5 });
  await page.mouse.up();
  await expect(selection).toContainText('3 selected');
  await page.keyboard.press('Control+d');
  await expect(nodes).toHaveCount(4);
  await expect(selection).toContainText('3 selected');
  await page.keyboard.press('Delete');
  await expect(nodes).toHaveCount(2);
});

test('records steps and plays them back with notes', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  await page.getByRole('button', { name: 'Pointer', exact: true }).click();
  const pointer = page.getByRole('group', { name: /^Pointer i/ });

  // 每一步：記下畫面，再把指標往右移一格
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('s');
    await pointer.click();
    await page.keyboard.press('ArrowRight');
  }
  await expect(pointer).toHaveAccessibleName('Pointer i at index 3');

  await page.getByRole('button', { name: 'Play all 3 steps from the start' }).click();
  const playback = page.getByRole('toolbar', { name: 'Step playback' });
  await expect(playback).toContainText('Step 1 of 3');
  await expect(pointer).toHaveAccessibleName('Pointer i at index 0');
  await playback.getByRole('textbox', { name: 'What happens in step 1' }).fill('i starts at the first cell');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(playback).toContainText('Step 2 of 3');
  await expect(pointer).toHaveAccessibleName('Pointer i at index 1');
  // 播放時不能編輯，元件庫停用
  await expect(page.getByRole('toolbar', { name: 'Tools' })).toBeHidden();

  // 從第 2 步繼續編輯：畫面換成那一步
  await playback.getByRole('button', { name: 'Continue editing from here' }).click();
  await expect(playback).toBeHidden();
  await expect(pointer).toHaveAccessibleName('Pointer i at index 1');

  // 說明會存起來
  await page.getByRole('button', { name: 'Play all 3 steps from the start' }).click();
  await expect(playback.getByRole('textbox', { name: 'What happens in step 1' })).toHaveValue('i starts at the first cell');
  await playback.getByRole('button', { name: 'Delete step' }).click();
  await expect(playback).toContainText('Step 1 of 2');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Play all 2 steps from the start' })).toBeVisible();
});

test('exports the board, or the step being played, as a PNG', async ({ page }) => {
  await page.goto('/#/board/scratch');
  const exportButton = page.getByRole('button', { name: 'Export image' });
  await expect(exportButton).toBeDisabled();
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  await page.getByRole('button', { name: 'Pointer', exact: true }).click();

  const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);
  expect(download.suggestedFilename()).toBe('whiteboard.png');
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const png = readFileSync(path);
  // PNG 檔頭，而且不是空白小圖
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.length).toBeGreaterThan(2000);

  // 播放時匯出的是那一步
  await page.keyboard.press('s');
  await page.getByRole('button', { name: 'Play the step from the start' }).click();
  const [stepDownload] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);
  expect(stepDownload.suggestedFilename()).toBe('whiteboard-step-1.png');
});
