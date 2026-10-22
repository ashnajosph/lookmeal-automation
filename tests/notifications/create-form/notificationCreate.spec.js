const { test, expect } = require('@playwright/test');
const { rowsOf, openNotifications, openCreateForm } = require('../helpers/notificationHelpers');

test('ADM_022.018 @critical - 新規作成 opens the notification creation screen', async ({ page }) => {
  await openNotifications(page);
  await page.getByRole('button', { name: '新規作成' }).click();

  await expect(page).toHaveURL(/push-notification\/add-new/);
  await expect(page.getByText('通知作成', { exact: true })).toBeVisible();
  await expect(page.locator('#title')).toBeVisible();
  await expect(page.locator('#description')).toBeVisible();
});

test('ADM_022.020 - キャンセル on the creation screen returns to the notification list', async ({ page }) => {
  await openCreateForm(page);

  await page.getByRole('button', { name: 'キャンセル' }).click();

  await expect(page).not.toHaveURL(/add-new/);
  await expect(rowsOf(page).first()).toBeVisible();
});

test('ADM_022.021 - the 通知 breadcrumb link returns to the notification list', async ({ page }) => {
  await openCreateForm(page);

  await page.getByRole('navigation', { name: 'breadcrumb' }).getByRole('link', { name: '通知' }).click();

  await expect(page).not.toHaveURL(/add-new/);
  await expect(rowsOf(page).first()).toBeVisible();
});