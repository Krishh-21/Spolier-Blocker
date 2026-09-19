const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const sandbox = { performance, console: { log() {}, warn() {}, error() {} } };
sandbox.window = sandbox; vm.createContext(sandbox);
for (const file of ['packs.js', 'core.js', 'v4-knowledge-engine.js', 'v4-spoiler-detector.js']) vm.runInContext(fs.readFileSync('extension/' + file, 'utf8'), sandbox);
function detector(config) { return sandbox.SpoilerCore.createDetector(config, new sandbox.V4SpoilerDetector()); }
const fixtures = [
  ['Avengers: Endgame', ['Tony Stark'], 'Tony Stark dies in Endgame', true],
  ['Avengers: Endgame', [], 'Tony Stark and Steve Rogers are the main heroes', false],
  ['Avengers: Endgame', [], 'Captain America proves he is worthy and wields Mjolnir during the final battle', true],
  ['Breaking Bad', ['Walter White'], 'Walter White and Jesse Pinkman cook together', false],
  ['Breaking Bad', ['Walter White'], 'Walter dies in season 5', true],
  ['Random Show', ['Hamza'], 'The Twist: Hamza is not Pakistani at all', true],
  ['Dune', [], 'Dunedin local election winner announced', false],
  ['Thor', [], 'An author wins an award', false],
  ['Formula 1', ['Max Verstappen'], 'Max Verstappen wins the Monaco Grand Prix', true],
  ['A New Story', ['Mira Vale'], 'Mira Vale finale leaked', true]
];
for (const [title, phrases, text, expected] of fixtures) test(`contextual regression: ${title} / ${text}`, () => {
  assert.equal(detector({ selectedMedia: [{ title, phrases }] })(text).blocked, expected);
});
test('knowledge enrichment does not persist removed aliases in shared templates', () => {
  const engine = new sandbox.KnowledgeEngine();
  engine.getKnowledge([{ title: 'Avengers: Endgame', phrases: ['Imaginary Character'] }]);
  const fresh = engine.getKnowledge([{ title: 'Avengers: Endgame', phrases: [] }])[0];
  assert.equal(fresh.characters.some(c => c.name === 'Imaginary Character'), false);
});
