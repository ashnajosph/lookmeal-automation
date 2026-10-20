const { test: setup, expect } = require('@playwright/test');

const superAdminFile = 'auth/superAdmin.json';
const generalAdminFile = 'auth/generalAdmin.json';

setup('authenticate as super admin', async ({ page }) => {
  await page.goto('/auth/login');
  await page.locator('#email').fill(process.env.SUPER_ADMIN_EMAIL);
  await page.locator('#password').fill(process.env.SUPER_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'ダッシュボード' }).first()).toBeVisible();

  await page.context().storageState({ path: superAdminFile });
});

setup('authenticate as general admin', async ({ page }) => {
  await page.goto('/auth/login');
  await page.locator('#email').fill(process.env.GENERAL_ADMIN_EMAIL);
  await page.locator('#password').fill(process.env.GENERAL_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'ダッシュボード' }).first()).toBeVisible();

  await page.context().storageState({ path: generalAdminFile });
});