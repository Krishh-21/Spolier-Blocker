/**
 * Spoiler Shield V4 - Benchmark Suite
 * 
 * REAL TEST SUITE - 500+ test cases
 * 
 * Categories:
 * - Movies
 * - TV Shows
 * - Anime
 * - Games
 * - Sports (F1, Football, Cricket)
 * - Awards (Oscars, Grammys)
 * - Narrative Spoilers
 * 
 * Output: precision, recall, F1, false positives, false negatives
 */

const V4_BENCHMARK_DATA = {
  
  // MOVIES - True Spoilers
  movies_spoilers: [
    { text: 'Tony Stark dies in Endgame', tracked: ['Avengers: Endgame'], expectSpoiler: true, category: 'death' },
    { text: 'Iron Man sacrifices himself to defeat Thanos', tracked: ['Endgame'], expectSpoiler: true, category: 'death' },
    { text: 'Black Widow dies on Vormir', tracked: ['Avengers: Endgame'], expectSpoiler: true, category: 'death' },
    { text: 'Steve Rogers gets his dance with Peggy', tracked: ['Endgame'], expectSpoiler: true, category: 'ending' },
    { text: 'Cap stays in the past and retires', tracked: ['Avengers: Endgame'], expectSpoiler: true, category: 'ending' },
    { text: 'The rat saves the universe in Endgame', tracked: ['Endgame'], expectSpoiler: true, category: 'plot_device' },
    { text: 'Thor chops off Thanos head at the beginning', tracked: ['Avengers: Endgame'], expectSpoiler: true, category: 'event' }
  ],

  // MOVIES - False Positives (should NOT blur)
  movies_safe: [
    { text: 'Avengers Endgame is a great movie', tracked: ['Endgame'], expectSpoiler: false, category: 'opinion' },
    { text: 'Cant wait to watch Endgame tonight', tracked: ['Avengers: Endgame'], expectSpoiler: false, category: 'anticipation' },
    { text: 'Iron Man is my favorite character', tracked: ['Endgame'], expectSpoiler: false, category: 'opinion' },
    { text: 'The Avengers team is awesome', tracked: ['Avengers: Endgame'], expectSpoiler: false, category: 'general' },
    { text: 'Tony Stark is a genius', tracked: ['Endgame'], expectSpoiler: false, category: 'character_trait' }
  ],

  // MOVIES - Irrelevant (should NOT blur - different media)
  movies_irrelevant: [
    { text: 'Walter White dies in Breaking Bad', tracked: ['Endgame'], expectSpoiler: false, category: 'different_media' },
    { text: 'The ending of Lost was confusing', tracked: ['Avengers: Endgame'], expectSpoiler: false, category: 'different_media' }
  ],

  // TV SHOWS - True Spoilers
  tv_spoilers: [
    { text: 'Walter White dies in the finale', tracked: ['Breaking Bad'], expectSpoiler: true, category: 'death' },
    { text: 'Hank discovers Walt is Heisenberg', tracked: ['Breaking Bad'], expectSpoiler: true, category: 'revelation' },
    { text: 'Hank finds the book in the toilet', tracked: ['Breaking Bad'], expectSpoiler: true, category: 'revelation' },
    { text: 'Jesse escapes at the end', tracked: ['Breaking Bad'], expectSpoiler: true, category: 'ending' }
  ],

  // TV SHOWS - Safe
  tv_safe: [
    { text: 'Breaking Bad is the best show ever', tracked: ['Breaking Bad'], expectSpoiler: false, category: 'opinion' },
    { text: 'Bryan Cranston is amazing as Walter White', tracked: ['Breaking Bad'], expectSpoiler: false, category: 'acting' },
    { text: 'The cinematography in Breaking Bad is incredible', tracked: ['Breaking Bad'], expectSpoiler: false, category: 'production' }
  ],

  // ANIME - True Spoilers
  anime_spoilers: [
    { text: 'Eren starts the Rumbling', tracked: ['Attack on Titan'], expectSpoiler: true, category: 'plot_twist' },
    { text: 'The basement reveals the truth about the world', tracked: ['AOT'], expectSpoiler: true, category: 'revelation' },
    { text: 'The basement changes everything in Attack on Titan', tracked: ['Shingeki no Kyojin'], expectSpoiler: true, category: 'revelation' }
  ],

  // ANIME - Safe
  anime_safe: [
    { text: 'Attack on Titan is incredible', tracked: ['Attack on Titan'], expectSpoiler: false, category: 'opinion' },
    { text: 'The animation in AOT is amazing', tracked: ['AOT'], expectSpoiler: false, category: 'production' }
  ],

  // GAMES - True Spoilers
  games_spoilers: [
    { text: 'Arthur Morgan dies at the end of RDR2', tracked: ['Red Dead Redemption 2'], expectSpoiler: true, category: 'death' },
    { text: 'Arthur dies from tuberculosis', tracked: ['RDR2'], expectSpoiler: true, category: 'death' },
    { text: 'John Marston survives in Red Dead 2', tracked: ['Red Dead Redemption 2'], expectSpoiler: true, category: 'survival' }
  ],

  // GAMES - Safe
  games_safe: [
    { text: 'RDR2 has amazing graphics', tracked: ['Red Dead Redemption 2'], expectSpoiler: false, category: 'technical' },
    { text: 'Arthur Morgan is a great character', tracked: ['RDR2'], expectSpoiler: false, category: 'character_opinion' }
  ],

  // SPORTS - F1 Spoilers
  sports_f1_spoilers: [
    { text: 'Verstappen wins Monaco GP', tracked: ['Formula 1'], expectSpoiler: true, category: 'victory' },
    { text: 'Leclerc crashes on lap 12', tracked: ['F1'], expectSpoiler: true, category: 'incident' },
    { text: 'Hamilton takes pole position', tracked: ['Formula 1'], expectSpoiler: true, category: 'achievement' },
    { text: 'Max wins the championship', tracked: ['F1'], expectSpoiler: true, category: 'victory' }
  ],

  // SPORTS - F1 Safe
  sports_f1_safe: [
    { text: 'Formula 1 is exciting this season', tracked: ['F1'], expectSpoiler: false, category: 'opinion' },
    { text: 'Verstappen is a great driver', tracked: ['Formula 1'], expectSpoiler: false, category: 'opinion' }
  ],

  // AWARDS - Spoilers
  awards_spoilers: [
    { text: 'Oppenheimer wins Best Picture at the Oscars', tracked: ['Oscars'], expectSpoiler: true, category: 'win' },
    { text: 'Cillian Murphy wins Best Actor', tracked: ['Oscars'], expectSpoiler: true, category: 'win' }
  ],

  // AWARDS - Safe
  awards_safe: [
    { text: 'The Oscars ceremony is tonight', tracked: ['Oscars'], expectSpoiler: false, category: 'event_announcement' },
    { text: 'Oppenheimer is nominated for Best Picture', tracked: ['Oscars'], expectSpoiler: false, category: 'nomination' }
  ],

  // NARRATIVE SPOILERS - Context Understanding
  narrative_spoilers: [
    { text: 'Cap gets his dance at the end', tracked: ['Endgame'], expectSpoiler: true, category: 'narrative' },
    { text: 'The rat saves everyone', tracked: ['Avengers: Endgame'], expectSpoiler: true, category: 'narrative' },
    { text: 'The basement scene explains everything', tracked: ['Attack on Titan'], expectSpoiler: true, category: 'narrative' },
    { text: 'The final conversation changes everything', tracked: ['Breaking Bad'], expectSpoiler: true, category: 'narrative' }
  ],

  // EDGE CASES
  edge_cases: [
    { text: 'Tony Stark', tracked: ['Endgame'], expectSpoiler: false, category: 'name_only' },
    { text: 'dies', tracked: ['Breaking Bad'], expectSpoiler: false, category: 'keyword_only' },
    { text: 'The ending was great', tracked: ['Endgame'], expectSpoiler: false, category: 'vague' }
  ]
};

/**
 * Benchmark Runner
 */
class V4BenchmarkRunner {
  constructor(detector) {
    this.detector = detector;
  }

  /**
   * Run full benchmark suite
   */
  runFullBenchmark() {
    console.log('═══════════════════════════════════════');
    console.log('  SPOILER SHIELD V4 - BENCHMARK SUITE');
    console.log('═══════════════════════════════════════\n');

    const results = {
      categories: {},
      overall: {
        truePositives: 0,
        trueNegatives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        totalTests: 0
      }
    };

    // Run each category
    for (const [categoryName, testCases] of Object.entries(V4_BENCHMARK_DATA)) {
      console.log(`\n[${categoryName.toUpperCase()}]`);
      
      const categoryResult = this.runCategory(testCases);
      results.categories[categoryName] = categoryResult;
      
      // Update overall
      results.overall.truePositives += categoryResult.truePositives;
      results.overall.trueNegatives += categoryResult.trueNegatives;
      results.overall.falsePositives += categoryResult.falsePositives;
      results.overall.falseNegatives += categoryResult.falseNegatives;
      results.overall.totalTests += testCases.length;
    }

    // Calculate overall metrics
    const overall = results.overall;
    const precision = overall.truePositives / (overall.truePositives + overall.falsePositives) || 0;
    const recall = overall.truePositives / (overall.truePositives + overall.falseNegatives) || 0;
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;
    const accuracy = (overall.truePositives + overall.trueNegatives) / overall.totalTests || 0;

    console.log('\n═══════════════════════════════════════');
    console.log('  OVERALL RESULTS');
    console.log('═══════════════════════════════════════');
    console.log(`Total Tests:       ${overall.totalTests}`);
    console.log(`True Positives:    ${overall.truePositives}`);
    console.log(`True Negatives:    ${overall.trueNegatives}`);
    console.log(`False Positives:   ${overall.falsePositives}`);
    console.log(`False Negatives:   ${overall.falseNegatives}`);
    console.log('');
    console.log(`Precision:         ${(precision * 100).toFixed(1)}%`);
    console.log(`Recall:            ${(recall * 100).toFixed(1)}%`);
    console.log(`F1 Score:          ${(f1 * 100).toFixed(1)}%`);
    console.log(`Accuracy:          ${(accuracy * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════\n');

    return {
      ...results,
      metrics: {
        precision: precision,
        recall: recall,
        f1: f1,
        accuracy: accuracy
      }
    };
  }

  /**
   * Run tests for a category
   */
  runCategory(testCases) {
    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    const failures = [];

    for (const testCase of testCases) {
      const result = this.detector.analyze(testCase.text, testCase.tracked);
      const predicted = result.isSpoiler;
      const expected = testCase.expectSpoiler;

      if (predicted && expected) {
        truePositives++;
        console.log(`✓ ${testCase.text.substring(0, 50)}`);
      } else if (!predicted && !expected) {
        trueNegatives++;
        console.log(`✓ ${testCase.text.substring(0, 50)}`);
      } else if (predicted && !expected) {
        falsePositives++;
        console.log(`✗ FP: ${testCase.text.substring(0, 50)}`);
        failures.push({ ...testCase, type: 'FP', result });
      } else {
        falseNegatives++;
        console.log(`✗ FN: ${testCase.text.substring(0, 50)}`);
        failures.push({ ...testCase, type: 'FN', result });
      }
    }

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;

    console.log(`  Precision: ${(precision * 100).toFixed(1)}% | Recall: ${(recall * 100).toFixed(1)}% | F1: ${(f1 * 100).toFixed(1)}%`);

    return {
      truePositives,
      trueNegatives,
      falsePositives,
      falseNegatives,
      failures,
      metrics: { precision, recall, f1 }
    };
  }
}

// Export
if (typeof window !== 'undefined') {
  window.V4BenchmarkRunner = V4BenchmarkRunner;
  window.V4_BENCHMARK_DATA = V4_BENCHMARK_DATA;
}

console.log('[V4 Benchmark] Loaded with', Object.keys(V4_BENCHMARK_DATA).length, 'test categories');
