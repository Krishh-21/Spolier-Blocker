// ===============================
// ⭐ BACKGROUND SERVICE WORKER ⭐
// Handles:
// - Right-click context menu actions
// - Adding new spoiler keywords
// - Reporting false-positives
// - Keyboard shortcuts
// - Badge (OFF/ON) updates
// - Reprocessing pages
// ===============================
// Optional: Privacy-first telemetry module
let telemetry = null;
// Service workers don't have document/DOM - import telemetry directly if needed
// (Currently telemetry is opt-in and not actively used)



// ===============================
// 📌 Create context menu items (runs when extension is installed)
// ===============================
chrome.runtime.onInstalled.addListener((details) => {

  // Add text from selection as a custom keyword
  chrome.contextMenus.create({
    id: 'spoiler-shield-add-keyword',
    title: 'Spoiler Shield: Add selected text as keyword',
    contexts: ['selection']
  });

  // Report an image or video as a spoiler
  chrome.contextMenus.create({
    id: 'spoiler-shield-report-media',
    title: 'Spoiler Shield: Report media as spoiler',
    contexts: ['image', 'video']
  });

  // Report selected text or link as a spoiler
  chrome.contextMenus.create({
    id: 'spoiler-shield-report-text',
    title: 'Spoiler Shield: Report text as spoiler',
    contexts: ['page', 'link']
  });

  // Mark something as a false positive (should NOT be a spoiler)
  chrome.contextMenus.create({
    id: 'spoiler-shield-false-positive',
    title: 'Spoiler Shield: Mark as NOT a spoiler',
    contexts: ['all']
  });

  // CRITICAL: Open landing page on fresh install
  try {
    if (details && details.reason === 'install') {
      // LANDING PAGE URL - Update this with your actual landing page URL
      const LANDING_PAGE_URL = chrome.runtime.getURL('spoiler-shield-landing.html') || 
                              'https://yourdomain.com/spoiler-shield-landing.html';
      
      // Open landing page for first-time users
      chrome.tabs.create({ url: LANDING_PAGE_URL }).catch(() => {
        // Fallback to onboarding if landing page not found
        chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') }).catch(() => {
          // Final fallback to welcome page
          chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
        });
      });
      
      // Mark as installed
      chrome.storage.sync.set({ firstInstallComplete: true });
    } else if (details && details.reason === 'update') {
      // On update, just show a badge notification
      chrome.action.setBadgeText({ text: 'NEW' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 5000);
    }
  } catch (e) {
    console.debug('Could not open landing page:', e);
  }
});



// ===============================
// 📌 Handle clicks on context menu items
// ===============================
chrome.contextMenus.onClicked.addListener((info, tab) => {

  // 1️⃣ Add selected text as keyword
  if (info.menuItemId === 'spoiler-shield-add-keyword' && info.selectionText) {
    const keyword = info.selectionText.trim();
    if (!keyword) return;
    
    // OPTIMIZATION: Limit keyword length
    if (keyword.length > 100) return;

    // Save selected keyword into storage
    chrome.storage.sync.get({ customKeywords: [] }, store => {
      const set = new Set([...(store.customKeywords || []), keyword]);
      const keywords = Array.from(set).slice(0, 1000); // Cap at 1000
      chrome.storage.sync.set({ customKeywords: keywords });

      // Re-run content script on the page
      if (tab && tab.id) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      }
    });
  }

  // 2️⃣ Report media (image/video) as spoiler by extracting filename tokens
  else if (info.menuItemId === 'spoiler-shield-report-media' && info.srcUrl) {
    const src = info.srcUrl;
    const tokens = extractTokensFromUrl(src);
    if (tokens.length === 0) return;

    chrome.storage.sync.get({ customKeywords: [] }, store => {
      const set = new Set([...(store.customKeywords || [])]);
      tokens.forEach(t => set.add(t));
      const keywords = Array.from(set).slice(0, 1000); // Cap at 1000
      chrome.storage.sync.set({ customKeywords: keywords });

      // Re-run content script after adding
      if (tab && tab.id) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      }
    });
  }

  // 3️⃣ Report selected text or page text as spoiler
  else if (info.menuItemId === 'spoiler-shield-report-text') {

    // If user highlighted something → use that
    const baseText = (info.selectionText || '').trim();
    if (baseText) {
      addCustomTokens(baseText, tab);
      return;
    }

    // Otherwise fetch text from the element the user right-clicked
    if (tab && tab.id != null) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        func: () => {
          try {
            const ctx = window.__spoilerShieldCtx || {};
            const sel = window.getSelection && (window.getSelection().toString() || '');
            return { text: sel || ctx.text || '', linkText: ctx.linkText || '', href: ctx.href || '' };
          } catch (e) {
            return { text: '', linkText: '', href: '' };
          }
        }
      }, results => {

        const res = (results && results[0] && results[0].result) || {};
        const text = (res.text || res.linkText || '').trim();
        if (text) addCustomTokens(text, tab);
      });
    }
  }

  // 4️⃣ Mark as false positive
  else if (info.menuItemId === 'spoiler-shield-false-positive') {

    if (tab && tab.id != null) {

      // Get the spoiler token that triggered the blur
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        func: () => {
          try {
            const ctx = window.__spoilerShieldCtx || {};
            const target = ctx.el || null;

            let matched = '';
            if (target) {
              const el = target.closest('[data-spoiler-shield="1"]');
              matched = (el && (el.getAttribute('data-spoiler-why') || '')) || '';
            }
            return { matched: matched || (ctx.matched || ''), text: ctx.text || '' };
          } catch (e) {
            return { matched: '', text: '' };
          }
        }
      }, results => {

        const res = (results && results[0] && results[0].result) || {};
        const token = (res.matched || '').trim().toLowerCase();
        if (!token) return;

        // Save false positive token
        chrome.storage.sync.get({ falsePositives: [] }, store => {
          const set = new Set([...(store.falsePositives || [])]);
          set.add(token);

          chrome.storage.sync.set({ falsePositives: Array.from(set) }, () => {
            // Reprocess page
            if (tab && tab.id) {
              chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            }
          });
        });
      });
    }
  }
});



// ===============================
// 📌 Helper: Add custom tokens from text
// ===============================
function addCustomTokens(text, tab) {
  const tokens = extractTokensFromText(text);
  if (tokens.length === 0) return;

  // Save keywords
  chrome.storage.sync.get({ customKeywords: [] }, store => {
    const set = new Set([...(store.customKeywords || [])]);
    tokens.forEach(t => set.add(t));

    const keywords = Array.from(set).slice(0, 1000); // Cap at 1000
    chrome.storage.sync.set({ customKeywords: keywords }, () => {

      // Reprocess page after adding new keywords
      if (tab && tab.id) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      }
    });
  });
}



// ===============================
// 📌 Keyboard Shortcuts Listener
// ===============================
chrome.commands.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  // Toggle ON/OFF
  if (command === 'toggle-spoiler-shield') {
    chrome.storage.sync.get({ settings: { enabled: true } }, store => {
      const settings = store.settings || { enabled: true };
      settings.enabled = !settings.enabled;

      chrome.storage.sync.set({ settings }, () => {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });

        // Show "OFF" badge if disabled
        chrome.action.setBadgeText({ text: settings.enabled ? '' : 'OFF', tabId: tab.id });
      });
    });
  }

  // Reprocess the page for spoilers
  else if (command === 'reprocess-page') {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  }
});



// ===============================
// 📌 Listen for messages (e.g., from popup/options/content)
// ===============================
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'spoiler-reprocess') {

    // Re-run content script on current tab
    if (sender && sender.tab && sender.tab.id) {
      // Prefer message-based reprocess (no reinjection); fallback to executeScript.
      chrome.tabs.sendMessage(sender.tab.id, { type: 'spoiler-reprocess' }, () => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({ target: { tabId: sender.tab.id }, files: ['content.js'] });
        }
      });

    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'spoiler-reprocess' }, () => {
            if (chrome.runtime.lastError) {
              chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] });
            }
          });
        }
      });
    }
  }
  
  // MEDIUM #13: Badge improvements - update count
  if (msg && msg.type === 'spoiler-count-update' && sender && sender.tab) {
    const count = msg.count || 0;
    const tabId = sender.tab.id;
    
    if (count > 0) {
      // Show count on badge
      chrome.action.setBadgeText({ text: String(count), tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea', tabId });
      
      // Flash briefly to draw attention
      setTimeout(() => {
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
      }, 300);
      setTimeout(() => {
        chrome.action.setBadgeBackgroundColor({ color: '#667eea', tabId });
      }, 600);
    } else {
      // No spoilers found - show checkmark briefly
      chrome.action.setBadgeText({ text: '✓', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '', tabId });
      }, 2000);
    }
  }
  
  // Processing indicator (Phase 1 optimization)
  if (msg && msg.type === 'badge-processing' && sender && sender.tab) {
    const tabId = sender.tab.id;
    chrome.action.setBadgeText({ text: '...', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId }); // Orange
  }
  
  // Clear badge
  if (msg && msg.type === 'badge-clear' && sender && sender.tab) {
    const tabId = sender.tab.id;
    chrome.action.setBadgeText({ text: '', tabId });
  }
});



// ===============================
// 📌 Helper Functions
// ===============================

/**
 * Extract hostname from URL
 */
function extractHost(url) {
  try {
    if (!url) return '';
    const u = new URL(url);
    return u.hostname || '';
  } catch {
    return '';
  }
}

/**
 * Evaluate if extension is enabled for a specific host
 */
function evaluateEnablementForHost(settings, host) {
  if (!settings) return true;
  if (!settings.enabled) return false;
  
  // Check per-site settings
  if (settings.perSite && typeof settings.perSite[host] === 'boolean') {
    return settings.perSite[host];
  }
  
  // Check include/exclude domains
  const includeDomains = settings.includeDomains || [];
  const excludeDomains = settings.excludeDomains || [];
  
  if (includeDomains.length > 0) {
    return includeDomains.some(d => host.includes(d));
  }
  
  if (excludeDomains.length > 0 && excludeDomains.some(d => host.includes(d))) {
    return false;
  }
  
  return true;
}

// ===============================
// 📌 Update badge when tab changes or reloads
// ===============================
chrome.tabs.onActivated.addListener(async activeInfo => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateBadgeForTab(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') updateBadgeForTab(tab);
});



// ===============================
// 📌 Show OFF badge if extension disabled on this site
// ===============================
function updateBadgeForTab(tab) {
  if (!tab || !tab.id) return;

  chrome.storage.sync.get({ settings: { enabled: true, excludeDomains: [], includeDomains: [], perSite: {} } }, store => {
    const enabled = evaluateEnablementForHost(store.settings, extractHost(tab.url || ''));

    chrome.action.setBadgeBackgroundColor({ color: '#6a5acd', tabId: tab.id });
    chrome.action.setBadgeText({ text: enabled ? '' : 'OFF', tabId: tab.id });
  });
}



// ===============================
// 📌 Evaluate if extension should run on this domain
// ===============================
function evaluateEnablementForHost(settings, host) {
  if (!settings.enabled) return false;

  if (settings.excludeDomains && settings.excludeDomains.some(d => host.endsWith(d))) return false;

  if (settings.includeDomains && settings.includeDomains.length > 0) {
    return settings.includeDomains.some(d => host.endsWith(d));
  }

  if (settings.perSite && Object.prototype.hasOwnProperty.call(settings.perSite, host)) {
    return Boolean(settings.perSite[host]);
  }

  return true;
}



// ===============================
// 📌 Helpers to extract tokens
// ===============================

// Extract words from image/video URL filenames
function extractTokensFromUrl(url) {
  try {
    // SECURITY: Limit URL length to prevent DoS
    const safeUrl = String(url).slice(0, 2048);
    const u = new URL(safeUrl);
    
    // SECURITY: Only process http/https URLs
    if (!['http:', 'https:'].includes(u.protocol)) {
      return [];
    }
    
    const path = decodeURIComponent(u.pathname || '');
    const filename = path.split('/').pop() || '';
    const nameNoExt = filename.replace(/\.[a-z0-9]+$/i, '');
    const raw = (nameNoExt + ' ' + path).toLowerCase();

    // Split into tokens
    const tokens = raw.split(/[^a-z0-9]+/i)
      .filter(t => t && t.length >= 4 && t.length <= 24);

    return Array.from(new Set(tokens)).slice(0, 8);
  } catch {
    return [];
  }
}

// Extract words from selected text - minimum 5 characters to reduce noise
function extractTokensFromText(text) {
  // SECURITY: Limit input length to prevent DoS
  const safeText = String(text).slice(0, 10000);
  const raw = safeText.toLowerCase();
  const tokens = raw.split(/[^a-z0-9]+/i)
    .filter(t => t && t.length >= 5 && t.length <= 24);

  return Array.from(new Set(tokens)).slice(0, 12);
}

// Extract hostname from URL
function extractHost(url) {
  try {
    if (!url) return '';
    const u = new URL(url);
    return u.hostname || '';
  } catch {
    return '';
  }
}


// ===============================
// 🌐 LANDING PAGE SYNC - Message Handlers
// ===============================

// Handle messages from landing page
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('[Background] External message received:', request);
  
  if (request.type === 'ping') {
    sendResponse({ success: true, extensionId: chrome.runtime.id });
    return true;
  }
  
  if (request.type === 'getUserAccount') {
    chrome.storage.sync.get(['userAccount'], (data) => {
      sendResponse({ userAccount: data.userAccount || null });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'openOptions') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'signOut') {
    // Sign out user
    chrome.storage.sync.get(['userAccount'], (store) => {
      const token = store.userAccount && store.userAccount.token;
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          chrome.storage.sync.remove(['userAccount'], () => {
            sendResponse({ success: true });
          });
        });
      } else {
        chrome.storage.sync.remove(['userAccount'], () => {
          sendResponse({ success: true });
        });
      }
    });
    return true;
  }
  
  return false;
});

// Inject extension ID into landing page when it loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only inject on our landing page
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if it's our landing page (you can customize this check)
    if (tab.url.includes('spoiler-shield-landing') || 
        tab.url.includes('localhost') ||
        tab.url.includes('yourdomain.com')) {
      
      chrome.tabs.sendMessage(tabId, {
        type: 'spoilerShieldExtensionId',
        extensionId: chrome.runtime.id
      }).catch(() => {
        // Tab might not be ready for messages yet
      });
    }
  }
});

// Notify landing page when user account changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.userAccount) {
    // Find all tabs with our landing page
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url && (
          tab.url.includes('spoiler-shield-landing') ||
          tab.url.includes('localhost') ||
          tab.url.includes('yourdomain.com')
        )) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'userAccountUpdated',
            userAccount: changes.userAccount.newValue || null
          }).catch(() => {
            // Tab might not be ready
          });
        }
      });
    });
  }
});

console.log('[Background] Landing page sync handlers initialized');
