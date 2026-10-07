import { expect, test, type Page } from '@playwright/test';

// playwright.config.ts 的 ADMIN_EMAILS 設成這個帳號
const ADMIN = 'admin@e2e.test';
const password = 'e2e-password-123';

const thanks = (page: Page) => page.getByRole('status').filter({ hasText: 'Thanks! Your report was received.' });

/** 註冊並登入；重跑測試時帳號已經存在，就改用登入 */
async function signIn(page: Page, email: string) {
  await page.goto('/#/account');
  const account = page.getByRole('region', { name: 'Account & sync' });
  await account.getByRole('group', { name: 'Sign in or register' }).getByRole('button', { name: 'Register' }).click();
  await account.getByLabel('Email', { exact: true }).fill(email);
  await account.getByLabel('Password').fill(password);
  await account.getByRole('button', { name: 'Create account' }).click();
  const signedIn = account.getByText(email);
  const taken = account.getByRole('alert').filter({ hasText: 'already registered' });
  await expect(signedIn.or(taken)).toBeVisible();
  if (await taken.isVisible()) {
    await account.getByRole('group', { name: 'Sign in or register' }).getByRole('button', { name: 'Sign in' }).click();
    await account.getByRole('button', { name: 'Sign in' }).last().click();
  }
  await expect(signedIn).toBeVisible();
}

const uniqueEmail = (name: string) => `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test('reports a flashcard after answering it', async ({ page }) => {
  await page.goto('/#/cards');
  await expect(page.getByText('Card 1 of 5')).toBeVisible();
  // 作答前沒有回報按鈕
  await expect(page.getByRole('button', { name: 'Report this card' })).toHaveCount(0);
  await page.getByRole('button', { name: 'I don’t know' }).click();

  await page.getByRole('button', { name: 'Report this card' }).click();
  const dialog = page.getByRole('dialog', { name: 'Report this card' });
  await expect(dialog.getByRole('button', { name: 'Wrong content' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Unclear' }).click();
  await dialog.getByLabel('Details').fill('The explanation skips a step.');
  await dialog.getByText('Sent along with your report').click();
  await expect(dialog).toContainText('Correct answer');

  const request = page.waitForRequest((r) => r.url().endsWith('/api/reports') && r.method() === 'POST');
  await dialog.getByRole('button', { name: 'Send' }).click();
  const body = (await request).postDataJSON();
  expect(body).toMatchObject({
    kind: 'unclear',
    message: 'The explanation skips a step.',
    context: { page: '/cards', card: { id: expect.stringMatching(/^(tip|signal):/), answer: expect.any(String) } },
  });
  expect(body.context.card.picked).toBeUndefined();
  await expect(thanks(page)).toBeVisible();
  await expect(dialog).toBeHidden();

  // 回報完照樣可以繼續下一張
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Card 2 of 5')).toBeVisible();
});

test('finds sign-in from Today and More', async ({ page, isMobile }) => {
  await page.goto('/');
  const banner = page.getByRole('complementary', { name: 'Sign in to sync across devices' });
  if (isMobile) {
    await banner.getByRole('link', { name: 'Sign in / Register' }).click();
  } else {
    // 桌面版用側邊欄的按鈕，今天頁不再重複提醒
    await expect(banner).toBeHidden();
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Sign in / Register' }).click();
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Account & sync' }).getByLabel('Email', { exact: true })).toBeVisible();

  await page.goto('/#/more');
  await page.getByRole('region', { name: 'Not signed in' }).getByRole('link', { name: 'Sign in / Register' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();

  await page.goto('/#/settings');
  await page.getByRole('region', { name: 'Account & sync' }).getByRole('link', { name: 'Sign in / Register' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();

  if (isMobile) {
    await page.goto('/');
    await banner.getByRole('button', { name: 'Not now' }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    await expect(banner).toBeHidden();
  }
});

test('sends a bug report without an account, and the admin resolves it', { tag: '@desktop' }, async ({ page, browser }) => {
  await page.goto('/#/problems');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Report a problem' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Report a problem or suggest something' })).toBeVisible();

  const form = page.getByRole('region', { name: 'New report' });
  await expect(form.getByRole('button', { name: 'Bug' })).toHaveAttribute('aria-pressed', 'true');
  const message = `The timer froze ${Date.now()}`;
  await form.getByLabel('Details').fill(message);
  await form.getByLabel('Contact (optional)').fill('guest@example.com');
  await form.getByText('Sent along with your report').click();
  // 附上從哪個頁面來的
  await expect(form).toContainText('/problems');
  await form.getByRole('button', { name: 'Send' }).click();
  await expect(thanks(page)).toBeVisible();
  await expect(form.getByLabel('Details')).toHaveValue('');
  await expect(page.getByRole('region', { name: 'My reports' })).toContainText('Sign in to follow the status');

  const context = await browser.newContext();
  const admin = await context.newPage();
  await signIn(admin, ADMIN);
  await admin.goto('/#/feedback');
  await admin.getByRole('region', { name: 'Inbox' }).getByRole('link', { name: 'Open inbox' }).click();
  const item = admin.getByRole('article').filter({ hasText: message });
  await expect(item).toContainText('guest@example.com');
  await expect(item).toContainText('/problems');
  await expect(item).toContainText('Received');
  await item.getByRole('button', { name: 'Mark resolved' }).click();
  // 處理好就從「未處理」消失，切到「已處理」看得到，也可以重新打開
  await expect(item).toBeHidden();
  const filters = admin.getByRole('group', { name: 'Filter reports' });
  await filters.getByRole('button', { name: /^Resolved/ }).click();
  await expect(item).toContainText('Resolved');
  await item.getByRole('button', { name: 'Reopen' }).click();
  await expect(item).toBeHidden();
  await filters.getByRole('button', { name: /^Open/ }).click();
  await expect(item).toContainText('Received');
  await context.close();
});

test('shows people the status of their own reports', { tag: '@desktop' }, async ({ page }) => {
  await signIn(page, uniqueEmail('reporter'));
  await page.goto('/#/feedback');
  const form = page.getByRole('region', { name: 'New report' });
  await form.getByRole('button', { name: 'Suggestion' }).click();
  await expect(form).toContainText(/Sent as reporter-/);
  await expect(form.getByLabel('Contact (optional)')).toHaveCount(0);
  await form.getByLabel('Details').fill('A dark mode for the whiteboard, please.');
  await form.getByRole('button', { name: 'Send' }).click();
  await expect(thanks(page)).toBeVisible();

  const mine = page.getByRole('region', { name: 'My reports' });
  await expect(mine.getByRole('article')).toHaveCount(1);
  await expect(mine.getByRole('article')).toContainText('Suggestion');
  await expect(mine.getByRole('article')).toContainText('Received');

  // 一般帳號看不到收件匣
  await page.goto('/#/feedback/inbox');
  await expect(page.getByText('Only admins can see the inbox.')).toBeVisible();
});
