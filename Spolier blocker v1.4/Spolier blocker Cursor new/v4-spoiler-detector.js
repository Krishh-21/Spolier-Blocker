/**
 * Spoiler Shield V4 - Spoiler Intelligence Detector
 * 
 * This is the main V4 detector that combines:
 * - Knowledge Engine (understands media)
 * - Entity Matcher (Tony Stark = Iron Man)
 * - Event Detector (deaths, victories, reveals)
 * - Narrative Inference (context understanding)
 * - Block Classifier (prevents leakage)
 */

class V4SpoilerDetector {
  constructor(config = {}) {
    this.config = {
      relevanceThreshold: config.relevanceThreshold || 0.50,
      spoilerThreshold: config.spoilerThreshold || 0.65,
      blockEscalationThreshold: config.blockEscalationThreshold || 0.75,
      ...config
    };
    
    // Initialize intelligence components
    this.knowledgeEngine = new KnowledgeEngine();
    this.entityMatcher = new EntityMatcher(this.knowledgeEngine);
    this.eventDetector = new SpoilerEventDetector(this.knowledgeEngine);
    this.narrativeEngine = new NarrativeInferenceEngine(this.knowledgeEngine);
    
    // Performance tracking
    this.stats = {
      totalAnalyzed: 0,
      relevantBlocked: 0,
      irrelevantIgnored: 0,
      entityMatches: 0,
      eventMatches: 0,
      narrativeMatches: 0,
      blockEscalations: 0,
      avgProcessingTime: 0
    };
    
    console.log('[V4 Detector] Initialized with true spoiler intelligence');
  }

  /**
   * Main analysis function - TRUE SPOILER INTELLIGENCE
   */
  analyze(text, trackedTitles = []) {
    const startTime = performance.now();
    
    if (!text || text.length < 10) {
      return this.noSpoilerResult(0, performance.now() - startTime);
    }

    // Step 1: Get knowledge for tracked media
    const trackedKnowledge = this.knowledgeEngine.getKnowledge(trackedTitles);
    
    if (trackedKnowledge.length === 0) {
      return this.noSpoilerResult(0, performance.now() - startTime);
    }

    // Step 2: Check relevance (is text about tracked media?)
    const relevance = this.knowledgeEngine.checkRelevance(text, trackedKnowledge);
    
    if (relevance.length === 0) {
      this.stats.irrelevantIgnored++;
      return this.noSpoilerResult(0, performance.now() - startTime, { 
        reason: 'not_relevant',
        relevance: []
      });
    }

    // Step 3: Find entities mentioned (Tony Stark, Iron Man, etc.)
    const relevantMedia = relevance.map(r => r.media);
    const foundEntities = this.entityMatcher.findEntities(text, relevantMedia);
    
    if (foundEntities.length > 0) {
      this.stats.entityMatches++;
    }

    // Step 4: Detect spoiler events (deaths, endings, victories)
    const detectedEvents = this.eventDetector.detectEvents(text, relevantMedia, foundEntities);
    
    if (detectedEvents.length > 0) {
      this.stats.eventMatches++;
    }

    // Step 5: Detect narrative spoilers ("Cap gets his dance")
    const detectedNarratives = this.narrativeEngine.detectNarratives(text, relevantMedia);
    
    if (detectedNarratives.length > 0) {
      this.stats.narrativeMatches++;
    }

    // Step 6: Calculate spoiler probability
    const analysis = this.calculateSpoilerProbability(
      text,
      relevance,
      foundEntities,
      detectedEvents,
      detectedNarratives
    );

    // Step 7: Block-level classification (prevent leakage)
    const blockAnalysis = this.analyzeBlock(text, analysis);
    
    // Step 8: Decide if we should blur
    const shouldBlur = analysis.probability >= this.config.spoilerThreshold;
    const shouldEscalate = blockAnalysis.shouldEscalate;
    
    if (shouldEscalate) {
      this.stats.blockEscalations++;
    }
    
    if (shouldBlur) {
      this.stats.relevantBlocked++;
    }

    const processingTime = performance.now() - startTime;
    this.updateStats(processingTime);

    return {
      isSpoiler: shouldBlur,
      blurEntireBlock: shouldEscalate,
      probability: analysis.probability,
      confidence: analysis.confidence,
      severity: analysis.severity,
      
      // Intelligence data
      relevance: relevance,
      entities: foundEntities,
      events: detectedEvents,
      narratives: detectedNarratives,
      
      // Block analysis
      blockAnalysis: blockAnalysis,
      
      // Reasoning
      reasoning: this.generateReasoning(analysis, foundEntities, detectedEvents, detectedNarratives, blockAnalysis),
      
      // Performance
      processingTime: processingTime
    };
  }

  /**
   * Calculate spoiler probability using intelligence signals
   */
  calculateSpoilerProbability(text, relevance, entities, events, narratives) {
    let probability = 0;
    let confidence = 0;
    let severity = 'minor';
    
    // Base probability from relevance
    if (relevance.length > 0) {
      const maxRelevance = Math.max(...relevance.map(r => r.confidence));
      probability += maxRelevance * 0.20; // 20% weight for relevance
      confidence += 0.25;
    }

    // Entity mentions increase probability
    if (entities.length > 0) {
      const entityScore = Math.min(entities.length * 0.15, 0.30);
      probability += entityScore;
      confidence += 0.25;
    }

    // Spoiler events are critical
    if (events.length > 0) {
      // Check severity of events
      const hasCritical = events.some(e => e.severity === 'critical');
      const hasMajor = events.some(e => e.severity === 'major');
      
      if (hasCritical) {
        probability += 0.50; // Critical events are 50% probability boost
        severity = 'critical';
      } else if (hasMajor) {
        probability += 0.35;
        severity = 'major';
      } else {
        probability += 0.20;
      }
      
      confidence += 0.30;
    }

    // Narrative spoilers are high confidence
    if (narratives.length > 0) {
      const maxNarrativeSeverity = narratives.reduce((max, n) => {
        if (n.severity === 'critical') return 'critical';
        if (n.severity === 'major' && max !== 'critical') return 'major';
        return max;
      }, 'minor');
      
      if (maxNarrativeSeverity === 'critical') {
        probability += 0.45;
        severity = 'critical';
      } else if (maxNarrativeSeverity === 'major') {
        probability += 0.30;
        if (severity !== 'critical') severity = 'major';
      }
      
      confidence += 0.20;
    }

    // Normalize
    probability = Math.min(probability, 1.0);
    confidence = Math.min(confidence, 1.0);

    return {
      probability: probability,
      confidence: confidence,
      severity: severity
    };
  }

  /**
   * Block-level analysis to prevent spoiler leakage
   */
  analyzeBlock(text, analysis) {
    const sentences = text.split(/[.!?]+\s+/).filter(s => s.length >= 10);
    
    if (sentences.length === 0) {
      return {
        shouldEscalate: false,
        sentenceCount: 0,
        signalCount: 0,
        entityDensity: 0,
        eventDensity: 0
      };
    }

    // Calculate densities
    const entityCount = (analysis.entities || []).length;
    const eventCount = (analysis.events || []).length;
    const narrativeCount = (analysis.narratives || []).length;
    
    const signalCount = entityCount + eventCount + narrativeCount;
    const entityDensity = entityCount / sentences.length;
    const eventDensity = (eventCount + narrativeCount) / sentences.length;
    
    // Escalation rules
    const shouldEscalate = 
      signalCount >= 3 ||                     // 3+ signals
      eventCount >= 2 ||                      // 2+ events
      eventDensity >= 0.30 ||                 // 30%+ event density
      analysis.probability >= this.config.blockEscalationThreshold; // High probability
    
    return {
      shouldEscalate: shouldEscalate,
      sentenceCount: sentences.length,
      signalCount: signalCount,
      entityDensity: entityDensity,
      eventDensity: eventDensity,
      entityCount: entityCount,
      eventCount: eventCount,
      narrativeCount: narrativeCount
    };
  }

  /**
   * Generate human-readable reasoning
   */
  generateReasoning(analysis, entities, events, narratives, blockAnalysis) {
    const reasons = [];
    
    // Block escalation
    if (blockAnalysis.shouldEscalate) {
      reasons.push(`⚠️ BLOCK BLUR: ${blockAnalysis.signalCount} spoiler signals detected`);
    }

    // Entities
    if (entities.length > 0) {
      const entityNames = entities.map(e => e.matchedAs).join(', ');
      reasons.push(`Entities: ${entityNames}`);
    }

    // Events
    if (events.length > 0) {
      const eventTypes = events.map(e => `${e.entity ? e.entity + ' ' : ''}${e.type}`).join(', ');
      reasons.push(`Events: ${eventTypes}`);
    }

    // Narratives
    if (narratives.length > 0) {
      const narrativeTypes = narratives.map(n => n.type).join(', ');
      reasons.push(`Narratives: ${narrativeTypes}`);
    }

    // Severity
    reasons.push(`Severity: ${analysis.severity}`);
    reasons.push(`Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);

    return reasons;
  }

  /**
   * Return no spoiler result
   */
  noSpoilerResult(probability, processingTime, extra = {}) {
    return {
      isSpoiler: false,
      blurEntireBlock: false,
      probability: probability,
      confidence: 1.0,
      severity: 'none',
      relevance: [],
      entities: [],
      events: [],
      narratives: [],
      reasoning: [extra.reason || 'No spoiler detected'],
      processingTime: processingTime,
      ...extra
    };
  }

  /**
   * Update performance statistics
   */
  updateStats(processingTime) {
    this.stats.totalAnalyzed++;
    const n = this.stats.totalAnalyzed;
    this.stats.avgProcessingTime = ((this.stats.avgProcessingTime * (n - 1)) + processingTime) / n;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgProcessingTimeMs: this.stats.avgProcessingTime.toFixed(2),
      relevanceRate: (this.stats.relevantBlocked / Math.max(this.stats.totalAnalyzed, 1) * 100).toFixed(1) + '%',
      escalationRate: (this.stats.blockEscalations / Math.max(this.stats.relevantBlocked, 1) * 100).toFixed(1) + '%'
    };
  }

  /**
   * Test function
   */
  test(text, trackedTitles) {
    console.group('[V4 Test]');
    console.log('Text:', text);
    console.log('Tracked:', trackedTitles);
    
    const result = this.analyze(text, trackedTitles);
    
    console.log('Result:', result);
    console.log('Is Spoiler:', result.isSpoiler);
    console.log('Probability:', (result.probability * 100).toFixed(0) + '%');
    console.log('Entities Found:', result.entities.length);
    console.log('Events Detected:', result.events.length);
    console.log('Narratives:', result.narratives.length);
    console.log('Reasoning:', result.reasoning);
    
    console.groupEnd();
    
    return result;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.V4SpoilerDetector = V4SpoilerDetector;
}

console.log('[V4 Spoiler Detector] Loaded');
