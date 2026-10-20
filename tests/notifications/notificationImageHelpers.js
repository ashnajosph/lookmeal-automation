const { expect } = require('@playwright/test');

const zlib = require('zlib');

// Builds a solid orange 240x160 PNG in memory, so no image file has to be kept in the project
// and the image is big enough to be clearly seen in the notification
function makePng(width = 240, height = 160) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const check = Buffer.alloc(4);
    check.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, check]);
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB

  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [255, 149, 0]).flat())]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PNG = makePng();

// Presses the image button of the rich text editor, picks the PNG in the file chooser
// and waits until the image shows in the editor (the editor keeps it inside the text itself)
async function attachImage(page) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('.ql-image').click(),
  ]);
  await chooser.setFiles({ name: 'test.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('.ql-editor img')).toBeVisible();
}

module.exports = { attachImage };