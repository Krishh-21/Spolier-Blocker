'use strict';
importScripts('packs.js', 'core.js');
const C = SpoilerCore;
let initialization;
let writes = Promise.resolve();
let requests = 0;

function initialize() {
  return initialization ||= (async () => {
    // Secrets and raw legacy state must never be readable by content scripts.
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    await chrome.storage.sync.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    const local = await chrome.storage.local.get(['config', 'tmdbToken']);
    if (!local.config) {
      const legacy = await chrome.storage.sync.get(['settings', 'selectedMedia', 'customKeywords', 'falsePositives', 'tmdbKey']);
      const next = { config: C.sanitize(legacy) };
      if (!local.tmdbToken && typeof legacy.tmdbKey === 'string' && /^[a-f0-9]{32}$/i.test(legacy.tmdbKey)) next.tmdbToken = legacy.tmdbKey;
      await chrome.storage.local.set(next);
      await chrome.storage.sync.remove(['userAccount', 'tmdbKey']);
    }
  })().catch(error => { initialization = null; throw error; });
}
async function config() { await initialize(); return C.sanitize((await chrome.storage.local.get('config')).config); }
function trustedUI(sender) {
  return sender.id === chrome.runtime.id && ['popup.html', 'options.html'].some(path => sender.url === chrome.runtime.getURL(path));
}
async function broadcast() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter(t => Number.isInteger(t.id)).map(t => chrome.tabs.sendMessage(t.id, { type: 'config-changed' }).catch(() => {})));
}
function mutate(update) {
  const operation = writes.then(async () => {
    const next = C.sanitize(await update(await config()));
    if (new TextEncoder().encode(JSON.stringify(next)).length > C.LIMITS.bytes) throw new Error('Settings exceed the 1 MB limit. Remove some titles or keywords.');
    await chrome.storage.local.set({ config: next });
    await broadcast();
    return next;
  });
  writes = operation.catch(() => {});
  return operation;
}
async function tmdb(path, params = {}) {
  await initialize();
  if (requests >= 3) throw new Error('A lookup is already running. Please try again shortly.');
  if (!await chrome.permissions.contains({ origins: ['https://api.themoviedb.org/*'] })) throw new Error('Enable TMDB lookup in settings first.');
  const { tmdbToken } = await chrome.storage.local.get('tmdbToken');
  if (!tmdbToken) throw new Error('Add your TMDB API key or read access token in settings.');
  requests++;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL('https://api.themoviedb.org/3/' + path);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const headers = { Accept: 'application/json' };
    if (/^[a-f0-9]{32}$/i.test(tmdbToken)) url.searchParams.set('api_key', tmdbToken);
    else headers.Authorization = 'Bearer ' + tmdbToken;
    const response = await fetch(url, { headers, credentials: 'omit', redirect: 'error', signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('upstream');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '', size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2000000) { await reader.cancel(); throw new Error('size'); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch { throw new Error('TMDB lookup failed. Check your key and connection, then try again.'); }
  finally { clearTimeout(timer); requests--; }
}
async function handle(message, sender) {
  if (sender.id !== chrome.runtime.id || !message || typeof message.type !== 'string') throw new Error('Unsupported request.');
  if (message.type === 'get-config') return { config: await config() };
  if (message.type === 'count' && sender.tab && sender.frameId === 0) {
    const count = Math.max(0, Math.min(9999, Number.isSafeInteger(message.count) ? message.count : 0));
    await chrome.action.setBadgeText({ tabId: sender.tab.id, text: message.active === false ? 'OFF' : count ? String(count) : '' });
    await chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#27675b' });
    return {};
  }
  if (!trustedUI(sender)) throw new Error('This action is only available in extension settings.');
  switch (message.type) {
    case 'save-config': return { config: await mutate(() => message.config) };
    case 'add-keyword': {
      if (typeof message.keyword !== 'string' || !message.keyword.trim() || message.keyword.length > C.LIMITS.term) throw new Error('Enter a keyword of 1–160 characters.');
      return { config: await mutate(c => {
        if (c.customKeywords.length >= C.LIMITS.keywords) throw new Error('Keyword limit reached.');
        c.customKeywords.push(message.keyword); return c;
      }) };
    }
    case 'toggle': return { config: await mutate(c => { c.settings.enabled = !c.settings.enabled; return c; }) };
    case 'toggle-site': {
      const host = C.domain(message.host);
      if (!host) throw new Error('This page cannot be protected.');
      return { config: await mutate(c => { c.settings.perSite[host] = !C.enabled(c.settings, host); return c; }) };
    }
    case 'token-status': return { configured: Boolean((await chrome.storage.local.get('tmdbToken')).tmdbToken) };
    case 'save-token': {
      if (typeof message.token !== 'string' || message.token.length > 2048 || /[\s\r\n]/.test(message.token)) throw new Error('Invalid token.');
      await initialize();
      if (message.token) await chrome.storage.local.set({ tmdbToken: message.token });
      else await chrome.storage.local.remove('tmdbToken');
      return {};
    }
    case 'search': {
      const type = message.mediaType === 'tv' ? 'tv' : 'movie';
      if (typeof message.query !== 'string' || message.query.trim().length < 2 || message.query.length > 120) throw new Error('Search with 2–120 characters.');
      const data = await tmdb('search/' + type, { query: message.query.trim(), include_adult: 'false' });
      return { results: (Array.isArray(data.results) ? data.results : []).slice(0, 12).map(item => ({
        tmdbId: item.id, type, title: String(item.title || item.name || '').slice(0, 160),
        year: String(item.release_date || item.first_air_date || '').slice(0, 4)
      })) };
    }
    case 'track-result': {
      if (!Number.isSafeInteger(message.id) || message.id <= 0 || !['movie', 'tv'].includes(message.mediaType)) throw new Error('Invalid title.');
      const type = message.mediaType;
      const data = await tmdb(`${type}/${message.id}`, { append_to_response: 'alternative_titles,credits' });
      const aliases = data.alternative_titles?.titles || data.alternative_titles?.results || [];
      const item = { title: data.title || data.name, type, tmdbId: message.id,
        phrases: [...(Array.isArray(aliases) ? aliases.map(a => a.title) : []),
          ...(Array.isArray(data.credits?.cast) ? data.credits.cast.slice(0, 30).flatMap(c => String(c.character || '').split(' / ')) : [])] };
      return { config: await mutate(c => {
        if (c.selectedMedia.length >= C.LIMITS.media) throw new Error('Title limit reached.');
        c.selectedMedia.push(item); return c;
      }) };
    }
    default: throw new Error('Unsupported request.');
  }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  handle(message, sender).then(data => respond({ ok: true, ...data }), error => respond({ ok: false, error: error.message || 'Action failed.' }));
  return true;
});
chrome.runtime.onInstalled.addListener(async details => {
  await initialize();
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: 'add-keyword', title: 'Spoiler Shield: block selected text', contexts: ['selection'] });
  if (details.reason === 'install') await chrome.runtime.openOptionsPage();
});
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'add-keyword' && typeof info.selectionText === 'string') {
    mutate(c => { c.customKeywords.push(info.selectionText.slice(0, C.LIMITS.term)); return c; }).catch(() => {});
  }
});
chrome.commands.onCommand.addListener(async command => {
  if (command === 'toggle-spoiler-shield') await mutate(c => { c.settings.enabled = !c.settings.enabled; return c; });
  else if (command === 'reprocess-page') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: 'rescan' }).catch(() => {});
  }
});
