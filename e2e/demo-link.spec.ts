import { expect, test } from '@playwright/test';

// 試用連結 …/?demo：空的瀏覽器直接載入示範資料；已經有自己的紀錄的人不受影響；參數用完就從網址拿掉

const banner = 'You’re looking at demo data';

test('opens straight into demo data from a ?demo link', async ({ page }) => {
  await page.goto('/?demo');
  await expect(page.getByText(banner)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Today’s goal' })).toContainText('Young tree');
  await expect(page).not.toHaveURL(/demo/);
});

test('also works with the parameter inside the hash route', async ({ page }) => {
  await page.goto('/#/progress?demo');
  await expect(page.getByText(banner)).toBeVisible();
  await expect(page).toHaveURL(/#\/progress$/);
});

test('leaves my own records alone when I open a ?demo link', async ({ page }) => {
  // 先記錄一題，變成有自己資料的人
  await page.goto('/#/practice/1');
  await page.getByRole('group', { name: 'While solving' }).getByRole('button', { name: 'I’m done' }).click();
  await page.getByRole('region', { name: 'Record this attempt' }).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved. Next review');

  await page.goto('/?demo');
  await expect(page.getByRole('region', { name: 'Today’s goal' })).toBeVisible();
  await expect(page.getByText(banner)).toHaveCount(0);
  await expect(page).not.toHaveURL(/demo/);
  await page.goto('/#/problems/1');
  await expect(page.getByRole('region', { name: /^History/ }).getByRole('listitem')).toHaveCount(1);
});
