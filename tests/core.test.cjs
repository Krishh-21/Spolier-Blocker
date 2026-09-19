const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../extension/packs.js');
const C = require('../extension/core.js');
test('custom keywords work without a selected title; punctuation and invisibles normalize', () => {
  const detect = C.createDetector({ customKeywords: ['Spider-Man', 'Dune', 'C++ ending'] });
  assert.equal(detect('SPIDER\u200b–MAN appears').blocked, true);
  assert.equal(detect('Dunedin travel').blocked, false);
  assert.equal(detect('C++ ending explained').blocked, true);
});
test('strict blocks names; balanced requires nearby spoiler signals', () => {
  const data = { selectedMedia: [{ title: 'A New Story', phrases: ['Mira Vale'] }] };
  const balanced = C.createDetector(data);
  assert.equal(balanced('Mira Vale cast interview').blocked, false);
  assert.equal(balanced('Mira Vale dies in the finale').blocked, true);
  assert.equal(balanced('An unrelated character dies').blocked, false);
  assert.equal(C.createDetector({ ...data, settings: { mode: 'strict' } })('Mira Vale cast interview').blocked, true);
});
test('Unicode boundaries do not confuse substrings and CJK titles match unspaced text', () => {
  assert.equal(C.createDetector({ customKeywords: ['Thor'] })('an author writes').blocked, false);
  assert.equal(C.createDetector({ customKeywords: ['進撃の巨人'] })('これは進撃の巨人の結末').blocked, true);
});
test('packs are opt in and have multilingual cues', () => {
  assert.equal(C.createDetector({})('Stranger Things ending explained').blocked, false);
  const d = C.createDetector({ enabledPacks: ['stranger-things'] });
  assert.equal(d('Stranger Things ending explained').blocked, true);
  assert.equal(d('Stranger Things: Vecna stirbt').blocked, true);
});
test('domain rules honor label boundaries, exclusions and explicit site overrides', () => {
  const settings = C.sanitize({ settings: { excludeDomains: ['example.com'] } }).settings;
  assert.equal(C.enabled(settings, 'news.example.com'), false);
  assert.equal(C.enabled(settings, 'notexample.com'), true);
  const c = C.sanitize({ settings: { includeDomains: ['youtube.com'], perSite: { 'youtube.com': false } } });
  assert.equal(C.enabled(c.settings, 'youtube.com'), false);
  assert.equal(C.domain('https://example.com'), '');
  assert.equal(C.domain('example.com@attacker.com'), '');
});
test('backup validation strips secrets, CSS, arbitrary keys and prototype properties', () => {
  const config = C.parseBackup('{"settings":{"overlayColor":"url(https://evil)","enabled":"no","blurRadiusPx":999,"perSite":{"__proto__":false}},"customKeywords":["safe",5],"userAccount":{"token":"SECRET"},"tmdbKey":"SECRET"}');
  assert.equal(config.settings.enabled, true);
  assert.equal(config.settings.blurRadiusPx, 40);
  assert.deepEqual(config.customKeywords, ['safe']);
  assert.equal(JSON.stringify(config).includes('SECRET'), false);
  assert.equal(JSON.stringify(config).includes('evil'), false);
  assert.equal(Object.hasOwn(config.settings.perSite, '__proto__'), false);
  assert.throws(() => C.parseBackup('[]'));
  assert.throws(() => C.parseBackup('{"schemaVersion":99,"settings":{}}'));
  assert.throws(() => C.parseBackup(' '.repeat(1000001)));
});
test('malformed arrays are bounded and exact exceptions do not whitelist a topic', () => {
  const d = C.createDetector({ customKeywords: ['Dune'], falsePositives: ['Dune premiere date'] });
  assert.equal(d('Dune premiere date').blocked, false);
  assert.equal(d('Dune ending explained').blocked, true);
  const c = C.sanitize({ selectedMedia: [null, 4, { title: 'ok', phrases: 'bad' }], customKeywords: Array.from({ length: 2500 }, (_, i) => 'term ' + i) });
  assert.equal(c.customKeywords.length, 2000);
  assert.equal(c.selectedMedia.length, 1);
});

test('reveal defaults off; YouTube exclusion has a real hostname boundary', () => {
  const c = C.sanitize({ settings: { protectYouTube: false, presentation: 'motion' } });
  assert.equal(c.settings.showReveal, false); assert.equal(c.settings.presentation, 'motion');
  assert.equal(C.enabled(c.settings, 'www.youtube.com'), false);
  assert.equal(C.enabled(c.settings, 'notyoutube.com'), true);
  assert.equal(C.sanitize({ settings: { presentation: 'pixelated' } }).settings.presentation, 'pixelated');
});
