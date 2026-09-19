/**
 * TMDB Knowledge Builder
 * Auto-builds V4-compatible knowledge profiles when users add titles.
 */

const TMDB_DEFAULT_PROXY = 'https://ss-nu-gules.vercel.app';

class TmdbKnowledgeBuilder {
  /**
   * Fetch full TMDB details for a search result item
   */
  static async fetchDetails(item, options = {}) {
    const mediaType = item.media_type || item.type || (item.name && !item.title ? 'tv' : 'movie');
    const id = item.id;

    if (!['movie', 'tv'].includes(mediaType) || !id || isNaN(parseInt(id, 10))) {
      return null;
    }

    const proxyUrl = (options.proxyUrl || '').replace(/\/$/, '');
    const apiKey = options.apiKey || '';
    const append = 'alternative_titles,keywords,credits';

    let url;
    if (proxyUrl) {
      url = `${proxyUrl}/3/${mediaType}/${id}?append_to_response=${append}`;
    } else if (apiKey) {
      url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${encodeURIComponent(apiKey)}&append_to_response=${append}`;
    } else {
      url = `${TMDB_DEFAULT_PROXY}/3/${mediaType}/${id}?append_to_response=${append}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, { credentials: 'omit', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn('[TMDB Knowledge] fetch failed:', e.message);
      return null;
    }
  }

  /**
   * Build knowledge profile + phrase list from TMDB API response
   */
  static buildFromTmdbData(data, mediaType, aggressiveness = 2) {
    if (!data) {
      return { knowledge: null, phrases: [] };
    }

    const level = Math.max(0, Math.min(3, aggressiveness));
    const limits = {
      aliases: level === 0 ? 3 : level === 1 ? 6 : level === 2 ? 10 : 15,
      keywords: level === 0 ? 0 : level === 1 ? 8 : level === 2 ? 12 : 18,
      cast: level === 0 ? 0 : level === 1 ? 0 : level === 2 ? 8 : 14
    };

    const title = data.title || data.name || '';
    const knowledge = {
      aliases: [],
      characters: [],
      keywords: [],
      genres: [],
      tagline: null,
      creators: []
    };

    const phrases = new Set();
    if (title) phrases.add(title.toLowerCase());

    // Alternative titles / names
    const altSource = data.alternative_titles?.titles || data.alternative_titles?.results || [];
    altSource.slice(0, limits.aliases).forEach(t => {
      const name = (t.title || t.name || '').trim();
      if (name && name.toLowerCase() !== title.toLowerCase()) {
        knowledge.aliases.push(name);
        phrases.add(name.toLowerCase());
      }
    });

    // Original title
    if (data.original_title && data.original_title !== title) {
      knowledge.aliases.push(data.original_title);
      phrases.add(data.original_title.toLowerCase());
    }
    if (data.original_name && data.original_name !== title) {
      knowledge.aliases.push(data.original_name);
      phrases.add(data.original_name.toLowerCase());
    }

    // Genres (thematic relevance)
    (data.genres || []).forEach(g => {
      if (g.name) {
        knowledge.genres.push(g.name);
        if (level >= 1) phrases.add(g.name.toLowerCase());
      }
    });

    // Keywords (locations, themes, plot-adjacent tags — not full plot text)
    const kwSource = data.keywords?.keywords || data.keywords?.results || [];
    kwSource.slice(0, limits.keywords).forEach(k => {
      const name = (k.name || '').trim();
      if (name && name.length >= 3) {
        knowledge.keywords.push(name);
        phrases.add(name.toLowerCase());
      }
    });

    // Tagline (short, usually safe)
    if (data.tagline && data.tagline.length >= 4 && data.tagline.length <= 120) {
      knowledge.tagline = data.tagline;
    }

    // TV creators
    if (mediaType === 'tv' && data.created_by) {
      data.created_by.slice(0, 4).forEach(c => {
        if (c.name) knowledge.creators.push(c.name);
      });
    }

    // Cast → structured characters
    const cast = (data.credits?.cast || []).slice(0, limits.cast);
    const seenCharacters = new Set();

    for (const member of cast) {
      const rawChar = (member.character || '').trim();
      if (!rawChar || /^himself|herself|self$/i.test(rawChar)) continue;

      const charName = TmdbKnowledgeBuilder.cleanCharacterName(rawChar);
      if (!charName || charName.length < 2) continue;

      const key = charName.toLowerCase();
      if (seenCharacters.has(key)) continue;
      seenCharacters.add(key);

      const aliases = TmdbKnowledgeBuilder.buildCharacterAliases(charName);
      knowledge.characters.push({ name: charName, aliases });

      phrases.add(charName.toLowerCase());
      aliases.forEach(a => phrases.add(a.toLowerCase()));
    }

    return {
      knowledge: TmdbKnowledgeBuilder.compactKnowledge(knowledge),
      phrases: Array.from(phrases).filter(p => p.length >= 2)
    };
  }

  static cleanCharacterName(name) {
    return String(name)
      .replace(/\s*\([^)]*\)\s*/g, '')
      .replace(/\s*\/\s*.+$/, '')
      .replace(/\s+voice\s*$/i, '')
      .trim();
  }

  static buildCharacterAliases(charName) {
    const aliases = [];
    const parts = charName.split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0];
      if (first.length >= 3) aliases.push(first);
      // "Tony Stark" → also match "Stark" if distinctive
      const last = parts[parts.length - 1];
      if (last.length >= 4 && last !== first) aliases.push(last);
    }
    return aliases;
  }

  static compactKnowledge(knowledge) {
    return {
      aliases: knowledge.aliases.slice(0, 15),
      characters: knowledge.characters.slice(0, 14),
      keywords: knowledge.keywords.slice(0, 18),
      genres: knowledge.genres.slice(0, 6),
      tagline: knowledge.tagline || null,
      creators: (knowledge.creators || []).slice(0, 4)
    };
  }

  /**
   * Full pipeline: fetch + build for a search/onboarding item
   */
  static async buildForItem(item, options = {}) {
    const mediaType = item.media_type || item.type || (item.name && !item.title ? 'tv' : 'movie');
    const data = await TmdbKnowledgeBuilder.fetchDetails(item, options);
    const aggressiveness = options.aggressiveness ?? 2;
    const profile = TmdbKnowledgeBuilder.buildFromTmdbData(data, mediaType, aggressiveness);

    const title = item.title || item.name || data?.title || data?.name || '';
    const year = (item.release_date || item.first_air_date || data?.release_date || data?.first_air_date || '').split('-')[0] || '';

    // Filename-style tokens for torrent/social posts
    if (typeof generateFilenameTokens === 'function') {
      generateFilenameTokens(title, year).forEach(t => profile.phrases.push(t));
    }

    profile.phrases = Array.from(new Set(profile.phrases.map(p => String(p).toLowerCase())));
    profile.mediaType = mediaType;
    profile.tmdbId = item.id || data?.id || null;

    return profile;
  }
}

if (typeof window !== 'undefined') {
  window.TmdbKnowledgeBuilder = TmdbKnowledgeBuilder;
  window.TMDB_DEFAULT_PROXY = TMDB_DEFAULT_PROXY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TmdbKnowledgeBuilder, TMDB_DEFAULT_PROXY };
}
