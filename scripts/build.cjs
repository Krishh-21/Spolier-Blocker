'use strict';
// A small, deterministic ZIP writer avoids shipping build tools or historical files.
require('./check.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const source = path.resolve(__dirname, '..', 'extension');
const out = path.resolve(__dirname, '..', 'dist');
const files = ['manifest.json', 'background.js', 'core.js', 'packs.js', 'content.js', 'content.css',
  'v4-knowledge-engine.js', 'v4-spoiler-detector.js', 'popup.html', 'popup.js', 'options.html', 'options.js', 'privacy.html', 'ui.css', 'tmdb-logo.svg', 'icon16.png', 'icon48.png', 'icon128.png'];
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
let offset = 0;
const chunks = [], directory = [];
for (const file of files.sort()) {
  const name = Buffer.from(file), bytes = fs.readFileSync(path.join(source, file));
  const crc = crc32(bytes);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc, 14); header.writeUInt32LE(bytes.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(name.length, 26);
  chunks.push(header, name, bytes);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(33, 14);
  central.writeUInt32LE(crc, 16); central.writeUInt32LE(bytes.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
  directory.push(central, name); offset += header.length + name.length + bytes.length;
}
const central = Buffer.concat(directory), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...chunks, central, end]);
fs.mkdirSync(out, { recursive: true });
const target = path.join(out, `spoiler-shield-${require('../package.json').version}.zip`);
fs.writeFileSync(target, zip);
fs.writeFileSync(target + '.sha256', crypto.createHash('sha256').update(zip).digest('hex') + '  ' + path.basename(target) + '\n');
console.log(`Built ${target} (${zip.length} bytes, ${files.length} files).`);
