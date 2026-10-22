const { test, expect } = require('@playwright/test');
const { rowsOf, searchBox, noDataMessage, openNotifications } = require('../helpers/notificationHelpers');
const { deliveryCell, titleCell, chooseFilter, expectOnlyMethod, firstTitle } = require('../helpers/notificationListHelpers');

// Nothing here sends anything.
test.beforeEach(async ({ page }) => {
  await openNotifications(page);
});

test('ADM_027.002 / ADM_027.003 - the list shows all its columns', async ({ page }) => {
  for (const column of ['No.', '配信日時', '配信メッセージ', '配信方法', '配信数', '開封数']) {
    await expect(page.locator('thead')).toContainText(column);
  }
});

test('ADM_027.013 - every row has a 詳細を見る button', async ({ page }) => {
  const rowCount = await rowsOf(page).count();

  await expect(rowsOf(page).getByRole('button', { name: '詳細を見る' })).toHaveCount(rowCount);
});

test('ADM_027.007 / ADM_027.008 / ADM_027.036 - every row shows a known delivery method', async ({ page }) => {
  await expect(rowsOf(page).filter({ has: page.locator(deliveryCell, { hasNotText: /(アプリ内|プッシュ) - (会員|ゲスト)/ }) })).toHaveCount(0);
});

test('ADM_027.022 / ADM_027.023 - the filter starts on すべて and offers the five delivery methods', async ({ page }) => {
  await expect(page.getByText('すべて', { exact: true })).toBeVisible();

  await page.getByText('すべて', { exact: true }).click();

  for (const option of ['すべて', 'アプリ内 - 会員', 'アプリ内 - ゲスト', 'プッシュ - 会員', 'プッシュ - ゲスト']) {
    await expect(page.getByRole('menuitem', { name: option })).toBeVisible();
  }
});

for (const filter of [
  { tc: 'ADM_027.024', option: 'アプリ内 - 会員' },
  { tc: 'ADM_027.025', option: 'プッシュ - 会員' },
]) {
  test(`${filter.tc} - filtering by ${filter.option} lists only those notifications`, async ({ page }) => {
    await chooseFilter(page, filter.option);

    await expectOnlyMethod(page, filter.option);
  });
}

test('ADM_027.035 - a keyword search works together with the プッシュ - 会員 filter', async ({ page }) => {
  await chooseFilter(page, 'プッシュ - 会員');
  await expectOnlyMethod(page, 'プッシュ - 会員');
  const keyword = await firstTitle(page);

  await searchBox(page).fill(keyword);

  await expect(rowsOf(page).filter({ hasNotText: keyword })).toHaveCount(0);
  await expect(rowsOf(page).first()).toBeVisible();
  await expectOnlyMethod(page, 'プッシュ - 会員');
});

test('ADM_027.028 / ADM_027.029 - the list narrows while typing, without pressing Enter', async ({ page }) => {
  const keyword = await firstTitle(page);
  const before = await rowsOf(page).count();

  await searchBox(page).pressSequentially(keyword, { delay: 100 });

  // the search also looks at the message, so a row without the keyword in its title can still match:
  // check that the notification stays and that the list got shorter
  await expect(rowsOf(page).filter({ hasText: keyword }).first()).toBeVisible();
  await expect.poll(() => rowsOf(page).count(), { timeout: 15000 }).toBeLessThan(before);
});

test('ADM_027.032 - searching part of a title finds that notification', async ({ page }) => {
  const title = await firstTitle(page);
  const part = title.slice(0, Math.ceil(title.length / 2));

  await searchBox(page).fill(part);

  await expect(rowsOf(page).filter({ hasText: title }).first()).toBeVisible();
});

// The real-send tests put "automated test" in the message only (their titles are like "automated GI 123456")
test('ADM_027.031 - searching a word that is only in the message still finds the notification', async ({ page }) => {
  await searchBox(page).fill('automated test');
  await Promise.race([rowsOf(page).first().waitFor(), noDataMessage(page).waitFor()]);
  test.skip(await noDataMessage(page).isVisible(), 'no notification with the message "automated test" exists (the real-send tests create them)');

  await expect(rowsOf(page).first()).toBeVisible();
});

test('ADM_027.039 - 詳細を見る after a search opens the detail screen', async ({ page }) => {
  const keyword = await firstTitle(page);
  await searchBox(page).fill(keyword);
  await expect(rowsOf(page).filter({ hasNotText: keyword })).toHaveCount(0);

  await rowsOf(page).first().getByRole('button', { name: '詳細を見る' }).click();

  await expect(page.getByText('通知詳細', { exact: true }).first()).toBeVisible();
});

for (const method of ['アプリ内 - 会員', 'プッシュ - 会員', 'プッシュ - ゲスト']) {
  test(`ADM_027.014 / ADM_027.038 - 詳細を見る on an ${method} notification opens 通知詳細`, async ({ page }) => {
    const row = rowsOf(page).filter({ has: page.locator(deliveryCell, { hasText: method }) }).first();
    test.skip((await row.count()) === 0, `there is no ${method} notification on the first page of the list`);

    await row.getByRole('button', { name: '詳細を見る' }).click();

    await expect(page.getByText('通知詳細', { exact: true }).first()).toBeVisible();
  });
}

test('ADM_027.084 - the 通知 breadcrumb on the detail screen returns to the list', async ({ page }) => {
  await rowsOf(page).first().getByRole('button', { name: '詳細を見る' }).click();
  await expect(page.getByText('通知詳細', { exact: true }).first()).toBeVisible();

  await page.getByRole('navigation', { name: 'breadcrumb' }).getByRole('link', { name: '通知' }).click();

  await expect(rowsOf(page).first()).toBeVisible();
  await expect(searchBox(page)).toBeVisible();
});