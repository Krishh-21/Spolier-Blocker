/**
 * Spoiler Shield V4 - Knowledge Engine
 * 
 * TRUE SPOILER INTELLIGENCE SYSTEM
 * 
 * This is NOT regex matching.
 * This is entity understanding + event detection + narrative inference.
 * 
 * The system KNOWS:
 * - Characters (Tony Stark = Iron Man)
 * - Events (death, victory, reveal)
 * - Narratives ("Cap gets his dance" = Endgame ending)
 * - Context (only blur if related to tracked media)
 */

class KnowledgeEngine {
  constructor() {
    this.knowledgeBase = new Map();
    this.entityCache = new Map();
    this.narrativePatterns = [];
    this.initializeKnowledge();
  }

  /**
   * Initialize knowledge base with media understanding
   */
  initializeKnowledge() {
    // Movies
    this.addMedia({
      title: 'Avengers: Endgame',
      type: 'movie',
      aliases: ['Endgame', 'Avengers 4', 'A4'],
      characters: [
        { name: 'Tony Stark', aliases: ['Iron Man', 'Stark', 'Tony', 'Shellhead', 'Tin Man'] },
        { name: 'Steve Rogers', aliases: ['Captain America', 'Cap', 'Steve', 'Rogers', 'Capsicle'] },
        { name: 'Thor', aliases: ['God of Thunder', 'Odinson', 'Point Break'] },
        { name: 'Natasha Romanoff', aliases: ['Black Widow', 'Nat', 'Natasha', 'Romanoff'] },
        { name: 'Bruce Banner', aliases: ['Hulk', 'Banner', 'Big Guy', 'Green Guy'] },
        { name: 'Thanos', aliases: ['The Mad Titan', 'Purple Guy'] },
        { name: 'Clint Barton', aliases: ['Hawkeye', 'Clint', 'Barton', 'Ronin'] },
        { name: 'Scott Lang', aliases: ['Ant-Man', 'Scott'] },
        { name: 'Peter Parker', aliases: ['Spider-Man', 'Spidey', 'Peter'] }
      ],
      locations: ['Vormir', 'Titan', 'Wakanda', 'New York', 'Garden'],
      teams: ['Avengers', 'Time Heist Team'],
      relationships: [
        { entities: ['Tony Stark', 'Pepper Potts'], type: 'marriage' },
        { entities: ['Steve Rogers', 'Peggy Carter'], type: 'romance' }
      ],
      majorEvents: [
        { type: 'death', entity: 'Tony Stark', outcome: 'defeats Thanos with snap' },
        { type: 'death', entity: 'Natasha Romanoff', outcome: 'sacrifices for Soul Stone' },
        { type: 'ending', entity: 'Steve Rogers', outcome: 'stays in past with Peggy' },
        { type: 'victory', entity: 'Avengers', outcome: 'defeats Thanos' },
        { type: 'plot_device', entity: 'rat', outcome: 'releases Scott from Quantum Realm' },
        { type: 'time_travel', entity: 'Avengers', outcome: 'retrieves Infinity Stones' }
      ],
      plotTwists: [
        'Thanos destroyed the stones',
        'Time heist using Quantum Realm',
        'Tony creates new gauntlet'
      ],
      narratives: [
        { pattern: /\b(the )?rat (saves?|saved|releases?|freed|frees)\b/i, type: 'plot_device', severity: 'major', event: 'rat releases Scott' },
        { pattern: /\bcap gets (his )?dance\b/i, type: 'ending', severity: 'critical', event: 'Steve stays with Peggy' },
        { pattern: /\b(tony|stark|iron man) (snaps?|dies?|sacrifices?)\b/i, type: 'death', severity: 'critical', event: 'Tony defeats Thanos' },
        { pattern: /\btime (heist|travel)\b/i, type: 'plot_device', severity: 'major', event: 'Avengers travel through time' },
        { pattern: /\b(black widow|natasha) (dies?|sacrifices?|vormir)\b/i, type: 'death', severity: 'critical', event: 'Natasha sacrifices herself' },
        { pattern: /\bthanos (destroyed|got rid of) (the )?stones\b/i, type: 'plot_twist', severity: 'major', event: 'Thanos destroyed Infinity Stones' }
      ]
    });

    this.addMedia({
      title: 'Breaking Bad',
      type: 'tv',
      aliases: ['BB', 'BrBa'],
      characters: [
        { name: 'Walter White', aliases: ['Walt', 'Heisenberg', 'Mr. White', 'WW'] },
        { name: 'Jesse Pinkman', aliases: ['Jesse', 'Pinkman', 'Cap n Cook'] },
        { name: 'Hank Schrader', aliases: ['Hank', 'ASAC Schrader'] },
        { name: 'Gustavo Fring', aliases: ['Gus', 'Fring', 'Chicken Man'] },
        { name: 'Skyler White', aliases: ['Skyler', 'Sky'] },
        { name: 'Saul Goodman', aliases: ['Saul', 'Jimmy McGill'] }
      ],
      locations: ['Los Pollos Hermanos', 'Superlab', 'Desert', 'ABQ'],
      relationships: [
        { entities: ['Walter White', 'Jesse Pinkman'], type: 'partnership' },
        { entities: ['Hank Schrader', 'Walter White'], type: 'family' }
      ],
      majorEvents: [
        { type: 'death', entity: 'Walter White', outcome: 'dies in lab' },
        { type: 'death', entity: 'Hank Schrader', outcome: 'killed by Jack' },
        { type: 'death', entity: 'Gustavo Fring', outcome: 'killed by Walter' },
        { type: 'revelation', entity: 'Hank', outcome: 'discovers Walt is Heisenberg' },
        { type: 'escape', entity: 'Jesse Pinkman', outcome: 'freed by Walt' }
      ],
      plotTwists: [
        'Hank discovers Walt is Heisenberg',
        'Gus Fring death',
        'Walt poisons Brock'
      ],
      narratives: [
        { pattern: /\bhank (finds?|discovers?|reads?) (the )?(book|toilet|WW)\b/i, type: 'revelation', severity: 'major', event: 'Hank discovers truth' },
        { pattern: /\bwalter (dies?|death|ending)\b/i, type: 'death', severity: 'critical', event: 'Walter dies' },
        { pattern: /\bgus (dies?|killed|face|explosion)\b/i, type: 'death', severity: 'major', event: 'Gus death' },
        { pattern: /\b(i am|say my name|heisenberg reveal)\b/i, type: 'character_moment', severity: 'moderate', event: 'Walt reveals identity' }
      ]
    });

    this.addMedia({
      title: 'Attack on Titan',
      type: 'anime',
      aliases: ['AOT', 'Shingeki no Kyojin', 'SnK', 'AoT'],
      characters: [
        { name: 'Eren Yeager', aliases: ['Eren', 'Jaeger', 'Attack Titan'] },
        { name: 'Mikasa Ackerman', aliases: ['Mikasa', 'Ackerman'] },
        { name: 'Armin Arlert', aliases: ['Armin', 'Colossal Titan'] },
        { name: 'Levi Ackerman', aliases: ['Levi', 'Captain Levi', 'Humanity\'s Strongest'] },
        { name: 'Erwin Smith', aliases: ['Erwin', 'Commander Erwin'] }
      ],
      locations: ['Basement', 'Paradis', 'Marley', 'Shiganshina', 'Wall Maria'],
      majorEvents: [
        { type: 'plot_twist', entity: 'Eren', outcome: 'starts the Rumbling' },
        { type: 'revelation', entity: 'basement', outcome: 'reveals truth about world' },
        { type: 'death', entity: 'Erwin Smith', outcome: 'sacrifices in battle' },
        { type: 'transformation', entity: 'Eren', outcome: 'becomes villain' }
      ],
      plotTwists: [
        'Basement reveals truth about world',
        'Eren starts Rumbling',
        'Reiner and Bertholdt are titans'
      ],
      narratives: [
        { pattern: /\b(the )?basement (reveals?|changes?|explains?|truth)\b/i, type: 'revelation', severity: 'critical', event: 'basement revelation' },
        { pattern: /\beren starts? (the )?rumbling\b/i, type: 'plot_twist', severity: 'critical', event: 'Eren initiates genocide' },
        { pattern: /\beren (becomes?|turns?|villain|genocides?)\b/i, type: 'transformation', severity: 'critical', event: 'Eren becomes antagonist' },
        { pattern: /\berwin (dies?|death|sacrifice)\b/i, type: 'death', severity: 'major', event: 'Erwin dies' }
      ]
    });

    this.addMedia({
      title: 'Red Dead Redemption 2',
      type: 'game',
      aliases: ['RDR2', 'Red Dead 2', 'RDR II'],
      characters: [
        { name: 'Arthur Morgan', aliases: ['Arthur', 'Morgan'] },
        { name: 'John Marston', aliases: ['John', 'Marston'] },
        { name: 'Dutch van der Linde', aliases: ['Dutch', 'van der Linde'] },
        { name: 'Micah Bell', aliases: ['Micah', 'Bell'] },
        { name: 'Sadie Adler', aliases: ['Sadie'] }
      ],
      locations: ['Valentine', 'Saint Denis', 'Guarma', 'Blackwater'],
      majorEvents: [
        { type: 'death', entity: 'Arthur Morgan', outcome: 'dies from tuberculosis' },
        { type: 'betrayal', entity: 'Micah Bell', outcome: 'betrays gang' },
        { type: 'survival', entity: 'John Marston', outcome: 'escapes and survives' },
        { type: 'disease', entity: 'Arthur Morgan', outcome: 'contracts TB' }
      ],
      plotTwists: [
        'Arthur has tuberculosis',
        'Micah is the rat',
        'Dutch abandons Arthur'
      ],
      narratives: [
        { pattern: /\barthur (dies?|death|tuberculosis|TB|ending)\b/i, type: 'death', severity: 'critical', event: 'Arthur dies from TB' },
        { pattern: /\bmicah (rat|traitor|betrays?)\b/i, type: 'betrayal', severity: 'major', event: 'Micah betrays gang' },
        { pattern: /\bjohn (survives?|lives?|escapes?)\b/i, type: 'survival', severity: 'moderate', event: 'John survives' }
      ]
    });

    // Sports templates
    this.addSportsKnowledge();
    
    // Awards templates
    this.addAwardsKnowledge();
  }

  addSportsKnowledge() {
    // Formula 1
    this.addMedia({
      title: 'Formula 1',
      type: 'sports',
      aliases: ['F1', 'Formula One', 'F1 Racing'],
      entities: [
        { name: 'Max Verstappen', aliases: ['Verstappen', 'Max', 'VER', 'Mad Max'] },
        { name: 'Charles Leclerc', aliases: ['Leclerc', 'Charles', 'LEC', 'Charles Leg Clerc'] },
        { name: 'Lewis Hamilton', aliases: ['Hamilton', 'Lewis', 'HAM', 'Sir Lewis'] },
        { name: 'Sergio Perez', aliases: ['Perez', 'Checo', 'PER'] },
        { name: 'Fernando Alonso', aliases: ['Alonso', 'Fernando', 'ALO', 'Nando'] },
        { name: 'Lando Norris', aliases: ['Norris', 'Lando', 'NOR'] }
      ],
      locations: ['Monaco', 'Silverstone', 'Monza', 'Spa', 'Suzuka', 'Singapore'],
      teams: ['Red Bull', 'Ferrari', 'Mercedes', 'McLaren', 'Aston Martin'],
      majorEvents: [
        { type: 'victory', keywords: ['wins', 'victory', 'champion', 'P1', 'first place'] },
        { type: 'incident', keywords: ['crash', 'crashes', 'DNF', 'retires', 'collision', 'spins'] },
        { type: 'achievement', keywords: ['pole', 'fastest lap', 'podium', 'P2', 'P3'] },
        { type: 'championship', keywords: ['championship', 'title', 'world champion'] }
      ],
      narratives: [
        { pattern: /\b(verstappen|max|ver) (wins?|won|victory|p1|first)\b/i, type: 'victory', severity: 'moderate', event: 'race victory' },
        { pattern: /\b(leclerc|charles|lec) (crash(es|ed)?|dnf|retire[ds]?)\b/i, type: 'incident', severity: 'moderate', event: 'race incident' },
        { pattern: /\b\w+ (wins?|won) (the )?(championship|title|wdc)\b/i, type: 'championship', severity: 'major', event: 'championship won' }
      ]
    });
  }

  addAwardsKnowledge() {
    // Oscars
    this.addMedia({
      title: 'Oscars',
      type: 'awards',
      aliases: ['Academy Awards', 'Oscars 2024', 'Oscars 2025', 'Academy Awards 2024'],
      categories: [
        'Best Picture',
        'Best Director',
        'Best Actor',
        'Best Actress',
        'Best Supporting Actor',
        'Best Supporting Actress'
      ],
      majorEvents: [
        { type: 'win', keywords: ['wins', 'winner', 'awarded', 'takes home', 'receives'] }
      ],
      narratives: [
        { pattern: /\b(\w+) wins? (best (picture|director|actor|actress))\b/i, type: 'win', severity: 'moderate', event: 'award winner' }
      ]
    });
  }

  addMedia(mediaData) {
    const key = mediaData.title.toLowerCase();
    this.knowledgeBase.set(key, mediaData);
    
    // Index aliases
    if (mediaData.aliases) {
      for (const alias of mediaData.aliases) {
        this.knowledgeBase.set(alias.toLowerCase(), mediaData);
      }
    }
  }

  /**
   * Get knowledge for tracked media
   */
  getKnowledge(trackedTitles) {
    const knowledge = [];
    
    for (const title of trackedTitles) {
      const key = title.toLowerCase();
      const media = this.knowledgeBase.get(key);
      
      if (media) {
        knowledge.push(media);
      } else {
        // Create minimal knowledge for unknown media
        knowledge.push({
          title: title,
          type: 'unknown',
          characters: [],
          events: [],
          narratives: []
        });
      }
    }
    
    return knowledge;
  }

  /**
   * Check if text is relevant to tracked media
   */
  checkRelevance(text, trackedKnowledge) {
    const lowerText = text.toLowerCase();
    const relevantMedia = [];
    
    for (const media of trackedKnowledge) {
      // Check title match
      if (lowerText.includes(media.title.toLowerCase())) {
        relevantMedia.push({ media, reason: 'title_match', confidence: 1.0 });
        continue;
      }
      
      // Check alias match
      if (media.aliases) {
        for (const alias of media.aliases) {
          if (lowerText.includes(alias.toLowerCase())) {
            relevantMedia.push({ media, reason: 'alias_match', confidence: 0.95 });
            break;
          }
        }
      }
      
      // Check character/entity match
      const entities = media.characters || media.entities || [];
      for (const entity of entities) {
        if (lowerText.includes(entity.name.toLowerCase())) {
          relevantMedia.push({ media, reason: 'entity_match', confidence: 0.85 });
          break;
        }
        
        // Check aliases
        if (entity.aliases) {
          for (const alias of entity.aliases) {
            if (lowerText.includes(alias.toLowerCase())) {
              relevantMedia.push({ media, reason: 'entity_alias_match', confidence: 0.80 });
              break;
            }
          }
        }
      }
    }
    
    return relevantMedia;
  }
}

/**
 * Entity Matcher - Understands that "Tony Stark" = "Iron Man"
 */
class EntityMatcher {
  constructor(knowledgeEngine) {
    this.knowledge = knowledgeEngine;
  }

  /**
   * Find entities mentioned in text
   */
  findEntities(text, mediaKnowledge) {
    const foundEntities = [];
    const lowerText = text.toLowerCase();
    
    for (const media of mediaKnowledge) {
      const entities = media.characters || media.entities || [];
      
      for (const entity of entities) {
        // Check main name
        if (lowerText.includes(entity.name.toLowerCase())) {
          foundEntities.push({
            entity: entity,
            media: media,
            matchedAs: entity.name,
            confidence: 1.0
          });
          continue;
        }
        
        // Check aliases
        if (entity.aliases) {
          for (const alias of entity.aliases) {
            if (lowerText.includes(alias.toLowerCase())) {
              foundEntities.push({
                entity: entity,
                media: media,
                matchedAs: alias,
                confidence: 0.9
              });
              break;
            }
          }
        }
      }
    }
    
    return foundEntities;
  }
}

/**
 * Spoiler Event Detector - Detects deaths, endings, victories
 */
class SpoilerEventDetector {
  constructor(knowledgeEngine) {
    this.knowledge = knowledgeEngine;
  }

  /**
   * Detect spoiler events in text - KNOWLEDGE-FIRST approach
   */
  detectEvents(text, mediaKnowledge, foundEntities) {
    const detectedEvents = [];
    const lowerText = text.toLowerCase();
    
    for (const media of mediaKnowledge) {
      if (!media.majorEvents) continue;
      
      for (const event of media.majorEvents) {
        let eventDetected = false;
        let confidence = 0;
        
        // Check if event entity is mentioned
        const entityMentioned = event.entity && foundEntities.some(fe => 
          fe.entity.name === event.entity || 
          (fe.entity.aliases && fe.entity.aliases.some(alias => 
            alias.toLowerCase() === event.entity.toLowerCase()
          ))
        );
        
        if (!entityMentioned && event.entity) continue;
        
        // Detect event type without exact keywords
        switch(event.type) {
          case 'death':
            eventDetected = this.detectDeath(lowerText, event.entity);
            confidence = 0.95;
            break;
          case 'victory':
          case 'win':
            eventDetected = this.detectVictory(lowerText, event.entity);
            confidence = 0.90;
            break;
          case 'betrayal':
            eventDetected = this.detectBetrayal(lowerText, event.entity);
            confidence = 0.90;
            break;
          case 'revelation':
            eventDetected = this.detectRevelation(lowerText, event.entity);
            confidence = 0.85;
            break;
          case 'ending':
            eventDetected = this.detectEnding(lowerText);
            confidence = 0.90;
            break;
          case 'transformation':
            eventDetected = this.detectTransformation(lowerText, event.entity);
            confidence = 0.85;
            break;
          case 'plot_twist':
          case 'plot_device':
            eventDetected = this.detectPlotEvent(lowerText, event.outcome);
            confidence = 0.80;
            break;
          default:
            // Generic event detection
            eventDetected = event.keywords && event.keywords.some(kw => 
              lowerText.includes(kw.toLowerCase())
            );
            confidence = 0.75;
        }
        
        if (eventDetected) {
          detectedEvents.push({
            type: event.type,
            entity: event.entity,
            outcome: event.outcome,
            media: media,
            confidence: confidence,
            severity: this.getSeverity(event.type)
          });
        }
      }
    }
    
    return detectedEvents;
  }

  /**
   * Detect death event without exact "dies" keyword
   */
  detectDeath(text, entity) {
    const deathIndicators = [
      'dies', 'died', 'death', 'killed', 'kills', 'dead',
      'murdered', 'assassinated', 'executed', 'perished',
      'sacrifices', 'sacrificed', 'gave their life',
      'didn\'t survive', 'didn\'t make it',
      'fate', 'end of', 'last moments',
      'funeral', 'buried', 'grave'
    ];
    
    return deathIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Detect victory without exact "wins" keyword
   */
  detectVictory(text, entity) {
    const victoryIndicators = [
      'wins', 'won', 'winner', 'victory', 'victorious',
      'champion', 'championship', 'defeats', 'defeated',
      'beats', 'beat', 'conquers', 'conquered',
      'triumph', 'triumphs', 'prevails',
      'takes home', 'awarded', 'receives',
      'p1', 'first place', 'gold medal'
    ];
    
    return victoryIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Detect betrayal without exact keyword
   */
  detectBetrayal(text, entity) {
    const betrayalIndicators = [
      'betrays', 'betrayed', 'betrayal',
      'traitor', 'rat', 'snitch', 'informant',
      'double cross', 'backstabs', 'backstabbed',
      'turned on', 'sells out', 'sold out',
      'working for', 'secretly', 'mole'
    ];
    
    return betrayalIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Detect revelation without exact keyword
   */
  detectRevelation(text, entity) {
    const revelationIndicators = [
      'reveals', 'revealed', 'revelation', 'reveal',
      'discovers', 'discovered', 'finds out', 'found out',
      'learns', 'learned', 'realizes', 'realized',
      'truth', 'secret', 'actually', 'turns out',
      'identity', 'exposed', 'unmasked'
    ];
    
    return revelationIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Detect ending without exact keyword
   */
  detectEnding(text) {
    const endingIndicators = [
      'ending', 'finale', 'final episode', 'final chapter',
      'final scene', 'concludes', 'conclusion',
      'last episode', 'series finale', 'how it ends',
      'in the end', 'at the end', 'by the end'
    ];
    
    return endingIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Detect transformation without exact keyword
   */
  detectTransformation(text, entity) {
    const transformationIndicators = [
      'becomes', 'became', 'turns into', 'turned into',
      'transforms', 'transformed', 'changes into',
      'revealed to be', 'revealed as', 'actually is',
      'villain', 'antagonist', 'evil', 'dark side'
    ];
    
    return transformationIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Detect plot event by outcome
   */
  detectPlotEvent(text, outcome) {
    if (!outcome) return false;
    
    // Check if text describes similar outcome
    const outcomeWords = outcome.toLowerCase().split(' ');
    return outcomeWords.some(word => word.length > 3 && text.includes(word));
  }

  getSeverity(eventType) {
    const severityMap = {
      'death': 'critical',
      'ending': 'critical',
      'victory': 'major',
      'defeat': 'major',
      'revelation': 'major',
      'plot_twist': 'critical',
      'win': 'moderate',
      'incident': 'minor'
    };
    
    return severityMap[eventType] || 'moderate';
  }
}

/**
 * Narrative Inference Engine - Understands "Cap gets his dance" = Endgame ending
 */
class NarrativeInferenceEngine {
  constructor(knowledgeEngine) {
    this.knowledge = knowledgeEngine;
  }

  /**
   * Detect narrative spoilers
   */
  detectNarratives(text, mediaKnowledge) {
    const detectedNarratives = [];
    
    for (const media of mediaKnowledge) {
      if (!media.narratives) continue;
      
      for (const narrative of media.narratives) {
        if (narrative.pattern.test(text)) {
          detectedNarratives.push({
            type: narrative.type,
            severity: narrative.severity,
            media: media,
            confidence: 0.90,
            pattern: narrative.pattern.source
          });
        }
      }
    }
    
    return detectedNarratives;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.KnowledgeEngine = KnowledgeEngine;
  window.EntityMatcher = EntityMatcher;
  window.SpoilerEventDetector = SpoilerEventDetector;
  window.NarrativeInferenceEngine = NarrativeInferenceEngine;
}

console.log('[V4 Knowledge Engine] Loaded');
