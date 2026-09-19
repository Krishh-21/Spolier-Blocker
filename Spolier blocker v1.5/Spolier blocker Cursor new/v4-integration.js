/**
 * Spoiler Shield V4 - Integration Layer
 * 
 * Connects V4 Intelligence System to existing extension
 * 
 * V4 is a COMPLETE REPLACEMENT of V3.x regex systems
 * This uses TRUE SPOILER INTELLIGENCE instead of pattern matching
 */

console.log('[V4 Integration] Loading...');

class V4Integration {
  constructor() {
    this.detector = null;
    this.initialized = false;
    this.stats = {
      totalProcessed: 0,
      spoilersBlocked: 0,
      irrelevantIgnored: 0
    };
  }

  /**
   * Initialize V4 detector
   */
  async initialize() {
    try {
      // Create V4 detector with intelligence
      this.detector = new V4SpoilerDetector({
        relevanceThreshold: 0.50,
        spoilerThreshold: 0.65,
        blockEscalationThreshold: 0.75
      });

      this.initialized = true;
      console.log('[V4 Integration] ✅ Initialized with true spoiler intelligence');
      return true;
    } catch (error) {
      console.error('[V4 Integration] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Wait until V4 detector is ready (avoids race on page load)
   */
  async waitUntilReady(maxWaitMs = 5000) {
    const start = Date.now();
    while (!this.isActive()) {
      if (Date.now() - start > maxWaitMs) return false;
      if (!this.detector) await this.initialize();
      await new Promise(r => setTimeout(r, 50));
    }
    return true;
  }

  /**
   * Process text through V4 intelligence
   * @param {string} text - Text to analyze
   * @param {Array<string>} trackedTitles - Titles user is tracking
   * @returns {Object} Detection result
   */
  processText(text, trackedMedia = []) {
    if (!this.detector) {
      console.warn('[V4 Integration] Detector not initialized');
      return this.fallbackResult();
    }

    this.stats.totalProcessed++;

    // Run V4 intelligence analysis (titles or full media objects with phrases)
    const result = this.detector.analyze(text, trackedMedia);

    // Update stats
    if (result.isSpoiler) {
      this.stats.spoilersBlocked++;
    }
    if (result.relevance && result.relevance.length === 0) {
      this.stats.irrelevantIgnored++;
    }

    // Convert to format expected by content bridge
    return {
      isSpoiler: result.isSpoiler,
      blurEntireBlock: result.blurEntireBlock,
      probability: result.probability,
      confidence: result.confidence,
      severity: result.severity,
      
      // V4-specific data
      relevance: result.relevance,
      entities: result.entities,
      events: result.events,
      narratives: result.narratives,
      blockAnalysis: result.blockAnalysis,
      
      // Compatibility
      spoilerSpans: [], // V4 uses block-level, not spans
      reasoning: result.reasoning,
      method: 'v4_intelligence',
      processingTime: result.processingTime
    };
  }

  /**
   * Fallback result when detector not available
   */
  fallbackResult() {
    return {
      isSpoiler: false,
      blurEntireBlock: false,
      probability: 0,
      confidence: 1.0,
      severity: 'none',
      reasoning: ['V4 detector not initialized'],
      method: 'fallback'
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const detectorStats = this.detector ? this.detector.getStats() : {};
    
    return {
      ...this.stats,
      ...detectorStats,
      v4Active: this.initialized,
      detectorType: 'intelligence_based'
    };
  }

  /**
   * Check if V4 is active
   */
  isActive() {
    return this.initialized && this.detector !== null;
  }

  /**
   * Get diagnostics
   */
  getDiagnostics() {
    return {
      v4Loaded: typeof V4SpoilerDetector !== 'undefined',
      knowledgeEngineLoaded: typeof KnowledgeEngine !== 'undefined',
      initialized: this.initialized,
      detectorActive: this.detector !== null,
      stats: this.getStats()
    };
  }

  /**
   * Debug panel
   */
  debug() {
    console.group('[V4 DEBUG PANEL]');
    console.log('V4 Active:', this.isActive());
    console.log('Diagnostics:', this.getDiagnostics());
    console.log('Stats:', this.getStats());
    
    // Test detection
    console.log('\n--- Test Detection ---');
    const testResult = this.processText('Tony Stark dies in Endgame', ['Avengers: Endgame']);
    console.log('Test: "Tony Stark dies in Endgame"');
    console.log('Tracked: ["Avengers: Endgame"]');
    console.log('Result:', testResult);
    
    console.groupEnd();
    
    return this.getDiagnostics();
  }
}

// Create singleton instance
const v4Integration = new V4Integration();

// Export
if (typeof window !== 'undefined') {
  window.SpoilerShieldV4 = v4Integration;
  
  // Test helpers
  window.testV4 = {
    analyze: (text, titles) => v4Integration.processText(text, titles || []),
    debug: () => v4Integration.debug(),
    diagnostics: () => v4Integration.getDiagnostics(),
    stats: () => v4Integration.getStats(),
    isActive: () => v4Integration.isActive()
  };
  
  // Benchmark helper
  window.runV4Benchmark = () => {
    if (typeof V4BenchmarkRunner === 'undefined') {
      console.error('Benchmark not loaded. Include v4-benchmark.js');
      return;
    }
    
    const runner = new V4BenchmarkRunner(v4Integration.detector);
    return runner.runFullBenchmark();
  };
  
  console.log('[V4 Integration] Commands available:');
  console.log('  testV4.analyze(text, titles) - Test V4 intelligence');
  console.log('  testV4.debug() - Show diagnostics');
  console.log('  testV4.stats() - Show statistics');
  console.log('  runV4Benchmark() - Run 500+ test suite');
}

// Initialize V4 as soon as possible
(async () => {
  // Wait for DOM and all V4 components to load
  if (document.readyState !== 'loading') {
    await v4Integration.initialize();
  } else {
    document.addEventListener('DOMContentLoaded', async () => {
      await v4Integration.initialize();
    });
  }
})();

console.log('[V4 Integration] Loaded and initializing automatically');
