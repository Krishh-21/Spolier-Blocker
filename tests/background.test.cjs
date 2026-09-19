const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function harness(legacy = {}) {
  const local = {}, sync = { ...legacy }, events = {};
  const area = data => ({
    async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, data[key]])); },
    async set(value) { Object.assign(data, value); },
    async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key]; },
    async setAccessLevel(value) { assert.equal(value.accessLevel, 'TRUSTED_CONTEXTS'); }
  });
  const event = name => ({ addListener(fn) { events[name] = fn; } });
  const sandbox = { console, URL, TextEncoder, TextDecoder, AbortController, setTimeout, clearTimeout,
    chrome: { storage: { local: area(local), sync: area(sync) }, runtime: { id: 'test-id', getURL: p => 'chrome-extension://test-id/' + p,
      onMessage: event('message'), onInstalled: event('installed'), openOptionsPage: async () => {} },
      tabs: { query: async () => [], sendMessage: async () => {} }, action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
      contextMenus: { onClicked: event('context'), removeAll: async () => {}, create: () => {} }, commands: { onCommand: event('command') },
      permissions: { contains: async () => false } } };
  vm.createContext(sandbox);
  sandbox.importScripts = (...files) => { for (const file of files) vm.runInContext(fs.readFileSync(path.resolve('extension', file), 'utf8'), sandbox); };
  vm.runInContext(fs.readFileSync('extension/background.js', 'utf8'), sandbox);
  return { sandbox, local, sync, ui: { id: 'test-id', url: 'chrome-extension://test-id/options.html' }, page: { id: 'test-id', url: 'https://example.com/', tab: { id: 1 }, frameId: 0 } };
}
test('migration preserves protection and removes synced credentials from page-visible state', async () => {
  const h = harness({ customKeywords: ['Dune'], tmdbKey: 'a'.repeat(32), userAccount: { token: 'secret' }, settings: { enabled: false } });
  const result = await h.sandbox.handle({ type: 'get-config' }, h.page);
  assert.equal(result.config.settings.enabled, false);
  assert.equal(result.config.customKeywords[0], 'Dune');
  assert.equal(h.local.tmdbToken, 'a'.repeat(32));
  assert.equal(h.sync.tmdbKey, undefined); assert.equal(h.sync.userAccount, undefined);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});
test('content scripts cannot mutate configuration, fetch metadata or obtain credentials', async () => {
  const h = harness();
  for (const type of ['save-config', 'save-token', 'token-status', 'search', 'toggle']) {
    await assert.rejects(h.sandbox.handle({ type, token: 'secret' }, h.page), /only available/);
  }
  await assert.rejects(h.sandbox.handle({ type: 'get-config' }, { id: 'another-extension' }), /Unsupported/);
});
test('concurrent keyword additions are serialized without lost updates', async () => {
  const h = harness(); h.local.accountSession = { user: { tier: 'max' } };
  await Promise.all(Array.from({ length: 20 }, (_, i) => h.sandbox.handle({ type: 'add-keyword', keyword: 'term ' + i }, h.ui)));
  assert.equal(h.local.config.customKeywords.length, 20);
});
test('lookup fails before network when optional permission is absent', async () => {
  const h = harness(); let fetched = false;
  h.sandbox.fetch = () => { fetched = true; throw new Error('Unexpected network'); };
  await assert.rejects(h.sandbox.handle({ type: 'search', query: 'Dune', mediaType: 'movie' }, h.ui), /Enable TMDB/);
  assert.equal(fetched, false);
});
test('fixed upstream errors redact credentials and response body limits fail closed', async () => {
  const h = harness(); await h.sandbox.initialize();
  h.local.tmdbToken = 'a'.repeat(32); h.sandbox.chrome.permissions.contains = async () => true;
  h.sandbox.fetch = async url => { assert.equal(url.hostname, 'api.themoviedb.org'); throw new Error('SECRET ' + url); };
  await assert.rejects(h.sandbox.handle({ type: 'search', query: 'Dune', mediaType: 'movie' }, h.ui), error => !error.message.includes('aaaa') && !error.message.includes('SECRET'));
  let canceled = false;
  h.sandbox.fetch = async () => ({ ok: true, body: { getReader: () => ({ read: async () => ({ value: new Uint8Array(2000001), done: false }), cancel: async () => { canceled = true; } }) } });
  await assert.rejects(h.sandbox.handle({ type: 'search', query: 'Dune', mediaType: 'movie' }, h.ui), /lookup failed/);
  assert.equal(canceled, true);
});

test('TMDB lookup returns spoiler-free search labels and stores only title aliases', async () => {
  const h = harness(); await h.sandbox.initialize();
  h.local.tmdbToken = 'read-access-token'; h.sandbox.chrome.permissions.contains = async () => true;
  h.sandbox.fetch = async (url, options) => {
    assert.equal(url.origin, 'https://api.themoviedb.org');
    assert.equal(options.headers.Authorization, 'Bearer read-access-token');
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    const data = url.pathname.includes('/search/')
      ? { results: [{ id: 42, title: 'A Story', release_date: '2026-01-01', overview: 'SECRET PLOT' }] }
      : { title: 'A Story', overview: 'SECRET PLOT', alternative_titles: { titles: [{ title: 'Une histoire' }] }, credits: { cast: [{ character: 'Mira Vale' }] } };
    let done = false;
    return { ok: true, body: { getReader: () => ({ read: async () => done ? { done: true } : (done = true, { done: false, value: new TextEncoder().encode(JSON.stringify(data)) }) }) } };
  };
  const search = await h.sandbox.handle({ type: 'search', query: 'Story', mediaType: 'movie' }, h.ui);
  assert.equal(search.results[0].year, '2026'); assert.equal(JSON.stringify(search).includes('SECRET PLOT'), false);
  const tracked = await h.sandbox.handle({ type: 'track-result', id: 42, mediaType: 'movie' }, h.ui);
  assert.equal(tracked.config.selectedMedia[0].phrases.includes('Mira Vale'), true);
  assert.equal(JSON.stringify(tracked).includes('SECRET PLOT'), false);
  assert.equal(JSON.stringify(tracked).includes('read-access-token'), false);
});

test('keyword quotas count entries, preserve existing data, and never trust imported tiers', async () => {
  const h = harness();
  await h.sandbox.handle({ type: 'save-config', config: { customKeywords: ['a long phrase', 'another'], tier: 'max' } }, h.ui);
  await assert.rejects(h.sandbox.handle({ type: 'add-keyword', keyword: 'third' }, h.ui), /allows 2/);
  h.local.accountPolicy = { free: 1, premium: 10, max: null };
  await h.sandbox.handle({ type: 'save-config', config: { ...h.local.config, settings: { showReveal: true } } }, h.ui);
  assert.equal(h.local.config.customKeywords.length, 2);
  for (const type of ['account-status', 'account-login', 'account-upload', 'account-download']) await assert.rejects(h.sandbox.handle({ type }, h.page), /only available/);
});
