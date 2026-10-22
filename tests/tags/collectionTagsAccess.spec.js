const { test, expect } = require('@playwright/test');

test('general admin is logged out when accessing Collection Tags directly', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-general-admin', 'General Admin only: a Super Admin may open Collection Tags');

  await page.goto('/collections');

  await expect(page).toHaveURL(/auth\/login/);
});