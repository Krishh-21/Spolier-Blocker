'use strict';
// A private local preview with a stable unpacked-extension ID; never use this bootstrap in production.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createPortal } = require('../server/app.cjs');
const root = path.resolve(__dirname, '..');
const data = path.join(root, 'server/data'); fs.mkdirSync(data, { recursive: true });
const credentialsPath = path.join(data, 'local-admin.json');
if (!fs.existsSync(credentialsPath)) {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  fs.writeFileSync(credentialsPath, JSON.stringify({ email: 'admin@spoilershield.local', password: crypto.randomBytes(24).toString('base64url'), publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64') }, null, 2), { mode: 0o600 });
}
const credentials = JSON.parse(fs.readFileSync(credentialsPath));
const extensionId = crypto.createHash('sha256').update(Buffer.from(credentials.publicKey, 'base64')).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(97 + parseInt(digit, 16)));
const origin = 'http://127.0.0.1:4173';
const target = path.join(root, 'dist/local-extension'); fs.mkdirSync(target, { recursive: true });
for (const file of fs.readdirSync(path.join(root, 'extension'))) fs.copyFileSync(path.join(root, 'extension', file), path.join(target, file));
const manifest = JSON.parse(fs.readFileSync(path.join(target, 'manifest.json')));
manifest.key = credentials.publicKey; manifest.optional_host_permissions.push(origin + '/*');
fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(target, 'account-config.js'), `globalThis.SpoilerAccount = Object.freeze(${JSON.stringify({ origin })});\n`);
createPortal({ database: path.join(data, 'local-preview.sqlite'), origin, extensionOrigins: ['chrome-extension://' + extensionId], adminEmail: credentials.email, adminPassword: credentials.password })
  .then(server => server.listen(4173, '127.0.0.1', () => {
    console.log(`Website: ${origin}\nAdmin: ${origin}/admin\nPrivate local admin credentials: ${credentialsPath}\nLoad unpacked for connected local testing: ${target}`);
  })).catch(error => { console.error(error.message); process.exitCode = 1; });
