/* Shared UI-only theme preference. Never loaded into host webpages. */
(() => {
  'use strict';
  const key = 'spoiler-shield-theme';
  const media = matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['light', 'dark', 'system'].includes(value) ? value : 'system';
  const extension = location.protocol === 'chrome-extension:';
  let choice = 'system';
  try { choice = valid(localStorage.getItem(key)); } catch {}
  function apply(value) {
    choice = valid(value);
    document.documentElement.dataset.theme = choice === 'system' ? (media.matches ? 'dark' : 'light') : choice;
    document.documentElement.dataset.themeChoice = choice;
    for (const select of document.querySelectorAll('[data-theme-select]')) select.value = choice;
    try { localStorage.setItem(key, choice); } catch {}
  }
  apply(choice);
  media.addEventListener('change', () => apply(choice));
  addEventListener('storage', event => { if (event.key === key) apply(event.newValue); });
  if (extension) {
    chrome.storage.local.get('uiTheme').then(data => apply(data.uiTheme)).catch(() => {});
    chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.uiTheme) apply(changes.uiTheme.newValue); });
  }
  document.addEventListener('DOMContentLoaded', () => {
    apply(choice);
    for (const select of document.querySelectorAll('[data-theme-select]')) select.addEventListener('change', () => {
      apply(select.value);
      if (extension) chrome.storage.local.set({ uiTheme: choice }).catch(() => {});
    });
  });
})();
