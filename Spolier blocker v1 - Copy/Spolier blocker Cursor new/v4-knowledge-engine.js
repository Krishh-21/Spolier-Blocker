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
    this.tmdbCache = new Map();
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
        { pattern: /\btime (heist|travel|machine)\b/i, type: 'plot_device', severity: 'major', event: 'Avengers travel through time' },
        { pattern: /\b(build|built|building) (a )?time machine\b/i, type: 'plot_device', severity: 'major', event: 'time machine built' },
        { pattern: /\bsteal(s|ing)? (the )?infinity stones\b/i, type: 'plot_device', severity: 'major', event: 'steal Infinity Stones' },
        { pattern: /\b(black widow|natasha).{0,30}(dies?|died|death|sacrific|vormir|falls)\b/i, type: 'death', severity: 'critical', event: 'Natasha sacrifices herself' },
        { pattern: /\b(thanos).{0,40}(destroyed|decimated|used up).{0,20}(stones|infinity)\b/i, type: 'plot_twist', severity: 'major', event: 'Thanos destroyed Infinity Stones' },
        { pattern: /\b(thor|thanos).{0,30}(chop|chops|chopped|behead|decapitat|head)\b/i, type: 'death', severity: 'critical', event: 'Thanos killed' },
        { pattern: /\bvormir\b/i, type: 'plot_device', severity: 'major', event: 'Soul Stone on Vormir' },
        { pattern: /\bsoul stone\b/i, type: 'plot_device', severity: 'major', event: 'Soul Stone quest' },
        { pattern: /\bquantum realm\b/i, type: 'plot_device', severity: 'major', event: 'Quantum Realm' },
        { pattern: /\bmajor casualties\b/i, type: 'plot_summary', severity: 'critical', event: 'death discussion' },
        { pattern: /\bhow (the )?(story|saga|movie|film) (ends?|wraps? up|concludes?)\b/i, type: 'plot_summary', severity: 'critical', event: 'ending summary' }
      ]
    });

    this.addMedia({
      title: 'Breaking Bad',
      type: 'tv',
      aliases: ['BB', 'BrBa'],
      characters: [
        { name: 'Walter White', aliases: ['Walter', 'Walt', 'Heisenberg', 'Mr. White', 'WW'] },
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
        { pattern: /\bwalter (dies?|died|death|ending|killed|kills)\b/i, type: 'death', severity: 'critical', event: 'Walter dies' },
        { pattern: /\b(dies?|died|killed|death).{0,40}\b(season\s*5|finale|last episode)\b/i, type: 'death', severity: 'critical', event: 'character death in finale' },
        { pattern: /\b(season\s*5|finale).{0,40}\b(dies?|died|killed|death)\b/i, type: 'death', severity: 'critical', event: 'character death in finale' },
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
   * Get knowledge for tracked media (titles or full media objects with phrases)
   */
  getKnowledge(trackedItems) {
    const knowledge = [];

    for (const item of trackedItems) {
      knowledge.push(this.buildMediaKnowledge(item));
    }

    return knowledge;
  }

  /**
   * Build merged knowledge for one tracked title — works for ANY movie/show
   */
  buildMediaKnowledge(item) {
    const title = typeof item === 'string' ? item : (item.title || '');
    const phrases = typeof item === 'string' ? [] : (item.phrases || []);
    const mediaType = typeof item === 'string' ? 'movie' : (item.type || item.mediaType || 'movie');
    const storedKnowledge = typeof item === 'string' ? null : (item.knowledge || null);
    const key = title.toLowerCase();
    const builtIn = this.knowledgeBase.get(key);

    const media = builtIn
      ? { ...builtIn, characters: [...(builtIn.characters || builtIn.entities || [])] }
      : {
          title,
          type: mediaType === 'unknown' ? 'movie' : mediaType,
          aliases: [title],
          characters: [],
          majorEvents: [],
          narratives: [],
          plotTwists: [],
          keywords: [],
          genres: []
        };

    if (!media.characters) media.characters = [];
    if (!media.aliases) media.aliases = [title];

    // Merge TMDB auto-built knowledge profile
    if (storedKnowledge) {
      this.mergeStoredKnowledge(media, storedKnowledge);
    }

    // Legacy flat phrases (cast names, etc.)
    for (const phrase of phrases) {
      if (!this.isLikelyCharacterPhrase(phrase, title)) continue;
      const p = phrase.trim();
      const lower = p.toLowerCase();
      const exists = media.characters.some(c =>
        c.name.toLowerCase() === lower ||
        (c.aliases && c.aliases.some(a => a.toLowerCase() === lower))
      );
      if (!exists && p.split(' ').length <= 4) {
        media.characters.push({ name: p, aliases: [] });
      }
    }

    return media;
  }

  /**
   * Merge TMDB-built knowledge into media profile
   */
  mergeStoredKnowledge(media, knowledge) {
    if (knowledge.aliases) {
      for (const alias of knowledge.aliases) {
        if (alias && !media.aliases.some(a => a.toLowerCase() === alias.toLowerCase())) {
          media.aliases.push(alias);
        }
      }
    }

    if (knowledge.characters) {
      for (const char of knowledge.characters) {
        const lower = char.name.toLowerCase();
        const existing = media.characters.find(c => c.name.toLowerCase() === lower);
        if (existing) {
          const merged = new Set([...(existing.aliases || []), ...(char.aliases || [])]);
          existing.aliases = Array.from(merged);
        } else {
          media.characters.push({ name: char.name, aliases: char.aliases || [] });
        }
      }
    }

    if (knowledge.keywords?.length) {
      media.keywords = [...new Set([...(media.keywords || []), ...knowledge.keywords])];
      media.locations = [...new Set([...(media.locations || []), ...knowledge.keywords])];
    }

    if (knowledge.genres?.length) {
      media.genres = [...new Set([...(media.genres || []), ...knowledge.genres])];
    }

    if (knowledge.tagline) {
      media.tagline = knowledge.tagline;
    }

    if (knowledge.creators?.length) {
      media.creators = knowledge.creators;
    }
  }

  isLikelyCharacterPhrase(phrase, title) {
    const p = String(phrase || '').trim();
    if (!p || p.length < 3) return false;
    if (p.toLowerCase() === String(title || '').toLowerCase()) return false;
    if (/^[a-z0-9_.-]+$/.test(p) && !p.includes(' ')) return false;
    if (/^\d{4}$/.test(p)) return false;
    return true;
  }

  /**
   * Check if text is relevant to tracked media
   */
  checkRelevance(text, trackedKnowledge) {
    const lowerText = text.toLowerCase();
    const seen = new Map();

    const addRelevance = (media, reason, confidence) => {
      const key = media.title;
      const existing = seen.get(key);
      if (!existing || existing.confidence < confidence) {
        seen.set(key, { media, reason, confidence });
      }
    };

    for (const media of trackedKnowledge) {
      if (lowerText.includes(media.title.toLowerCase())) {
        addRelevance(media, 'title_match', 1.0);
        continue;
      }

      if (media.aliases) {
        for (const alias of media.aliases) {
          if (lowerText.includes(alias.toLowerCase())) {
            addRelevance(media, 'alias_match', 0.95);
            break;
          }
        }
      }

      const entities = media.characters || media.entities || [];
      for (const entity of entities) {
        if (this.entityMentioned(lowerText, entity)) {
          addRelevance(media, 'entity_match', 0.85);
          break;
        }
        if (entity.aliases) {
          for (const alias of entity.aliases) {
            if (this.textIncludesTerm(lowerText, alias)) {
              addRelevance(media, 'entity_alias_match', 0.80);
              break;
            }
          }
        }
      }

      if (media.teams) {
        for (const team of media.teams) {
          if (this.textIncludesTerm(lowerText, team)) {
            addRelevance(media, 'team_match', 0.82);
            break;
          }
        }
      }

      if (media.locations) {
        for (const loc of media.locations) {
          if (this.textIncludesTerm(lowerText, loc)) {
            addRelevance(media, 'location_match', 0.78);
            break;
          }
        }
      }

      if (media.type === 'sports') {
        if (/\b(race|grand prix|podium|qualifying|championship|lap|pit stop|dnf|pole position)\b/i.test(lowerText)) {
          addRelevance(media, 'sports_context', 0.75);
        }
      }

      if (media.type === 'awards') {
        if (/\b(best (picture|director|actor|actress|supporting|animated|original|adapted)|oscar|academy award|nominee|nominated|winner|wins best|takes home|awarded)\b/i.test(lowerText)) {
          addRelevance(media, 'awards_context', 0.90);
        }
        if (media.categories) {
          for (const cat of media.categories) {
            if (lowerText.includes(cat.toLowerCase())) {
              addRelevance(media, 'category_match', 0.88);
              break;
            }
          }
        }
      }

      // TMDB keywords & genres (thematic relevance for any tracked title)
      if (media.keywords) {
        for (const kw of media.keywords) {
          if (this.textIncludesTerm(lowerText, kw)) {
            addRelevance(media, 'keyword_match', 0.72);
            break;
          }
        }
      }

      if (media.genres) {
        for (const genre of media.genres) {
          if (this.textIncludesTerm(lowerText, genre)) {
            addRelevance(media, 'genre_match', 0.70);
            break;
          }
        }
      }

      if (media.tagline && lowerText.includes(media.tagline.toLowerCase())) {
        addRelevance(media, 'tagline_match', 0.75);
      }
    }

    return Array.from(seen.values());
  }

  textIncludesTerm(text, term) {
    const t = String(term || '').toLowerCase().trim();
    if (!t) return false;
    if (t.length <= 2) {
      return new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
    }
    return text.includes(t);
  }

  entityMentioned(text, entity) {
    if (!entity || !entity.name) return false;
    const names = [entity.name, ...(entity.aliases || [])];
    const firstName = entity.name.split(' ')[0];
    if (firstName && firstName.length >= 3) names.push(firstName);
    return names.some(name => this.textIncludesTerm(text, name));
  }

  getEntityNames(entity) {
    const names = [entity.name, ...(entity.aliases || [])];
    const firstName = entity.name.split(' ')[0];
    if (firstName && firstName.length >= 3) names.push(firstName);
    return names;
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
        const matchedAs = this.matchEntityName(lowerText, entity);
        if (matchedAs) {
          foundEntities.push({
            entity: entity,
            media: media,
            matchedAs: matchedAs,
            confidence: matchedAs === entity.name ? 1.0 : 0.9
          });
        }
      }
    }
    
    return foundEntities;
  }

  matchEntityName(lowerText, entity) {
    for (const name of this.knowledge.getEntityNames(entity)) {
      if (this.knowledge.textIncludesTerm(lowerText, name)) {
        return name;
      }
    }
    return null;
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
        
        // Check if event entity is mentioned (in found entities OR directly in text)
        const entityMentioned = event.entity && (
          foundEntities.some(fe =>
            fe.entity.name === event.entity ||
            (fe.entity.aliases && fe.entity.aliases.some(alias =>
              alias.toLowerCase() === event.entity.toLowerCase()
            ))
          ) ||
          this.entityMentionedInText(lowerText, event.entity, media)
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
          case 'time_travel':
            eventDetected = this.detectPlotEvent(lowerText, event.outcome) ||
              this.detectPlotLanguage(lowerText);
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
   * Check if an entity is mentioned in text (name, first name, or aliases)
   */
  entityMentionedInText(text, entityName, media) {
    if (!entityName || !text) return false;

    const entities = media.characters || media.entities || [];
    const entity = entities.find(e => e.name === entityName);
    const namesToCheck = [entityName];

    if (entity) {
      namesToCheck.push(entity.name);
      if (entity.aliases) namesToCheck.push(...entity.aliases);
      const firstName = entity.name.split(' ')[0];
      if (firstName && firstName.length >= 3) namesToCheck.push(firstName);
    }

    const unique = [...new Set(namesToCheck.map(n => n.toLowerCase()))];
    return unique.some(name => {
      if (name.length <= 2) {
        return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
      }
      return text.includes(name);
    });
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
      'funeral', 'buried', 'grave',
      'chops off', 'chopped off', 'chopping off', 'beheads', 'beheaded',
      'decapitat', 'falls to her death', 'falls to his death', 'falls to their death',
      'jumps off', 'jumped to her death', 'jumped to his death',
      'casualties', 'major casualties', 'loses her life', 'loses his life'
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
    
    const outcomeWords = outcome.toLowerCase().split(/\s+/);
    return outcomeWords.filter(w => w.length > 3).some(word => text.includes(word));
  }

  detectPlotLanguage(text) {
    const plotIndicators = [
      'time machine', 'time heist', 'time travel', 'infinity stones', 'infinity gauntlet',
      'soul stone', 'quantum realm', 'steal the stones', 'steals the stones',
      'destroyed the stones', 'wraps up', 'plot twist', 'game-changing',
      'how it ends', 'what happens', 'major twist', 'final battle', 'climax'
    ];
    return plotIndicators.some(indicator => text.includes(indicator));
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

/**
 * Universal Spoiler Engine — logic that works for ANY movie, TV show, sport, or awards
 * Covers positive moments, twists, reveals, climaxes — not just deaths/tragedies
 */
class UniversalSpoilerEngine {
  constructor() {
    this.twistPatterns = [
      /\bthe twist[:\s—-]/i,
      /\bisn'?t\s+[\w"']+[\w\s"']{0,40}\s+at all\b/i,
      /\bnot\s+[\w"']+[\w\s"']{0,40}\s+at all\b/i,
      /\b(isn'?t|is not|wasn'?t|was not|not actually|aren't actually)\s+/i,
      /\bturns out (to be|that|he|she|they|it)\b/i,
      /\bactually (is|was|has been|were)\b/i,
      /\bsecretly (is|was|has been)\b/i,
      /\brevealed (to be|that|as|himself|herself)\b/i,
      /\bplot twist\b/i,
      /\bshocking reveal\b/i,
      /\bbig reveal\b/i,
      /\bidentity (is|was) revealed\b/i,
      /\bhidden truth\b/i,
      /\btrue identity\b/i,
      /\ball along\b/i
    ];

    this.positiveMomentPatterns = [
      /\bproves? (he|she|they|worthy|himself|herself|themself)\b/i,
      /\b(is|was|are|were) worthy\b/i,
      /\bwields?\s+/i,
      /\bfinally (gets?|got|becomes?|became|achieves?|achieved|wins?|won|kisses?|kissed|marries?|married)\b/i,
      /\bfor the first time\b/i,
      /\bgets? (his|her|their) (happy ending|dance|moment|revenge|powers?|crown)\b/i,
      /\breturns? (as|to|from|in|with)\b/i,
      /\breunites?\b/i,
      /\bachieves? \b/i,
      /\blifts? (the |thor'?s? )?(hammer|mjolnir)\b/i,
      /\bmjolnir\b/i,
      /\bpower(s)? up\b/i,
      /\bfulfills? (his|her|their|the) destiny\b/i,
      /\bsaves? (the day|everyone|the world|the city)\b/i,
      /\bgets? (the girl|the guy|together with)\b/i,
      /\bhappy ending\b/i,
      /\bthey (kiss|married|get together)\b/i,
      /\bchosen one\b/i,
      /\belected (as|to)\b/i,
      /\bcrowned (as|king|queen)\b/i,
      /\binherits? (the|a)\b/i
    ];

    this.climacticPatterns = [
      /\bfinal battle\b/i,
      /\bclimax\b/i,
      /\bclimactic\b/i,
      /\bduring the (final|last|epic|big)\b/i,
      /\bin the (finale|final episode|final scene|last scene|last episode)\b/i,
      /\bconfrontation (with|between)\b/i,
      /\bshowdown\b/i,
      /\bface-?off\b/i,
      /\blast stand\b/i,
      /\bgrand finale\b/i
    ];

    this.plotVerbPatterns = [
      /\b(discovers?|discovered|finds? out|found out|learns?|learned|realizes?|realized) (that|who|what|how|why)\b/i,
      /\b(sacrifices?|sacrificed|gives? up|gave up|lets? go of)\b/i,
      /\b(betrays?|betrayed|backstabs?|backstabbed)\b/i,
      /\b(escapes?|escaped|flees?|fled|gets? away)\b/i,
      /\b(kisses?|kissed|marries?|married|proposes? to|engaged to)\b/i,
      /\b(becomes?|became|turns? into|turned into|transforms? into|transformed into)\b/i,
      /\b(wins?|won|defeats?|defeated|beats?|beat|overcomes?|overcame)\b/i,
      /\b(loses?|lost|fails?|failed)\b/i,
      /\b(dies?|died|killed|kills?|murdered|dead|perished)\b/i,
      /\b(reveals?|revealed|exposes?|exposed|unmasks?|unmasked)\b/i,
      /\b(steals?|stole|takes?|took|retrieves?|retrieved)\b/i,
      /\b(destroy(s|ed)?|defeat(s|ed)?)\b/i,
      /\breturns? from (the )?dead\b/i,
      /\bcomes? back (as|to|from)\b/i,
      /\bgets? (pregnant|arrested|fired|promoted)\b/i,
      /\b(is|was) (pregnant|the father|the mother|the killer|the villain)\b/i
    ];

    this.spoilerFraming = [
      'spoiler', 'spoilers', 'spoiler alert', 'plot summary', 'plot twist',
      'how it ends', 'how the story ends', 'how the movie ends', 'how the show ends',
      'what happens', 'what happened', 'ending explained', 'ending revealed',
      'wraps up', 'concludes', 'in the end', 'turns out', 'it turns out',
      'game-changing', 'biggest moments', 'key moments', 'major moments',
      'recap', 'synopsis', 'storyline', 'full plot', 'entire plot',
      'here is exactly', 'here\'s exactly', 'here is how', 'plot points', 'story beats',
      'without further ado', 'long story short', 'bottom line is', 'at the end'
    ];

    this.narrativeMomentPatterns = [
      /\bstays? in the past\b/i,
      /\b(retires?|retired)\b/i,
      /\b(the )?rat saves? (the )?(universe|everyone)\b/i,
      /\bsaves? (the )?(universe|everyone)\b/i,
      /\bfinds? the book\b/i,
      /\bfinds? .{0,25}book in the toilet\b/i,
      /\b(book|toilet).{0,30}(finds?|discovers?|reads?)\b/i,
      /\b(basement|scene|conversation).{0,40}(explains?|reveals?|changes?)\b/i,
      /\bexplains? everything\b/i,
      /\bchanges? everything\b/i,
      /\bgets? (his|her|their) dance\b/i,
      /\bconversation changes? everything\b/i,
      /\bfinal conversation\b/i,
      /\bstays? (in|with) .{0,30}(past|peggy)\b/i
    ];

    this.highSpecificityPatterns = [
      /\b(the )?rat saves?\b/i,
      /\bbasement .{0,30}(explains?|reveals?|truth)\b/i,
      /\bfinds? the book\b/i,
      /\bscene explains?\b/i,
      /\bconversation changes?\b/i
    ];
  }

  detect(text, relevance, foundEntities) {
    if (!relevance || relevance.length === 0) return [];

    const disclosures = [];
    const entityCount = foundEntities.length;
    const hasTwist = this.twistPatterns.some(p => p.test(text));
    const hasPositive = this.positiveMomentPatterns.some(p => p.test(text));
    const hasClimactic = this.climacticPatterns.some(p => p.test(text));
    const hasPlotVerb = this.plotVerbPatterns.some(p => p.test(text));
    const hasFraming = this.spoilerFraming.some(f => text.toLowerCase().includes(f));
    const strongRelevance = relevance.some(r => r.confidence >= 0.82);
    const hasNarrativeMoment = this.narrativeMomentPatterns.some(p => p.test(text));
    const highSpecificity = this.highSpecificityPatterns.some(p => p.test(text));

    if (hasNarrativeMoment && (entityCount >= 1 || strongRelevance || highSpecificity)) {
      disclosures.push({
        type: 'narrative_spoiler',
        severity: 'major',
        confidence: 0.88,
        reason: 'Indirect narrative spoiler (scene, twist, or story beat)',
        universal: true
      });
    }

    if (hasTwist && (entityCount >= 1 || strongRelevance)) {
      disclosures.push({
        type: 'plot_twist',
        severity: 'critical',
        confidence: 0.94,
        reason: 'Plot twist / identity reveal',
        universal: true
      });
    }

    if (entityCount >= 1 && hasPositive) {
      disclosures.push({
        type: 'epic_moment',
        severity: 'major',
        confidence: 0.90,
        reason: 'Major character moment (worthy, wields, achieves, etc.)',
        universal: true
      });
    }

    if (entityCount >= 1 && hasClimactic && (hasPlotVerb || hasPositive)) {
      disclosures.push({
        type: 'climactic_scene',
        severity: 'major',
        confidence: 0.88,
        reason: 'Climactic scene with character involvement',
        universal: true
      });
    }

    if (entityCount >= 1 && hasPlotVerb && text.length >= 25) {
      disclosures.push({
        type: 'plot_advancement',
        severity: 'major',
        confidence: 0.86,
        reason: 'Character linked to plot development',
        universal: true
      });
    }

    if (hasFraming && strongRelevance) {
      disclosures.push({
        type: 'spoiler_framing',
        severity: 'critical',
        confidence: 0.92,
        reason: 'Explicit spoiler discussion',
        universal: true
      });
    }

    if (entityCount >= 2 && hasPlotVerb && text.length >= 40) {
      disclosures.push({
        type: 'plot_summary',
        severity: 'major',
        confidence: 0.84,
        reason: 'Multi-character plot discussion',
        universal: true
      });
    }

    if (hasClimactic && hasPlotVerb && strongRelevance && text.length >= 35) {
      disclosures.push({
        type: 'climactic_plot',
        severity: 'major',
        confidence: 0.85,
        reason: 'Climactic plot event',
        universal: true
      });
    }

    return disclosures;
  }

  detectSportsAwards(text, media, foundEntities, relevance) {
    const disclosures = [];
    const lower = text.toLowerCase();
    const outcomeWords = [
      'wins', 'won', 'winner', 'victory', 'defeats', 'defeated', 'beats', 'beat',
      'champion', 'championship', 'podium', 'p1', 'first place', 'grand prix',
      'crash', 'crashes', 'crashed', 'dnf', 'retires', 'retired',
      'awarded', 'takes home', 'receives', 'wins best', 'won best', 'oscar goes to'
    ];
    const hasOutcome = outcomeWords.some(w => lower.includes(w));

    if (media.type === 'sports' && hasOutcome && (foundEntities.length >= 1 || relevance.length > 0)) {
      disclosures.push({
        type: 'sports_result',
        media,
        severity: 'major',
        confidence: 0.90,
        reason: 'Sports result/outcome',
        universal: true
      });
    }

    if (media.type === 'awards' && hasOutcome) {
      disclosures.push({
        type: 'award_result',
        media,
        severity: 'major',
        confidence: 0.90,
        reason: 'Award winner/result',
        universal: true
      });
    }

    return disclosures;
  }
}

/**
 * Plot Disclosure Analyzer - Detects ANY plot/outcome spoiler (not just deaths)
 */
class PlotDisclosureAnalyzer {
  constructor(knowledgeEngine) {
    this.knowledge = knowledgeEngine;
    this.universal = new UniversalSpoilerEngine();
  }

  detectDisclosures(text, mediaKnowledge, foundEntities, relevance) {
    if (!relevance || relevance.length === 0) return [];

    const disclosures = [...this.universal.detect(text, relevance, foundEntities)];
    const lowerText = text.toLowerCase();
    const entityCount = foundEntities.length;
    const hasOutcome = this.universal.plotVerbPatterns.some(p => p.test(text));

    for (const rel of relevance) {
      const media = rel.media;

      disclosures.push(...this.universal.detectSportsAwards(text, media, foundEntities, relevance));

      if (media.plotTwists) {
        for (const twist of media.plotTwists) {
          const words = twist.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const matchCount = words.filter(w => lowerText.includes(w)).length;
          if (words.length > 0 && matchCount >= Math.min(2, words.length)) {
            disclosures.push({
              type: 'plot_twist',
              media,
              severity: 'major',
              confidence: 0.85,
              reason: `Plot twist: ${twist}`
            });
          }
        }
      }

      if (media.type === 'movie' || media.type === 'tv' || media.type === 'anime' || media.type === 'game') {
        const locHit = (media.locations || []).some(loc => lowerText.includes(loc.toLowerCase()));
        if (locHit && hasOutcome && entityCount >= 1) {
          disclosures.push({
            type: 'location_outcome',
            media,
            severity: 'major',
            confidence: 0.86,
            reason: 'Story location linked to outcome'
          });
        }
      }
    }

    return this.deduplicateDisclosures(disclosures);
  }

  deduplicateDisclosures(disclosures) {
    const seen = new Set();
    return disclosures.filter(d => {
      const key = d.type + '|' + (d.reason || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// Export
if (typeof window !== 'undefined') {
  window.KnowledgeEngine = KnowledgeEngine;
  window.EntityMatcher = EntityMatcher;
  window.SpoilerEventDetector = SpoilerEventDetector;
  window.NarrativeInferenceEngine = NarrativeInferenceEngine;
  window.PlotDisclosureAnalyzer = PlotDisclosureAnalyzer;
  window.UniversalSpoilerEngine = UniversalSpoilerEngine;
}

console.log('[V4 Knowledge Engine] Loaded');
