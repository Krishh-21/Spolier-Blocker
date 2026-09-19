const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const trees = fs.readdirSync('.').filter(name => name.startsWith('Spolier blocker ') && fs.existsSync(path.join(name, 'Spolier blocker Cursor new/manifest.json'))).map(name => path.join(name, 'Spolier blocker Cursor new'));
test('historical syntax and external credential bridges stay closed', () => {
  for (const base of trees) {
    const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json')));
    assert.equal(manifest.externally_connectable, undefined);
    for (const file of ['background.js', 'options.js', 'content.js', 'tmdb-proxy/server.js']) new vm.Script(fs.readFileSync(path.join(base, file), 'utf8'), { filename: path.join(base, file) });
    assert.equal(fs.readFileSync(path.join(base, 'background.js'), 'utf8').includes('onMessageExternal.addListener'), false);
    assert.equal(fs.readFileSync(path.join(base, 'content.js'), 'utf8').includes("sessionStorage.setItem('__spoilerSelectedTitles'"), false);
  }
});
test('legacy backup sanitizers reject CSS syntax and omit account/API credentials', () => {
  for (const base of trees) {
    const source = fs.readFileSync(path.join(base, 'options.js'), 'utf8');
    const sandbox = {}; vm.createContext(sandbox);
    vm.runInContext(source.slice(source.lastIndexOf('function sanitizeLegacyBackup')), sandbox);
    const result = sandbox.sanitizeLegacyBackup({ settings: { overlayColor: 'red;} body{display:none}', blurRadiusPx: '1px);}', enabled: true }, userAccount: { token: 'SECRET' }, tmdbKey: 'SECRET', tmdbProxy: 'https://evil', customKeywords: ['Dune'] });
    assert.equal(result.settings.overlayColor, undefined);
    assert.equal(result.settings.blurRadiusPx, undefined);
    assert.equal(result.settings.enabled, true);
    assert.equal(JSON.stringify(result).includes('SECRET'), false);
    assert.equal(JSON.stringify(result).includes('evil'), false);
  }
});
test('public proxy health does not call upstream or serialize network errors', async () => {
  for (const base of trees) {
    const routes = new Map(); let fetches = 0;
    const app = { use() {}, get(route, fn) { routes.set(route, fn); }, listen() {} };
    const express = () => app; express.json = () => () => {};
    const sandbox = { process: { env: { DEFAULT_TMDB_KEY: 'SECRET' } }, console: { warn() {}, log() {}, error() {} }, URLSearchParams,
      require(name) { return { dotenv: { config() {} }, express, 'node-fetch': async () => { fetches++; throw new Error('SECRET'); }, cors: () => () => {}, 'express-rate-limit': () => () => {} }[name]; } };
    vm.runInNewContext(fs.readFileSync(path.join(base, 'tmdb-proxy/server.js'), 'utf8'), sandbox);
    if (!routes.has('/health')) continue;
    let body;
    const response = { status() { return this; }, set() { return this; }, json(value) { body = value; return this; } };
    for (let i = 0; i < 150; i++) await routes.get('/health')({}, response);
    assert.equal(fetches, 0); assert.equal(JSON.stringify(body).includes('SECRET'), false);
  }
});

test('historical IndexedDB migration never erases phrases still consumed from sync', async () => {
  for (const version of ['v1.2', 'v1.3']) {
    const source = fs.readFileSync(`Spolier blocker ${version}/Spolier blocker Cursor new/indexeddb-manager.js`, 'utf8');
    const start = source.indexOf('async function migrateFromSyncStorage()');
    const end = source.indexOf('/**', start);
    const original = { selectedMedia: [{ title: 'Without ID', phrases: ['Mira Vale'] }, { id: 42, title: 'With ID', phrases: ['Other character'] }], rlWeights: { term: 1 } };
    const copied = [];
    const sandbox = { console: { log() {}, error() {} }, getMetadata: async () => false, saveMetadata: async () => {},
      savePhrases: async (id, phrases) => copied.push({ id, phrases }), saveRLWeightsBatch: async () => ({ saved: 1 }),
      chrome: { storage: { sync: { get: (_, done) => done(original), set() { throw new Error('Source must be preserved'); }, remove() { throw new Error('Source must be preserved'); } } } } };
    vm.createContext(sandbox); vm.runInContext(source.slice(start, end), sandbox);
    const result = await sandbox.migrateFromSyncStorage();
    assert.equal(result.success, true); assert.equal(result.freedSpace, false);
    assert.equal(original.selectedMedia[0].phrases[0], 'Mira Vale'); assert.equal(copied.length, 1);
  }
});
