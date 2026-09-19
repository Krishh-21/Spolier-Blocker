# Spoiler Shield V3 - Universal AI Spoiler Detection Engine

## 🎯 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│  Content Script │ Background Worker │ Popup UI │ Options Page  │
└────────┬────────────────────┬────────────────────┬──────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DETECTION PIPELINE CORE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │  Stage 1:    │→→→│  Stage 2:    │→→→│  Stage 3:    │       │
│  │  Entity      │   │  Narrative   │   │  Spoiler     │       │
│  │  Detection   │   │  Event       │   │  Classifier  │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
│         │                   │                   │               │
│         └───────────────────┴───────────────────┘               │
│                             ▼                                    │
│                  ┌──────────────────────┐                       │
│                  │  Stage 4: Relevance  │                       │
│                  │  Engine              │                       │
│                  └──────────────────────┘                       │
│                             │                                    │
│                             ▼                                    │
│                  ┌──────────────────────┐                       │
│                  │  Blur Decision       │                       │
│                  │  + Feedback Loop     │                       │
│                  └──────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INFERENCE ENGINES                            │
├─────────────────────────────────────────────────────────────────┤
│  ONNX Runtime  │  Transformers.js  │  IndexedDB Cache          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
spoiler-shield-v3/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── options.html
├── options.js
│
├── core/
│   ├── detection-pipeline.js        # Main orchestration
│   ├── text-preprocessor.js         # Text normalization
│   └── batch-processor.js           # Batch inference optimization
│
├── engines/
│   ├── entity-engine.js             # Stage 1: Entity detection
│   ├── narrative-engine.js          # Stage 2: Narrative events
│   ├── spoiler-classifier.js        # Stage 3: ML classifier
│   ├── relevance-engine.js          # Stage 4: Media matching
│   └── ocr-engine.js                # Optional: Image text extraction
│
├── models/
│   ├── model-loader.js              # ONNX/Transformers.js loader
│   ├── embeddings-cache.js          # Embedding cache layer
│   └── models/
│       ├── spoiler-detector-mini.onnx    # 12MB NER + Classifier
│       ├── narrative-bert-tiny.onnx       # 18MB Narrative analysis
│       └── tokenizer/                     # Tokenizer files
│
├── storage/
│   ├── indexeddb-manager.js         # Enhanced IDB wrapper
│   ├── cache-manager.js             # Multi-level caching
│   └── schemas.js                   # DB schemas
│
├── feedback/
│   ├── rl-engine.js                 # Reinforcement learning
│   ├── calibration.js               # Threshold calibration
│   └── telemetry.js                 # Anonymous metrics
│
├── metadata/
│   ├── tmdb-fetcher.js              # Movie/TV metadata
│   ├── entity-graph-builder.js     # Build entity graphs
│   └── aliases-resolver.js          # Handle character aliases
│
├── benchmark/
│   ├── test-suite.js                # Evaluation framework
│   ├── metrics.js                   # P/R/F1 calculations
│   └── test-data.json               # Ground truth dataset
│
├── workers/
│   ├── inference-worker.js          # Offload ML inference
│   └── ocr-worker.js                # Offload OCR processing
│
├── ui/
│   ├── blur-renderer.js             # Visual blur effects
│   ├── confidence-badge.js          # Show confidence scores
│   └── feedback-ui.js               # User feedback interface
│
└── utils/
    ├── performance-monitor.js       # Track performance
    ├── error-handler.js             # Graceful degradation
    └── logger.js                    # Debug logging
```

---

## 🗄️ IndexedDB Schema V3

```javascript
// Database: SpoilerShieldV3
// Version: 3

const DB_SCHEMA = {
  // Store 1: User tracked media
  trackedMedia: {
    keyPath: 'id',
    indexes: [
      { name: 'title', keyPath: 'title', unique: false },
      { name: 'type', keyPath: 'type', unique: false },
      { name: 'addedAt', keyPath: 'addedAt', unique: false }
    ],
    structure: {
      id: 'string',              // UUID
      title: 'string',           // "Breaking Bad"
      type: 'string',            // 'movie|tv|anime|game|book'
      tmdbId: 'number|null',     // External ID if available
      entityGraph: {
        characters: ['Walter White', 'Jesse Pinkman', ...],
        locations: ['Albuquerque', 'Los Pollos Hermanos', ...],
        organizations: ['DEA', 'Cartel', ...],
        aliases: {
          'Walter White': ['Heisenberg', 'Mr. White'],
          'Jesse Pinkman': ['Cap\'n Cook']
        }
      },
      metadata: {
        year: 'number',
        genres: ['string'],
        cast: ['string'],
        creators: ['string']
      },
      relevanceThreshold: 0.3,   // User-adjustable
      addedAt: 'timestamp',
      lastUpdated: 'timestamp'
    }
  },

  // Store 2: Embedding cache
  embeddingsCache: {
    keyPath: 'textHash',
    indexes: [
      { name: 'createdAt', keyPath: 'createdAt', unique: false }
    ],
    structure: {
      textHash: 'string',        // SHA-256 of text
      text: 'string',            // Original text (for debugging)
      embedding: 'Float32Array', // 384-dim vector
      modelVersion: 'string',    // 'v3.1.0'
      createdAt: 'timestamp'
    }
  },

  // Store 3: Spoiler detection results cache
  detectionCache: {
    keyPath: 'textHash',
    indexes: [
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
      { name: 'probability', keyPath: 'spoilerProbability', unique: false }
    ],
    structure: {
      textHash: 'string',
      text: 'string',
      result: {
        spoilerProbability: 'number',  // 0.00-1.00
        severity: 'string',            // 'minor|moderate|major|critical'
        confidence: 'number',          // 0.00-1.00
        reasoning: ['string'],         // Explanations
        detectedEntities: [{
          text: 'string',
          type: 'string',              // 'PERSON|ORG|LOC|EVENT'
          relevance: 'number'
        }],
        narrativeSignals: [{
          signal: 'string',             // 'death|reveal|ending'
          confidence: 'number'
        }],
        relatedMedia: ['string'],      // Matched titles
        shouldBlur: 'boolean'
      },
      modelVersion: 'string',
      createdAt: 'timestamp',
      hits: 'number'                   // Cache hit counter
    }
  },

  // Store 4: Feedback data
  feedbackData: {
    keyPath: 'id',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'type', keyPath: 'type', unique: false }
    ],
    structure: {
      id: 'string',
      textHash: 'string',
      text: 'string',
      predictedProbability: 'number',
      userAction: 'string',          // 'reveal|report_fp|report_fn|manual_blur'
      mediaTitle: 'string',
      timestamp: 'timestamp'
    }
  },

  // Store 5: Performance metrics
  performanceMetrics: {
    keyPath: 'id',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false }
    ],
    structure: {
      id: 'string',
      inferenceTimeMs: 'number',
      textLength: 'number',
      cacheHit: 'boolean',
      modelVersion: 'string',
      timestamp: 'timestamp'
    }
  },

  // Store 6: Model configuration
  modelConfig: {
    keyPath: 'version',
    structure: {
      version: 'string',             // 'v3.1.0'
      spoilerThreshold: 0.65,        // Global threshold
      minConfidence: 0.50,
      severityWeights: {
        minor: 0.3,
        moderate: 0.5,
        major: 0.8,
        critical: 0.95
      },
      enabledStages: {
        entityDetection: true,
        narrativeEvents: true,
        mlClassifier: true,
        relevanceEngine: true,
        ocr: false
      },
      performanceLimits: {
        maxInferenceTimeMs: 100,
        maxTextLength: 500,
        maxConcurrentInferences: 3
      }
    }
  }
};
```

---

## 🧠 Stage 1: Entity Detection Engine

```javascript
// engines/entity-engine.js

class EntityEngine {
  constructor() {
    this.nerModel = null;  // Named Entity Recognition model
    this.patterns = this.initPatterns();
  }

  async initialize() {
    // Load TinyBERT-NER ONNX model (8MB)
    this.nerModel = await loadONNXModel('models/ner-tinybert.onnx');
  }

  initPatterns() {
    return {
      // Episode/Season references
      episodeRef: /(?:episode|ep\.?|season|s\d+e\d+|chapter|volume)\s*\d+/gi,
      
      // Temporal indicators
      temporal: /(?:in the (?:end|finale|ending|conclusion)|at the (?:end|start|beginning)|by the (?:end|finale))/gi,
      
      // Character transformations
      transformation: /(?:becomes?|turns? into|transforms? into|reveals? (?:that|to be))/gi,
      
      // Outcome indicators
      outcome: /(?:dies?|killed|survives?|wins?|loses?|defeats?|escapes?|sacrifices?)/gi,
      
      // Revelation patterns
      revelation: /(?:reveals?|discovers?|learns?|finds? out|realizes?|(?:plot )?twist)/gi,
      
      // Future tense spoiler indicators
      futureTense: /(?:will|gonna|going to|eventually|finally|ultimately|in the end)/gi,
      
      // Vague spoiler phrases
      vagueSpoi
ler: /(?:wait (?:until|for)|(?:that|the) (?:scene|moment|part|ending) (?:when|where)|broke me|changed everything|never expected|mind[- ]?blow(?:ing|n)|jaw[- ]?drop)/gi
    };
  }

  /**
   * Extract entities from text using hybrid approach:
   * 1. ML-based NER (people, places, organizations)
   * 2. Pattern-based extraction (episodes, events, temporal refs)
   */
  async detectEntities(text) {
    const entities = {
      persons: [],
      locations: [],
      organizations: [],
      episodes: [],
      temporalRefs: [],
      transformations: [],
      outcomes: [],
      revelations: [],
      futureTense: [],
      vagueSpoilers: []
    };

    // Pattern-based extraction (fast, no ML)
    entities.episodes = this.extractMatches(text, this.patterns.episodeRef);
    entities.temporalRefs = this.extractMatches(text, this.patterns.temporal);
    entities.transformations = this.extractMatches(text, this.patterns.transformation);
    entities.outcomes = this.extractMatches(text, this.patterns.outcome);
    entities.revelations = this.extractMatches(text, this.patterns.revelation);
    entities.futureTense = this.extractMatches(text, this.patterns.futureTense);
    entities.vagueSpoilers = this.extractMatches(text, this.patterns.vagueSpoi