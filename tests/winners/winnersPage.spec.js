const { test, expect } = require('@playwright/test');

test('Winners (extra) - the list loads with data', async ({ page }) => {
  await page.goto('/winners');

  await expect(page.locator('#tableTitle')).toHaveText('当選者一覧');
  await expect(page.locator('tbody tr[role="checkbox"]').first()).toBeVisible();
});

test('Winners (extra) - searching a nickname narrows the list to it', async ({ page }) => {
  await page.goto('/winners');
  const rows = page.locator('tbody tr[role="checkbox"]');
  await expect(rows.first()).toBeVisible();

  // use the longest nickname on the page, so the search really narrows the list
  const names = (await rows.locator('td:nth-child(3)').allInnerTexts()).map((n) => n.trim());
  const nickname = names.sort((a, b) => b.length - a.length)[0];

  await page.getByPlaceholder('ニックネーム / 指定メールアドレスで検索').fill(nickname);

  await expect(rows.first()).toBeVisible();
  await expect(rows.filter({ hasNotText: nickname })).toHaveCount(0);
});

test('Winners (extra) - searching an email narrows the list to it', async ({ page }) => {
  await page.goto('/winners');
  const rows = page.locator('tbody tr[role="checkbox"]');
  const email = await rows.first().locator('td:nth-child(4)').innerText();

  await page.getByPlaceholder('ニックネーム / 指定メールアドレスで検索').fill(email);

  await expect(rows.first()).toContainText(email);
  await expect(rows.filter({ hasNotText: email })).toHaveCount(0);
});

test('Winners (extra) - a search with no match shows the no-data message', async ({ page }) => {
  await page.goto('/winners');

  await page.getByPlaceholder('ニックネーム / 指定メールアドレスで検索').fill('zzzz-no-match');

  await expect(page.getByText('表示するデータがありません')).toBeVisible();
  await expect(page.locator('tbody tr[role="checkbox"]')).toHaveCount(0);
});
test('Winners (extra) - the Access Log button opens the access log page', async ({ page }) => {
  await page.goto('/winners');

  await page.getByRole('button', { name: 'アクセスログ' }).click();

  await expect(page.getByText('URLアクセス時刻')).toBeVisible();
  await expect(page.getByText('管理者名')).toBeVisible();
});