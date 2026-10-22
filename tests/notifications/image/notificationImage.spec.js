const { test, expect } = require('@playwright/test');
const { openCreateForm } = require('../helpers/notificationHelpers');
const { attachImage } = require('../helpers/notificationImageHelpers');

// Image in the in-app message editor. Nothing here presses 次へ or sends anything.

test('ADM_027.138 (editor) - the image button opens the file chooser and the picked image shows in the editor', async ({ page }) => {
  await openCreateForm(page); // アプリ内通知 comes selected

  await attachImage(page);

  await expect(page.locator('.ql-editor img')).toHaveAttribute('src', /^data:image\/png/); // the image sits inside the text itself
});