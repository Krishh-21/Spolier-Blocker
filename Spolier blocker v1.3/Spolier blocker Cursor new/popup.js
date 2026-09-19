let TMDB_API_KEY = '';
let TMDB_PROXY_URL = '';
// Default shared proxy (deployed) - used when user hasn't configured a proxy
const DEFAULT_TMDB_PROXY = 'https://ss-nu-gules.vercel.app';
// WARNING: Do not hardcode API keys in extensions for production.
// Preferred: configure a server-side TMDB proxy in Options. If not set,
// users can provide their own TMDB API key in Options (less preferred).

// LANDING PAGE URL - Update this with your actual landing page URL
const LANDING_PAGE_URL = chrome.runtime.getURL('spoiler-shield-landing.html') || 'https://yourdomain.com/spoiler-shield-landing.html';

// CRITICAL: Proxy health tracking
let proxyHealthStatus = { healthy: true, lastCheck: 0, failCount: 0 };
const PROXY_HEALTH_CHECK_INTERVAL = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

async function ensureApiKey() {
  const store = await getStore();
  TMDB_API_KEY = (store.tmdbKey || '').trim();
  // Prefer user's configured proxy, fall back to the shared default proxy
  TMDB_PROXY_URL = (store.tmdbProxy || DEFAULT_TMDB_PROXY).trim();
  
  // CRITICAL: Check proxy health periodically
  await checkProxyHealth();
  
  if (!TMDB_API_KEY) {
    if (!TMDB_PROXY_URL) {
      setStatus('Add your TMDB API key in Options or configure a TMDB proxy to search titles.', true);
    } else if (TMDB_PROXY_URL === DEFAULT_TMDB_PROXY) {
      if (proxyHealthStatus.healthy) {
        setStatus('Using shared TMDB proxy', false);
      } else {
        setStatus('⚠️ Proxy unavailable - Add API key in Options for search', true);
      }
    } else {
      setStatus('Using configured TMDB proxy', false);
    }
  } else {
    setStatus('');
  }
}

// CRITICAL: Health check endpoint for proxy
async function checkProxyHealth() {
  const now = Date.now();
  // Only check every 5 minutes
  if (now - proxyHealthStatus.lastCheck < PROXY_HEALTH_CHECK_INTERVAL) {
    return proxyHealthStatus.healthy;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${TMDB_PROXY_URL}/health`, {
      signal: controller.signal,
      method: 'GET'
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      proxyHealthStatus = { healthy: true, lastCheck: now, failCount: 0 };
      return true;
    } else {
      proxyHealthStatus.failCount++;
      proxyHealthStatus.healthy = proxyHealthStatus.failCount < 3;
      proxyHealthStatus.lastCheck = now;
      return false;
    }
  } catch (error) {
    proxyHealthStatus.failCount++;
    proxyHealthStatus.healthy = proxyHealthStatus.failCount < 3;
    proxyHealthStatus.lastCheck = now;
    return false;
  }
}

document.getElementById('searchButton').addEventListener('click', async () => {
  await ensureApiKey();
  const query = document.getElementById('searchInput').value;
  const mediaType = document.getElementById('mediaType').value;
  searchMedia(query, mediaType);
});

// Search on Enter
document.getElementById('searchInput').addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  await ensureApiKey();
  const query = document.getElementById('searchInput').value;
  const mediaType = document.getElementById('mediaType').value;
  searchMedia(query, mediaType);
});

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('reprocessBtn').addEventListener('click', () => {
  triggerReprocess();
});

document.getElementById('revealAllBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0] || !tabs[0].id) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'spoiler-reveal-all' }, () => {
      if (chrome.runtime.lastError) {
        setStatus('Open a normal webpage tab to use Reveal all.', true);
      }
    });
  });
});

document.getElementById('hideAllBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0] || !tabs[0].id) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'spoiler-hide-all' }, () => {
      if (chrome.runtime.lastError) {
        setStatus('Open a normal webpage tab to use Hide all.', true);
      }
    });
  });
});

document.getElementById('addQuickKeyword').addEventListener('click', async () => {
  const input = document.getElementById('quickKeyword');
  const keyword = (input.value || '').trim();
  if (!keyword) return;
  const store = await getStore();
  const set = new Set([...(store.customKeywords || []), keyword]);
  chrome.storage.sync.set({ customKeywords: Array.from(set) }, () => {
    input.value = '';
    triggerReprocess();
  });
});

document.getElementById('toggleEnabled').addEventListener('change', async (e) => {
  const store = await getStore();
  const settings = store.settings || { enabled: true };
  settings.enabled = !!e.target.checked;
  chrome.storage.sync.set({ settings }, triggerReprocess);
});

async function initToggle() {
  const store = await getStore();
  const enabled = !store.settings || store.settings.enabled !== false;
  document.getElementById('toggleEnabled').checked = enabled;
  // Per-site toggle
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = (tabs[0] && tabs[0].url) || '';
    let host = '';
    try { host = new URL(url).host; } catch {}
    document.getElementById('siteHost').textContent = host || '–';
    const s = store.settings || { perSite: {} };
    const per = (s.perSite && Object.prototype.hasOwnProperty.call(s.perSite, host)) ? !!s.perSite[host] : true;
    document.getElementById('siteToggle').checked = per;
    document.getElementById('siteToggle').onchange = () => {
      const next = store.settings || { enabled: true, perSite: {} };
      next.perSite = next.perSite || {};
      next.perSite[host] = !!document.getElementById('siteToggle').checked;
      chrome.storage.sync.set({ settings: next }, triggerReprocess);
    };
  });
}

async function searchMedia(query, mediaType) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  
  // Handle games separately (TMDB doesn't support games)
  if (mediaType === 'game') {
    if (!query || !query.trim()) {
      setStatus('Enter a game title to add manually.', true);
      return;
    }
    // Allow manual addition for games
    const gameItem = {
      title: query.trim(),
      name: query.trim(),
      id: Date.now(),
      release_date: '',
      first_air_date: ''
    };
    displayResults([gameItem], mediaType);
    setStatus('Add this game manually');
    return;
  }
  
  // Ensure API key or proxy is available
  await ensureApiKey();
  if (!TMDB_API_KEY && !TMDB_PROXY_URL) return;
  
  if (!query || !query.trim()) {
    setStatus('Enter a title to search.', true);
    return;
  }
  
  setStatus('Searching…');
  
  // CRITICAL: Try proxy with retries, fall back to direct API if fails
  let data = null;
  
  if (TMDB_PROXY_URL && proxyHealthStatus.healthy) {
    data = await searchWithProxy(query, mediaType);
  }
  
  // FALLBACK: If proxy failed and we have an API key, try direct
  if (!data && TMDB_API_KEY) {
    setStatus('Proxy unavailable, trying direct API…', false);
    data = await searchDirectAPI(query, mediaType);
  }
  
  // If everything failed
  if (!data) {
    if (!TMDB_API_KEY) {
      setStatus('❌ Search temporarily unavailable. Add keywords manually or configure API key in Options.', true);
    } else {
      setStatus('❌ Search failed. Try again or add keywords manually.', true);
    }
    return;
  }
  
  if (!data.results || !Array.isArray(data.results)) {
    setStatus('No results.', true);
    return;
  }
  
  displayResults(data.results, mediaType);
}

// CRITICAL: Search with exponential backoff retry
async function searchWithProxy(query, mediaType, attemptNumber = 0) {
  if (attemptNumber >= MAX_RETRY_ATTEMPTS) {
    return null;
  }
  
  // Request runtime host permission
  let originHost = '';
  try {
    const url = new URL(TMDB_PROXY_URL);
    if (url.protocol !== 'https:') {
      return null;
    }
    originHost = url.origin + '/*';
  } catch {
    return null;
  }
  
  if (originHost) {
    const hasPerm = await new Promise(resolve => chrome.permissions.contains({ origins: [originHost] }, resolve));
    if (!hasPerm) {
      const granted = await new Promise(res => chrome.permissions.request({ origins: [originHost] }, granted => res(!!granted)));
      if (!granted) {
        return null;
      }
    }
  }
  
  const url = `${TMDB_PROXY_URL.replace(/\/$/, '')}/3/search/${mediaType}?query=${encodeURIComponent(query)}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { 
      credentials: 'omit',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // MEDIUM #15: Handle rate limiting with countdown
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
        const resetTime = Date.now() + (waitSeconds * 1000);
        
        // Store rate limit info
        chrome.storage.local.set({ 
          rateLimitUntil: resetTime,
          rateLimitReason: 'Too many searches'
        });
        
        setStatus(`⏱️ Rate limited. Try again in ${Math.ceil(waitSeconds / 60)} minute${waitSeconds > 60 ? 's' : ''}`, true);
        
        // Start countdown
        startRateLimitCountdown(resetTime);
        return null;
      }
      
      // Retry on 5xx errors
      if (response.status >= 500) {
        const delay = RETRY_DELAYS[attemptNumber] || 4000;
        setStatus(`Retrying in ${delay/1000}s... (attempt ${attemptNumber + 1}/${MAX_RETRY_ATTEMPTS})`, false);
        await new Promise(resolve => setTimeout(resolve, delay));
        return searchWithProxy(query, mediaType, attemptNumber + 1);
      }
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Proxy search failed:', error);
    // Retry on network errors
    if (attemptNumber < MAX_RETRY_ATTEMPTS - 1) {
      const delay = RETRY_DELAYS[attemptNumber] || 4000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return searchWithProxy(query, mediaType, attemptNumber + 1);
    }
    return null;
  }
}

// MEDIUM #15: Rate limit countdown timer
function startRateLimitCountdown(resetTime) {
  const searchBtn = document.getElementById('searchButton');
  const searchInput = document.getElementById('searchInput');
  
  // Disable search
  searchBtn.disabled = true;
  searchInput.disabled = true;
  searchBtn.style.opacity = '0.5';
  searchBtn.style.cursor = 'not-allowed';
  
  const updateCountdown = () => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((resetTime - now) / 1000));
    
    if (remaining <= 0) {
      // Re-enable search
      searchBtn.disabled = false;
      searchInput.disabled = false;
      searchBtn.style.opacity = '1';
      searchBtn.style.cursor = 'pointer';
      setStatus('Rate limit cleared. You can search again!', false);
      chrome.storage.local.remove(['rateLimitUntil', 'rateLimitReason']);
      return;
    }
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    searchBtn.textContent = `Wait ${minutes}:${seconds.toString().padStart(2, '0')}`;
    setTimeout(updateCountdown, 1000);
  };
  
  updateCountdown();
}

// Check for existing rate limit on load
async function checkRateLimit() {
  const store = await new Promise(resolve => 
    chrome.storage.local.get(['rateLimitUntil'], resolve)
  );
  
  if (store.rateLimitUntil && store.rateLimitUntil > Date.now()) {
    startRateLimitCountdown(store.rateLimitUntil);
  }
}

// CRITICAL: Fallback to direct TMDB API
async function searchDirectAPI(query, mediaType) {
  if (!TMDB_API_KEY) return null;
  
  const originHost = 'https://api.themoviedb.org/*';
  const hasPerm = await new Promise(resolve => chrome.permissions.contains({ origins: [originHost] }, resolve));
  if (!hasPerm) {
    const granted = await new Promise(res => chrome.permissions.request({ origins: [originHost] }, granted => res(!!granted)));
    if (!granted) {
      return null;
    }
  }
  
  const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${encodeURIComponent(TMDB_API_KEY)}&query=${encodeURIComponent(query)}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { 
      credentials: 'omit',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Direct API search failed:', error);
    return null;
  }
}

async function displayResults(results, mediaType) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  if (!results.length) {
    setStatus('No matches found.', true);
    return;
  }
  setStatus(`${results.length} result${results.length>1?'s':''}`);
  
  // Get watched items once for all results
  const store = await new Promise(resolve => chrome.storage.sync.get(['watchedItems'], resolve));
  const watchedItems = store.watchedItems || [];
  
  results.slice(0, 12).forEach(item => {
    const title = escapeHtml(item.title || item.name || 'Untitled');
    const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';
    const poster = item.poster_path ? `https://image.tmdb.org/t/p/w154${item.poster_path}` : '';
    const div = document.createElement('div');
    div.className = 'result';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    
    // Check if already watched
    const normalizedType = mediaType === 'movie' ? 'movie' : mediaType === 'tv' ? 'tv' : 'game';
    const isWatched = watchedItems.some(w => 
      w.title === (item.title || item.name) && w.type === normalizedType
    );
    
    const watchedText = isWatched ? '✔ Watched it' : '+ Block spoilers';
    const watchedStyle = isWatched ? 'background: #4ade80; color: white;' : '';
    
    div.innerHTML = `
      ${poster ? `<img src="${escapeHtml(poster)}" alt="${title}" style="width:100%; border-radius:8px; margin-bottom:6px">` : ''}
      <div class="title">${title}</div>
      <div class="meta">${mediaType.toUpperCase()}${year? ' • '+year:''}</div>
      <button class="btn" style="width:100%; margin-top:8px; padding:6px; font-size:11px; ${watchedStyle}" data-action="block">${watchedText}</button>
      <button class="btn ghost" style="width:100%; margin-top:4px; padding:6px; font-size:11px;" data-action="watched">${isWatched ? '✓ Watched' : 'Mark as Watched'}</button>
    `;
    
    // Add click handlers
    div.querySelector('[data-action="block"]').addEventListener('click', (e) => {
      e.stopPropagation();
      addTitle(item);
    });
    
    div.querySelector('[data-action="watched"]').addEventListener('click', async (e) => {
      e.stopPropagation();
      await markAsWatched(item.title || item.name, mediaType, year, item.director || '');
      // Refresh the results display
      displayResults(results, mediaType);
    });
    
    resultsDiv.appendChild(div);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function markAsWatched(title, type, year, director) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['watchedItems', 'userAccount'], (store) => {
    const watchedItems = store.watchedItems || [];
    const userAccount = store.userAccount;
    
    // Normalize type
    let normalizedType = 'movie';
    if (type === 'tv' || type === 'tvshow') normalizedType = 'tv';
    else if (type === 'game' || type === 'games') normalizedType = 'game';
    else normalizedType = 'movie';
    
    const newItem = {
      id: Date.now().toString(),
      title,
      type: normalizedType,
      year,
      director,
      userEmail: userAccount ? userAccount.email : null,
      timestamp: Date.now()
    };
    
    // Check if already exists
    const exists = watchedItems.some(item => 
      item.title === title && 
      item.type === normalizedType &&
      (userAccount ? item.userEmail === userAccount.email : !item.userEmail)
    );
    
      if (!exists) {
        watchedItems.push(newItem);
        chrome.storage.sync.set({ watchedItems }, () => {
          setStatus(`Marked "${title}" as watched`, false);
          resolve();
        });
      } else {
        // Remove if already watched (toggle)
        const filtered = watchedItems.filter(item => 
          !(item.title === title && 
            item.type === normalizedType &&
            (userAccount ? item.userEmail === userAccount.email : !item.userEmail))
        );
        chrome.storage.sync.set({ watchedItems: filtered }, () => {
          setStatus(`Removed "${title}" from watched list`, false);
          resolve();
        });
      }
    });
  });
}

async function addTitle(item) {
  const title = item.title || item.name;
  const base = [title];
  const expanded = await expandPhrases(item);
  const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';
  const filenameTokens = generateFilenameTokens(title, year);
  const phrases = Array.from(new Set([...base, ...expanded, ...filenameTokens].map(s => String(s).toLowerCase())));
  const selected = await new Promise(resolve => chrome.storage.sync.get('selectedMedia', res => resolve(res.selectedMedia || [])));
  // Avoid duplicates by title (case-insensitive)
  const lower = String(title || '').toLowerCase();
  const next = (selected || []).filter(s => String(s.title || '').toLowerCase() !== lower);
  next.push({ title, phrases });
  chrome.storage.sync.set({ selectedMedia: next }, () => {
    updateSelectedList();
    triggerReprocess();
    // Clear search inputs/results for UX polish
    try {
      document.getElementById('searchInput').value = '';
      document.getElementById('results').innerHTML = '';
    } catch {}
  });
}

function updateSelectedList() {
  chrome.storage.sync.get('selectedMedia', res => {
    const list = document.getElementById('selectedList');
    list.innerHTML = '';
    const assign = document.getElementById('assignTitle');
    assign.innerHTML = '';
    (res.selectedMedia || []).forEach(item => {
      const li = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = item.title;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove';
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = async () => {
        const selected = await new Promise(resolve => chrome.storage.sync.get('selectedMedia', r => resolve(r.selectedMedia || [])));
        const next = selected.filter(s => s.title !== item.title);
        chrome.storage.sync.set({ selectedMedia: next }, () => {
          updateSelectedList();
          triggerReprocess();
        });
      };
      li.appendChild(text);
      li.appendChild(removeBtn);
      list.appendChild(li);
      const opt = document.createElement('option');
      opt.value = item.title;
      opt.textContent = item.title;
      assign.appendChild(opt);
    });
  });
}

updateSelectedList();
initToggle();
ensureApiKey();

// HIGH PRIORITY #5: Initialize reblur timer dropdown
async function initReblurTimer() {
  const store = await getStore();
  const reblurMs = (store.settings && typeof store.settings.reblurAfterMs === 'number') ? store.settings.reblurAfterMs : 0;
  document.getElementById('reblurTimer').value = String(reblurMs);
  
  // Listen for changes
  document.getElementById('reblurTimer').addEventListener('change', async (e) => {
    const store = await getStore();
    const settings = store.settings || { enabled: true };
    settings.reblurAfterMs = parseInt(e.target.value) || 0;
    chrome.storage.sync.set({ settings }, () => {
      setStatus(`Auto-reblur set to ${settings.reblurAfterMs > 0 ? (settings.reblurAfterMs / 1000) + 's' : 'never'}`, false);
      triggerReprocess();
    });
  });
}

initReblurTimer();

// MEDIUM #15: Check for existing rate limit on popup load
checkRateLimit();

// Add missed spoiler: inject selection mode into page
document.getElementById('addMissedBtn').addEventListener('click', () => {
  const title = (document.getElementById('assignTitle').value || '').trim();
  if (!title) { setStatus('Select a title first.', true); return; }
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0] || !tabs[0].id) return;
    chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, func: startMissedSpoilerMode, args: [title] });
  });
});

// Mark a wrong spoiler (false positive) with a click-to-pick flow
document.getElementById('markWrongBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0] || !tabs[0].id) return;
    chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, func: startFalsePositivePickMode });
  });
});

function startMissedSpoilerMode(title) {
  try {
    if (window.__spoilerPickMode) return;
    window.__spoilerPickMode = true;
    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;bottom:12px;right:12px;background:#121935;color:#e7ecff;padding:8px 10px;border-radius:8px;z-index:2147483647;font:500 12px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    tip.textContent = 'Click the spoiler element to add it (ESC to cancel)';
    document.body.appendChild(tip);
    const hl = document.createElement('div');
    hl.style.cssText = 'position:fixed;border:2px solid #7c8cff;background:rgba(124,140,255,.15);pointer-events:none;z-index:2147483646;display:none;border-radius:4px';
    document.body.appendChild(hl);
    
    const cleanup = () => {
      try {
        window.__spoilerPickMode = false;
        tip.remove();
        hl.remove();
        document.removeEventListener('mousemove', move, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
      } catch {}
    };
    
    const move = ev => {
      const el = ev.target.closest('*');
      if (!el || !(el instanceof Element) || el === tip || el === hl) {
        hl.style.display = 'none';
        return;
      }
      try {
        const r = el.getBoundingClientRect();
        hl.style.left = r.left + 'px';
        hl.style.top = r.top + 'px';
        hl.style.width = r.width + 'px';
        hl.style.height = r.height + 'px';
        hl.style.display = 'block';
      } catch {}
    };
    
    const onKeyDown = ev => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        tip.textContent = 'Cancelled';
        setTimeout(cleanup, 500);
      }
    };
    
    document.addEventListener('mousemove', move, true);
    document.addEventListener('keydown', onKeyDown, true);
    
    const onClick = ev => {
      ev.preventDefault(); 
      ev.stopPropagation();
      const el = ev.target.closest('*');
      if (!el || el === tip || el === hl) return;
      
      const text = (el && el.textContent || '').trim();
      const meta = [];
      if (el && el.tagName === 'IMG') {
        meta.push(el.alt||'', el.title||'', el.getAttribute('aria-label')||'');
      }
      
      // capture background-image url if present
      let bgUrl = '';
      try {
        const cs = getComputedStyle(el);
        const bg = cs.backgroundImage || '';
        const m = bg.match(/url\(("|')?(.*?)\1\)/i);
        if (m && m[2]) bgUrl = m[2];
      } catch {}
      
      const url = (el && (el.currentSrc || el.src)) || bgUrl || '';
      const allText = (text + ' ' + meta.join(' ') + ' ' + url).trim();
      
      if (!allText) {
        tip.textContent = 'No text found. Try another element.';
        setTimeout(() => tip.textContent = 'Click the spoiler element to add it (ESC to cancel)', 2000);
        return;
      }
      
      chrome.storage.sync.get({ selectedMedia: [], customKeywords: [], rlWeights: {} }, store => {
        const sel = store.selectedMedia || [];
        const entry = sel.find(s => s.title === title) || { title, phrases: [] };
        
        // Extract tokens from the clicked element
        const tokens = allText.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 4 && t.length <= 24).slice(0, 12);
        
        // Add to phrases
        const set = new Set([...(entry.phrases||[]), ...tokens]);
        entry.phrases = Array.from(set);
        const next = sel.filter(s => s.title !== title).concat(entry);
        
        // Reinforcement Learning: Give positive reward to these tokens
        const rlWeights = store.rlWeights || {};
        const LEARNING_RATE = 0.1;
        const POSITIVE_REWARD = 1.0;
        
        tokens.forEach(token => {
          if (!rlWeights[token]) rlWeights[token] = 0.5; // Initialize to neutral
          // Q-learning update: Q(s,a) = Q(s,a) + α * (reward - Q(s,a))
          rlWeights[token] = rlWeights[token] + LEARNING_RATE * (POSITIVE_REWARD - rlWeights[token]);
          // Clamp between 0 and 1
          rlWeights[token] = Math.max(0, Math.min(1, rlWeights[token]));
        });
        
        // Also add to custom keywords if reinforceLearning is enabled
        const customKeywords = store.customKeywords || [];
        const keywordSet = new Set([...customKeywords, ...tokens]);
        
        chrome.storage.sync.set({ 
          selectedMedia: next, 
          rlWeights: rlWeights,
          customKeywords: Array.from(keywordSet)
        }, () => {
          tip.textContent = `Added ${tokens.length} tokens. Refreshing…`;
            setTimeout(() => {
              cleanup();
              // Reprocess (no page reload)
              try { chrome.runtime.sendMessage({ type: 'spoiler-reprocess' }); } catch {}
            }, 800);
        });
      });
    };
    
    setTimeout(() => document.addEventListener('click', onClick, true), 100);
  } catch (e) {
    console.error('startMissedSpoilerMode error:', e);
  }
}

function startFalsePositivePickMode() {
  try {
    if (window.__spoilerFPMode) return;
    window.__spoilerFPMode = true;
    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;bottom:12px;right:12px;background:#121935;color:#e7ecff;padding:8px 10px;border-radius:8px;z-index:2147483647;font:500 12px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    tip.textContent = 'Click the blurred element that is NOT a spoiler (ESC to cancel)';
    document.body.appendChild(tip);
    
    const hl = document.createElement('div');
    hl.style.cssText = 'position:fixed;border:2px solid #ff8a8a;background:rgba(255,138,138,.15);pointer-events:none;z-index:2147483646;display:none;border-radius:4px';
    document.body.appendChild(hl);
    
    const cleanup = () => {
      window.__spoilerFPMode = false;
      try { 
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('keydown', onKeyDown, true);
      } catch {}
      try { 
        tip.remove();
        hl.remove();
      } catch {}
    };
    
    const onKeyDown = ev => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        tip.textContent = 'Cancelled';
        setTimeout(cleanup, 500);
      }
    };
    
    const onMouseMove = ev => {
      // Find blurred element under cursor
      const el = ev.target;
      let blurredEl = null;
      
      if (el && el.getAttribute && el.getAttribute('data-spoiler-shield') === '1') {
        blurredEl = el;
      } else if (el && el.classList && el.classList.contains('spoiler-shield-blur')) {
        blurredEl = el;
      } else {
        blurredEl = el.closest && el.closest('[data-spoiler-shield="1"]');
      }
      
      // Also check parents manually
      if (!blurredEl) {
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          if (parent.getAttribute && parent.getAttribute('data-spoiler-shield') === '1') {
            blurredEl = parent;
            break;
          }
          if (parent.classList && parent.classList.contains('spoiler-shield-blur')) {
            blurredEl = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }
      
      if (blurredEl && blurredEl !== tip && !tip.contains(blurredEl)) {
        try {
          const r = blurredEl.getBoundingClientRect();
          hl.style.left = r.left + 'px';
          hl.style.top = r.top + 'px';
          hl.style.width = r.width + 'px';
          hl.style.height = r.height + 'px';
          hl.style.display = 'block';
        } catch {}
      } else {
        hl.style.display = 'none';
      }
    };
    
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    
    const onClick = ev => {
      // Don't process clicks on the tip itself
      if (ev.target === tip || tip.contains(ev.target)) {
        return;
      }
      
      ev.preventDefault(); 
      ev.stopPropagation();
      
      // Try to find the blurred element - check target and all parents
      let el = ev.target;
      let blurredEl = null;
      
      // Check if target itself is blurred
      if (el && el.getAttribute && el.getAttribute('data-spoiler-shield') === '1') {
        blurredEl = el;
      } else {
        // Check parents using closest
        blurredEl = el.closest && el.closest('[data-spoiler-shield="1"]');
      }
      
      // Also check if target has class spoiler-shield-blur
      if (!blurredEl && el && el.classList && el.classList.contains('spoiler-shield-blur')) {
        blurredEl = el;
      }
      
      // Find parent with the class
      if (!blurredEl) {
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          if (parent.getAttribute && parent.getAttribute('data-spoiler-shield') === '1') {
            blurredEl = parent;
            break;
          }
          if (parent.classList && parent.classList.contains('spoiler-shield-blur')) {
            blurredEl = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }
      
      if (!blurredEl) {
        tip.textContent = 'Click a blurred/spoiler element (ESC to cancel)';
        setTimeout(() => tip.textContent = 'Click the blurred element that is NOT a spoiler (ESC to cancel)', 2000);
        return;
      }
      
      // Get the token from data-spoiler-why attribute
      let token = (blurredEl.getAttribute('data-spoiler-why') || '').trim().toLowerCase();
      
      // If no token, try to extract from text content
      if (!token) {
        const text = (blurredEl.textContent || '').trim();
        if (text) {
          // Extract potential tokens from the text
          const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 4 && t.length <= 24);
          if (tokens.length > 0) {
            token = tokens[0]; // Use first significant token
          }
        }
      }
      
      if (!token) {
        tip.textContent = 'No spoiler token found. Try clicking the blurred text directly.';
        setTimeout(() => tip.textContent = 'Click the blurred element that is NOT a spoiler (ESC to cancel)', 3000);
        return;
      }
      
      chrome.storage.sync.get({ falsePositives: [], rlWeights: {} }, store => {
        // Add to false positives list
        const set = new Set([...(store.falsePositives || [])]);
        set.add(token);
        
        // Reinforcement Learning: Give negative reward to this token
        const rlWeights = store.rlWeights || {};
        const LEARNING_RATE = 0.15; // Slightly higher for negative feedback
        const NEGATIVE_REWARD = 0.0; // Negative feedback reduces weight
        
        if (!rlWeights[token]) rlWeights[token] = 0.5;
        // Q-learning update with negative reward
        rlWeights[token] = rlWeights[token] + LEARNING_RATE * (NEGATIVE_REWARD - rlWeights[token]);
        // Clamp between 0 and 1
        rlWeights[token] = Math.max(0, Math.min(1, rlWeights[token]));
        
        chrome.storage.sync.set({ 
          falsePositives: Array.from(set),
          rlWeights: rlWeights
        }, () => {
          tip.textContent = `Marked "${token}" as false positive. Refreshing…`;
          setTimeout(() => {
            cleanup();
            try { chrome.runtime.sendMessage({ type: 'spoiler-reprocess' }); } catch {}
          }, 800);
        });
      });
    };
    
    setTimeout(() => document.addEventListener('click', onClick, true), 100);
  } catch (e) {
    console.error('startFalsePositivePickMode error:', e);
  }
}

function triggerReprocess() {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'spoiler-reprocess' }, () => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] });
        }
      });
    }
  });
}

function getStore() {
  return new Promise(resolve => chrome.storage.sync.get({ settings: { enabled: true }, customKeywords: [], tmdbKey: '', tmdbProxy: '' }, resolve));
}

function setStatus(text, isError) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = text || '';
  el.style.color = isError ? '#ff8a8a' : '#98a2c8';
}

async function expandPhrases(item) {
  try {
    await ensureApiKey();
    // Determine media type from item properties (TV shows have name, movies have title)
    const mediaType = item.media_type || (item.name && !item.title ? 'tv' : 'movie');
    const id = item.id;
    
    // SECURITY: Validate mediaType to prevent path traversal
    if (!['movie', 'tv'].includes(mediaType)) {
      console.warn('Invalid media type:', mediaType);
      return [];
    }
    
    // SECURITY: Validate ID is numeric
    if (!id || isNaN(parseInt(id))) {
      console.warn('Invalid media ID:', id);
      return [];
    }
    
    let url = '';
    if (TMDB_PROXY_URL) {
      url = `${TMDB_PROXY_URL.replace(/\/$/, '')}/3/${mediaType}/${id}?append_to_response=alternative_titles,keywords,credits`;
    } else {
      url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${encodeURIComponent(TMDB_API_KEY)}&append_to_response=alternative_titles,keywords,credits`;
    }
    
    // SECURITY: Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, { 
      credentials: 'omit',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.warn('expandPhrases fetch failed:', res.status);
      return [];
    }
    
    const data = await res.json();
    const phrases = [];
    const store = await getStore();
    const level = (store.settings && typeof store.settings.aggressiveness === 'number') ? store.settings.aggressiveness : 2;
    // titles
    if (level >= 0) {
      const alts = (data.alternative_titles && (data.alternative_titles.titles || data.alternative_titles.results)) || [];
      alts.slice(0, level === 0 ? 2 : level === 1 ? 5 : 20).forEach(t => {
        const name = t.title || t.name;
        if (name) phrases.push(name);
      });
    }
    // keywords
    if (level >= 1) {
      const kw = (data.keywords && (data.keywords.keywords || data.keywords.results)) || [];
      kw.slice(0, level === 1 ? 6 : 20).forEach(k => k.name && phrases.push(k.name));
    }
    // cast/characters
    if (level >= 2) {
      const cast = (data.credits && data.credits.cast) || [];
      cast.slice(0, level === 2 ? 6 : 14).forEach(c => {
        if (c.name) phrases.push(c.name);
        if (c.character) phrases.push(c.character);
      });
    }
    return phrases;
  } catch (e) {
    console.warn('expandPhrases failed', e);
    return [];
  }
}

function generateFilenameTokens(title, year) {
  try {
    const t = String(title || '').trim();
    if (!t) return [];
    const simple = t.toLowerCase();
    const base = [
      simple,
      simple.replace(/\s+/g, ''),
      simple.replace(/\s+/g, '-'),
      simple.replace(/\s+/g, '_'),
      simple.replace(/[^a-z0-9]+/gi, '')
    ];
    const withYear = year ? base.map(b => [b+year, b+'-'+year, b+'_'+year]).flat() : [];
    const noArticles = simple.replace(/^(the|a|an)\s+/i, '');
    const extra = [
      noArticles,
      noArticles.replace(/\s+/g, ''),
      noArticles.replace(/\s+/g, '-'),
      noArticles.replace(/\s+/g, '_')
    ];
    return Array.from(new Set([...base, ...withYear, ...extra]));
  } catch { return []; }
}


// ===============================
// LOGO CLICK - Open Landing Page
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  const logoLink = document.getElementById('logoLink');
  if (logoLink) {
    logoLink.addEventListener('click', () => {
      // Open landing page in new tab
      chrome.tabs.create({ 
        url: LANDING_PAGE_URL 
      });
    });
  }
});

console.log('[Popup] Landing page link initialized');
