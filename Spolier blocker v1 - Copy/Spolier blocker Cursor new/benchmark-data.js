// Benchmark Dataset for Spoiler Detection Quality Testing
// Phase 4: Objective tuning and regression testing

/**
 * True Spoilers - Should be detected and blurred
 * These are real spoiler patterns found across different sites
 */
const TRUE_SPOILERS = [
  // Breaking Bad spoilers
  {
    text: "Walter White dies in the finale",
    site: "reddit",
    title: "Breaking Bad",
    severity: "critical", // critical, major, minor
    expectMatch: true,
    confidence: 0.9 // Expected confidence score
  },
  {
    text: "Hank discovers Walt is Heisenberg in S5E8",
    site: "twitter",
    title: "Breaking Bad",
    severity: "critical",
    expectMatch: true,
    confidence: 0.85
  },
  {
    text: "Jesse Pinkman escapes at the end",
    site: "facebook",
    title: "Breaking Bad",
    severity: "major",
    expectMatch: true,
    confidence: 0.8
  },
  
  // Game of Thrones spoilers
  {
    text: "Jon Snow comes back to life in Season 6",
    site: "reddit",
    title: "Game of Thrones",
    severity: "critical",
    expectMatch: true,
    confidence: 0.9
  },
  {
    text: "The Red Wedding episode where Robb Stark dies",
    site: "youtube",
    title: "Game of Thrones",
    severity: "critical",
    expectMatch: true,
    confidence: 0.85
  },
  {
    text: "Daenerys burns King's Landing",
    site: "twitter",
    title: "Game of Thrones",
    severity: "critical",
    expectMatch: true,
    confidence: 0.8
  },
  
  // The Sixth Sense spoilers
  {
    text: "Bruce Willis was dead the whole time",
    site: "imdb",
    title: "The Sixth Sense",
    severity: "critical",
    expectMatch: true,
    confidence: 0.95
  },
  
  // Star Wars spoilers
  {
    text: "Darth Vader is Luke's father",
    site: "reddit",
    title: "Star Wars",
    severity: "critical",
    expectMatch: true,
    confidence: 0.9
  },
  {
    text: "Han Solo gets killed by Kylo Ren",
    site: "twitter",
    title: "Star Wars: The Force Awakens",
    severity: "critical",
    expectMatch: true,
    confidence: 0.85
  },
  
  // The Usual Suspects
  {
    text: "Keyser Söze is Kevin Spacey's character",
    site: "imdb",
    title: "The Usual Suspects",
    severity: "critical",
    expectMatch: true,
    confidence: 0.9
  },
  
  // Fight Club
  {
    text: "Tyler Durden doesn't exist, he's Brad Pitt's alter ego",
    site: "reddit",
    title: "Fight Club",
    severity: "critical",
    expectMatch: true,
    confidence: 0.85
  },
  
  // Avengers: Endgame
  {
    text: "Tony Stark sacrifices himself to snap Thanos away",
    site: "youtube",
    title: "Avengers: Endgame",
    severity: "critical",
    expectMatch: true,
    confidence: 0.9
  },
  {
    text: "Captain America wields Thor's hammer",
    site: "twitter",
    title: "Avengers: Endgame",
    severity: "major",
    expectMatch: true,
    confidence: 0.75
  },
  
  // The Last of Us
  {
    text: "Joel dies in the beginning of Part II",
    site: "reddit",
    title: "The Last of Us Part II",
    severity: "critical",
    expectMatch: true,
    confidence: 0.9
  },
  
  // Breaking Bad (subtle spoilers)
  {
    text: "The final scene with Walter in the meth lab",
    site: "twitter",
    title: "Breaking Bad",
    severity: "minor",
    expectMatch: true,
    confidence: 0.65
  },
  
  // More varied examples
  {
    text: "Snape kills Dumbledore in Half-Blood Prince",
    site: "reddit",
    title: "Harry Potter",
    severity: "critical",
    expectMatch: true,
    confidence: 0.9
  },
  {
    text: "Ned Stark beheaded in Season 1",
    site: "facebook",
    title: "Game of Thrones",
    severity: "critical",
    expectMatch: true,
    confidence: 0.85
  },
  {
    text: "Trinity dies saving Neo in Revolutions",
    site: "imdb",
    title: "The Matrix",
    severity: "major",
    expectMatch: true,
    confidence: 0.8
  },
];

/**
 * False Positives - Should NOT be detected as spoilers
 * These are legitimate content that shouldn't be blocked
 */
const FALSE_POSITIVES = [
  // Cast and crew mentions
  {
    text: "Bryan Cranston stars in new movie",
    site: "imdb",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "actor-mention"
  },
  {
    text: "Breaking Bad cast reunion interview",
    site: "youtube",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "cast-reunion"
  },
  {
    text: "Directed by Vince Gilligan",
    site: "imdb",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "credits"
  },
  {
    text: "Aaron Paul to star in new Netflix series",
    site: "twitter",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "actor-news"
  },
  
  // General discussion without spoilers
  {
    text: "Breaking Bad is the best show ever made",
    site: "reddit",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "general-praise"
  },
  {
    text: "Just started watching Game of Thrones, loving it!",
    site: "twitter",
    title: "Game of Thrones",
    expectMatch: false,
    reason: "general-discussion"
  },
  {
    text: "Can't wait for the new Star Wars movie",
    site: "facebook",
    title: "Star Wars",
    expectMatch: false,
    reason: "anticipation"
  },
  
  // Awards and recognition
  {
    text: "Breaking Bad wins Emmy for Best Drama",
    site: "imdb",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "awards"
  },
  {
    text: "Game of Thrones nominated for 32 Emmys",
    site: "twitter",
    title: "Game of Thrones",
    expectMatch: false,
    reason: "awards"
  },
  
  // Reviews without spoilers
  {
    text: "The cinematography in Breaking Bad is incredible",
    site: "reddit",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "technical-review"
  },
  {
    text: "Best episodes of Game of Thrones ranked",
    site: "youtube",
    title: "Game of Thrones",
    expectMatch: false,
    reason: "ranking"
  },
  
  // Common words that appear in titles
  {
    text: "Breaking news: weather update",
    site: "twitter",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "common-word"
  },
  {
    text: "Game of the year awards",
    site: "reddit",
    title: "Game of Thrones",
    expectMatch: false,
    reason: "common-phrase"
  },
  {
    text: "The last person to comment wins",
    site: "facebook",
    title: "The Last of Us",
    expectMatch: false,
    reason: "common-phrase"
  },
  
  // Character actor mentions (not plot related)
  {
    text: "Walter White actor to host SNL",
    site: "twitter",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "actor-hosting"
  },
  {
    text: "Jon Snow kit worn by cosplayer",
    site: "reddit",
    title: "Game of Thrones",
    expectMatch: false,
    reason: "cosplay"
  },
  
  // Merchandise and products
  {
    text: "Breaking Bad Funko Pop collection",
    site: "facebook",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "merchandise"
  },
  {
    text: "Game of Thrones themed coffee mug",
    site: "twitter",
    title: "Game of Thrones",
    expectMatch: false,
    reason: "merchandise"
  },
  
  // Behind the scenes (no plot details)
  {
    text: "Behind the scenes of Breaking Bad filming",
    site: "youtube",
    title: "Breaking Bad",
    expectMatch: false,
    reason: "bts-general"
  },
  {
    text: "How they filmed the dragon scenes",
    site: "youtube",
    title: "Game of Thrones",
    expectMatch: false,
    reason: "bts-technical"
  },
];

/**
 * Edge Cases - Tricky examples that test detection quality
 */
const EDGE_CASES = [
  // Vague hints (should probably blur)
  {
    text: "That shocking moment in Breaking Bad finale",
    site: "twitter",
    title: "Breaking Bad",
    expectMatch: true,
    confidence: 0.6,
    category: "vague-hint"
  },
  {
    text: "I can't believe what happened to Jon Snow",
    site: "reddit",
    title: "Game of Thrones",
    expectMatch: true,
    confidence: 0.55,
    category: "reaction-hint"
  },
  
  // Character names in different context
  {
    text: "Walter White paint color for living room",
    site: "pinterest",
    title: "Breaking Bad",
    expectMatch: false,
    category: "name-coincidence"
  },
  {
    text: "Skyler blue dress fashion",
    site: "pinterest",
    title: "Breaking Bad",
    expectMatch: false,
    category: "name-fashion"
  },
  
  // Partial spoilers
  {
    text: "Episode discussion: Walt makes a difficult choice",
    site: "reddit",
    title: "Breaking Bad",
    expectMatch: true,
    confidence: 0.5,
    category: "vague-plot"
  },
];

/**
 * Evaluation functions
 */

/**
 * Run benchmark tests and calculate metrics
 */
function runBenchmark(detectionFunction) {
  const results = {
    trueSpoilers: { correct: 0, total: TRUE_SPOILERS.length, missed: [] },
    falsePositives: { correct: 0, total: FALSE_POSITIVES.length, wrongBlocks: [] },
    edgeCases: { results: [] }
  };
  
  // Test true spoilers
  TRUE_SPOILERS.forEach(test => {
    const detected = detectionFunction(test.text, test.title);
    if (detected === test.expectMatch) {
      results.trueSpoilers.correct++;
    } else {
      results.trueSpoilers.missed.push(test);
    }
  });
  
  // Test false positives
  FALSE_POSITIVES.forEach(test => {
    const detected = detectionFunction(test.text, test.title);
    if (detected === test.expectMatch) {
      results.falsePositives.correct++;
    } else {
      results.falsePositives.wrongBlocks.push(test);
    }
  });
  
  // Test edge cases
  EDGE_CASES.forEach(test => {
    const detected = detectionFunction(test.text, test.title);
    results.edgeCases.results.push({
      ...test,
      detected,
      correct: detected === test.expectMatch
    });
  });
  
  // Calculate metrics
  const tp = results.trueSpoilers.correct; // True Positives
  const fn = results.trueSpoilers.total - results.trueSpoilers.correct; // False Negatives
  const tn = results.falsePositives.correct; // True Negatives
  const fp = results.falsePositives.total - results.falsePositives.correct; // False Positives
  
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  const f1Score = 2 * (precision * recall) / (precision + recall);
  const accuracy = (tp + tn) / (tp + tn + fp + fn);
  
  return {
    metrics: {
      precision: (precision * 100).toFixed(1) + '%',
      recall: (recall * 100).toFixed(1) + '%',
      f1Score: (f1Score * 100).toFixed(1) + '%',
      accuracy: (accuracy * 100).toFixed(1) + '%'
    },
    details: results
  };
}

/**
 * Test different aggressiveness levels
 */
function benchmarkAggressiveness(levels = [0, 1, 2, 3]) {
  console.log('=== Benchmark by Aggressiveness Level ===\n');
  
  levels.forEach(level => {
    console.log(`\n--- Level ${level} ---`);
    // Here you would call your actual detection function with different settings
    // For now, this is a placeholder
    console.log('Run detection with aggressiveness:', level);
  });
}

/**
 * Export for use in tests
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TRUE_SPOILERS,
    FALSE_POSITIVES,
    EDGE_CASES,
    runBenchmark,
    benchmarkAggressiveness
  };
}
