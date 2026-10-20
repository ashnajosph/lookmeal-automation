const { test, expect } = require('@playwright/test');
const { rowsOf } = require('./notificationHelpers');

test('ADM_022.001 / ADM_027.001 @critical - the 通知 sidebar item opens the notification list', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '通知', exact: true }).click();

  await expect(page).toHaveURL(/push-notification/);
  await expect(rowsOf(page).first()).toBeVisible();
});