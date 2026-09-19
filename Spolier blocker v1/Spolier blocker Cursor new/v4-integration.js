/**
 * Spoiler Shield V4 - Integration Layer
 * Connects V4 Intelligence System to content script and options page
 */

const V4_LOG_PREFIX = '[V4 Integration]';

class V4Integration {
  constructor() {
    this.detector = null;
    this.initialized = false;
    this.pendingConfig = null;
    this.stats = {
      totalProcessed: 0,
      spoilersBlocked: 0,
      irrelevantIgnored: 0
    };
  }

  /**
   * Initialize V4 detector
   */
  async initialize(settings) {
    try {
      const config = typeof buildDetectorConfig === 'function'
        ? buildDetectorConfig(settings || {})
        : { relevanceThreshold: 0.50, spoilerThreshold: 0.65, blockEscalationThreshold: 0.75 };

      this.detector = new V4SpoilerDetector(config);
      this.pendingConfig = null;
      this.initialized = true;
      return true;
    } catch (error) {
      console.error(V4_LOG_PREFIX, 'Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Apply user settings to the active detector
   */
  configureFromSettings(settings = {}) {
    const config = typeof buildDetectorConfig === 'function'
      ? buildDetectorConfig(settings)
      : null;

    if (!config) return false;

    if (this.detector) {
      this.detector.updateConfig(config);
    } else {
      this.pendingConfig = config;
    }
    return true;
  }

  /**
   * Wait until V4 detector is ready (avoids race on page load)
   */
  async waitUntilReady(maxWaitMs = 5000, settings) {
    const start = Date.now();
    while (!this.isActive()) {
      if (Date.now() - start > maxWaitMs) return false;
      if (!this.detector) await this.initialize(settings);
      await new Promise(r => setTimeout(r, 50));
    }
    if (settings) this.configureFromSettings(settings);
    else if (this.pendingConfig && this.detector) {
      this.detector.updateConfig(this.pendingConfig);
      this.pendingConfig = null;
    }
    return true;
  }

  /**
   * Process text through V4 intelligence
   */
  processText(text, trackedMedia = []) {
    if (!this.detector) {
      return this.fallbackResult();
    }

    this.stats.totalProcessed++;

    const result = this.detector.analyze(text, trackedMedia);

    if (result.isSpoiler) {
      this.stats.spoilersBlocked++;
    }
    if (result.relevance && result.relevance.length === 0) {
      this.stats.irrelevantIgnored++;
    }

    return {
      isSpoiler: result.isSpoiler,
      blurEntireBlock: result.blurEntireBlock,
      probability: result.probability,
      confidence: result.confidence,
      severity: result.severity,
      relevance: result.relevance,
      entities: result.entities,
      events: result.events,
      narratives: result.narratives,
      plotDisclosures: result.plotDisclosures,
      blockAnalysis: result.blockAnalysis,
      spoilerSpans: [],
      reasoning: result.reasoning,
      method: 'v4_intelligence',
      processingTime: result.processingTime
    };
  }

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

  getStats() {
    const detectorStats = this.detector ? this.detector.getStats() : {};
    return {
      ...this.stats,
      ...detectorStats,
      blurred: this.stats.spoilersBlocked,
      v4Active: this.initialized,
      detectorType: 'intelligence_based',
      spoilerThreshold: this.detector?.config?.spoilerThreshold
    };
  }

  isActive() {
    return this.initialized && this.detector !== null;
  }

  getDiagnostics() {
    return {
      v4Loaded: typeof V4SpoilerDetector !== 'undefined',
      knowledgeEngineLoaded: typeof KnowledgeEngine !== 'undefined',
      initialized: this.initialized,
      detectorActive: this.detector !== null,
      config: this.detector?.config || null,
      stats: this.getStats()
    };
  }

  debug() {
    console.group('[V4 DEBUG PANEL]');
    console.log('V4 Active:', this.isActive());
    console.log('Diagnostics:', this.getDiagnostics());
    console.log('Stats:', this.getStats());
    const testResult = this.processText(
      'Tony Stark dies in Endgame',
      [{ title: 'Avengers: Endgame', phrases: [] }]
    );
    console.log('Test result:', testResult);
    console.groupEnd();
    return this.getDiagnostics();
  }
}

const v4Integration = new V4Integration();

if (typeof window !== 'undefined') {
  window.SpoilerShieldV4 = v4Integration;

  window.testV4 = {
    analyze: (text, media) => v4Integration.processText(text, media || []),
    debug: () => v4Integration.debug(),
    diagnostics: () => v4Integration.getDiagnostics(),
    stats: () => v4Integration.getStats(),
    isActive: () => v4Integration.isActive()
  };

  window.runV4Benchmark = () => {
    if (typeof V4BenchmarkRunner === 'undefined') {
      console.error('Benchmark not loaded. Include v4-benchmark.js');
      return;
    }
    const runner = new V4BenchmarkRunner(v4Integration.detector);
    return runner.runFullBenchmark();
  };
}

(async () => {
  if (document.readyState !== 'loading') {
    await v4Integration.initialize();
  } else {
    document.addEventListener('DOMContentLoaded', () => v4Integration.initialize());
  }
})();
