/**
 * Spoiler Shield V3 Integration Layer
 * 
 * This file bridges the new V3 enhanced detection engine with the existing
 * Spoiler Shield extension architecture.
 * 
 * Architecture:
 * - content.js: Main extension logic (unchanged)
 * - v3-enhanced-detection.js: New detection engine
 * - v3-integration.js: Integration layer (THIS FILE)
 * 
 * Usage:
 *   Load this file after v3-enhanced-detection.js
 *   Call V3Integration.initialize() on boot
 *   Use V3Integration.processText() instead of old keyword matching
 */

console.log('[V3.5 DEBUG] v3-integration.js loading...');

class V3Integration {
  constructor() {
    this.detector = null;
    this.config = null;
    this.cache = new Map(); // In-memory cache for this session
    this.stats = {
      totalAnalyzed: 0,
      blurred: 0,
      cacheHits: 0,
      avgProcessingTime: 0,
      detectionMethod: { pattern: 0, cache: 0 }
    };
  }

  /**
   * Initialize V3 detection engine
   * @param {Object} userConfig - User configuration from chrome.storage
   */
  async initialize(userConfig = {}) {
    try {
      // Create detector instance
      this.detector = new EnhancedSpoilerDetector({
        spoilerThreshold: userConfig.spoilerThreshold || 0.65,
        minConfidence: userConfig.minConfidence || 0.50
      });

      this.config = userConfig;
      
      console.log('[Spoiler Shield V3] Enhanced detection engine initialized');
      return true;
    } catch (error) {
      console.error('[Spoiler Shield V3] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Process text through V3 detection pipeline
   * @param {string} text - Text to analyze
   * @param {Array<string>} trackedTitles - List of tracked media titles
   * @param {Object} options - Additional options (metadata, etc.)
   * @returns {Object} Detection result
   */
  processText(text, trackedTitles = [], options = {}) {
    if (!this.detector) {
      console.warn('[Spoiler Shield V3.5] Detector not initialized, using fallback');
      return this.fallbackDetection(text, trackedTitles);
    }

    // Input validation
    if (!text || typeof text !== 'string' || text.length < 10) {
      return {
        isSpoiler: false,
        probability: 0,
        confidence: 1.0,
        method: 'skip',
        reasoning: ['Text too short or invalid']
      };
    }

    const startTime = performance.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(text, trackedTitles);
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      this.stats.detectionMethod.cache++;
      const cached = this.cache.get(cacheKey);
      return { ...cached, method: 'cache' };
    }

    // Run detection with metadata
    const result = this.detector.analyze(text, trackedTitles, options.metadata || {});
    
    // Calculate processing time
    const processingTime = performance.now() - startTime;

    // Convert to format expected by existing code
    const integrationResult = {
      isSpoiler: result.shouldBlur,
      probability: result.spoilerProbability,
      confidence: result.confidence,
      severity: result.severity,
      signals: result.detectedSignals,
      relevance: result.relevance,
      reasoning: result.reasoning,
      spoilerSpans: result.spoilerSpans || [],
      method: 'pattern',
      processingTimeMs: processingTime
    };

    // Cache result
    this.cacheResult(cacheKey, integrationResult);

    // Update stats
    this.updateStats(integrationResult, processingTime);

    return integrationResult;
  }

  /**
   * Generate cache key for text + titles combination
   */
  generateCacheKey(text, titles) {
    // Simple hash function for caching
    const combined = text + '|' + titles.sort().join(',');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cache detection result
   */
  cacheResult(key, result) {
    // Limit cache size to prevent memory issues
    if (this.cache.size > 1000) {
      // Remove oldest 20% of entries
      const toDelete = Array.from(this.cache.keys()).slice(0, 200);
      toDelete.forEach(k => this.cache.delete(k));
    }
    
    this.cache.set(key, result);
  }

  /**
   * Fallback detection when V3 engine fails
   */
  fallbackDetection(text, trackedTitles) {
    // Simple keyword matching as fallback
    const spoilerKeywords = [
      'dies', 'death', 'killed', 'ending', 'finale', 'spoiler',
      'twist', 'reveal', 'betrayal', 'wins', 'loses'
    ];

    const lowerText = text.toLowerCase();
    const matches = spoilerKeywords.filter(kw => lowerText.includes(kw));

    return {
      isSpoiler: matches.length >= 2,
      probability: Math.min(matches.length * 0.3, 0.9),
      confidence: 0.6,
      method: 'fallback',
      reasoning: [`Fallback detection: found ${matches.length} keywords`]
    };
  }

  /**
   * Update performance statistics
   */
  updateStats(result, processingTime) {
    this.stats.totalAnalyzed++;
    if (result.isSpoiler) {
      this.stats.blurred++;
    }
    
    // Running average
    this.stats.avgProcessingTime = 
      (this.stats.avgProcessingTime * (this.stats.totalAnalyzed - 1) + processingTime) / 
      this.stats.totalAnalyzed;
    
    this.stats.detectionMethod[result.method] = 
      (this.stats.detectionMethod[result.method] || 0) + 1;
  }

  /**
   * Get current performance statistics including V3.7 block-level metrics
   */
  getStats() {
    return {
      ...this.stats,
      precision: this.stats.blurred / this.stats.totalAnalyzed || 0,
      cacheHitRate: this.stats.cacheHits / this.stats.totalAnalyzed || 0,
      // V3.7: Include detector stats for block-level metrics
      detectorStats: this.detector ? this.detector.perfStats : null
    };
  }

  /**
   * Clear cache (useful for debugging or memory management)
   */
  clearCache() {
    this.cache.clear();
    console.log('[Spoiler Shield V3] Cache cleared');
  }

  /**
   * Update detector configuration
   */
  updateConfig(newConfig) {
    if (this.detector && newConfig) {
      this.detector.config = {
        ...this.detector.config,
        ...newConfig
      };
      this.config = { ...this.config, ...newConfig };
      console.log('[Spoiler Shield V3] Configuration updated');
    }
  }

  /**
   * Process user feedback for reinforcement learning
   * @param {string} text - Original text
   * @param {boolean} wasSpoiler - User's feedback
   * @param {Object} originalPrediction - Original detection result
   */
  processFeedback(text, wasSpoiler, originalPrediction) {
    // Store feedback for future calibration
    const feedback = {
      text: text.substring(0, 200), // Store partial text for privacy
      predictedSpoiler: originalPrediction.isSpoiler,
      actualSpoiler: wasSpoiler,
      probability: originalPrediction.probability,
      signals: originalPrediction.signals?.map(s => s.name) || [],
      timestamp: Date.now()
    };

    // Save to chrome.storage for later analysis
    chrome.storage.local.get({ v3Feedback: [] }, (result) => {
      const feedbackList = result.v3Feedback || [];
      feedbackList.push(feedback);
      
      // Keep only last 1000 feedback entries
      if (feedbackList.length > 1000) {
        feedbackList.splice(0, feedbackList.length - 1000);
      }
      
      chrome.storage.local.set({ v3Feedback: feedbackList });
    });

    console.log('[Spoiler Shield V3] Feedback recorded:', feedback);
  }

  /**
   * TASK 5: Get diagnostic information
   */
  getDiagnostics() {
    return {
      v3Loaded: typeof EnhancedSpoilerDetector !== 'undefined',
      bridgeLoaded: typeof window !== 'undefined' && window.__v3BridgeLoaded === true,
      integrationLoaded: this.detector !== null,
      processorOverridden: typeof window !== 'undefined' && typeof window.__originalCreateProcessor !== 'undefined',
      legacyProcessorActive: typeof window !== 'undefined' && typeof window.__originalCreateProcessor !== 'undefined' && typeof window.createProcessor === 'function',
      cacheSize: this.cache.size,
      averageProcessingTime: this.stats.avgProcessingTime.toFixed(2) + 'ms',
      totalProcessed: this.stats.totalAnalyzed,
      blurRate: (this.stats.blurred / Math.max(this.stats.totalAnalyzed, 1) * 100).toFixed(1) + '%',
      cacheHitRate: (this.stats.cacheHits / Math.max(this.stats.totalAnalyzed, 1) * 100).toFixed(1) + '%',
      detectorPerfStats: this.detector ? this.detector.getPerfStats() : null
    };
  }

  /**
   * TASK 4: Debug panel for troubleshooting
   */
  debug() {
    const diag = this.getDiagnostics();
    
    console.group('[V3.5 DEBUG PANEL]');
    console.log('✓ Detector Loaded:', diag.v3Loaded);
    console.log('✓ Bridge Loaded:', diag.bridgeLoaded);
    console.log('✓ Integration Loaded:', diag.integrationLoaded);
    console.log('✓ Processor Overridden:', diag.processorOverridden);
    console.log('✓ Legacy Processor Active:', diag.legacyProcessorActive);
    console.log('Cache Size:', diag.cacheSize);
    console.log('Average Processing Time:', diag.averageProcessingTime);
    console.log('Total Processed:', diag.totalProcessed);
    console.log('Blur Rate:', diag.blurRate);
    console.log('Cache Hit Rate:', diag.cacheHitRate);
    
    if (diag.detectorPerfStats) {
      console.log('Detector Performance:', diag.detectorPerfStats);
    }
    
    // Test detection
    console.log('\n--- Test Detection ---');
    const testResult = this.processText('Walter White dies in the finale', ['Breaking Bad']);
    console.log('Test Input: "Walter White dies in the finale"');
    console.log('Tracked: ["Breaking Bad"]');
    console.log('Result:', testResult);
    
    console.groupEnd();
    
    return diag;
  }

  /**
   * TASK 5: Check if V3 is active
   */
  isActive() {
    return this.detector !== null && typeof window !== 'undefined' && window.SpoilerShieldV3 === this;
  }

  /**
   * TASK 4: Run benchmark tests
   */
  runBenchmark(benchmarkData) {
    if (!benchmarkData || !benchmarkData.TRUE_SPOILERS || !benchmarkData.FALSE_POSITIVES) {
      console.error('[V3.5 Benchmark] Invalid benchmark data');
      return null;
    }

    const startTime = performance.now();
    
    console.log('[V3.5 Benchmark] Starting benchmark tests...');
    
    const results = {
      trueSpoilers: { correct: 0, total: 0, missed: [], times: [] },
      falsePositives: { correct: 0, total: 0, wrongBlocks: [], times: [] },
      edgeCases: { results: [] }
    };
    
    // Test true spoilers (should be detected)
    results.trueSpoilers.total = benchmarkData.TRUE_SPOILERS.length;
    for (const test of benchmarkData.TRUE_SPOILERS) {
      const testStart = performance.now();
      const result = this.processText(test.text, [test.title]);
      const testTime = performance.now() - testStart;
      results.trueSpoilers.times.push(testTime);
      
      if (result.isSpoiler === test.expectMatch) {
        results.trueSpoilers.correct++;
      } else {
        results.trueSpoilers.missed.push({
          ...test,
          predicted: result.isSpoiler,
          probability: result.probability,
          reason: result.reasoning
        });
      }
    }
    
    // Test false positives (should NOT be detected)
    results.falsePositives.total = benchmarkData.FALSE_POSITIVES.length;
    for (const test of benchmarkData.FALSE_POSITIVES) {
      const testStart = performance.now();
      const result = this.processText(test.text, [test.title]);
      const testTime = performance.now() - testStart;
      results.falsePositives.times.push(testTime);
      
      if (result.isSpoiler === test.expectMatch) {
        results.falsePositives.correct++;
      } else {
        results.falsePositives.wrongBlocks.push({
          ...test,
          predicted: result.isSpoiler,
          probability: result.probability,
          reason: result.reasoning
        });
      }
    }
    
    // Test edge cases
    if (benchmarkData.EDGE_CASES) {
      for (const test of benchmarkData.EDGE_CASES) {
        const testStart = performance.now();
        const result = this.processText(test.text, [test.title]);
        const testTime = performance.now() - testStart;
        
        results.edgeCases.results.push({
          ...test,
          detected: result.isSpoiler,
          probability: result.probability,
          correct: result.isSpoiler === test.expectMatch,
          processingTime: testTime
        });
      }
    }
    
    // Calculate metrics
    const tp = results.trueSpoilers.correct; // True Positives
    const fn = results.trueSpoilers.total - results.trueSpoilers.correct; // False Negatives
    const tn = results.falsePositives.correct; // True Negatives
    const fp = results.falsePositives.total - results.falsePositives.correct; // False Positives
    
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const accuracy = (tp + tn) / (tp + tn + fp + fn) || 0;
    
    // Calculate timing statistics
    const allTimes = [...results.trueSpoilers.times, ...results.falsePositives.times];
    const avgTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
    const maxTime = Math.max(...allTimes);
    const minTime = Math.min(...allTimes);
    
    const totalTime = performance.now() - startTime;
    
    const metrics = {
      precision: (precision * 100).toFixed(1) + '%',
      recall: (recall * 100).toFixed(1) + '%',
      f1Score: (f1Score * 100).toFixed(1) + '%',
      accuracy: (accuracy * 100).toFixed(1) + '%',
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn,
      avgProcessingTime: avgTime.toFixed(2) + 'ms',
      maxProcessingTime: maxTime.toFixed(2) + 'ms',
      minProcessingTime: minTime.toFixed(2) + 'ms',
      totalBenchmarkTime: totalTime.toFixed(2) + 'ms'
    };
    
    console.log('[V3.5 Benchmark] Results:', metrics);
    console.log('[V3.5 Benchmark] Missed Spoilers:', results.trueSpoilers.missed.length);
    console.log('[V3.5 Benchmark] Wrong Blocks:', results.falsePositives.wrongBlocks.length);
    
    return {
      metrics,
      details: results
    };
  }

  /**
   * Batch process multiple text blocks efficiently
   * @param {Array<string>} texts - Array of texts to analyze
   * @param {Array<string>} trackedTitles - Tracked titles
   * @param {Object} options - Options including metadata
   * @returns {Array<Object>} Array of detection results
   */
  batchProcess(texts, trackedTitles = [], options = {}) {
    const results = [];
    const startTime = performance.now();

    for (const text of texts) {
      try {
        const result = this.processText(text, trackedTitles, options);
        results.push(result);
      } catch (error) {
        console.error('[Spoiler Shield V3.5] Batch processing error:', error);
        results.push({
          isSpoiler: false,
          probability: 0,
          error: error.message
        });
      }
    }

    const totalTime = performance.now() - startTime;
    console.log(`[Spoiler Shield V3.5] Batch processed ${texts.length} texts in ${totalTime.toFixed(2)}ms`);

    return results;
  }
}

// Create singleton instance
const v3Integration = new V3Integration();

console.log('[V3.5 DEBUG] V3Integration instance created');
console.log('[V3.5 DEBUG] typeof v3Integration:', typeof v3Integration);

// Export for use in other files
if (typeof window !== 'undefined') {
  window.SpoilerShieldV3 = v3Integration;
  console.log('[V3.5 DEBUG] window.SpoilerShieldV3 assigned');
  console.log('[V3.5 DEBUG] window.SpoilerShieldV3 ===  v3Integration:', window.SpoilerShieldV3 === v3Integration);
  
  // Add console helper for testing
  window.testV3 = {
    analyze: (text, titles) => v3Integration.processText(text, titles || []),
    diagnostics: () => v3Integration.getDiagnostics(),
    debug: () => v3Integration.debug(),
    isActive: () => v3Integration.isActive(),
    stats: () => v3Integration.getStats(),
    clearCache: () => v3Integration.clearCache()
  };
  
  console.log('[V3.5 Integration] Test helper available as window.testV3');
  console.log('[V3.5 Integration] Commands:');
  console.log('  testV3.debug() - Show full debug panel');
  console.log('  testV3.analyze(text, titles) - Test detection');
  console.log('  testV3.diagnostics() - Show diagnostics');
}

// Also support module exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = V3Integration;
}

console.log('[V3.5 DEBUG] v3-integration.js loaded successfully');

