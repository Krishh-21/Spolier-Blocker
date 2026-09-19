'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
if (manifest.version !== require('../package.json').version) throw new Error('Version mismatch');
for (const file of fs.readdirSync(root)) {
  const text = fs.readFileSync(path.join(root, file));
  if (file.endsWith('.js')) new vm.Script(text.toString(), { filename: file });
  if (file.endsWith('.html')) {
    for (const match of text.toString().matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (!/^(https?:|#)/.test(match[1]) && !fs.existsSync(path.join(root, match[1]))) throw new Error(`Missing asset: ${match[1]}`);
    }
    if (/<script(?![^>]*\bsrc=)[^>]*>\s*\S/.test(text.toString())) throw new Error('Inline script: ' + file);
  }
}
for (const script of manifest.content_scripts.flatMap(x => [...x.js, ...x.css])) {
  if (!fs.existsSync(path.join(root, script))) throw new Error('Missing content asset: ' + script);
}
if (manifest.externally_connectable || manifest.oauth2 || manifest.web_accessible_resources) throw new Error('Unexpected public extension surface');
for (const folder of ['website', 'server', 'scripts']) {
  for (const file of fs.readdirSync(path.join(root, '..', folder))) {
    if (/\.(?:js|cjs)$/.test(file)) new vm.Script(fs.readFileSync(path.join(root, '..', folder, file), 'utf8'), { filename: `${folder}/${file}` });
  }
}
console.log('Extension syntax, manifest, version and asset checks passed.');
