const { test, expect } = require('@playwright/test');
const { rowsOf, openNotifications } = require('./notificationHelpers');
const { deliveryCell, titleCell, chooseFilter, expectOnlyMethod } = require('./notificationListHelpers');

// List pagination, filter switching and the notification detail screen. Nothing here sends anything.

const noCell = 'td:nth-child(1)'; // the No. of a list row
const firstNo = async (page) => (await rowsOf(page).first().locator(noCell).innerText()).trim();
const pageButton = (page, n) => page.getByRole('button', { name: `Go to page ${n}` });
const currentPage = (page, n) => page.getByRole('button', { name: `page ${n}`, exact: true });

test('ADM_027.015 - more than 10 notifications are split into pages of 10', async ({ page }) => {
  await openNotifications(page);

  await expect(rowsOf(page)).toHaveCount(10);
  await expect(currentPage(page, 1)).toHaveAttribute('aria-current', 'true');
  await expect(pageButton(page, 2)).toBeVisible();
});

test('ADM_027.017 - the next page button opens page 2', async ({ page }) => {
  await openNotifications(page);
  const firstNoOnPage1 = await firstNo(page);

  await page.getByRole('button', { name: 'Go to next page' }).click();

  await expect(currentPage(page, 2)).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => firstNo(page)).not.toBe(firstNoOnPage1); // other rows are shown
});

test('ADM_027.018 - the previous page button goes back to page 1', async ({ page }) => {
  await openNotifications(page);
  const firstNoOnPage1 = await firstNo(page);
  await pageButton(page, 2).click();
  await expect(currentPage(page, 2)).toHaveAttribute('aria-current', 'true');

  await page.getByRole('button', { name: 'Go to previous page' }).click();

  await expect(currentPage(page, 1)).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => firstNo(page)).toBe(firstNoOnPage1);
});

test('ADM_027.026 - the filter can be switched from one value to another', async ({ page }) => {
  await openNotifications(page);

  await chooseFilter(page, 'アプリ内 - 会員');
  await expectOnlyMethod(page, 'アプリ内 - 会員');

  await chooseFilter(page, 'プッシュ - 会員', 'アプリ内 - 会員'); // the filter now shows the last choice
  await expectOnlyMethod(page, 'プッシュ - 会員');

  await chooseFilter(page, 'すべて', 'プッシュ - 会員');
  await expect(page.getByText('すべて', { exact: true }).first()).toBeVisible();
  await expect(rowsOf(page).first()).toBeVisible();
});

// ---- Notification detail screen (an in-app notification, member or guest) ----
// Opens 詳細を見る on the first in-app row of the page and returns the title the list showed
async function openInAppDetail(page) {
  await openNotifications(page);
  const inAppRows = rowsOf(page).filter({ has: page.locator(deliveryCell, { hasText: 'アプリ内' }) });
  test.skip((await inAppRows.count()) === 0, 'there is no in-app notification on the first page of the list');

  const title = (await inAppRows.first().locator(titleCell).innerText()).trim();
  await inAppRows.first().getByRole('button', { name: '詳細を見る' }).click();
  await expect(page.locator('#tableTitle')).toHaveText('通知詳細');
  return title;
}

test('ADM_027.083 - the detail screen shows the content of the notification', async ({ page }) => {
  const title = await openInAppDetail(page);

  await expect(page.getByText('配信方法', { exact: true })).toBeVisible();
  await expect(page.getByText('アプリ内通知', { exact: true }).first()).toBeVisible();
  await expect(page.locator('#subject')).toHaveValue(title); // タイトル is the title from the list
  await expect(page.getByText('本文プレビュー※プッシュ通知のみ表示')).toBeVisible();
  await expect(page.locator('#in_app_message')).not.toHaveValue('');
  await expect(page.getByText('アプリ内通知本文', { exact: true })).toBeVisible();
});

test('ADM_027.085 - the detail screen fields cannot be edited', async ({ page }) => {
  await openInAppDetail(page);
  const subject = page.locator('#subject');
  const preview = page.locator('#in_app_message');
  const before = await subject.inputValue();

  await expect(subject).not.toBeEditable();
  await expect(preview).not.toBeEditable();

  await subject.click();
  await page.keyboard.type('xyz'); // typing must change nothing
  await expect(subject).toHaveValue(before);
});