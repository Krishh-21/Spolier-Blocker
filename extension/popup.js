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
