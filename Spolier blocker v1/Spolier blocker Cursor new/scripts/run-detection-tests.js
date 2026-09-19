#!/usr/bin/env node
/**
 * Spoiler Shield V4 — automated detection test runner
 * Usage: npm test
 */
global.window = global;

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

eval(fs.readFileSync(path.join(root, 'v4-knowledge-engine.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'v4-spoiler-detector.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'v4-benchmark.js'), 'utf8'));

const detector = new V4SpoilerDetector(buildDetectorConfig({ aggressiveness: 2 }));

const suites = [
  { name: 'Names only (no blur)', expectBlur: false, cases: [
    [{ title: 'Avengers: Endgame', phrases: [] }, 'Tony Stark and Steve Rogers are the main heroes'],
    [{ title: 'Breaking Bad', phrases: ['Walter White'] }, 'Walter White and Jesse Pinkman cook together'],
  ]},
  { name: 'Spoilers (blur)', expectBlur: true, cases: [
    [{ title: 'Breaking Bad', phrases: ['Walter'] }, 'Walter dies in season 5'],
    [{ title: 'Avengers: Endgame', phrases: [] }, 'Captain America proves he is worthy and wields Mjolnir during the final battle'],
    [{ title: 'Random Show', phrases: ['Hamza'] }, 'The Twist: Hamza is not Pakistani at all'],
    [{ title: 'Avengers: Endgame', phrases: [] }, 'Cap stays in the past and retires'],
    [{ title: 'Avengers: Endgame', phrases: [] }, 'The rat saves everyone'],
    [{ title: 'Breaking Bad', phrases: ['Hank'] }, 'Hank finds the book in the toilet'],
    [{ title: 'Formula 1', phrases: ['Max Verstappen'], type: 'sports' }, 'Max Verstappen wins the Monaco Grand Prix'],
    [{ title: 'Oscars', phrases: [], type: 'awards' }, 'Oppenheimer wins Best Picture at the Academy Awards'],
    [{ title: 'Dune', phrases: [], knowledge: {
      aliases: ['Dune: Part One'],
      characters: [{ name: 'Paul Atreides', aliases: ['Paul'] }, { name: 'Chani', aliases: [] }],
      keywords: ['desert', 'prophecy'],
      genres: ['Science Fiction']
    }}, 'Paul takes the throne and becomes emperor of the known universe'],
  ]},
];

let pass = 0;
let fail = 0;

console.log('Spoiler Shield V4 — Detection Tests\n');

for (const suite of suites) {
  console.log(`[${suite.name}]`);
  for (const [media, text] of suite.cases) {
    const result = detector.analyze(text, [media]);
    const ok = result.isSpoiler === suite.expectBlur;
    if (ok) pass++;
    else {
      fail++;
      console.log(`  FAIL: "${text.substring(0, 60)}..." expected=${suite.expectBlur} got=${result.isSpoiler} p=${result.probability.toFixed(2)}`);
    }
  }
}

console.log('\n--- Benchmark ---');
const runner = new V4BenchmarkRunner(detector);
const bench = runner.runFullBenchmark();

console.log(`\nCustom: ${pass} pass, ${fail} fail`);
const exitCode = fail > 0 ? 1 : 0;
process.exit(exitCode);
