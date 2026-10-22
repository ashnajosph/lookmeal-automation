const fs = require('fs');

// Turns CSV text into a list of objects, one per row, keyed by the header names
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] || ''])));
}

// DBレポート: picks a table, downloads its CSV and returns the rows (the file stays in Playwright's temp folder)
async function downloadTable(page, tableName) {
  await page.getByText('DBレポート', { exact: true }).first().click(); // the text appears twice in the sidebar
  await page.reload(); // starts with an empty table choice, also when this page was already open
  await page.getByText('DBテーブルを選択', { exact: true }).click();
  await page.getByRole('option', { name: tableName, exact: true }).click(); // an option, not the same text in the history table

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'CSVファイルダウンロード' }).click(),
  ]);
  return parseCsv(fs.readFileSync(await download.path(), 'utf8'));
}

// An active guest is one whose device_token has a value
const activeGuests = (rows) => rows.filter((r) => r.device_token.trim() !== '').length;

module.exports = { parseCsv, downloadTable, activeGuests };