const { expect } = require('@playwright/test');

// The real data rows of the notification table
const rowsOf = (page) => page.locator('tbody tr[role="checkbox"]');

const searchBox = (page) => page.getByRole('textbox'); // not tied to the placeholder, which stops matching once text is typed
const noDataMessage = (page) => page.getByText('表示するデータがありません');

// Opens the notification list and waits until the rows have loaded
async function openNotifications(page) {
  await page.goto('/push-notification');
  await expect(rowsOf(page).first()).toBeVisible();
}

// Opens the notification list, then the creation form (新規作成)
async function openCreateForm(page) {
  await openNotifications(page);
  await page.getByRole('button', { name: '新規作成' }).click();
  await expect(page).toHaveURL(/add-new/);
}

// Opens the creation form in プッシュ通知のみ mode (会員ユーザー comes selected) and returns its parts
async function openPushForm(page) {
  await openCreateForm(page);
  await page.getByRole('radio', { name: 'プッシュ通知のみ' }).check();
  const sendButton = page.getByRole('button', { name: '送信する' });
  await expect(sendButton).toBeVisible();
  return { title: page.locator('#title'), message: page.locator('#message'), sendButton };
}

// Reads the 配信日時 cell of every row ("2026年 10月 06日   11:36") and turns each into a number
// by picking out the digits, so we can compare dates without needing any Japanese text.
async function rowDates(page) {
  const texts = await rowsOf(page).locator('td:nth-child(2)').allInnerTexts();
  return texts.map((text) => {
    const [year, month, day, hour, minute] = text.match(/\d+/g).map(Number);
    return new Date(year, month - 1, day, hour, minute).getTime();
  });
}

module.exports = { rowsOf, searchBox, noDataMessage, openNotifications, openCreateForm, openPushForm, rowDates };