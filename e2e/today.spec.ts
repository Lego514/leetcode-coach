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
  await expect(bar).toContainText('First review in 1 day');
  await bar.getByRole('button', { name: `Mark ${marked} problems` }).click();
  // 題目多的時候分散到之後幾天
  await expect(page.getByRole('status')).toContainText(new RegExp(`Scheduled ${marked} problems for review (on|between) `));
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

test('shows the plan as numbers and what a target date needs', async ({ page }) => {
  await page.goto('/');
  const stat = (label: string) => page.locator('.plan-stat').filter({ hasText: label });
  const progress = page.getByRole('progressbar', { name: 'NeetCode 150 progress' });
  await expect(progress).toHaveAttribute('aria-valuetext', '0 of 150 problems completed');
  await expect(stat('problems left').getByRole('definition')).toHaveText('150');
  await expect(stat('new a day').getByRole('definition')).toHaveText('3');
  await expect(stat('first pass done').getByRole('definition')).toHaveText(/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/);

  // 目標日期太近，每天 3 題來不及：標出來並提供調高的按鈕
  await page.getByRole('link', { name: 'Set a target date' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  const target = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.getByLabel('Target date').fill(target);
  // 只換網址的 # 後面，不重新載入頁面，剛存的設定才不會被打斷
  await page.goto('/#/');
  await expect(stat('until')).toContainText(/\d+ days/);
  await expect(stat('needed a day')).toHaveAttribute('data-warn', '');
  await expect(page.getByText('At your goal of 3 a day, you won’t make it.')).toBeVisible();
  await page.getByRole('link', { name: 'Raise the daily goal' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
});

test('edits or deletes a record from today', async ({ page }) => {
  await page.goto('/');
  await doneList(page).getByRole('button', { name: 'Record another problem' }).click();
  const record = page.getByRole('dialog', { name: 'Record another problem' });
  await record.getByLabel('Problem number, title, or LeetCode URL').fill('1');
  await record.getByRole('button', { name: 'Find problem' }).click();
  await record.getByRole('button', { name: /Solved alone/ }).click();
  await record.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(record).toBeHidden();
  await expect(doneList(page)).toContainText('Last time: Solved alone');

  // 選錯了：改成看了解答，複習排程跟著重算
  await doneList(page).getByRole('button', { name: 'Edit today’s record for Two Sum' }).click();
  const edit = page.getByRole('dialog', { name: 'Edit this record' });
  await expect(edit.getByRole('button', { name: /Solved alone/ })).toHaveAttribute('aria-pressed', 'true');
  await edit.getByRole('button', { name: /Read the solution/ }).click();
  await edit.getByLabel('Minutes spent (optional)').fill('25');
  await edit.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByText(/^Updated\. Next review/)).toBeVisible();
  await expect(doneList(page)).toContainText('Last time: Read the solution');

  // 記錯題目：刪掉，這題回到還沒做過
  await doneList(page).getByRole('button', { name: 'Edit today’s record for Two Sum' }).click();
  await expect(edit.getByLabel('Minutes spent (optional)')).toHaveValue('25');
  await edit.getByRole('button', { name: 'Delete this record' }).click();
  await edit.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(edit).toBeHidden();
  await expect(doneList(page)).toContainText('Nothing recorded yet');
});

test('mixes another pattern into new problems, hides the pattern, and lets me choose how they are picked', async ({ page }) => {
  await page.goto('/');
  const items = newList(page).getByRole('listitem');
  // 預設穿插：兩題陣列加一題別的模式，看不到模式名稱
  await expect(items).toHaveCount(3);
  await expect(newList(page)).toContainText('mostly in pattern order, with one from another pattern');
  await expect(items.nth(2)).toContainText('Mixed in from another pattern');
  await expect(newList(page)).not.toContainText('Arrays & Hashing');

  await page.goto('/#/settings');
  // 設定存好之後勾選才會變，所以點一下再等它變
  const show = page.getByLabel('Show the pattern on new problems');
  await show.click();
  await expect(show).toBeChecked();
  const focus = page.getByRole('radio', { name: /^Focus on one pattern/ });
  await focus.click();
  await expect(focus).toBeChecked();
  await page.getByLabel('Pattern to focus on').selectOption({ label: 'Graphs' });
  await expect(page.getByLabel('Pattern to focus on')).toHaveValue('graphs');

  await page.goto('/');
  await expect(newList(page)).toContainText('Focusing on Graphs');
  await expect(items).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) await expect(items.nth(i)).toContainText('Graphs');

  await page.goto('/#/settings');
  const roadmap = page.getByRole('radio', { name: /^Roadmap order/ });
  await roadmap.click();
  await expect(roadmap).toBeChecked();
  await page.goto('/');
  await expect(newList(page)).toContainText('In NeetCode 150 pattern order');
  for (let i = 0; i < 3; i += 1) await expect(items.nth(i)).toContainText('Arrays & Hashing');
});

test('loads demo data to look around, then clears it', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('region', { name: 'Before you start' });
  await welcome.getByRole('button', { name: 'Try it with demo data' }).click();
  // 每一頁上面都提醒是示範資料
  const banner = page.getByRole('status').filter({ hasText: 'You’re looking at demo data' });
  await expect(banner).toBeVisible();
  await expect(page.getByRole('region', { name: /^Due for review/ }).getByRole('listitem').first()).toBeVisible();
  await page.goto('/#/progress');
  await expect(banner).toBeVisible();
  await expect(page.getByRole('region', { name: /practice sessions in the past year/ })).toBeVisible();

  await banner.getByRole('button', { name: 'Clear demo data' }).click();
  await expect(banner).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Before you start' })).toBeVisible();
});

test('never carries demo data into an account', { tag: '@desktop' }, async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try it with demo data' }).click();
  await expect(page.getByText('You’re looking at demo data')).toBeVisible();

  await page.goto('/#/account');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByRole('group', { name: 'Sign in or register' }).getByRole('button', { name: 'Register' }).click();
  await account.getByLabel('Email', { exact: true }).fill(`demo-${Date.now()}@example.com`);
  await account.getByLabel('Password').fill('e2e-password-123');
  await account.getByRole('button', { name: 'Create account' }).click();
  await expect(account.getByText('Waiting to upload')).toBeVisible();

  // 登入前先清掉示範資料：帳號裡什麼都沒有
  await expect(page.getByText('You’re looking at demo data')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Before you start' })).toBeVisible();
  await expect(page.getByRole('region', { name: /^Due for review/ }).getByRole('listitem')).toHaveCount(0);
});
