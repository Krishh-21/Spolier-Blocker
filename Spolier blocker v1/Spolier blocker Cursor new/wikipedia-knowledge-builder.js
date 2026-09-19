/**
 * Wikipedia / Wikidata Knowledge Builder
 * Sports, reality TV, awards, events — no API key required (contact email for User-Agent).
 */

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKI_MEDIA_TYPES = new Set(['sports', 'reality', 'awards', 'event', 'game']);

class WikipediaKnowledgeBuilder {
  static userAgent(contact) {
    const c = (contact || 'spoiler-shield@users.noreply.github.com').trim();
    return `SpoilerShield/1.3 (Chrome Extension; ${c})`;
  }

  static async wikiFetch(baseUrl, params, contact) {
    const url = `${baseUrl}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url, {
        credentials: 'omit',
        signal: controller.signal,
        headers: { 'Api-User-Agent': WikipediaKnowledgeBuilder.userAgent(contact) }
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn('[Wikipedia Knowledge] fetch failed:', e.message);
      return null;
    }
  }

  static searchSuffix(mediaType) {
    const map = {
      sports: 'sport',
      reality: 'reality television series',
      awards: 'award ceremony',
      event: 'event',
      game: 'video game',
      movie: 'film',
      tv: 'television series'
    };
    return map[mediaType] || '';
  }

  static async search(query, mediaType = 'event', options = {}) {
    if (!query || !query.trim()) return [];
    const suffix = WikipediaKnowledgeBuilder.searchSuffix(mediaType);
    const srsearch = suffix ? `${query.trim()} ${suffix}` : query.trim();
    const data = await WikipediaKnowledgeBuilder.wikiFetch(WIKI_API, {
      action: 'query',
      list: 'search',
      srsearch,
      srlimit: '12',
      utf8: '1'
    }, options.contact);
    return (data?.query?.search || []).map(r => ({
      title: r.title,
      pageid: r.pageid,
      snippet: r.snippet
    }));
  }

  static async fetchPageBundle(pageTitle, contact) {
    const data = await WikipediaKnowledgeBuilder.wikiFetch(WIKI_API, {
      action: 'query',
      prop: 'pageprops|categories',
      titles: pageTitle,
      cllimit: '30',
      ppprop: 'wikibase_item',
      redirects: '1'
    }, contact);
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) return null;
    const categories = (page.categories || [])
      .map(c => (c.title || '').replace(/^Category:/i, '').trim())
      .filter(c => c && !/wikipedia|wikidata|articles?|stubs?|pages with|television series|films? scored|webarchive|commons category/i.test(c));
    return {
      pageid: page.pageid,
      title: page.title,
      wikidataId: page.pageprops?.wikibase_item || null,
      categories
    };
  }

  static async fetchWikidataEntity(qid, contact) {
    if (!qid) return null;
    const data = await WikipediaKnowledgeBuilder.wikiFetch(WIKIDATA_API, {
      action: 'wbgetentities',
      ids: qid,
      props: 'labels|aliases|claims',
      languages: 'en'
    }, contact);
    return data?.entities?.[qid] || null;
  }

  static async resolveEntityLabels(qids, contact) {
    const ids = [...new Set(qids.filter(Boolean))].slice(0, 20);
    if (!ids.length) return {};
    const data = await WikipediaKnowledgeBuilder.wikiFetch(WIKIDATA_API, {
      action: 'wbgetentities',
      ids: ids.join('|'),
      props: 'labels',
      languages: 'en'
    }, contact);
    const out = {};
    for (const id of ids) {
      const label = data?.entities?.[id]?.labels?.en?.value;
      if (label) out[id] = label;
    }
    return out;
  }

  static claimValues(entity, propId) {
    const claims = entity?.claims?.[propId] || [];
    return claims.map(c => c.mainsnak?.datavalue?.value).filter(Boolean);
  }

  static buildFromWikidata(entity, pageBundle, mediaType, aggressiveness = 2) {
    const level = Math.max(0, Math.min(3, aggressiveness));
    const limits = {
      people: level < 2 ? 0 : level === 2 ? 10 : 16,
      teams: level < 1 ? 0 : level === 2 ? 6 : 10,
      keywords: level < 1 ? 4 : level === 2 ? 10 : 14
    };

    const knowledge = {
      aliases: [],
      characters: [],
      keywords: [],
      genres: [],
      teams: [],
      locations: [],
      categories: (pageBundle?.categories || []).slice(0, limits.keywords),
      wikiPageId: pageBundle?.pageid || null,
      wikidataId: pageBundle?.wikidataId || entity?.id || null,
      sources: ['wikipedia']
    };
    const phrases = new Set();
    const title = pageBundle?.title || entity?.labels?.en?.value || '';
    if (title) phrases.add(title.toLowerCase());

    const aliases = entity?.aliases?.en || [];
    aliases.slice(0, 8).forEach(a => {
      if (a.value) {
        knowledge.aliases.push(a.value);
        phrases.add(a.value.toLowerCase());
      }
    });

    // Genres / sport
    WikipediaKnowledgeBuilder.claimValues(entity, 'P136').slice(0, 6).forEach(v => {
      const id = typeof v === 'object' ? v.id : null;
      if (id) knowledge.genres.push(id);
    });
    WikipediaKnowledgeBuilder.claimValues(entity, 'P641').slice(0, 3).forEach(v => {
      const id = typeof v === 'object' ? v.id : null;
      if (id) knowledge.genres.push(id);
    });

    knowledge.categories.forEach(c => phrases.add(c.toLowerCase()));

    return { knowledge, phrases, title, pendingQids: { cast: [], teams: [], genres: [] }, limits };
  }

  static async enrichFromClaims(entity, draft, contact) {
    const castQids = WikipediaKnowledgeBuilder.claimValues(entity, 'P161')
      .map(v => v.id).filter(Boolean);
    const participantQids = WikipediaKnowledgeBuilder.claimValues(entity, 'P1344')
      .map(v => v.id).filter(Boolean);
    const teamQids = WikipediaKnowledgeBuilder.claimValues(entity, 'P54')
      .map(v => v.id).filter(Boolean);
    const coachQids = WikipediaKnowledgeBuilder.claimValues(entity, 'P286')
      .concat(WikipediaKnowledgeBuilder.claimValues(entity, 'P54').map(v => v.id))
      .filter(Boolean);
    const genreQids = [...WikipediaKnowledgeBuilder.claimValues(entity, 'P136'),
      ...WikipediaKnowledgeBuilder.claimValues(entity, 'P641')]
      .map(v => v.id).filter(Boolean);

    const allQids = [...castQids, ...teamQids, ...coachQids, ...genreQids, ...participantQids];
    const labels = await WikipediaKnowledgeBuilder.resolveEntityLabels(allQids, contact);

    const level = draft.limits || { people: 10, teams: 6, keywords: 10 };
    const k = draft.knowledge;
    const phrases = draft.phrases;

    castQids.slice(0, level.people).forEach(qid => {
      const name = labels[qid];
      if (!name || name.length < 2) return;
      const aliases = WikipediaKnowledgeBuilder.buildPersonAliases(name);
      k.characters.push({ name, aliases });
      phrases.add(name.toLowerCase());
      aliases.forEach(a => phrases.add(a.toLowerCase()));
    });

    teamQids.slice(0, level.teams).forEach(qid => {
      const name = labels[qid];
      if (!name) return;
      k.teams.push(name);
      phrases.add(name.toLowerCase());
    });

    genreQids.slice(0, 6).forEach(qid => {
      const name = labels[qid];
      if (!name) return;
      if (!k.genres.includes(name)) k.genres.push(name);
      phrases.add(name.toLowerCase());
    });

    participantQids.slice(0, 4).forEach(qid => {
      const name = labels[qid];
      if (!name) return;
      k.keywords.push(name);
      phrases.add(name.toLowerCase());
    });

    return draft;
  }

  static buildPersonAliases(name) {
    const aliases = [];
    const parts = name.split(/\s+/);
    if (parts.length >= 2 && parts[0].length >= 3) aliases.push(parts[0]);
    const last = parts[parts.length - 1];
    if (last.length >= 4 && last !== parts[0]) aliases.push(last);
    return aliases;
  }

  static compactKnowledge(knowledge) {
    return {
      aliases: (knowledge.aliases || []).slice(0, 12),
      characters: (knowledge.characters || []).slice(0, 16),
      keywords: (knowledge.keywords || []).slice(0, 14),
      genres: (knowledge.genres || []).slice(0, 8),
      teams: (knowledge.teams || []).slice(0, 10),
      locations: (knowledge.locations || []).slice(0, 8),
      categories: (knowledge.categories || []).slice(0, 12),
      wikiPageId: knowledge.wikiPageId || null,
      wikidataId: knowledge.wikidataId || null,
      sources: knowledge.sources || ['wikipedia']
    };
  }

  static async buildForTitle(title, mediaType, options = {}) {
    const empty = { knowledge: null, phrases: [], mediaType, wikiPageId: null };
    if (!title || !title.trim()) return empty;

    const pageBundle = await WikipediaKnowledgeBuilder.fetchPageBundle(title.trim(), options.contact);
    if (!pageBundle) return empty;

    let entity = null;
    if (pageBundle.wikidataId) {
      entity = await WikipediaKnowledgeBuilder.fetchWikidataEntity(pageBundle.wikidataId, options.contact);
    }

    const aggressiveness = options.aggressiveness ?? 2;
    const draft = entity
      ? WikipediaKnowledgeBuilder.buildFromWikidata(entity, pageBundle, mediaType, aggressiveness)
      : {
          knowledge: {
            aliases: [],
            characters: [],
            keywords: [],
            genres: [],
            teams: [],
            locations: [],
            categories: pageBundle.categories || [],
            wikiPageId: pageBundle.pageid,
            wikidataId: null,
            sources: ['wikipedia']
          },
          phrases: new Set([pageBundle.title.toLowerCase()]),
          title: pageBundle.title,
          limits: { people: 0, teams: 0, keywords: 10 }
        };

    if (entity) await WikipediaKnowledgeBuilder.enrichFromClaims(entity, draft, options.contact);

    draft.phrases.add(pageBundle.title.toLowerCase());
    (pageBundle.categories || []).forEach(c => draft.phrases.add(c.toLowerCase()));

    return {
      knowledge: WikipediaKnowledgeBuilder.compactKnowledge(draft.knowledge),
      phrases: Array.from(draft.phrases).filter(p => p.length >= 2),
      mediaType,
      wikiPageId: pageBundle.pageid
    };
  }

  static isWikiMediaType(mediaType) {
    return WIKI_MEDIA_TYPES.has(mediaType) || mediaType === 'sports' || mediaType === 'reality' || mediaType === 'awards' || mediaType === 'event';
  }

  static mergeProfiles(...profiles) {
    const out = { phrases: [], knowledge: null, mediaType: 'movie', tmdbId: null, wikiPageId: null };
    const k = {
      aliases: [], characters: [], keywords: [], genres: [], teams: [], locations: [],
      categories: [], creators: [], tagline: null, wikiPageId: null, wikidataId: null, sources: []
    };
    const phrases = new Set();
    const charSeen = new Set();
    const aliasSeen = new Set();

    for (const p of profiles) {
      if (!p) continue;
      if (p.mediaType) out.mediaType = p.mediaType;
      if (p.tmdbId) out.tmdbId = p.tmdbId;
      if (p.wikiPageId) out.wikiPageId = p.wikiPageId;
      (p.phrases || []).forEach(ph => phrases.add(String(ph).toLowerCase()));
      const kn = p.knowledge;
      if (!kn) continue;
      (kn.sources || []).forEach(s => { if (!k.sources.includes(s)) k.sources.push(s); });
      if (kn.wikiPageId) k.wikiPageId = kn.wikiPageId;
      if (kn.wikidataId) k.wikidataId = kn.wikidataId;
      if (kn.tagline) k.tagline = kn.tagline;
      (kn.aliases || []).forEach(a => {
        const lower = a.toLowerCase();
        if (!aliasSeen.has(lower)) { aliasSeen.add(lower); k.aliases.push(a); }
      });
      (kn.characters || []).forEach(c => {
        const lower = c.name.toLowerCase();
        if (!charSeen.has(lower)) { charSeen.add(lower); k.characters.push(c); }
      });
      ['keywords', 'genres', 'teams', 'locations', 'categories', 'creators'].forEach(field => {
        (kn[field] || []).forEach(v => {
          if (v && !k[field].includes(v)) k[field].push(v);
        });
      });
    }

    out.phrases = Array.from(phrases);
    out.knowledge = (k.aliases.length || k.characters.length || k.keywords.length || k.teams.length)
      ? {
          aliases: k.aliases.slice(0, 15),
          characters: k.characters.slice(0, 16),
          keywords: k.keywords.slice(0, 18),
          genres: k.genres.slice(0, 8),
          teams: k.teams.slice(0, 10),
          locations: k.locations.slice(0, 8),
          categories: k.categories.slice(0, 12),
          creators: k.creators.slice(0, 4),
          tagline: k.tagline,
          wikiPageId: k.wikiPageId,
          wikidataId: k.wikidataId,
          sources: k.sources
        }
      : null;
    return out;
  }
}

if (typeof window !== 'undefined') {
  window.WikipediaKnowledgeBuilder = WikipediaKnowledgeBuilder;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WikipediaKnowledgeBuilder };
}
