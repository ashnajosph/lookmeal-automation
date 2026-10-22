const { test, expect } = require('@playwright/test');
const { openCreateForm } = require('../helpers/notificationHelpers');

// 配信先ユーザー選択 screen (in-app notification to registered users).
// General Admin has no access to the user module, so the app answers the user list request with 403
// and logs them out as soon as this screen opens. That is the expected behavior (confirmed), so:
//  - the functional tests below run as Super Admin only
//  - one General Admin test proves the restriction
const isGeneralAdmin = (testInfo) => testInfo.project.name === 'chromium-general-admin';

// These tests only select users and press 戻る. Nothing here presses 送信する.

// Only real user rows (they have a checkbox), so a loading or filler row is never counted
const rows = (page) => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') });
const checkboxOf = (row) => row.locator('input[type="checkbox"]');
const sendButton = (page) => page.getByRole('button', { name: '送信する' });
const applyButton = (page) => page.getByRole('button', { name: 'アップロード内容を反映' });
const searchBox = (page) => page.getByPlaceholder('キーワード検索');

// A row found by its ユーザーID (2nd cell), so it is still found after rows move around
const rowById = (page, id) =>
  rows(page).filter({ has: page.locator('td:nth-child(2)', { hasText: new RegExp(`^\\s*${id}\\s*$`) }) });

// Fills the in-app form, presses 次へ and waits for the user list
async function openUserSelection(page) {
  await openCreateForm(page);
  await page.locator('#title').fill('title');
  await page.locator('#description').fill('preview');
  await page.locator('.ql-editor').fill('body');
  await page.getByRole('button', { name: '次へ' }).click();

  await expect(page.getByText('配信先ユーザー選択', { exact: true }).first()).toBeVisible(); // breadcrumb and heading
  await expect.poll(() => rows(page).count()).toBeGreaterThan(1); // wait for the whole first page, not just the first row
}

// Reads the first few ユーザーID values from the list
async function firstIds(page, count) {
  const texts = await rows(page).locator('td:nth-child(2)').allInnerTexts();
  return texts.slice(0, count).map((t) => t.trim());
}

// Puts CSV text into the hidden file input
async function chooseCsvText(page, text) {
  await page.locator('input[type="file"]').setInputFiles({ name: 'users.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
}

// The ideal template has two columns, User Id and Name (same header as the sample file)
async function chooseCsv(page, ids) {
  await chooseCsvText(page, ['User Id,Name', ...ids.map((id) => `${id},x`)].join('\n'));
}

// Two success toasts can show at the same time, so each one is found by its own text
const uploadToast = (page) => page.locator('.Toastify__toast--success', { hasText: 'CSVファイルのアップロードに成功しました' }); // when the file is chosen
const reflectToast = (page) => page.locator('.Toastify__toast--success', { hasText: 'ユーザー情報の反映が完了しました' }); // when アップロード内容を反映 is pressed
const errorToast = (page) => page.locator('.Toastify__toast--error').first();
const countText = (n) => new RegExp(`選択したユーザー\\s*${n}\\s*人にアプリ内通知が送信されます。`);

// Selects the first few users and opens the confirmation dialog. It is only ever closed with キャンセル.
async function openConfirmDialog(page, count) {
  await openUserSelection(page);
  for (const id of await firstIds(page, count)) {
    await checkboxOf(rowById(page, id)).click();
  }
  await sendButton(page).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test('ADM_027.070 (General Admin) - the user selection screen logs General Admin out because they have no user-module access', async ({ page }, testInfo) => {
  test.skip(!isGeneralAdmin(testInfo), 'this restriction only applies to General Admin');

  await openCreateForm(page);
  await page.locator('#title').fill('title');
  await page.locator('#description').fill('preview');
  await page.locator('.ql-editor').fill('body');
  await page.getByRole('button', { name: '次へ' }).click();

  await expect(page).toHaveURL(/auth\/login/, { timeout: 15000 });
});

test.describe('user selection (Super Admin)', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(isGeneralAdmin(testInfo), 'General Admin has no user-module access and is logged out on this screen (expected)');
  });

  test('ADM_027.070 @critical - 次へ opens the user selection screen', async ({ page }) => {
    await openUserSelection(page);
  });

  test('ADM_027.086 - the user selection screen shows its elements', async ({ page }) => {
    await openUserSelection(page);

    await expect(searchBox(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'ユーザー情報を含むCSVファイルを選択' })).toBeVisible();
    await expect(applyButton(page)).toBeVisible();
    await expect(checkboxOf(page.locator('thead'))).toBeVisible(); // select-all
    await expect(checkboxOf(rows(page).first())).toBeVisible();
    await expect(page.getByRole('button', { name: '戻る' })).toBeVisible();
    await expect(sendButton(page)).toBeVisible();
  });

  test('ADM_027.087 - the user list shows the right columns', async ({ page }) => {
    await openUserSelection(page);

    const header = page.locator('thead');
    await expect(header).toContainText('No.');
    for (const column of ['ユーザーID', 'ニックネーム', 'メールアドレス', '生年月', '性別', '居住地']) {
      await expect(header.getByText(column, { exact: true })).toBeVisible();
    }
  });

  test('ADM_027.072 / ADM_027.112 - 送信する is disabled while no user is selected', async ({ page }) => {
    await openUserSelection(page);

    await expect(sendButton(page)).toBeDisabled();
  });

  test('ADM_027.071 / ADM_027.088 @critical - selecting a user checks the box and enables 送信する', async ({ page }) => {
    await openUserSelection(page);

    await checkboxOf(rows(page).first()).click(); // click, not check(): the row jumps to the top once selected

    await expect(rows(page).locator('input[type="checkbox"]:checked')).toHaveCount(1);
    await expect(sendButton(page)).toBeEnabled();
  });

  test('ADM_027.089 - several users can be selected and stay checked', async ({ page }) => {
    await openUserSelection(page);
    const ids = await firstIds(page, 3);

    for (const id of ids) {
      await checkboxOf(rowById(page, id)).click(); // click, not check(): the row jumps to the top once selected
    }

    for (const id of ids) {
      await expect(checkboxOf(rowById(page, id))).toBeChecked();
    }
    await expect(rows(page).locator('input[type="checkbox"]:checked')).toHaveCount(3);
  });

  test('ADM_027.090 / ADM_027.091 - select-all checks every listed user and a second click clears them', async ({ page }) => {
    await openUserSelection(page);
    const total = await rows(page).count();
    const selectAll = checkboxOf(page.locator('thead'));

    await selectAll.check();
    await expect(rows(page).locator('input[type="checkbox"]:checked')).toHaveCount(total);

    await selectAll.uncheck();
    await expect(rows(page).locator('input[type="checkbox"]:checked')).toHaveCount(0);
  });

  test('ADM_027.092 - a selected user moves to the top of the list', async ({ page }) => {
    await openUserSelection(page);
    const ids = await firstIds(page, 20);
    const lastId = ids[ids.length - 1]; // the lowest row on screen

    await checkboxOf(rowById(page, lastId)).click(); // click, not check(): the row jumps to the top once selected

    await expect(rows(page).first().locator('td:nth-child(2)')).toHaveText(lastId);
  });

  test('ADM_027.093 - searching filters the user list', async ({ page }) => {
    await openUserSelection(page);
    const email = (await rows(page).nth(2).locator('td:nth-child(4)').innerText()).trim(); // read a real value from the page

    await searchBox(page).fill(email);

    await expect(rows(page).first()).toContainText(email);
    await expect(rows(page).filter({ hasNotText: email })).toHaveCount(0);
  });

  test('ADM_027.095 - the CSV button opens the file chooser', async ({ page }) => {
    await openUserSelection(page);

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'ユーザー情報を含むCSVファイルを選択' }).click(),
    ]);

    expect(chooser).toBeTruthy();
  });

  test('ADM_027.096 / ADM_027.097 - uploading a CSV enables アップロード内容を反映', async ({ page }) => {
    await openUserSelection(page);
    await expect(applyButton(page)).toBeDisabled(); // disabled until a file is chosen

    await chooseCsv(page, await firstIds(page, 2));

    await expect(uploadToast(page)).toBeVisible();
    await expect(applyButton(page)).toBeEnabled();
  });

  test('ADM_027.098 @critical - アップロード内容を反映 selects the users from the CSV', async ({ page }) => {
    await openUserSelection(page);
    const ids = await firstIds(page, 3);

    await chooseCsv(page, ids);
    await applyButton(page).click();

    await expect(reflectToast(page)).toBeVisible();
    for (const id of ids) {
      await expect(checkboxOf(rowById(page, id))).toBeChecked();
    }
    await expect(rows(page).locator('input[type="checkbox"]:checked')).toHaveCount(3);
  });

  test('ADM_027.101 - 戻る goes back to the form without sending', async ({ page }) => {
    await openUserSelection(page);
    await chooseCsv(page, await firstIds(page, 2));

    await page.getByRole('button', { name: '戻る' }).click();

    await expect(page.locator('#title')).toBeVisible(); // the creation form again
    await expect(page).toHaveURL(/add-new/);
  });

  test('ADM_027.094 - a deleted user does not appear in the user list', async ({ page }) => {
    await openUserSelection(page);

    // user 1172 (abc@gmail.com) is deleted: search for the email and wait for the answer
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/admins/users/search') && decodeURIComponent(r.url()).includes('abc@gmail.com')),
      searchBox(page).fill('abc@gmail.com'),
    ]);

    await expect(rowById(page, '1172')).toHaveCount(0);
  });

  test('ADM_027.099 - a deleted user in the CSV is not selected', async ({ page }) => {
    await openUserSelection(page);
    const [validId] = await firstIds(page, 1);

    await chooseCsv(page, ['1172', validId]); // 1172 is a deleted user
    await applyButton(page).click();

    await expect(reflectToast(page)).toBeVisible();
    await expect(checkboxOf(rowById(page, validId))).toBeChecked();
    await expect(rows(page).locator('input[type="checkbox"]:checked')).toHaveCount(1); // only the real user

    await sendButton(page).click();
    await expect(page.getByRole('dialog')).toContainText(countText(1)); // so only 1 user would get the notification
    await page.getByRole('dialog').getByRole('button', { name: 'キャンセル' }).click();
  });

  test('ADM_027.100 - a CSV with the wrong columns is rejected', async ({ page }) => {
    await openUserSelection(page);

    await chooseCsvText(page, 'Phone,Gender\n09012345678,F'); // only User Id and Name are accepted
    await applyButton(page).click({ timeout: 3000 }).catch(() => {}); // the rejection may already come when the file is chosen

    await expect(errorToast(page)).toBeVisible();
    await expect(rows(page).locator('input[type="checkbox"]:checked')).toHaveCount(0);
    await expect(sendButton(page)).toBeDisabled();
  });

  // ---- Confirmation dialog: always closed with キャンセル, never 配信する ----
  test('ADM_027.102 / ADM_027.103 @critical - 送信する opens the confirmation dialog with the question and the warning', async ({ page }) => {
    const dialog = await openConfirmDialog(page, 1);

    await expect(dialog).toContainText('この内容で通知を配信してもよろしいですか？');
    await expect(dialog).toContainText(countText(1));
    await expect(dialog).toContainText('送信後の変更・取り消しはできません。');
    await expect(dialog).toContainText('ご注意ください。');

    await dialog.getByRole('button', { name: 'キャンセル' }).click();
  });

  test('ADM_027.104 - the dialog shows how many users are selected', async ({ page }) => {
    const dialog = await openConfirmDialog(page, 3);

    await expect(dialog).toContainText(countText(3));

    await dialog.getByRole('button', { name: 'キャンセル' }).click();
  });

  test('ADM_027.105 / ADM_027.106 - the dialog shows キャンセル and 配信する', async ({ page }) => {
    const dialog = await openConfirmDialog(page, 1);

    await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: '配信する' })).toBeVisible();

    await dialog.getByRole('button', { name: 'キャンセル' }).click();
  });

  test('ADM_027.107 - キャンセル closes the dialog and stays on the user selection screen', async ({ page }) => {
    const dialog = await openConfirmDialog(page, 2);

    await dialog.getByRole('button', { name: 'キャンセル' }).click();

    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/select-user/);
    await expect(rows(page).locator('input[type="checkbox"]:checked')).toHaveCount(2); // the selection is kept
  });
});