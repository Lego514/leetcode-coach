import { expect, test, type Page } from '@playwright/test';

// 測試專用的假帳號，只存在這次測試的資料庫裡
const password = 'e2e-password-123';

async function signIn(page: Page, email: string, mode: 'Register' | 'Sign in') {
  await page.goto('/#/settings');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByRole('group', { name: 'Sign in or register' }).getByRole('button', { name: mode }).click();
  await account.getByLabel('Email', { exact: true }).fill(email);
  const field = account.getByLabel('Password');
  await field.fill(password);
  // 打錯字看得出來，不用等到登入失敗
  await expect(field).toHaveAttribute('type', 'password');
  await account.getByRole('button', { name: 'Show' }).click();
  await expect(field).toHaveAttribute('type', 'text');
  await expect(field).toHaveValue(password);
  await account.getByRole('button', { name: 'Hide' }).click();
  await expect(field).toHaveAttribute('type', 'password');
  await account.getByRole('button', { name: mode === 'Register' ? 'Create account' : 'Sign in' }).last().click();
  await expect(account.getByText(email)).toBeVisible();
  return account;
}

async function recordSolved(page: Page, problemId: number) {
  await page.goto(`/#/problems/${problemId}`);
  await page.getByRole('button', { name: 'Record without timer' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record this attempt' });
  await dialog.getByRole('button', { name: /Solved alone/ }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
}

test('syncs attempts between two browsers, including ones recorded offline', async ({ browser }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const laptop = await browser.newContext();
  const phone = await browser.newContext();
  const a = await laptop.newPage();
  const b = await phone.newPage();

  // 先離線使用，註冊時把本機紀錄併進帳號
  await recordSolved(a, 1);
  const accountA = await signIn(a, email, 'Register');
  await expect(accountA.getByText(/Synced at/)).toBeVisible();

  await signIn(b, email, 'Sign in');
  await b.goto('/');
  await expect(b.getByRole('region', { name: 'Done today' })).toContainText('Two Sum');

  // 離線時照常記錄，恢復連線後自動上傳
  await laptop.setOffline(true);
  await recordSolved(a, 217);
  await a.goto('/#/settings');
  await expect(accountA.getByText(/Offline/)).toBeVisible();
  await expect(accountA.getByText('1 change')).toBeVisible();
  await laptop.setOffline(false);
  await expect(accountA.getByText('Nothing')).toBeVisible();

  await b.goto('/#/settings');
  await b.getByRole('button', { name: 'Sync now' }).click();
  await b.goto('/');
  await expect(b.getByRole('region', { name: 'Done today' })).toContainText('Contains Duplicate');

  await laptop.close();
  await phone.close();
});
