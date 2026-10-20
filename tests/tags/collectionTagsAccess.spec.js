const { test, expect } = require('@playwright/test');

test('general admin is logged out when accessing Collection Tags directly', async ({ page }) => {
  await page.goto('/collections');

  await expect(page).toHaveURL(/auth\/login/);
});