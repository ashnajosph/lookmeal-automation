const { test, expect } = require('@playwright/test');

test('registered users list loads with data', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '登録ユーザー' }).click();

    await expect(page.locator('#tableTitle')).toBeVisible();
  await expect(page.locator('#tableTitle')).toHaveText('登録ユーザー一覧');

  // Table should show at least one data row
  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible();
});