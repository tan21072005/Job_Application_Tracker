import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function createPng(width, height, r, g, b, a = 255) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw a rounded box or colored square with border
      const isBorder = (x === 0 || x === width - 1 || y === 0 || y === height - 1);
      rawData[pxOffset] = isBorder ? Math.max(0, r - 30) : r;
      rawData[pxOffset + 1] = isBorder ? Math.max(0, g - 30) : g;
      rawData[pxOffset + 2] = isBorder ? Math.max(0, b - 30) : b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = Buffer.concat([
    Buffer.from('IHDR'),
    ihdrData
  ]);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(ihdrChunk), 0);
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),
    ihdrChunk,
    ihdrCrc
  ]);

  // IDAT
  const idatChunk = Buffer.concat([
    Buffer.from('IDAT'),
    compressed
  ]);
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressed.length, 0);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(idatChunk), 0);
  const idat = Buffer.concat([
    idatLength,
    idatChunk,
    idatCrc
  ]);

  // IEND
  const iendChunk = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendChunk), 0);
  const iend = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    iendChunk,
    iendCrc
  ]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const iconsDir = path.resolve('packages/jobtrack-extension/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Brand blue: #315bef -> rgb(49, 91, 239)
[16, 48, 128].forEach(size => {
  const png = createPng(size, size, 49, 91, 239);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png (${size}x${size})`);
});
