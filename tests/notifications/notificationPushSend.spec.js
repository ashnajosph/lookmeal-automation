const { test, expect } = require('@playwright/test');
const { rowsOf, searchBox, openCreateForm, openPushForm } = require('./notificationHelpers');
const { attachImage } = require('./notificationImageHelpers');

// WARNING: these tests really press 配信する on QA:
//  - the push test sends to ALL registered users
//  - the in-app test sends to ONE registered user, the account in TEST_USER_EMAIL (put it in .env)
// It is skipped unless you switch it on:  ALLOW_MEMBER_SEND=1 npx playwright test ...
test.skip(process.env.ALLOW_MEMBER_SEND !== '1', 'real sends to all registered users are off (set ALLOW_MEMBER_SEND=1 to run them)');

test('ADM_027.073 / ADM_027.131 / ADM_027.132 / ADM_027.135 - push to all registered users: sending shows the success message and adds the notification', async ({ page }) => {
  const title = `automated MP ${Date.now() % 1e6}`; // MP = member push; push titles are limited to 20 characters
  const { title: titleBox, message, sendButton } = await openPushForm(page); // 会員ユーザー comes selected
  await titleBox.fill(title);
  await message.fill('automated test');
  await sendButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('この内容で通知を配信してもよろしいですか？');
  await dialog.getByRole('button', { name: '配信する' }).click();

  await expect(page.locator('.Toastify__toast--success').first()).toContainText('プッシュ通知を配信しました');
  await expect(page).toHaveURL(/push-notification/);
  await expect(page).not.toHaveURL(/add-new/);

  await searchBox(page).fill(title);
  const row = rowsOf(page).filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  await expect(row.locator('td:nth-child(4)')).toHaveText('プッシュ - 会員');
  // Still manual: the notification arriving on a phone, and the comparison with the old implementation (ADM_027.135)
});

// Sends an in-app notification to the one user in TEST_USER_EMAIL and returns its row in the list.
// Needs Super Admin: General Admin cannot open the user selection screen (expected).
async function sendInAppToTestUser(page, testInfo, { image } = {}) {
  test.skip(testInfo.project.name === 'chromium-general-admin', 'the user selection screen needs Super Admin');
  const email = process.env.TEST_USER_EMAIL;
  test.skip(!email, 'set TEST_USER_EMAIL in .env to the email of the account that should receive it');

  const title = `automated ${image ? 'MI-IMG' : 'MI'} ${Date.now() % 1e6}`; // MI = member in-app
  await openCreateForm(page); // アプリ内通知 with 会員ユーザー comes selected
  await page.locator('#title').fill(title);
  await page.locator('#description').fill('automated test');
  await page.locator('.ql-editor').fill('automated test');
  if (image) await attachImage(page);
  await page.getByRole('button', { name: '次へ' }).click();

  // user selection screen: find the one user by email and tick the box
  const users = page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/admins/users/search') && decodeURIComponent(r.url()).includes(email)),
    page.getByPlaceholder('キーワード検索').fill(email),
  ]);
  const user = users.filter({ hasText: email });
  await expect(user).toHaveCount(1);
  await user.locator('input[type="checkbox"]').click();
  await expect(users.locator('input[type="checkbox"]:checked')).toHaveCount(1);

  await page.getByRole('button', { name: '送信する' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(/選択したユーザー\s*1\s*人にアプリ内通知が送信されます。/);
  await dialog.getByRole('button', { name: '配信する' }).click();

  await expect(page.locator('.Toastify__toast--success').first()).toContainText('アプリ内通知を配信しました');
  await expect(page).not.toHaveURL(/select-user|add-new/);

  await searchBox(page).fill(title);
  const row = rowsOf(page).filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  await expect(row.locator('td:nth-child(4)')).toHaveText('アプリ内 - 会員');
  await expect(row.locator('td:nth-child(5)')).toContainText('1人', { timeout: 30000 }); // 配信数 can fill in a little later
  return row;
}

test('ADM_027 (extra) - registered in-app: sending to one selected user shows the success message and adds the notification', async ({ page }, testInfo) => {
  await sendInAppToTestUser(page, testInfo);
  // Still manual: the notification showing in that user's app and arriving as a push
});

test('ADM_027.138 - registered in-app with an image: it is sent and the image shows on the detail screen', async ({ page }, testInfo) => {
  const row = await sendInAppToTestUser(page, testInfo, { image: true });

  await row.getByRole('button', { name: '詳細を見る' }).click();

  const image = page.getByText('アプリ内通知本文', { exact: true }).locator('xpath=..').locator('img'); // inside the message body
  await expect(image).toBeVisible();
  await expect(image).not.toHaveJSProperty('naturalWidth', 0); // it really loaded, not a broken image
  // Still manual: how the image looks in the notification on the phone
});