const { test, expect } = require('@playwright/test');

test.describe('Collection Tags (super admin)', () => {

  test('can create a new tag', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'コレクションタグ' }).click();

    const tagName = `zz-${Date.now()}`.slice(0, 10);

    await page.getByRole('button', { name: '追加' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill(tagName);
    await dialog.getByRole('button', { name: '確認へ進む' }).click();

    await expect(page.getByText(`タグ「${tagName}」を追加しますか？`)).toBeVisible();
    await page.getByRole('button', { name: '追加する' }).click();

    await expect(page.getByText('コレクションタグを追加しました')).toBeVisible();
    await expect(page.getByRole('cell', { name: tagName })).toBeVisible();

    // Cleanup: delete the tag we just created.
    // Rows have role="checkbox" (not "row"), so we find them by tag + text instead.
       const row = page.locator('tbody tr[data-draggable-id]').filter({ hasText: tagName });
    await row.locator('button').nth(1).click(); // 2nd icon button = delete
    await page.getByRole('button', { name: '削除する' }).click();
    await expect(page.getByText('コレクションタグを削除しました')).toBeVisible();
  });

  test('shows an error when tag name exceeds 10 characters', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'コレクションタグ' }).click();
    await page.getByRole('button', { name: '追加' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('12345678901');
    await expect(page.getByText('10文字以内で入力してください')).toBeVisible();
  });

  test('shows an error when tag name is a duplicate', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'コレクションタグ' }).click();
    await page.getByRole('button', { name: '追加' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('new'); // known existing tag
    await dialog.getByRole('button', { name: '確認へ進む' }).click();

    // Confirmation dialog appears first
    await expect(page.getByText('タグ「new」を追加しますか？')).toBeVisible();
    await page.getByRole('button', { name: '追加する' }).click();

    // App bounces back to the input modal, now showing the duplicate error
    await expect(page.getByText('既に登録済みのタグ名です')).toBeVisible();
  });

  

});