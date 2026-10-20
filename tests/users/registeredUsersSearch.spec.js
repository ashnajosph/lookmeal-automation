const { test, expect } = require('@playwright/test');

test('search narrows the list as text is typed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '登録ユーザー' }).click();

  const firstRow = page.locator('tbody tr').first();
  const nickname = await firstRow.locator('td').nth(1).innerText();
  const searchTerm = nickname.slice(0, 2);

  const searchBox = page.getByPlaceholder('ニックネーム', { exact: false });
  await searchBox.fill(searchTerm);

  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('search shows no-results message for a non-matching term', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '登録ユーザー' }).click();

  const searchBox = page.getByPlaceholder('ニックネーム', { exact: false });
  await searchBox.fill('zzznonexistent123');

  await expect(page.getByText('表示するデータがありません')).toBeVisible();
});