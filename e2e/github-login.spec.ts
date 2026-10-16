import { expect, test, type Page } from '@playwright/test';

// 用 GitHub 登入：伺服器和瀏覽器都連到 e2e/fake-github.mjs（假 GitHub），
// 授權頁直接「按授權」轉回網站。登入要用 Secure cookie，所以只在桌面版 Chromium 跑。

/** 每個測試用自己的 GitHub 帳號，同一台伺服器上不會撞到 */
function githubAccount() {
  const n = Date.now() + Math.floor(Math.random() * 1000);
  return { id: n, login: `octo${n}`, email: `octo${n}@e2e.test` };
}

/** 在假 GitHub 上選好要用的帳號：之後到授權頁就會直接「按授權」轉回網站 */
async function approveOnGithub(page: Page, account: ReturnType<typeof githubAccount>) {
  const encoded = Buffer.from(JSON.stringify(account)).toString('base64url');
  await page.goto(`http://localhost:4320/as?account=${encoded}`);
}

test('signs up and back in with GitHub', { tag: '@desktop' }, async ({ page }) => {
  const account = githubAccount();
  await approveOnGithub(page, account);
  await page.goto('/#/account');

  await page.getByRole('link', { name: 'Continue with GitHub' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Account created with your GitHub email.' })).toBeVisible();
  // 結果顯示過就從網址拿掉，重新整理不會再出現
  await expect(page).toHaveURL(/#\/account$/);
  const accountSheet = page.getByRole('region', { name: 'Account & sync' });
  await expect(accountSheet).toContainText(account.email);
  await expect(accountSheet).toContainText(`@${account.login}`);
  // 沒有密碼：不能取消連結，刪除帳號時改成輸入 email
  await expect(accountSheet.getByRole('button', { name: 'Disconnect GitHub' })).toHaveCount(0);
  await accountSheet.getByRole('button', { name: 'Delete account' }).click();
  await expect(page.getByLabel(`Type ${account.email} to confirm`)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await accountSheet.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Keep data and sign out' }).click();
  await page.getByRole('link', { name: 'Continue with GitHub' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Signed in with GitHub.' })).toBeVisible();
  await expect(accountSheet).toContainText(account.email);
});

test('connects GitHub to a password account, and disconnects it', { tag: '@desktop' }, async ({ page }) => {
  const account = githubAccount();
  await approveOnGithub(page, account);
  await page.goto('/#/account');
  await page.getByRole('button', { name: 'Register' }).click();
  await page.getByLabel('Email').fill(`pw-${account.email}`);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByRole('button', { name: 'Create account' }).click();

  const accountSheet = page.getByRole('region', { name: 'Account & sync' });
  await expect(accountSheet).toContainText('Not connected');
  await accountSheet.getByRole('link', { name: 'Connect GitHub' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'GitHub connected.' })).toBeVisible();
  await expect(accountSheet).toContainText(`@${account.login}`);

  await accountSheet.getByRole('button', { name: 'Disconnect GitHub' }).click();
  await expect(accountSheet).toContainText('Not connected');
});
