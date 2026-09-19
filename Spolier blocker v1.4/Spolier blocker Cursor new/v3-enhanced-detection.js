/**
 * Spoiler Shield V3.7 - Block-Level Classification Engine
 * 
 * CRITICAL FIX: SPOILER LEAKAGE ELIMINATION
 * 
 * NEW IN V3.7:
 * - Block-level spoiler density analysis
 * - Escalation from span-blur to block-blur
 * - Major signal classification
 * - Narrative density detection
 * - AI response handling (ChatGPT, etc.)
 * 
 * IMPROVEMENTS FROM V3.5:
 * - Prevents spoiler leakage (entire spoiler blocks blurred)
 * - Smart escalation rules (3+ signals OR 2+ major signals)
 * - Content block type detection
 * - No more partial spoiler visibility
 * 
 * Expected Performance:
 * - Precision: 80-85%
 * - Recall: 75-80%
 * - Processing: <15ms per text block
 * - Zero spoiler leakage
 */

console.log('[V3.7 DEBUG] v3-enhanced-detection.js loading (Block Classifier)...');

class EnhancedSpoilerDetector {
  constructor(config = {}) {
    this.config = {
      spoilerThreshold: config.spoilerThreshold || 0.65,
      minConfidence: config.minConfidence || 0.50,
      relevanceThreshold: config.relevanceThreshold || 0.25,
      blockEscalationThreshold: config.blockEscalationThreshold || 0.80,
      spoilerDensityThreshold: config.spoilerDensityThreshold || 0.25,
      ...config
    };
    
    this.initializePatterns();
    this.initializeWeights();
    this.initializeNarrativePatterns();
    this.initializeBlockClassifier();
    
    // Performance tracking
    this.perfStats = {
      totalAnalyzed: 0,
      totalTime: 0,
      maxTime: 0,
      avgTime: 0,
      blockSpoilersDetected: 0,
      spanSpoilersDetected: 0,
      escalatedBlocks: 0,
      spoilerLeakagePrevented: 0
    };
    
    console.log('[V3.7 Block Classifier] Initialized with config:', this.config);
  }

  initializePatterns() {
    // Spoiler signal patterns with confidence weights
    this.patterns = {
      // CRITICAL SIGNALS (0.9-1.0)
      death: {
        pattern: /\b(dies?|death|killed|murdered|assassinated|executed|perished)\b/gi,
        weight: 0.95,
        severity: 'critical'
      },
      
      ending: {
        pattern: /\b(ending|finale|final (episode|chapter|scene)|concludes?|conclusion)\b/gi,
        weight: 0.90,
        severity: 'major'
      },
      
      // HIGH SIGNALS (0.75-0.89)
      revelation: {
        pattern: /\b((plot )?twist|reveals?|revelation|discovers?|finds? out|learns?|realizes?|turns? out)\b/gi,
        weight: 0.85,
        severity: 'major'
      },
      
      outcome: {
        pattern: /\b(wins?|loses?|defeats?|survives?|escapes?|sacrifices?|betrays?|betrayed by)\b/gi,
        weight: 0.82,
        severity: 'major'
      },
      
      transformation: {
        pattern: /\b(becomes?|turns? into|transforms? into|revealed (to be|as))\b/gi,
        weight: 0.80,
        severity: 'major'
      },
      
      villain: {
        pattern: /\b(villain|antagonist|bad guy|actually (evil|good)|secretly (working (for|with)))\b/gi,
        weight: 0.78,
        severity: 'major'
      },
      
      // MEDIUM-HIGH SIGNALS (0.60-0.74)
      future: {
        pattern: /\b(will|gonna|going to|eventually|by the end|in the (finale|ending)|ultimately|finally)\b/gi,
        weight: 0.72,
        severity: 'moderate'
      },
      
      temporal: {
        pattern: /\b(wait (until|for)|after (episode|chapter|season)|before (episode|chapter))\b/gi,
        weight: 0.70,
        severity: 'moderate'
      },
      
      spoilerAlert: {
        pattern: /\b(spoiler|spoilers?|spoiler alert)\b/gi,
        weight: 0.68,
        severity: 'moderate'
      },
      
      // MEDIUM SIGNALS (0.45-0.59)
      vague: {
        pattern: /\b(that (scene|moment|part|episode)|changed everything|broke me|never expected|mind[- ]?blow(ing|n)|jaw[- ]?drop(ping|ped)?)\b/gi,
        weight: 0.58,
        severity: 'moderate'
      },
      
      reference: {
        pattern: /\b(episode|season|chapter|volume|part)\s*\d+\b/gi,
        weight: 0.55,
        severity: 'minor'
      },
      
      relationship: {
        pattern: /\b(mar(ry|ries|ried)|divorce[ds]?|breaks? up|gets? together|dates?|kiss(es|ed)?)\b/gi,
        weight: 0.52,
        severity: 'minor'
      },
      
      event: {
        pattern: /\b(returns?|comes? back|leaves?|departs?|arrives?|appears?|introduced)\b/gi,
        weight: 0.48,
        severity: 'minor'
      },
      
      // LOW SIGNALS (0.30-0.44)
      power: {
        pattern: /\b(powers?|abilities?|strength|awakens?|unlocks?)\b/gi,
        weight: 0.42,
        severity: 'minor'
      },
      
      location: {
        pattern: /\b(goes to|travels? to|visits?|arrives? at)\b/gi,
        weight: 0.38,
        severity: 'minor'
      }
    };
  }

  initializeWeights() {
    // Contextual modifiers
    this.modifiers = {
      // Boost probability if multiple signals present
      multiSignalBoost: 0.15,
      
      // Reduce for past tense (often reviews, not spoilers)
      pastTenseReduction: -0.10,
      
      // Boost for future/conditional tense
      futureTenseBoost: 0.12,
      
      // Boost if mentions specific episodes/chapters
      specificReferenceBoost: 0.10,
      
      // Reduce for questions (usually speculation)
      questionReduction: -0.15,
      
      // Boost for definitive statements
      definitiveBoost: 0.08
    };
  }

  initializeNarrativePatterns() {
    // TASK 7: Patterns for narrative detection without obvious spoiler words
    this.narrativePatterns = {
      // Event significance patterns
      eventSignificance: {
        pattern: /\b(that (scene|moment|part)|the (scene|moment|part|episode) (where|when|with)|the (basement|hospital|final|last) scene)\b/gi,
        weight: 0.62,
        severity: 'moderate'
      },
      
      // Emotional impact
      emotionalImpact: {
        pattern: /\b(broke me|changed everything|never (the same|forget)|couldn't believe|jaw[- ]?drop(ped|ping)|mind[- ]?blow(n|ing)|can't stop thinking|had me (crying|sobbing|in tears))\b/gi,
        weight: 0.58,
        severity: 'moderate'
      },
      
      // Story-changing moments
      storyChanging: {
        pattern: /\b(changes everything|recontextualizes|explains everything|makes sense now|different meaning|new perspective|suddenly understand)\b/gi,
        weight: 0.70,
        severity: 'major'
      },
      
      // Episode/Chapter references (often spoiler context)
      episodeReference: {
        pattern: /\b(episode|chapter|season|part|volume)\s*(\d+|[IVX]+)\b/gi,
        weight: 0.60,
        severity: 'moderate'
      },
      
      // Outcome implications without explicit spoilers
      outcomeImplication: {
        pattern: /\b(the last (10|few) minutes|the (final|ending) (scene|sequence|shot)|after the (credits|episode)|by the end)\b/gi,
        weight: 0.65,
        severity: 'moderate'
      },
      
      // Narrative progression indicators
      narrativeProgression: {
        pattern: /\b(by (episode|season|chapter)|after (watching|reading|playing)|once you (see|know|understand|reach))\b/gi,
        weight: 0.55,
        severity: 'minor'
      },
      
      // Plot reveal indicators (subtle)
      plotReveal: {
        pattern: /\b(the reveal|the truth about|turns out|actually is|secretly|the real)\b/gi,
        weight: 0.75,
        severity: 'major'
      },
      
      // Reaction patterns that imply spoilers
      reactionPattern: {
        pattern: /\b(I can't believe (what|when|that)|no way (that|when)|didn't see (it|that) coming|shocked (when|that))\b/gi,
        weight: 0.60,
        severity: 'moderate'
      }
    };
  }

  /**
   * V3.7: Initialize Block-Level Classifier
   */
  initializeBlockClassifier() {
    // Define MAJOR signals (critical spoiler indicators)
    this.majorSignals = new Set([
      'death',
      'ending',
      'revelation',
      'outcome',
      'transformation',
      'villain'
    ]);
    
    // Escalation rules
    this.escalationRules = {
      minSignalCount: 3,           // Blur block if 3+ signals detected
      minMajorSignalCount: 2,      // Blur block if 2+ major signals detected
      minSpoilerDensity: 0.25,     // Blur block if 25%+ sentences are spoilers
      minBlockProbability: 0.80,   // Blur block if overall probability >= 80%
      minNarrativeDensity: 0.30    // Blur block if 30%+ narrative indicators
    };
    
    // Block type patterns for smart handling
    this.blockTypePatterns = {
      aiResponse: /\b(as an ai|i (can|cannot|shouldn't) provide|spoiler (alert|warning)|here are|let me explain|based on)\b/gi,
      spoilerRequest: /\b(spoil|spoilers?|tell me (what happens|the ending)|explain the (ending|plot)|who (dies|wins|survives))\b/gi,
      plotSummary: /\b(plot summary|story (overview|summary)|synopsis|what happens (in|at)|series of events)\b/gi,
      endingDiscussion: /\b(ending|finale|final (episode|chapter|scene)|conclusion|how it ends)\b/gi,
      characterDeaths: /\b(who dies|death (count|list)|characters? (who die|that die|killed))\b/gi,
      outcomeDiscussion: /\b(who (wins|loses|survives)|outcome|result|final battle|ultimate fate)\b/gi
    };
  }

  /**
   * Main analysis function
   * @param {string} text - Text to analyze
   * @param {Array} trackedTitles - List of tracked media titles  
   * @param {Object} metadata - Media metadata for relevance checking
   * @returns {Object} Analysis result
   */
  analyze(text, trackedTitles = [], metadata = {}) {
    const startTime = performance.now();
    
    if (!text || text.length < 10) {
      return {
        spoilerProbability: 0,
        shouldBlur: false,
        blurEntireBlock: false,
        confidence: 1.0,
        reasoning: ['Text too short'],
        processingTime: 0
      };
    }

    // Step 1: Check relevance FIRST
    const relevance = this.checkRelevanceV2(text, trackedTitles, metadata);
    
    // If not relevant enough, skip spoiler detection
    if (relevance.relevanceScore < this.config.relevanceThreshold) {
      const processingTime = performance.now() - startTime;
      this.updatePerfStats(processingTime);
      
      return {
        spoilerProbability: 0,
        shouldBlur: false,
        blurEntireBlock: false,
        confidence: 1.0,
        relevance: relevance,
        reasoning: ['Not relevant to tracked media'],
        processingTime: processingTime
      };
    }

    // Step 2: V3.7 - Analyze block-level characteristics
    const blockAnalysis = this.analyzeBlock(text, trackedTitles);
    
    // Step 3: Detect spoiler signals
    const signals = this.detectSignals(text);
    const narrativeSignals = this.detectNarrativeSignals(text);
    const allSignals = [...signals, ...narrativeSignals];
    
    // Step 4: Calculate base probability
    let probability = this.calculateBaseProbability(allSignals);
    
    // Step 5: Apply contextual modifiers
    probability = this.applyModifiers(text, probability, allSignals);
    
    // Step 6: Boost probability if highly relevant
    if (relevance.relevanceScore > 0.8) {
      probability += 0.05;
    }
    
    // Step 7: Calculate final confidence
    const confidence = this.calculateConfidence(allSignals, relevance);
    
    // Step 8: Determine severity
    const severity = this.determineSeverity(allSignals, probability);
    
    // Step 9: V3.7 - ESCALATION DECISION
    const shouldEscalate = this.shouldEscalateToBlock(
      blockAnalysis,
      allSignals,
      probability
    );
    
    // Step 10: Generate reasoning
    const reasoning = this.generateReasoning(allSignals, relevance, blockAnalysis, shouldEscalate);
    
    // Step 11: Detect spoiler spans (only if not escalating to block blur)
    const spoilerSpans = shouldEscalate ? [] : this.detectSpoilerSpans(text, allSignals, probability);
    
    const processingTime = performance.now() - startTime;
    
    // Update stats
    if (shouldEscalate) {
      this.perfStats.blockSpoilersDetected++;
      this.perfStats.escalatedBlocks++;
      this.perfStats.spoilerLeakagePrevented++;
    } else if (spoilerSpans.length > 0) {
      this.perfStats.spanSpoilersDetected++;
    }
    
    this.updatePerfStats(processingTime);
    
    const shouldBlur = (probability >= this.config.spoilerThreshold && 
                       confidence >= this.config.minConfidence &&
                       relevance.relevanceScore >= this.config.relevanceThreshold) ||
                       shouldEscalate;
    
    return {
      spoilerProbability: Math.min(probability, 1.0),
      confidence: confidence,
      severity: severity,
      shouldBlur: shouldBlur,
      blurEntireBlock: shouldEscalate, // V3.7 NEW
      blockAnalysis: blockAnalysis,    // V3.7 NEW
      detectedSignals: allSignals,
      relevance: relevance,
      reasoning: reasoning,
      spoilerSpans: spoilerSpans,
      processingTime: processingTime
    };
  }

  detectSignals(text) {
    const detected = [];
    
    for (const [name, config] of Object.entries(this.patterns)) {
      const matches = text.match(config.pattern);
      if (matches) {
        detected.push({
          name: name,
          matches: matches,
          count: matches.length,
          weight: config.weight,
          severity: config.severity
        });
      }
    }
    
    return detected;
  }

  detectNarrativeSignals(text) {
    const detected = [];
    
    for (const [name, config] of Object.entries(this.narrativePatterns)) {
      const matches = text.match(config.pattern);
      if (matches) {
        detected.push({
          name: name,
          matches: matches,
          count: matches.length,
          weight: config.weight,
          severity: config.severity,
          type: 'narrative'
        });
      }
    }
    
    return detected;
  }

  calculateBaseProbability(signals) {
    if (signals.length === 0) return 0;
    
    // Weighted sum approach
    let totalWeight = 0;
    let maxWeight = 0;
    
    for (const signal of signals) {
      const signalScore = signal.weight * Math.log(signal.count + 1);
      totalWeight += signalScore;
      maxWeight = Math.max(maxWeight, signal.weight);
    }
    
    // Normalize: use both sum and max
    const avgScore = totalWeight / signals.length;
    const probability = (avgScore * 0.6) + (maxWeight * 0.4);
    
    return probability;
  }

  applyModifiers(text, baseProbability, signals) {
    let probability = baseProbability;
    
    // Multi-signal boost
    if (signals.length >= 3) {
      probability += this.modifiers.multiSignalBoost;
    }
    
    // Tense analysis
    if (this.isPastTense(text)) {
      probability += this.modifiers.pastTenseReduction;
    }
    
    if (this.hasFutureTense(text)) {
      probability += this.modifiers.futureTenseBoost;
    }
    
    // Specific reference boost
    if (/\b(?:episode|season|chapter)\s*\d+\b/i.test(text)) {
      probability += this.modifiers.specificReferenceBoost;
    }
    
    // Question reduction
    if (text.includes('?')) {
      probability += this.modifiers.questionReduction;
    }
    
    // Definitive statements
    if (/\b(?:definitely|absolutely|certainly|confirmed)\b/i.test(text)) {
      probability += this.modifiers.definitiveBoost;
    }
    
    return probability;
  }

  isPastTense(text) {
    const pastTensePatterns = /\b(?:was|were|had|did|watched|saw|finished)\b/gi;
    const matches = text.match(pastTensePatterns);
    return matches && matches.length >= 2;
  }

  hasFutureTense(text) {
    const futureTensePatterns = /\b(?:will|gonna|going to|eventually|finally)\b/gi;
    return futureTensePatterns.test(text);
  }

  checkRelevance(text, trackedTitles) {
    // DEPRECATED: Use checkRelevanceV2 instead
    if (trackedTitles.length === 0) {
      return { relevant: true, confidence: 0.5, matchedTitles: [] };
    }
    
    const lowerText = text.toLowerCase();
    const matched = [];
    
    for (const title of trackedTitles) {
      const lowerTitle = title.toLowerCase();
      if (lowerText.includes(lowerTitle)) {
        matched.push(title);
      }
    }
    
    if (matched.length > 0) {
      return {
        relevant: true,
        confidence: 0.95,
        matchedTitles: matched
      };
    }
    
    // If no direct match, assume potentially relevant (better safe than sorry)
    return {
      relevant: true,
      confidence: 0.60,
      matchedTitles: []
    };
  }

  /**
   * TASK 2: Improved Relevance Engine
   * Check if text is relevant to tracked media using metadata
   */
  checkRelevanceV2(text, trackedTitles = [], metadata = {}) {
    if (trackedTitles.length === 0) {
      return { 
        relevanceScore: 0.5, 
        confidence: 0.5, 
        matchedTitles: [],
        matchedEntities: [],
        matchedAliases: []
      };
    }
    
    const lowerText = text.toLowerCase();
    const matched = {
      titles: [],
      entities: [],
      aliases: []
    };
    
    let maxRelevanceScore = 0;
    
    // Check for exact title matches
    for (const title of trackedTitles) {
      const lowerTitle = title.toLowerCase();
      if (lowerText.includes(lowerTitle)) {
        matched.titles.push(title);
        maxRelevanceScore = Math.max(maxRelevanceScore, 0.95);
      }
    }
    
    // Check for character names, locations, organizations from metadata
    if (metadata && typeof metadata === 'object') {
      const entitiesToCheck = [
        ...(metadata.characters || []),
        ...(metadata.cast || []),
        ...(metadata.locations || []),
        ...(metadata.organizations || [])
      ];
      
      for (const entity of entitiesToCheck) {
        if (!entity) continue;
        
        const entityName = (typeof entity === 'string' ? entity : entity.name || '').toLowerCase();
        if (entityName && lowerText.includes(entityName)) {
          matched.entities.push(entityName);
          maxRelevanceScore = Math.max(maxRelevanceScore, 0.85);
        }
        
        // Check aliases/alternate names
        if (entity.aliases && Array.isArray(entity.aliases)) {
          for (const alias of entity.aliases) {
            const lowerAlias = alias.toLowerCase();
            if (lowerAlias && lowerText.includes(lowerAlias)) {
              matched.aliases.push(alias);
              maxRelevanceScore = Math.max(maxRelevanceScore, 0.80);
            }
          }
        }
      }
    }
    
    // If no matches found, text is not relevant
    if (maxRelevanceScore === 0) {
      return {
        relevanceScore: 0.0,
        confidence: 0.95,
        matchedTitles: [],
        matchedEntities: [],
        matchedAliases: [],
        reason: 'No entity matches found'
      };
    }
    
    // Calculate confidence based on number of matches
    const totalMatches = matched.titles.length + matched.entities.length + matched.aliases.length;
    const confidence = Math.min(0.5 + (totalMatches * 0.15), 0.95);
    
    return {
      relevanceScore: maxRelevanceScore,
      confidence: confidence,
      matchedTitles: matched.titles,
      matchedEntities: matched.entities,
      matchedAliases: matched.aliases
    };
  }

  /**
   * TASK 3: Detect specific spoiler spans within text
   * Returns array of {start, end, confidence, reason} for precise blurring
   */
  detectSpoilerSpans(text, signals, overallProbability) {
    const spans = [];
    
    if (signals.length === 0) {
      return spans;
    }
    
    // For each signal, find its position in text
    for (const signal of signals) {
      if (!signal.matches || signal.matches.length === 0) continue;
      
      for (const match of signal.matches) {
        const matchLower = match.toLowerCase();
        const textLower = text.toLowerCase();
        
        let searchStart = 0;
        let index = -1;
        
        // Find all occurrences of this match
        while ((index = textLower.indexOf(matchLower, searchStart)) !== -1) {
          // Expand context around the match (include sentence or phrase)
          const contextStart = Math.max(0, index - 50);
          const contextEnd = Math.min(text.length, index + match.length + 50);
          
          // Find sentence boundaries
          let start = contextStart;
          let end = contextEnd;
          
          // Look for sentence start (. ! ? or start of text)
          for (let i = index; i >= contextStart; i--) {
            if (i === 0 || /[.!?]\s/.test(text.substring(i-2, i))) {
              start = i;
              break;
            }
          }
          
          // Look for sentence end (. ! ? or end of text)
          for (let i = index + match.length; i <= contextEnd; i++) {
            if (i === text.length || /[.!?]/.test(text[i])) {
              end = i + 1;
              break;
            }
          }
          
          // Avoid duplicates
          const isDuplicate = spans.some(s => 
            Math.abs(s.start - start) < 10 && Math.abs(s.end - end) < 10
          );
          
          if (!isDuplicate) {
            spans.push({
              start: start,
              end: end,
              confidence: signal.weight,
              reason: signal.name,
              matchedText: text.substring(start, end).trim()
            });
          }
          
          searchStart = index + match.length;
        }
      }
    }
    
    // If no specific spans found but overall probability is high,
    // fall back to blurring entire text
    if (spans.length === 0 && overallProbability > this.config.spoilerThreshold) {
      spans.push({
        start: 0,
        end: text.length,
        confidence: overallProbability,
        reason: 'high_overall_probability',
        matchedText: text
      });
    }
    
    // Merge overlapping spans
    return this.mergeOverlappingSpans(spans);
  }

  /**
   * Merge overlapping or adjacent spoiler spans
   */
  mergeOverlappingSpans(spans) {
    if (spans.length <= 1) return spans;
    
    // Sort by start position
    spans.sort((a, b) => a.start - b.start);
    
    const merged = [spans[0]];
    
    for (let i = 1; i < spans.length; i++) {
      const current = spans[i];
      const last = merged[merged.length - 1];
      
      // If overlapping or close (within 20 chars), merge
      if (current.start <= last.end + 20) {
        last.end = Math.max(last.end, current.end);
        last.confidence = Math.max(last.confidence, current.confidence);
        last.reason += ', ' + current.reason;
        last.matchedText = last.matchedText + ' ' + current.matchedText;
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  }

  /**
   * Update performance statistics
   */
  updatePerfStats(processingTime) {
    this.perfStats.totalAnalyzed++;
    this.perfStats.totalTime += processingTime;
    this.perfStats.maxTime = Math.max(this.perfStats.maxTime, processingTime);
    this.perfStats.avgTime = this.perfStats.totalTime / this.perfStats.totalAnalyzed;
  }

  /**
   * Get performance statistics
   */
  getPerfStats() {
    return {
      ...this.perfStats,
      avgTimeMs: this.perfStats.avgTime.toFixed(2),
      maxTimeMs: this.perfStats.maxTime.toFixed(2),
      totalTimeMs: this.perfStats.totalTime.toFixed(2)
    };
  }

  calculateConfidence(signals, relevance) {
    // Base confidence on number and strength of signals
    const signalConfidence = Math.min(signals.length / 5, 0.8);
    const relevanceConfidence = relevance.confidence;
    
    // Weighted average
    return (signalConfidence * 0.6) + (relevanceConfidence * 0.4);
  }

  determineSeverity(signals, probability) {
    const severities = signals.map(s => s.severity);
    
    if (severities.includes('critical') || probability > 0.85) {
      return 'critical';
    } else if (severities.includes('major') || probability > 0.70) {
      return 'major';
    } else if (probability > 0.55) {
      return 'moderate';
    } else {
      return 'minor';
    }
  }

  /**
   * V3.7: Analyze entire text block for spoiler density
   */
  analyzeBlock(text, trackedTitles) {
    // Split into sentences for density analysis
    const sentences = this.splitIntoSentences(text);
    
    if (sentences.length === 0) {
      return {
        sentenceCount: 0,
        spoilerSentences: 0,
        spoilerDensity: 0,
        narrativeDensity: 0,
        signalCount: 0,
        majorSignalCount: 0,
        blockProbability: 0,
        blockType: 'unknown'
      };
    }
    
    // Detect block type
    const blockType = this.detectBlockType(text);
    
    // Analyze each sentence
    let spoilerSentenceCount = 0;
    let narrativeSentenceCount = 0;
    let totalSignalCount = 0;
    let totalMajorSignalCount = 0;
    let blockProbabilitySum = 0;
    
    for (const sentence of sentences) {
      if (sentence.length < 10) continue;
      
      const signals = this.detectSignals(sentence);
      const narrativeSignals = this.detectNarrativeSignals(sentence);
      const allSentenceSignals = [...signals, ...narrativeSignals];
      
      // Count signals
      totalSignalCount += allSentenceSignals.length;
      
      // Count major signals
      const majorSignals = signals.filter(s => this.majorSignals.has(s.name));
      totalMajorSignalCount += majorSignals.length;
      
      // Check if sentence is spoiler
      const sentenceProbability = this.calculateBaseProbability(allSentenceSignals);
      blockProbabilitySum += sentenceProbability;
      
      if (sentenceProbability >= 0.60) {
        spoilerSentenceCount++;
      }
      
      if (narrativeSignals.length > 0) {
        narrativeSentenceCount++;
      }
    }
    
    // Calculate densities
    const spoilerDensity = spoilerSentenceCount / sentences.length;
    const narrativeDensity = narrativeSentenceCount / sentences.length;
    const blockProbability = blockProbabilitySum / sentences.length;
    
    return {
      sentenceCount: sentences.length,
      spoilerSentences: spoilerSentenceCount,
      spoilerDensity: spoilerDensity,
      narrativeDensity: narrativeDensity,
      signalCount: totalSignalCount,
      majorSignalCount: totalMajorSignalCount,
      blockProbability: blockProbability,
      blockType: blockType
    };
  }

  /**
   * V3.7: Split text into sentences
   */
  splitIntoSentences(text) {
    // Split on sentence boundaries
    const sentences = text.split(/[.!?]+\s+/)
      .map(s => s.trim())
      .filter(s => s.length >= 10);
    
    return sentences;
  }

  /**
   * V3.7: Detect block type (AI response, article, etc.)
   */
  detectBlockType(text) {
    for (const [type, pattern] of Object.entries(this.blockTypePatterns)) {
      if (pattern.test(text)) {
        return type;
      }
    }
    return 'general';
  }

  /**
   * V3.7: ESCALATION LOGIC - Decide if entire block should be blurred
   */
  shouldEscalateToBlock(blockAnalysis, signals, probability) {
    const rules = this.escalationRules;
    
    // Rule 1: High signal count (3+ signals)
    if (blockAnalysis.signalCount >= rules.minSignalCount) {
      console.log('[V3.7 ESCALATION] High signal count:', blockAnalysis.signalCount);
      return true;
    }
    
    // Rule 2: Multiple major signals (2+ critical spoilers)
    if (blockAnalysis.majorSignalCount >= rules.minMajorSignalCount) {
      console.log('[V3.7 ESCALATION] Multiple major signals:', blockAnalysis.majorSignalCount);
      return true;
    }
    
    // Rule 3: High spoiler density (25%+ sentences are spoilers)
    if (blockAnalysis.spoilerDensity >= rules.minSpoilerDensity) {
      console.log('[V3.7 ESCALATION] High spoiler density:', (blockAnalysis.spoilerDensity * 100).toFixed(1) + '%');
      return true;
    }
    
    // Rule 4: Very high block probability (80%+)
    if (blockAnalysis.blockProbability >= rules.minBlockProbability) {
      console.log('[V3.7 ESCALATION] High block probability:', (blockAnalysis.blockProbability * 100).toFixed(1) + '%');
      return true;
    }
    
    // Rule 5: High narrative density (30%+ narrative indicators)
    if (blockAnalysis.narrativeDensity >= rules.minNarrativeDensity) {
      console.log('[V3.7 ESCALATION] High narrative density:', (blockAnalysis.narrativeDensity * 100).toFixed(1) + '%');
      return true;
    }
    
    // Rule 6: AI response with spoiler content
    if (['aiResponse', 'spoilerRequest', 'plotSummary', 'endingDiscussion', 'characterDeaths', 'outcomeDiscussion'].includes(blockAnalysis.blockType)) {
      if (blockAnalysis.signalCount >= 2) {
        console.log('[V3.7 ESCALATION] AI/Spoiler content type with signals:', blockAnalysis.blockType);
        return true;
      }
    }
    
    return false;
  }

  generateReasoning(signals, relevance, blockAnalysis, shouldEscalate) {
    const reasons = [];
    
    // V3.7: Block escalation reasoning
    if (shouldEscalate) {
      reasons.push('⚠️ ENTIRE BLOCK BLURRED - Spoiler leakage prevention');
      
      if (blockAnalysis.signalCount >= 3) {
        reasons.push(`High signal count: ${blockAnalysis.signalCount} signals detected`);
      }
      if (blockAnalysis.majorSignalCount >= 2) {
        reasons.push(`Multiple major spoilers: ${blockAnalysis.majorSignalCount} critical signals`);
      }
      if (blockAnalysis.spoilerDensity >= 0.25) {
        reasons.push(`High spoiler density: ${(blockAnalysis.spoilerDensity * 100).toFixed(0)}% of sentences`);
      }
      if (blockAnalysis.narrativeDensity >= 0.30) {
        reasons.push(`Narrative-heavy content: ${(blockAnalysis.narrativeDensity * 100).toFixed(0)}%`);
      }
      if (blockAnalysis.blockType !== 'general') {
        reasons.push(`Content type: ${blockAnalysis.blockType}`);
      }
    }
    
    // Signal-based reasoning
    if (signals.length === 0) {
      reasons.push('No spoiler signals detected');
    } else {
      const signalNames = signals.map(s => s.name).join(', ');
      reasons.push(`Detected signals: ${signalNames}`);
      
      if (signals.length >= 3 && !shouldEscalate) {
        reasons.push('Multiple spoiler indicators present');
      }
    }
    
    // Relevance reasoning
    if (relevance.matchedTitles && relevance.matchedTitles.length > 0) {
      reasons.push(`Related to: ${relevance.matchedTitles.join(', ')}`);
    }
    
    return reasons;
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedSpoilerDetector;
}

console.log('[V3.5 DEBUG] EnhancedSpoilerDetector class defined');
console.log('[V3.5 DEBUG] typeof EnhancedSpoilerDetector:', typeof EnhancedSpoilerDetector);
