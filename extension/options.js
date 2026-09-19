'use strict';
const $ = id => document.getElementById(id);
const C = SpoilerCore;
let state = null, pendingImport = null;
const lines = value => value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
function status(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
async function call(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Action failed. Reload the extension and try again.');
  return result;
}
function on(id, fn) { $(id).addEventListener('click', async () => { try { await fn(); } catch (e) { status(e.message, true); } }); }
function renderTitles() {
  $('titles').replaceChildren();
  for (const item of state.selectedMedia) {
    const row = document.createElement('div'); row.className = 'item';
    const label = document.createElement('span'); label.textContent = `${item.title} · ${item.phrases.length} aliases`;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.textContent = 'Remove';
    button.setAttribute('aria-label', `Stop protecting ${item.title}`);
    button.addEventListener('click', () => { state.selectedMedia = state.selectedMedia.filter(x => x !== item); renderTitles(); status('Unsaved changes.'); });
    row.append(label, button); $('titles').append(row);
  }
  if (!state.selectedMedia.length) $('titles').textContent = 'No custom titles yet. Choose a pack or add a title below.';
}
function render() {
  for (const key of ['enabled', 'blurImages', 'revealOnHover', 'showReveal', 'previewOnYouTube', 'protectYouTube']) $(key).checked = state.settings[key];
  for (const key of ['mode', 'presentation', 'blurRadiusPx', 'reblurAfterMs']) $(key).value = state.settings[key];
  for (const key of ['includeDomains', 'excludeDomains']) $(key).value = state.settings[key].join('\n');
  $('keywords').value = state.customKeywords.join('\n'); $('exceptions').value = state.falsePositives.join('\n');
  $('siteOverrides').textContent = `${Object.keys(state.settings.perSite).length} site overrides set from the popup.`;
  $('packs').replaceChildren();
  for (const pack of SpoilerPacks) {
    const label = document.createElement('label'); label.className = 'pack';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = pack.id; input.checked = state.enabledPacks.includes(pack.id);
    const name = document.createElement('span'); name.textContent = pack.title;
    label.append(input, name); $('packs').append(label);
  }
  $('titleSuggestions').replaceChildren(...SpoilerPacks.map(pack => { const option = document.createElement('option'); option.value = pack.title; return option; }));
  renderTitles(); $('save').disabled = false;
}
function collect() {
  for (const key of ['enabled', 'blurImages', 'revealOnHover', 'showReveal', 'previewOnYouTube', 'protectYouTube']) state.settings[key] = $(key).checked;
  for (const key of ['mode', 'presentation']) state.settings[key] = $(key).value;
  for (const key of ['blurRadiusPx', 'reblurAfterMs']) state.settings[key] = Number($(key).value);
  for (const key of ['includeDomains', 'excludeDomains']) {
    const values = lines($(key).value);
    if (values.some(value => !C.domain(value))) throw new Error('Enter domain names only, such as youtube.com.');
    state.settings[key] = values;
  }
  state.customKeywords = lines($('keywords').value); state.falsePositives = lines($('exceptions').value);
  if (state.customKeywords.length > C.LIMITS.keywords || state.customKeywords.some(k => k.length > C.LIMITS.term)) throw new Error('Use up to 2,000 keywords, each at most 160 characters.');
  if (state.falsePositives.length > 200 || state.falsePositives.some(k => k.length > 2000)) throw new Error('Use up to 200 exceptions, each at most 2,000 characters.');
  state.enabledPacks = [...$('packs').querySelectorAll('input:checked')].map(input => input.value);
  return C.sanitize(state);
}
async function save() {
  const next = collect();
  $('save').disabled = true;
  try { state = (await call({ type: 'save-config', config: next })).config; render(); status('Saved. Open pages are updating.'); }
  finally { $('save').disabled = false; }
}
$('settingsForm').addEventListener('submit', event => { event.preventDefault(); save().catch(e => status(e.message, true)); });
$('settingsForm').addEventListener('input', () => { if (state) status('Unsaved changes.'); });
on('addTitle', () => {
  if (!state) return;
  const title = $('newTitle').value.trim();
  if (!title) throw new Error('Enter a title first.');
  if (state.selectedMedia.length >= C.LIMITS.media) throw new Error('Maximum 200 custom titles.');
  if (state.selectedMedia.some(m => C.normalize(m.title) === C.normalize(title))) throw new Error('This title is already protected.');
  const phrases = lines($('newAliases').value);
  if (phrases.length > C.LIMITS.phrases || phrases.some(p => p.length > 160)) throw new Error('Use up to 120 aliases of at most 160 characters.');
  state.selectedMedia.push({ title, type: 'other', phrases });
  $('newTitle').value = ''; $('newAliases').value = ''; renderTitles(); status('Title added. Save protection to apply.');
});
on('clearSites', () => { state.settings.perSite = {}; $('siteOverrides').textContent = '0 site overrides. Save to apply.'; });
async function tokenStatus() { $('tokenStatus').textContent = (await call({ type: 'token-status' })).configured ? 'A credential is saved on this device.' : 'Lookup is disconnected.'; }
on('connect', async () => {
  // Permission requests must stay in the direct user-gesture callback.
  const granted = await chrome.permissions.request({ origins: ['https://api.themoviedb.org/*'] });
  if (!granted) throw new Error('TMDB permission was not granted. Offline protection still works.');
  if ($('token').value.trim()) await call({ type: 'save-token', token: $('token').value.trim() });
  $('token').value = ''; await tokenStatus(); status('Lookup permission enabled.');
});
on('disconnect', async () => { await call({ type: 'save-token', token: '' }); await chrome.permissions.remove({ origins: ['https://api.themoviedb.org/*'] }); $('token').value = ''; await tokenStatus(); status('Lookup disconnected.'); });
on('search', async () => {
  const query = $('query').value, requestRevision = ++searchRevision;
  $('search').disabled = true; $('results').replaceChildren(); status('Searching TMDB…');
  try {
    const result = await call({ type: 'search', query, mediaType: $('mediaType').value });
    if (requestRevision !== searchRevision) return;
    $('query').setAttribute('aria-expanded', String(result.results.length > 0));
    for (const item of result.results) {
      const row = document.createElement('div'); row.className = 'item'; row.setAttribute('role', 'option');
      const text = document.createElement('span'); text.textContent = `${item.title} ${item.year ? '(' + item.year + ')' : ''}`;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Protect';
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await save();
          state = (await call({ type: 'track-result', id: item.tmdbId, mediaType: item.type })).config;
          render(); status('Title and aliases saved.');
        } catch (e) { status(e.message, true); } finally { button.disabled = false; }
      });
      row.append(text, button); $('results').append(row);
    }
    status(result.results.length ? 'Choose a title to protect.' : 'No titles found. You can add one manually.');
  } finally { $('search').disabled = false; if (query !== $('query').value && $('query').value.trim().length >= 2) { clearTimeout(searchTimer); searchTimer = setTimeout(() => $('search').click(), 350); } }
});
on('export', async () => {
  const saved = (await call({ type: 'get-config' })).config;
  const url = URL.createObjectURL(new Blob([JSON.stringify({ ...C.sanitize(saved), exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'spoiler-shield-backup.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); status('Saved settings exported.');
});
$('importFile').addEventListener('change', async () => {
  try {
    const file = $('importFile').files[0]; if (!file) return;
    if (file.size > C.LIMITS.bytes) throw new Error('Backup is too large (maximum 1 MB).');
    pendingImport = C.parseBackup(await file.text());
    $('importSummary').textContent = `${pendingImport.selectedMedia.length} titles, ${pendingImport.customKeywords.length} keywords, ${pendingImport.enabledPacks.length} packs. Protection will be ${pendingImport.settings.enabled ? 'enabled' : 'paused'}.`;
    $('importPreview').showModal();
  } catch (e) { status(e.message, true); } finally { $('importFile').value = ''; }
});
on('cancelImport', () => { pendingImport = null; $('importPreview').close(); });
on('confirmImport', async () => {
  if (!pendingImport) return;
  state = (await call({ type: 'save-config', config: pendingImport })).config;
  pendingImport = null; $('importPreview').close(); render(); status('Backup imported.');
});
(async () => { state = (await call({ type: 'get-config' })).config; render(); await tokenStatus(); status('Ready.'); })().catch(e => status(e.message, true));

let lastSuggestedAliases = '';
$('newTitle').addEventListener('input', () => {
  const pack = SpoilerPacks.find(p => C.normalize(p.title) === C.normalize($('newTitle').value));
  if (pack) { lastSuggestedAliases = pack.phrases.join('\n'); $('newAliases').value = lastSuggestedAliases; }
  else if ($('newAliases').value === lastSuggestedAliases) { $('newAliases').value = ''; lastSuggestedAliases = ''; }
});
let searchTimer, searchRevision = 0;
$('query').addEventListener('input', () => {
  searchRevision++;
  clearTimeout(searchTimer);
  if ($('query').value.trim().length < 2) { $('results').replaceChildren(); $('query').setAttribute('aria-expanded', 'false'); return; }
  searchTimer = setTimeout(() => { if (!$('search').disabled) $('search').click(); }, 350);
});
$('query').addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); $('results').querySelector('button')?.focus(); }
  if (event.key === 'Escape') { searchRevision++; clearTimeout(searchTimer); $('results').replaceChildren(); $('query').setAttribute('aria-expanded', 'false'); }
  if (event.key === 'Enter') { event.preventDefault(); clearTimeout(searchTimer); $('search').click(); }
});

let accountState;
async function renderAccount(refresh = false) {
  accountState = (await call({ type: 'account-status', refresh })).account;
  $('accountStatus').textContent = `${accountState.tier.toUpperCase()} · ${accountState.limit === null ? 'No tier quota for' : accountState.limit} custom keyword entries${accountState.user ? ' · ' + accountState.user.email : ' · Not signed in'}`;
  $('accountService').textContent = accountState.origin || 'Account service is not configured in this build. The maintainer must configure ACCOUNT_ORIGIN for deployment.';
  for (const id of ['accountLogin', 'accountRegister', 'accountRefresh']) $(id).disabled = !accountState.origin;
  for (const id of ['accountLogout', 'accountUpload', 'accountDownload']) $(id).disabled = !accountState.user;
}
async function accountPermission() {
  if (!accountState?.origin) throw Error('Account service is not configured.');
  if (!await chrome.permissions.request({ origins: [accountState.origin + '/*'] })) throw Error('Account permission was not granted.');
}
for (const [id, mode] of [['accountLogin', 'login'], ['accountRegister', 'register']]) on(id, async () => {
  await accountPermission();
  $(id).disabled = true;
  try { await call({ type: 'account-login', mode, email: $('accountEmail').value, password: $('accountPassword').value }); $('accountPassword').value = ''; await renderAccount(); status('Signed in. Choose Upload or Download to sync.'); }
  finally { $(id).disabled = false; }
});
on('accountRefresh', async () => { await accountPermission(); await renderAccount(true); status('Plan refreshed.'); });
on('accountLogout', async () => { const result = await call({ type: 'account-logout' }); await renderAccount(); status(result.notice || 'Signed out. Local settings preserved.'); });
on('accountUpload', async () => { await call({ type: 'account-upload' }); await renderAccount(); status('Saved settings uploaded.'); });
on('accountDownload', () => $('cloudPreview').showModal());
on('cancelCloud', () => $('cloudPreview').close());
on('confirmCloud', async () => { state = (await call({ type: 'account-download' })).config; $('cloudPreview').close(); render(); await renderAccount(); status('Cloud settings downloaded.'); });
renderAccount().then(async () => { if (accountState.origin && await chrome.permissions.contains({ origins: [accountState.origin + '/*'] })) await renderAccount(true); }).catch(error => { $('accountStatus').textContent = error.message; });

$('mediaType').addEventListener('change', () => $('query').dispatchEvent(new Event('input')));
$('results').addEventListener('keydown', event => {
  const buttons = [...$('results').querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
  if (event.key === 'Escape') { searchRevision++; clearTimeout(searchTimer); $('results').replaceChildren(); $('query').setAttribute('aria-expanded', 'false'); $('query').focus(); }
});
