const { test, expect } = require('@playwright/test');
const { rowsOf, openNotifications } = require('./notificationHelpers');

// The list has no guest-only view, so these tests use the 配信方法 filter and the 詳細を見る button.
// Nothing here sends anything.

const deliveryCell = 'td:nth-child(4)';

for (const method of [
  { tc: 'ADM_030.018 / ADM_027.024', option: 'アプリ内 - ゲスト' },
  { tc: 'ADM_030.019 / ADM_027.025', option: 'プッシュ - ゲスト' },
]) {
  test(`${method.tc} @critical - filtering by ${method.option} lists only those notifications`, async ({ page }) => {
    await openNotifications(page);

    await page.getByText('すべて', { exact: true }).click(); // the filter button, the only すべて while the menu is closed
    await page.getByRole('menuitem', { name: method.option }).click();

    // wait until no row with another delivery method is left, then make sure rows are really there
    await expect(rowsOf(page).filter({ has: page.locator(deliveryCell, { hasNotText: method.option }) })).toHaveCount(0);
    await expect(rowsOf(page).first()).toBeVisible();
  });
}

test('ADM_030.017 / ADM_027.014 / ADM_027.038 / ADM_027.082 - 詳細を見る on a guest in-app notification opens 通知詳細', async ({ page }) => {
  await openNotifications(page);
  const guestRows = rowsOf(page).filter({ has: page.locator(deliveryCell, { hasText: 'アプリ内 - ゲスト' }) });
  test.skip((await guestRows.count()) === 0, 'there is no guest in-app notification on the first page of the list');

  await guestRows.first().getByRole('button', { name: '詳細を見る' }).click();

  await expect(page.getByText('通知詳細', { exact: true }).first()).toBeVisible(); // the text is in the breadcrumb and the page title
});