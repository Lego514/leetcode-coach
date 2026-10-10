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
  await page.getByRole('button', { name: 'Text', exact: true }).click();
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

test('connects elements with a plain line, then selects, duplicates, and deletes a group with a box', async ({ page }) => {
  await page.goto('/#/board/scratch');
  // 元件庫已經沒有單一的圖節點，用兩個變數來連
  await page.getByRole('button', { name: 'Variable', exact: true }).click();
  await page.getByRole('button', { name: 'Variable', exact: true }).click();
  const nodes = page.getByRole('group', { name: /^Variable/ });
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

test('builds a linked list from text, flips a link, and points the tail back', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Linked list', exact: true }).click();
  const list = page.getByRole('group', { name: /^Linked list head/ });
  await expect(list).toHaveAccessibleName('Linked list head: 1 → 2 → 3');

  // 直接貼題目的範例
  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  await selbar.getByRole('button', { name: 'Build from text' }).click();
  const input = selbar.getByRole('textbox', { name: 'Build from text' });
  await expect(input).toHaveValue('1->2->3');
  await input.fill('1->2->3->4->5');
  await selbar.getByRole('button', { name: 'Apply' }).click();
  await expect(list).toHaveAccessibleName('Linked list head: 1 → 2 → 3 → 4 → 5');
  await expect(list).toContainText('null');

  // 點兩個節點之間的箭頭：往後 → 反過來 → 斷開
  await list.getByRole('button', { name: /^Link between node 0 and 1: forward/ }).click();
  await expect(list.getByRole('button', { name: /^Link between node 0 and 1: reversed/ })).toBeVisible();
  await list.getByRole('button', { name: /^Link between node 0 and 1: reversed/ }).click();
  await expect(list.getByRole('button', { name: /^Link between node 0 and 1: cut/ })).toBeVisible();

  // 選著串列時加指標，指標吸附在第一個節點下面，方向鍵一格一格走
  await page.getByRole('button', { name: 'Pointer', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Pointer i at index 0' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('group', { name: 'Pointer i at index 1' })).toBeVisible();

  // 點一個節點，讓尾巴接回這裡（有環），尾巴就不再接 null
  await list.locator('[data-cell="1"]').click();
  await selbar.getByRole('button', { name: 'Point the tail here' }).click();
  await expect(list).not.toContainText('null');
  await expect(selbar.getByRole('button', { name: 'Remove cycle' })).toBeVisible();
});

test('builds a binary tree from LeetCode’s format and edits it node by node', async ({ page, isMobile }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Binary tree', exact: true }).click();
  const tree = page.getByRole('group', { name: /^Binary tree root/ });
  await expect(tree).toHaveAccessibleName('Binary tree root: [1,2,3]');

  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  await selbar.getByRole('button', { name: 'Build from text' }).click();
  const input = selbar.getByRole('textbox', { name: 'Build from text' });
  await input.fill('[1,null,2,null,3,null,4,null,5,null,6,null,7]');
  await selbar.getByRole('button', { name: 'Apply' }).click();
  await expect(selbar.getByRole('alert')).toContainText('at most 6 levels');
  await input.fill('[3,9,20,null,null,15,7]');
  await selbar.getByRole('button', { name: 'Apply' }).click();
  await expect(tree).toHaveAccessibleName('Binary tree root: [3,9,20,null,null,15,7]');

  // 選節點 9，加右子節點，直接輸入值。桌面版點畫布上虛線的位置；手機畫面窄，那個位置可能在畫面外，用上方的按鈕
  await tree.locator('[data-cell="1"]').click();
  await expect(selbar).toContainText('Node 9');
  await expect(tree.getByRole('button', { name: '+ Left child' })).toHaveCount(1);
  if (isMobile) await selbar.getByRole('button', { name: '+ Right child' }).click();
  else await tree.getByRole('button', { name: '+ Right child' }).click();
  await page.getByRole('textbox', { name: 'Tree position 4' }).fill('8');
  await page.keyboard.press('Enter');
  await expect(tree).toHaveAccessibleName('Binary tree root: [3,9,20,null,8,15,7]');

  // 在根節點加指標，用方向鍵走到右子節點
  await tree.locator('[data-cell="0"]').click();
  await selbar.getByRole('button', { name: '+ Pointer' }).click();
  await expect(page.getByRole('group', { name: 'Pointer i at node 3' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('group', { name: 'Pointer i at node 20' })).toBeVisible();

  // 刪掉 20 的子樹，指標留在原地；根節點不能刪
  await tree.locator('[data-cell="2"]').click();
  await selbar.getByRole('button', { name: 'Delete this subtree' }).click();
  await expect(tree).toHaveAccessibleName('Binary tree root: [3,9,null,null,8]');
  await expect(page.getByRole('group', { name: 'Pointer i', exact: true })).toBeVisible();
  await tree.locator('[data-cell="0"]').click();
  await expect(selbar.getByRole('button', { name: 'Delete this subtree' })).toBeDisabled();

  await expect(page.getByText('Saved on this device')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('group', { name: 'Binary tree root: [3,9,null,null,8]' })).toBeVisible();
});

test('sets up a whole scene from a template, and turns text into a heading', async ({ page }) => {
  await page.goto('/#/board/scratch');
  const templates = page.getByRole('region', { name: 'Templates' });
  await templates.getByRole('button', { name: /^Reverse linked list/ }).click();
  await expect(page.getByRole('group', { name: 'Linked list head: 1 → 2 → 3 → 4 → 5' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Pointer curr at index 0' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Pointer next at index 1' })).toBeVisible();
  // prev 一開始是 None，不吸附在節點上
  await expect(page.getByRole('group', { name: 'Pointer prev', exact: true })).toBeVisible();
  // 整組一起選取，可以直接拖動或刪除
  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  await expect(selbar).toContainText('4 selected');

  await templates.getByRole('button', { name: /^Grid BFS/ }).click();
  await expect(page.getByRole('group', { name: /^2D array grid/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Queue queue/ })).toBeVisible();
  await expect(selbar).toContainText('3 selected');

  // 元件庫只有「文字」，選取後切換成標題
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await selbar.getByRole('button', { name: 'Make heading' }).click();
  await expect(page.getByRole('group', { name: /^Heading:/ })).toBeVisible();
  await selbar.getByRole('button', { name: 'Make body text' }).click();
  await expect(page.getByRole('group', { name: /^Text:/ })).toBeVisible();
});

test('frames the range between two pointers and keeps it in step as they move', async ({ page }) => {
  await page.goto('/#/board/scratch');
  const templates = page.getByRole('region', { name: 'Templates' });
  await templates.getByRole('button', { name: /^Two pointers/ }).click();

  // 選兩個指標，按「框住兩個指標之間」
  await page.getByRole('group', { name: 'Pointer l at index 0' }).click();
  await page.getByRole('group', { name: 'Pointer r at index 5' }).click({ modifiers: ['Shift'] });
  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  await selbar.getByRole('button', { name: 'Frame between pointers' }).click();
  const frame = page.locator('.board-range');
  await expect(frame).toHaveCount(1);
  const width = async () => Number(await frame.getAttribute('width'));
  const full = await width();

  // r 往左移兩格，框跟著變窄
  await page.getByRole('group', { name: 'Pointer r at index 5' }).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('group', { name: 'Pointer r at index 3' })).toBeVisible();
  expect(await width()).toBe(full - 2 * 44);

  // 刪掉指標，框也一起刪
  await page.keyboard.press('Delete');
  await expect(frame).toHaveCount(0);

  // 滑動視窗模板一開始就有範圍框
  await templates.getByRole('button', { name: /^Sliding window/ }).click();
  await expect(frame).toHaveCount(1);
});

test('builds a graph from an edge list, connects nodes, and marks an edge', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  const graph = page.getByRole('group', { name: /^Graph graph/ });
  await expect(graph).toHaveAccessibleName('Graph graph: n = 4, edges = [[0,1],[0,2],[1,3]]');

  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  await selbar.getByRole('button', { name: 'Build from text' }).click();
  await selbar.getByRole('textbox', { name: 'Build from text' }).fill('n = 5, edges = [[0,1],[0,2],[1,3],[2,4]]');
  await selbar.getByRole('button', { name: 'Apply' }).click();
  await expect(graph).toHaveAccessibleName('Graph graph: n = 5, edges = [[0,1],[0,2],[1,3],[2,4]]');
  await selbar.getByRole('button', { name: 'Make directed' }).click();
  await expect(graph).toHaveAccessibleName(/^Graph graph \(directed\)/);

  // 點最上面的節點 0，用 ← 繞到節點 3（手機上下方的選取列會擋住下面的節點），再連到 4
  await graph.locator('[data-cell="0"]').click();
  await expect(selbar).toContainText('Node 0');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(selbar).toContainText('Node 3');
  await selbar.getByRole('combobox', { name: 'Connect to…' }).selectOption('4');
  await expect(graph).toHaveAccessibleName(/\[3,4\]\]$/);

  // 點第一條邊：標記走過、寫權重
  await graph.locator('[data-edge="0"]').click();
  await expect(selbar).toContainText('Edge 0 → 1');
  await selbar.getByRole('button', { name: 'Mark as visited' }).click();
  await expect(graph.locator('g[data-marked]')).toHaveCount(1);
  const weight = selbar.getByRole('textbox', { name: 'Weight' });
  await weight.fill('4');
  await weight.press('Enter');
  await expect(graph).toHaveAccessibleName(/\[0,1,4\]/);
  await selbar.getByRole('button', { name: 'Delete this edge' }).click();
  await expect(graph).toHaveAccessibleName('Graph graph (directed): n = 5, edges = [[0,2],[1,3],[2,4],[3,4]]');
});

test('fills an array and a dict by pasting a problem’s example', async ({ page }) => {
  await page.goto('/#/board/scratch');
  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  const build = async (text: string) => {
    await selbar.getByRole('button', { name: 'Build from text' }).click();
    const input = selbar.getByRole('textbox', { name: 'Build from text' });
    await input.fill(text);
    await selbar.getByRole('button', { name: 'Apply' }).click();
  };

  // 貼 LeetCode 範例：取第一個陣列，名稱也改成 nums
  await page.getByRole('button', { name: 'Array', exact: true }).click();
  await build('nums = [2,7,11,15], target = 9');
  await expect(page.getByRole('group', { name: 'Array nums: 2, 7, 11, 15' })).toBeVisible();

  // 字串拆成一格一格
  await page.getByRole('button', { name: 'Queue', exact: true }).click();
  await build('"abc"');
  await expect(page.getByRole('group', { name: 'Queue queue: a, b, c' })).toBeVisible();

  // 字典用 Python 的寫法
  await page.getByRole('button', { name: 'Dict', exact: true }).click();
  await build("seen = {'a': 0, 'b': 1}");
  await expect(page.getByRole('group', { name: 'Dict seen: a 0; b 1' })).toBeVisible();
});

test('pushes and pops a heap, records each swap, and fixes a broken order', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Heap', exact: true }).click();
  const heap = page.getByRole('group', { name: /^Heap heap/ });
  await expect(heap).toHaveAccessibleName('Heap heap (min-heap): 1, 3, 2, 7, 4');
  // 樹和陣列畫的是同一份資料
  await expect(heap.locator('.board-tree-node')).toHaveCount(5);
  await expect(heap.locator('.board-heap-array .board-cell')).toHaveCount(5);

  // 記錄每一步：push 0 會往上換兩次，總共三步
  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  await selbar.getByRole('checkbox', { name: 'Record each step for playback' }).check();
  await selbar.getByRole('textbox', { name: 'Value to push' }).fill('0');
  await selbar.getByRole('button', { name: 'Push', exact: true }).click();
  await expect(heap).toHaveAccessibleName('Heap heap (min-heap): 0, 3, 1, 7, 4, 2');
  await expect(page.getByRole('button', { name: 'Play all 3 steps from the start' })).toBeVisible();

  await selbar.getByRole('button', { name: 'Pop', exact: true }).click();
  await expect(page.getByText('Popped 0')).toBeVisible();
  await expect(heap).toHaveAccessibleName('Heap heap (min-heap): 1, 3, 2, 7, 4');

  // 換成最大堆積：順序不對的節點變紅，Heapify 一次修好
  await expect(selbar.getByRole('button', { name: 'Heapify' })).toBeDisabled();
  await selbar.getByRole('button', { name: 'Make max-heap' }).click();
  await expect(heap).toHaveAccessibleName(/^Heap heap \(max-heap\)/);
  await expect(heap.locator('.board-heap-bad')).not.toHaveCount(0);
  await selbar.getByRole('button', { name: 'Heapify' }).click();
  await expect(heap).toHaveAccessibleName('Heap heap (max-heap): 7, 4, 2, 3, 1');
  await expect(heap.locator('.board-heap-bad')).toHaveCount(0);

  // 切換顯示：只看陣列，再只看樹
  await selbar.getByRole('button', { name: 'Show: tree + array' }).click();
  await expect(heap.locator('.board-tree-node')).toHaveCount(0);
  await selbar.getByRole('button', { name: 'Show: array' }).click();
  await expect(heap.locator('.board-heap-array')).toHaveCount(0);
  await expect(selbar.getByRole('button', { name: 'Show: tree' })).toBeVisible();
});

test('traces a recursion tree: returns, pruning, child calls, and a pointer walking in call order', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Recursion tree', exact: true }).click();
  const tree = page.getByRole('group', { name: /^Recursion tree fib/ });
  await expect(tree).toHaveAccessibleName('Recursion tree fib: f(4) (f(3) (f(2) (f(1), f(0)), f(1)), f(2) (f(1), f(0)))');
  // 重複的呼叫標同一個顏色：f(2) 兩次、f(1) 三次
  await expect(tree.locator('.board-rec-node[data-color="yellow"]')).toHaveCount(2);
  await expect(tree.locator('.board-rec-node[data-color="blue"]')).toHaveCount(3);

  // 點右邊的 f(2)：寫回傳值、剪掉這枝、加一個子呼叫
  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  await tree.locator('[data-cell="6"]').click();
  await expect(selbar).toContainText('Node f(2)');
  const ret = selbar.getByRole('textbox', { name: 'Returns' });
  await ret.fill('1');
  await ret.press('Enter');
  await selbar.getByRole('button', { name: 'Prune here' }).click();
  await expect(tree).toHaveAccessibleName(/, f\(2\) = 1 ✕ \(f\(1\), f\(0\)\)\)$/);
  await expect(tree.locator('.board-rec-node[data-pruned]')).toHaveCount(3);
  await selbar.getByRole('button', { name: '+ Child call' }).click();
  await page.getByRole('textbox', { name: 'Call 9' }).fill('f(-1)');
  await page.keyboard.press('Enter');
  await expect(tree).toHaveAccessibleName(/f\(2\) = 1 ✕ \(f\(1\), f\(0\), f\(-1\)\)\)$/);

  // 指標照呼叫的順序走：f(4) → f(3) → f(2)，↑ 回到呼叫者
  await tree.locator('[data-cell="0"]').click();
  await selbar.getByRole('button', { name: '+ Pointer' }).click();
  const pointer = page.getByRole('group', { name: /^Pointer i/ });
  await expect(pointer).toHaveAccessibleName('Pointer i at node f(4)');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(pointer).toHaveAccessibleName('Pointer i at node f(2)');
  await selbar.getByRole('button', { name: 'Back to caller' }).click();
  await expect(pointer).toHaveAccessibleName('Pointer i at node f(3)');

  // 用縮排的文字整個換掉；指標還指得到就留著
  await tree.locator('.board-label').click();
  await selbar.getByRole('button', { name: 'Build from text' }).click();
  await selbar.getByRole('textbox', { name: 'Build from text' }).fill('f(2) => 1\n  f(1) => 1\n  f(0) => 0');
  await selbar.getByRole('button', { name: 'Apply' }).click();
  await expect(tree).toHaveAccessibleName('Recursion tree fib: f(2) = 1 (f(1) = 1, f(0) = 0)');
  await expect(pointer).toHaveAccessibleName('Pointer i at node f(1)');
  await selbar.getByRole('button', { name: 'Stop coloring repeats' }).click();
  await expect(selbar.getByRole('button', { name: 'Color repeated calls' })).toBeVisible();
});

test('fills a DP table cell by cell with arrows, and builds one from the problem’s input', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'DP table', exact: true }).click();
  const table = page.getByRole('group', { name: /^DP table dp/ });
  await expect(table).toHaveAccessibleName('DP table dp (filling dp[1][1]): 0 0 0 0; 0 · · ·; 0 · · ·; 0 · · ·; 0 · · ·; 0 · · ·');
  // LCS：dp[1][1] 從上、左、左上三格算來
  await expect(table.locator('.board-dp-arrow')).toHaveCount(3);

  // 輸入值按 Enter：填進去並跳到下一格，每一格記成一步
  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  await selbar.getByRole('checkbox', { name: 'Record each filled cell' }).check();
  const value = selbar.getByRole('textbox', { name: 'Value' });
  await value.fill('1');
  await value.press('Enter');
  await value.fill('1');
  await value.press('Enter');
  await expect(table).toHaveAccessibleName(/^DP table dp \(filling dp\[1\]\[3\]\): 0 0 0 0; 0 1 1 ·;/);
  await expect(page.getByRole('button', { name: 'Play all 2 steps from the start' })).toBeVisible();

  // 點一格、用方向鍵移動；換成只看上和左
  await table.locator('[data-cell="11"]').click();
  await expect(table).toHaveAccessibleName(/\(filling dp\[2\]\[3\]\)/);
  await page.keyboard.press('ArrowLeft');
  await expect(table).toHaveAccessibleName(/\(filling dp\[2\]\[2\]\)/);
  await selbar.getByRole('combobox', { name: 'Depends on' }).selectOption('upLeft');
  await expect(table.locator('.board-dp-arrow')).toHaveCount(2);

  // 直接貼題目的輸入：硬幣 [1,2,5]、金額 6，dp[6] 從 dp[5]、dp[4]、dp[1] 算來
  await selbar.getByRole('button', { name: 'Build from text' }).click();
  await selbar.getByRole('textbox', { name: 'Build from text' }).fill('coins = [1,2,5], amount = 6');
  await selbar.getByRole('button', { name: 'Apply' }).click();
  await expect(table).toHaveAccessibleName('DP table dp (filling dp[0]): · · · · · · ·');
  await expect(selbar.getByRole('textbox', { name: 'Steps back' })).toHaveValue('1, 2, 5');
  await table.locator('[data-cell="6"]').click();
  await expect(table.locator('.board-dp-arrow')).toHaveCount(3);
});

test('lines up intervals, merges after sorting, and sweeps to count the meeting rooms', async ({ page }) => {
  await page.goto('/#/board/scratch');
  await page.getByRole('button', { name: 'Intervals', exact: true }).click();
  const line = page.getByRole('group', { name: /^Intervals intervals/ });
  await expect(line).toHaveAccessibleName('Intervals intervals: [1,3], [2,6], [8,10], [15,18]');

  // 點第一列，和下一列合併
  const selbar = page.getByRole('toolbar', { name: 'Selected element' });
  await line.locator('[data-cell="0"]').click();
  await expect(selbar).toContainText('[1,3]');
  await selbar.getByRole('button', { name: 'Merge with next' }).click();
  await expect(line).toHaveAccessibleName('Intervals intervals: [1,6], [8,10], [15,18]');
  await expect(selbar.getByRole('button', { name: 'Merge with next' })).toBeDisabled();

  // 換成會議室的例子，排序後用掃描線數同時進行的會議
  await line.locator('.board-label').click();
  await selbar.getByRole('button', { name: 'Build from text' }).click();
  await selbar.getByRole('textbox', { name: 'Build from text' }).fill('intervals = [[0,30],[15,20],[5,10]]');
  await selbar.getByRole('button', { name: 'Apply' }).click();
  await selbar.getByRole('button', { name: 'Sort by start' }).click();
  await expect(line).toHaveAccessibleName('Intervals intervals: [0,30], [5,10], [15,20]');
  await selbar.getByRole('button', { name: 'Sweep line' }).click();
  await expect(line).toHaveAccessibleName(/^Intervals intervals \(t = 0: 1 active\)/);
  await selbar.getByRole('button', { name: 'Next point' }).click();
  await expect(line).toHaveAccessibleName(/\(t = 5: 2 active\)/);
  await page.keyboard.press('ArrowRight');
  await expect(line).toHaveAccessibleName(/\(t = 10: 1 active\)/);

  // 標成移除的不算進行中
  await line.locator('[data-cell="0"]').click();
  await selbar.getByRole('button', { name: 'Mark removed' }).click();
  await expect(line).toHaveAccessibleName('Intervals intervals (t = 10: 0 active): [0,30] ✕, [5,10], [15,20]');
});
