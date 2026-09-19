(function (root) {
  'use strict';
  const VERSION = 2;
  const LIMITS = Object.freeze({ keywords: 2000, media: 200, phrases: 120, term: 160, bytes: 1000000 });
  const defaults = Object.freeze({ enabled: true, mode: 'balanced', presentation: 'cover', blurRadiusPx: 18,
    blurImages: true, revealOnHover: false, showReveal: false, previewOnYouTube: true, protectYouTube: true, reblurAfterMs: 0, includeDomains: [], excludeDomains: [], perSite: {} });
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const normalize = x => String(x ?? '').normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').toLocaleLowerCase('en-US')
    .replace(/[’‘]/g, "'").replace(/[\p{P}\p{Z}\s]+/gu, ' ').trim();
  function strings(value, limit = LIMITS.keywords, max = LIMITS.term) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.filter(x => typeof x === 'string').map(x => x.trim().slice(0, max)).filter(x => {
      const key = normalize(x);
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, limit);
  }
  function domain(value) {
    if (typeof value !== 'string' || !value.trim() || /[\s/@?#]/.test(value)) return '';
    try {
      const url = new URL('https://' + value.replace(/^\*\./, '').replace(/\.$/, ''));
      return url.port || !url.hostname || url.pathname !== '/' ? '' : url.hostname;
    } catch { return ''; }
  }
  function domainMatches(host, rule) { return host === rule || host.endsWith('.' + rule); }
  function enabled(settings, hostname) {
    const host = domain(hostname);
    if (settings.protectYouTube === false && (domainMatches(host, 'youtube.com') || domainMatches(host, 'youtu.be'))) return false;
    if (!host || !settings.enabled || settings.excludeDomains.some(d => domainMatches(host, d))) return false;
    if (Object.hasOwn(settings.perSite, host)) return settings.perSite[host];
    return !settings.includeDomains.length || settings.includeDomains.some(d => domainMatches(host, d));
  }
  function sanitize(input) {
    const data = object(input) ? input : {};
    const raw = object(data.settings) ? data.settings : {};
    const settings = { ...defaults, perSite: Object.create(null) };
    for (const key of ['enabled', 'blurImages', 'revealOnHover', 'showReveal', 'previewOnYouTube', 'protectYouTube']) if (typeof raw[key] === 'boolean') settings[key] = raw[key];
    if (['balanced', 'strict'].includes(raw.mode)) settings.mode = raw.mode;
    if (['cover', 'blur', 'motion', 'pixelated'].includes(raw.presentation)) settings.presentation = raw.presentation;
    for (const [key, min, max] of [['blurRadiusPx', 8, 40], ['reblurAfterMs', 0, 300000]]) {
      if (Number.isFinite(raw[key])) settings[key] = Math.max(min, Math.min(max, Math.round(raw[key])));
    }
    for (const key of ['includeDomains', 'excludeDomains']) settings[key] = strings(raw[key], 200, 253).map(domain).filter(Boolean);
    if (object(raw.perSite)) for (const [host, value] of Object.entries(raw.perSite).slice(0, 200)) {
      const safe = domain(host);
      if (safe && typeof value === 'boolean' && !['__proto__', 'constructor', 'prototype'].includes(safe)) settings.perSite[safe] = value;
    }
    const selectedMedia = [];
    const seen = new Set();
    for (const item of Array.isArray(data.selectedMedia) ? data.selectedMedia.slice(0, LIMITS.media) : []) {
      if (!object(item) || typeof item.title !== 'string') continue;
      const title = item.title.trim().slice(0, LIMITS.term);
      if (!normalize(title) || seen.has(normalize(title))) continue;
      seen.add(normalize(title));
      const knowledge = object(item.knowledge) ? item.knowledge : {};
      const names = Array.isArray(knowledge.characters) ? knowledge.characters.flatMap(c => object(c) ? [c.name, ...(Array.isArray(c.aliases) ? c.aliases : [])] : []) : [];
      selectedMedia.push({ title, type: ['movie', 'tv', 'anime', 'game', 'sports', 'awards', 'other'].includes(item.type) ? item.type : 'other',
        phrases: strings([...(Array.isArray(item.phrases) ? item.phrases : []), ...(Array.isArray(knowledge.aliases) ? knowledge.aliases : []), ...names], LIMITS.phrases),
        ...(Number.isSafeInteger(item.tmdbId) && item.tmdbId > 0 ? { tmdbId: item.tmdbId } : {}) });
    }
    const packIds = new Set((root.SpoilerPacks || []).map(p => p.id));
    return { schemaVersion: VERSION, settings, selectedMedia, customKeywords: strings(data.customKeywords),
      enabledPacks: strings(data.enabledPacks, 100).filter(id => packIds.has(id)),
      falsePositives: strings(data.falsePositives, 200, 2000) };
  }
  function parseBackup(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > LIMITS.bytes) throw new Error('Backup is too large (maximum 1 MB).');
    const parsed = JSON.parse(text);
    if (!object(parsed) || !(object(parsed.settings) || Array.isArray(parsed.selectedMedia) || Array.isArray(parsed.customKeywords))) throw new Error('Not a Spoiler Shield backup.');
    if (parsed.schemaVersion !== undefined && parsed.schemaVersion !== VERSION) throw new Error('Unsupported backup version.');
    return sanitize(parsed);
  }
  function activeMedia(config) {
    return [...config.selectedMedia, ...(root.SpoilerPacks || []).filter(p => config.enabledPacks.includes(p.id))];
  }
  function matcher(term, boundaries = true) {
    const normalized = normalize(term);
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Scripts without spaces (e.g. Japanese) must match inside sentences.
    const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(normalized);
    return new RegExp(boundaries && !cjk ? `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])` : escaped, 'u');
  }
  const cues = [
    'spoiler', 'spoilers', 'ending explained', 'ending', 'finale', 'plot twist', 'post credits', 'mid credits', 'after credits',
    'dies', 'died', 'death', 'dead', 'killed', 'kills', 'murdered', 'killer', 'betrays', 'betrayal', 'sacrifices', 'sacrifice',
    'survives', 'resurrected', 'revealed', 'reveals', 'turns out', 'identity', 'secretly', 'leaked', 'leaks', 'leak',
    'wins', 'won', 'winner', 'defeats', 'defeated', 'eliminated', 'champion', 'final score', 'results', 'podium',
    'recap', 'full plot', 'final boss', 'true ending', 'takes the throne', 'becomes emperor', 'retires',
    'muere', 'murió', 'muerte', 'final explicado', 'ganador', 'gana', 'spoilerwarnung', 'stirbt', 'gestorben', 'gewinnt',
    'mort', 'meurt', 'fin expliquée', 'gagnant', 'ネタバレ', '死亡', '結末', '優勝', '剧透', '死亡', '结局', '스포일러', '결말'
  ].map(x => matcher(x));
  function createDetector(input, legacyDetector) {
    const config = sanitize(input);
    const media = activeMedia(config);
    const keywords = config.customKeywords.map(term => matcher(term));
    const relevant = media.flatMap(m => strings([m.title, ...m.phrases], 121).map(term => matcher(term)));
    const allowed = new Set(config.falsePositives.map(normalize));
    return function detect(text) {
      if (typeof text !== 'string' || !text.trim()) return { blocked: false };
      const value = normalize(text);
      if (allowed.has(value)) return { blocked: false };
      if (keywords.some(re => re.test(value))) return { blocked: true, reason: 'Custom keyword' };
      const topic = relevant.find(re => re.test(value));
      if (topic && config.settings.mode === 'strict') return { blocked: true, reason: 'Protected topic' };
      if (topic) {
        // Require a cue near a tracked term, rather than combining unrelated paragraphs.
        for (const re of relevant) {
          const match = re.exec(value);
          if (match && cues.some(cue => cue.test(value.slice(Math.max(0, match.index - 220), match.index + match[0].length + 220)))) {
            return { blocked: true, reason: 'Topic and spoiler signal' };
          }
        }
      }
      if (legacyDetector && media.length && value.length <= 12000) {
        try { if (legacyDetector.analyze(text, media).isSpoiler) return { blocked: true, reason: 'Contextual spoiler signal' }; } catch { /* literal matching still works */ }
      }
      return { blocked: false };
    };
  }
  const api = { VERSION, LIMITS, defaults, normalize, strings, domain, domainMatches, enabled, sanitize, parseBackup, activeMedia, createDetector };
  root.SpoilerCore = Object.freeze(api);
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
