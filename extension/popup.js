'use strict';
const $ = id => document.getElementById(id);
let tab, state;
function status(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
async function call(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Reload the extension and try again.');
  return result;
}
function render() {
  $('reveal').hidden = !state.settings.showReveal;
  $('toggle').textContent = state.settings.enabled ? 'Pause all' : 'Enable';
  $('toggle').disabled = false;
  try {
    const url = new URL(tab.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    $('site').textContent = SpoilerCore.enabled(state.settings, url.hostname) ? 'Pause site' : 'Enable site';
    $('site').disabled = false;
  } catch { $('site').disabled = true; }
}
async function updatePageStatus() {
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'status' }, { frameId: 0 });
    if (!result) throw new Error();
    $('count').textContent = result.count;
    $('pageStatus').textContent = result.active ? 'Protected blocks on this page' : 'Protection is paused on this page';
  } catch { $('count').textContent = '—'; $('pageStatus').textContent = 'Reload an ordinary webpage to start. Browser pages are not supported.'; }
}
function action(id, handler) { $(id).addEventListener('click', () => handler().catch(e => status(e.message, true))); }
action('toggle', async () => { state = (await call({ type: 'toggle' })).config; render(); await updatePageStatus(); });
action('site', async () => { state = (await call({ type: 'toggle-site', host: new URL(tab.url).hostname })).config; render(); await updatePageStatus(); });
action('settings', () => chrome.runtime.openOptionsPage());
for (const [id, type] of [['rescan', 'rescan'], ['reveal', 'reveal-all'], ['hide', 'hide-all']]) action(id, async () => {
  await chrome.tabs.sendMessage(tab.id, { type }); status('Done.'); await updatePageStatus();
});
$('keywordForm').addEventListener('submit', async event => {
  event.preventDefault();
  try { state = (await call({ type: 'add-keyword', keyword: $('keyword').value })).config; $('keyword').value = ''; status('Keyword saved. Open pages are updating.'); }
  catch (e) { status(e.message, true); }
});
(async () => {
  state = (await call({ type: 'get-config' })).config;
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); render(); await updatePageStatus();
})().catch(e => status(e.message, true));

$('keywordSuggestions').replaceChildren(...SpoilerPacks.flatMap(pack => [pack.title, ...pack.phrases]).map(value => { const option = document.createElement('option'); option.value = value; return option; }));
call({ type: 'account-status' }).then(({ account }) => { $('planStatus').textContent = `${account.tier.toUpperCase()} · ${account.limit === null ? 'No tier quota' : account.limit + ' custom keyword slots'}`; }).catch(() => {});

let searchRevision = 0;
for (const id of ['mediaCategory', 'mediaQuery']) $(id).addEventListener('input', () => { searchRevision++; $('mediaResults').replaceChildren(); });
$('mediaSearch').addEventListener('submit', async event => {
  event.preventDefault();
  const revision = ++searchRevision, query = $('mediaQuery').value.trim(), type = $('mediaCategory').value;
  if (query.length < 2) return;
  const normalized = SpoilerCore.normalize(query);
  let results = SpoilerPacks.filter(p => p.type === type && [p.title, ...p.phrases].some(v => SpoilerCore.normalize(v).includes(normalized))).map(p => ({ ...p, packId: p.id }));
  $('searchNote').textContent = 'Searching…';
  let note = 'Bundled suggestions, or protect an exact title.';
  if (['movie', 'tv'].includes(type)) {
    try {
      if ((await call({ type: 'token-status' })).configured) {
        const remote = await call({ type: 'search', mediaType: type, query });
        results = [...remote.results, ...results.filter(p => !remote.results.some(r => SpoilerCore.normalize(r.title) === SpoilerCore.normalize(p.title)))];
        note = 'Movie and TV results from TMDB.';
      } else note = 'Connect TMDB in settings for the full movie/TV catalog and posters.';
    } catch (e) { note = e.message + ' Bundled suggestions remain available.'; }
  }
  if (revision !== searchRevision) return;
  if (!results.some(p => SpoilerCore.normalize(p.title) === normalized)) results.push({ title: query, type, exact: true });
  $('searchNote').textContent = note;
  $('mediaResults').replaceChildren(...results.map(item => {
    const card = document.createElement('article'); card.className = 'media-card';
    const art = document.createElement(item.poster ? 'img' : 'div'); art.className = 'media-poster';
    if (item.poster) { art.src = item.poster; art.alt = ''; art.loading = 'lazy'; art.referrerPolicy = 'no-referrer'; }
    else { art.textContent = item.title; art.setAttribute('aria-hidden', 'true'); }
    const title = document.createElement('h3'); title.textContent = item.title;
    const meta = document.createElement('small'); meta.textContent = `${item.type.toUpperCase()}${item.year ? ' · ' + item.year : ''}${item.exact ? ' · Exact title' : ''}`;
    const block = document.createElement('button'); block.textContent = '+ Block spoilers';
    const watched = document.createElement('button'); watched.className = 'secondary'; watched.textContent = 'Mark as watched';
    async function update(remove) {
      block.disabled = watched.disabled = true;
      try { state = (await call({ type: remove ? 'untrack-title' : item.tmdbId ? 'track-result' : 'track-title', id: item.tmdbId, mediaType: item.type, title: item.title, packId: item.packId })).config;
        status(remove ? 'Marked as watched: title protection removed. Separate keywords still apply.' : 'Title protected. Strict mode hides every mention.');
        block.textContent = remove ? '+ Block spoilers' : 'Protected';
      } catch (e) { status(e.message, true); }
      finally { block.disabled = watched.disabled = false; }
    }
    block.addEventListener('click', () => update(false)); watched.addEventListener('click', () => update(true));
    card.append(art, title, meta, block, watched); return card;
  }));
});
