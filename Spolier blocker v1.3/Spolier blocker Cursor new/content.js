// Spoiler Shield content script with settings support
// This file may be injected multiple times; keep it idempotent.
(async function initSpoilerShield() {
  if (window.__spoilerShieldBooted) {
    // If already booted, just reprocess with latest settings.
    try { await reprocessNow(); } catch {}
    return;
  }
  window.__spoilerShieldBooted = true;

  // Boot once, then respond to changes/messages without reloading the page.
  await reprocessNow();

  // Capture context for background to read when reporting text
  try {
    window.__spoilerShieldCtx = {};
    document.addEventListener('contextmenu', ev => {
      const el = ev.target && ev.target.closest ? ev.target.closest('*') : ev.target;
      const ctx = { text: '', linkText: '', href: '', matched: '', el: null };
      if (el) {
        ctx.text = (el.textContent || '').trim();
        const a = el.closest && el.closest('a');
        if (a) {
          ctx.linkText = (a.textContent || '').trim();
          ctx.href = a.href || '';
        }
        const blurred = el.closest && el.closest('[data-spoiler-shield="1"]');
        if (blurred) {
          ctx.matched = blurred.getAttribute('data-spoiler-why') || '';
          ctx.el = blurred;
        }
      }
      window.__spoilerShieldCtx = ctx;
    }, { capture: true });
  } catch {}

  // OPTIMIZATION: Use named listener so it can be properly cleaned up
  const storageChangeHandler = (changes, area) => {
    if (area !== 'sync') return;
    if (changes.settings || changes.selectedMedia || changes.customKeywords || changes.falsePositives || changes.rlWeights) {
      // Re-run processing when settings or phrases change (no page reload).
      scheduleReprocess();
    }
  };
  chrome.storage.onChanged.addListener(storageChangeHandler);

  // Allow popup/background to request reprocessing or reveal/hide all.
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'spoiler-reprocess') {
      scheduleReprocess(true);
    } else if (msg.type === 'spoiler-reveal-all') {
      revealAll(true);
    } else if (msg.type === 'spoiler-hide-all') {
      revealAll(false);
    }
  });
})();

function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      settings: {
        enabled: true,
        perSite: {},
        includeDomains: [],
        excludeDomains: [],
        blurRadiusPx: 6,
        blurImages: true,
        showOverlay: true,
        revealOnHover: false,
        revealOnClick: true,
        matchWordBoundaries: true,
        revealOnDblClick: false,
        reinforceLearning: false,
        aggressiveness: 2,
        overlayColor: '#0b1020',
        overlayTextColor: '#e7ecff',
        blurStyle: 'gaussian', // gaussian, pixelate, solid
        reblurAfterMs: 0,
        rlThreshold: 0.3
      },
      selectedMedia: [],
      customKeywords: [],
      falsePositives: [],
      rlWeights: {}
    }, resolve);
  });
}

function evaluateEnablement(store) {
  const { settings } = store;
  if (!settings.enabled) return false;
  const host = location.host;
  if (settings.excludeDomains && settings.excludeDomains.some(d => host.endsWith(d))) return false;
  if (settings.includeDomains && settings.includeDomains.length > 0) {
    return settings.includeDomains.some(d => host.endsWith(d));
  }
  if (settings.perSite && Object.prototype.hasOwnProperty.call(settings.perSite, host)) {
    return Boolean(settings.perSite[host]);
  }
  return true;
}

async function computePhrases(store) {
  const titles = (store.selectedMedia || []).flatMap(m => m.phrases || [m.title].filter(Boolean));
  const custom = (store.customKeywords || []).map(k => String(k));
  const negatives = (store.falsePositives || []);
  const rlWeights = store.rlWeights || {};
  
  // OPTIMIZATION: Limit total phrases to prevent memory exhaustion and performance issues
  const MAX_PHRASES = 1000;
  const all = [...titles, ...custom]
    .filter(Boolean)
    .map(s => String(s).slice(0, 100)) // Cap phrase length
    .map(s => s.toLowerCase())
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, MAX_PHRASES);
  // Filter any phrase that contains a known false-positive token.
  const negSet = new Set((negatives || []).map(s => String(s).toLowerCase()));
  const filtered = all.filter(p => {
    if (negSet.has(p)) return false;
    const tokens = String(p).toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
    return !tokens.some(t => negSet.has(t));
  });
  
  // Sort by RL weights (higher weight = more likely to be a spoiler, prioritize it)
  const sorted = filtered.sort((a, b) => {
    const weightA = rlWeights[a] || 0.5; // Default neutral weight
    const weightB = rlWeights[b] || 0.5;
    return weightB - weightA; // Higher weight first
  });
  
  return sorted;
}

function installStyles(store) {
  const existing = document.querySelector('style[data-spoiler-shield-style]');
  if (existing) existing.remove();

  const radius = (store.settings && store.settings.blurRadiusPx) ?? 6;
  const blurStyle = (store.settings && store.settings.blurStyle) || 'gaussian';
  const overlayBg = (store.settings && store.settings.overlayColor) || '#0b1020';
  const overlayText = (store.settings && store.settings.overlayTextColor) || '#e7ecff';

  const style = document.createElement('style');
  style.setAttribute('data-spoiler-shield-style', '');

  // Note: true pixelation requires canvas/SVG filters; we approximate with blur + contrast.
  const filterCss =
    blurStyle === 'gaussian'
      ? `filter: blur(${radius}px);`
      : blurStyle === 'pixelate'
        ? `filter: blur(${Math.max(1, Math.round(radius / 2))}px) contrast(1.2);`
        : `filter: none; opacity: .08; color: transparent; text-shadow: 0 0 12px currentColor;`;

  style.textContent = `
    .spoiler-shield-blur{${filterCss}transition:filter .15s ease}
    .spoiler-shield-revealed{filter:none!important; opacity:1!important; color:inherit!important; text-shadow:none!important}
    .spoiler-shield-wrapper{position:relative; display:inline-block}
    .spoiler-shield-overlay{position:absolute; inset:auto 6px 6px auto; background:${overlayBg}; color:${overlayText}; font:600 11px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:4px 6px; border-radius:6px; pointer-events:none; opacity:.95; max-width:260px}
  `;
  document.documentElement.appendChild(style);
}

function createProcessor(phrases, store) {
  const boundary = store.settings.matchWordBoundaries;
  // Get RL weights from storage if not in store
  const rlWeights = store.rlWeights || {};
  const escaped = phrases.map(escapeForRegex).filter(Boolean);
  
  // SECURITY: Limit regex complexity to prevent ReDoS attacks
  // Cap at 500 phrases and 50 chars per phrase to avoid catastrophic backtracking
  const safePhrases = escaped.slice(0, 500).map(p => String(p).slice(0, 50));
  
  const pattern = safePhrases.length ? (boundary ? `\\b(?:${safePhrases.join('|')})\\b` : `(?:${safePhrases.join('|')})`) : '(?:)';
  const re = new RegExp(pattern, 'i');
  const globalRe = new RegExp(pattern, 'gi');
  const whyMap = new WeakMap();

  // Helper to get RL weight for a phrase
  function getRLWeight(phrase) {
    const lower = phrase.toLowerCase();
    if (rlWeights[lower] !== undefined) return rlWeights[lower];
    return 0.5; // Default neutral weight
  }

  function processTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentNode;
    if (!parent || shouldSkip(parent)) return;
    if (parent.closest('[data-spoiler-shield="1"]')) return;
    const text = node.textContent || '';
    // OPTIMIZATION: Skip very long text nodes to prevent performance issues
    if (!text || text.length > 50000 || !re.test(text)) return;

    // Find all matches and use RL weights to prioritize
    const matches = [];
    let match;
    while ((match = globalRe.exec(text)) !== null) {
      const phrase = match[0].toLowerCase();
      const weight = getRLWeight(phrase); // Synchronous call
      // Use RL threshold: only blur if weight > 0.3 (configurable threshold)
      const RL_THRESHOLD = typeof store.settings.rlThreshold === 'number' ? store.settings.rlThreshold : 0.3;
      if (weight >= RL_THRESHOLD) {
        matches.push({ phrase: match[0], weight, index: match.index });
      }
    }

    if (matches.length === 0) return;

    // Wrap only the matched substrings (avoid blurring entire paragraphs)
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    globalRe.lastIndex = 0;
    while ((match = globalRe.exec(text)) !== null) {
      const phraseLower = match[0].toLowerCase();
      const weight = getRLWeight(phraseLower);
      const RL_THRESHOLD = typeof store.settings.rlThreshold === 'number' ? store.settings.rlThreshold : 0.3;
      if (weight < RL_THRESHOLD) continue;

      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));

      const span = document.createElement('span');
      span.className = 'spoiler-shield-blur';
      span.setAttribute('data-spoiler-shield', '1');
      span.setAttribute('data-spoiler-kind', 'text');
      span.setAttribute('data-spoiler-why', match[0]);
      span.textContent = text.slice(start, end);
      attachRevealHandlers(span, store.settings);
      frag.appendChild(span);
      lastIndex = end;
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    parent.replaceChild(frag, node);
  }

  function processImage(el) {
    if (!store.settings.blurImages) return;
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    if (el.closest('[data-spoiler-shield="1"]')) return;
    const tag = el.nodeName;
    if (!/(IMG|PICTURE|FIGURE|VIDEO)/.test(tag)) return;
    let text = '';
    if (tag === 'IMG') {
      text = [
        el.alt,
        el.title,
        el.getAttribute('aria-label'),
        el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby')) && document.getElementById(el.getAttribute('aria-labelledby')).textContent
      ].filter(Boolean).join(' ');
    } else if (tag === 'FIGURE') {
      const cap = el.querySelector('figcaption');
      if (cap) text += ' ' + (cap.textContent || '');
    }
    // Try nearby caption-like elements
    if (!text && el.parentElement) {
      const sib = el.parentElement.querySelector('figcaption, [role="note"], [class*="caption" i], [data-testid="imageAltText"]');
      if (sib) text += ' ' + (sib.textContent || '');
    }
    // Fallback: src URL parts
    if (el.tagName === 'IMG') {
      const dataSrc = el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || '';
      const srcset = el.getAttribute('srcset') || '';
      const src = el.currentSrc || el.src || dataSrc || '';
      try { text += ' ' + decodeURIComponent(src + ' ' + dataSrc + ' ' + srcset); } catch { text += ' ' + src + ' ' + dataSrc + ' ' + srcset; }
    }
    if (tag === 'VIDEO') {
      const poster = el.getAttribute('poster') || '';
      if (poster) { try { text += ' ' + decodeURIComponent(poster); } catch { text += ' ' + poster; } }
    }
    // Parent link href may have slug info
    const link = el.closest && el.closest('a');
    if (link && link.href) { try { text += ' ' + decodeURIComponent(link.href); } catch { text += ' ' + link.href; } }
    if (text && re.test(text)) {
      // Find matches with RL weights
      const matches = [];
      let match;
      while ((match = globalRe.exec(text)) !== null) {
        const phrase = match[0].toLowerCase();
        const weight = getRLWeight(phrase);
        const RL_THRESHOLD = typeof store.settings.rlThreshold === 'number' ? store.settings.rlThreshold : 0.3;
        if (weight >= RL_THRESHOLD) {
          matches.push({ phrase: match[0], weight });
        }
      }
      
      if (matches.length > 0) {
        matches.sort((a, b) => b.weight - a.weight);
        const bestMatch = matches[0];
        wrapAndBlur(el, bestMatch && bestMatch.phrase);
      }
    }
  }

  function processBackground(node) {
    if (!store.settings.blurImages) return;
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.closest('[data-spoiler-shield="1"]')) return;
    const style = getComputedStyle(node);
    const bg = style.backgroundImage || '';
    if (!bg || bg === 'none') return;
    const urlMatch = bg.match(/url\(("|')?(.*?)\1\)/i);
    const url = urlMatch && urlMatch[2] ? urlMatch[2] : '';
    let text = '';
    if (url) {
      try { text += ' ' + decodeURIComponent(url); } catch { text += ' ' + url; }
    }
    const label = node.getAttribute('aria-label') || node.getAttribute('title') || '';
    text += ' ' + label;
    if (text && re.test(text)) {
      // Find matches with RL weights
      const matches = [];
      let match;
      while ((match = globalRe.exec(text)) !== null) {
        const phrase = match[0].toLowerCase();
        const weight = getRLWeight(phrase);
        const RL_THRESHOLD = typeof store.settings.rlThreshold === 'number' ? store.settings.rlThreshold : 0.3;
        if (weight >= RL_THRESHOLD) {
          matches.push({ phrase: match[0], weight });
        }
      }
      
      if (matches.length > 0) {
        matches.sort((a, b) => b.weight - a.weight);
        const bestMatch = matches[0];
        wrapAndBlur(node, bestMatch && bestMatch.phrase);
      }
    }
  }

  function wrapAndBlur(target, why) {
    const wrapper = document.createElement('span');
    wrapper.setAttribute('data-spoiler-shield', '1');
    wrapper.className = 'spoiler-shield-wrapper spoiler-shield-blur';
    target.parentNode && target.parentNode.insertBefore(wrapper, target);
    wrapper.appendChild(target);
    if (store.settings.showOverlay) addOverlay(wrapper, why);
    if (why) {
      wrapper.setAttribute('title', `Blurred: ${why}`);
    }
    attachRevealHandlers(wrapper, store.settings);
  }

  function walk(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      processTextNode(node);
      return;
    }
    if (shouldSkip(node)) return;
    // process images/media elements
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (/IMG|PICTURE|FIGURE|VIDEO/.test(node.nodeName)) {
        processImage(node);
      }
      processBackground(node);
      // Site-Specific Adapters (Enhanced)
      try {
        const siteEls = node.querySelectorAll && node.querySelectorAll(
          [
            // YouTube - Enhanced selectors
            'ytd-thumbnail', 
            'yt-image', 
            'a#thumbnail', 
            'img.yt-core-image',
            'ytd-video-preview img',
            'ytd-compact-video-renderer img',
            'ytd-grid-video-renderer img',
            'yt-img-shadow img',
            '#img.ytd-thumbnail',
            
            // X/Twitter - Enhanced selectors
            '[data-testid="tweetPhoto"] img', 
            '[data-testid="tweetPhoto"] div[style*="background-image"]',
            '[data-testid="card.layoutLarge.media"] img',
            'div[aria-labelledby*="tweet"] img',
            'article img[src*="twimg.com"]',
            'div[style*="pbs.twimg.com"]',
            
            // Reddit - Enhanced selectors
            '.ImageBox-image', 
            'img[src*="preview.redd.it"]', 
            'shreddit-media img',
            'img[src*="i.redd.it"]',
            'a[data-click-id="thumbnail"] img',
            'faceplate-img img',
            
            // Facebook
            'img[data-imgperflogname]',
            'div[data-pagelet*="FeedUnit"] img',
            
            // Instagram
            'article img',
            'div[role="button"] img',
            
            // TikTok
            'img[data-e2e="video-thumbnail"]',
            'div[data-e2e="recommend-list-item"] img',
            
            // IMDb
            '.ipc-image',
            'img[class*="ipc-image"]',
            
            // Streaming services
            'div[class*="title-card"] img', // Netflix-like
            'div[class*="poster"] img',     // Generic
            'div[class*="thumbnail"] img'   // Generic
          ].join(', ')
        );
        if (siteEls && siteEls.length) {
          siteEls.forEach(el => {
            if (el.tagName === 'IMG') {
              processImage(el);
            } else {
              processBackground(el);
            }
          });
        }
      } catch (e) {
        console.warn('[Spoiler Shield] Site adapter error:', e);
      }
      // Also scan for images within this element
      const imgs = node.querySelectorAll && node.querySelectorAll('img, picture, figure, video');
      if (imgs && imgs.length) {
        imgs.forEach(processImage);
      }
    }
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      walk(children[i]);
    }
  }

  return { walk };
}

function shouldSkip(node) {
  const tag = node.nodeName;
  if (!tag) return false;
  // Skip inputs, scripts, styles, code blocks, and SVGs
  if (/(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|CODE|PRE|KBD|SAMP|SVG)/.test(tag)) return true;
  // Avoid re-processing already handled nodes
  if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute && node.getAttribute('data-spoiler-shield') === '1') return true;
  return false;
}

function attachRevealHandlers(el, settings) {
  if (settings.revealOnHover) {
    el.addEventListener('mouseenter', () => el.classList.add('spoiler-shield-revealed'));
    el.addEventListener('mouseleave', () => el.classList.remove('spoiler-shield-revealed'));
  }
  if (settings.revealOnClick || settings.revealOnDblClick) {
    let clickTimer = null;
    const single = () => {
      if (!settings.revealOnClick) return;
      el.classList.toggle('spoiler-shield-revealed');
      scheduleReblur(el, settings);
      if (settings.reinforceLearning && el.classList.contains('spoiler-shield-revealed')) {
        const text = extractRelevantText(el).trim();
        if (text) {
          chrome.storage.sync.get({ customKeywords: [], rlWeights: {} }, store => {
            const set = new Set([...(store.customKeywords || [])]);
            const tokens = text.split(/[^A-Za-z0-9]+/).filter(t => t.length >= 4 && t.length <= 24);
            const rlWeights = store.rlWeights || {};
            const LEARNING_RATE = 0.05; // Smaller learning rate for passive learning
            const POSITIVE_REWARD = 1.0;
            
            for (const t of tokens.slice(0, 5)) {
              set.add(t);
              // Reinforcement Learning: small positive reward when user reveals
              const tokenLower = t.toLowerCase();
              if (!rlWeights[tokenLower]) rlWeights[tokenLower] = 0.5;
              rlWeights[tokenLower] = rlWeights[tokenLower] + LEARNING_RATE * (POSITIVE_REWARD - rlWeights[tokenLower]);
              rlWeights[tokenLower] = Math.max(0, Math.min(1, rlWeights[tokenLower]));
            }
            
            chrome.storage.sync.set({ 
              customKeywords: Array.from(set),
              rlWeights: rlWeights
            });
          });
        }
      }
    };
    const onClick = () => {
      clearTimeout(clickTimer);
      clickTimer = setTimeout(single, 200);
    };
    const onDbl = () => {
      clearTimeout(clickTimer);
      if (settings.revealOnDblClick) {
        el.classList.toggle('spoiler-shield-revealed');
        scheduleReblur(el, settings);
      }
    };
    if (settings.revealOnClick) el.addEventListener('click', onClick);
    if (settings.revealOnDblClick) el.addEventListener('dblclick', onDbl);
  }
}

function scheduleReblur(el, settings) {
  try {
    const ms = (settings && typeof settings.reblurAfterMs === 'number') ? settings.reblurAfterMs : 0;
    if (!ms || ms <= 0) return;
    if (el.__spoilerShieldReblurTimer) clearTimeout(el.__spoilerShieldReblurTimer);
    el.__spoilerShieldReblurTimer = setTimeout(() => {
      try { el.classList.remove('spoiler-shield-revealed'); } catch {}
    }, ms);
  } catch {}
}

function revealAll(on) {
  try {
    const els = document.querySelectorAll('[data-spoiler-shield="1"]');
    els.forEach(el => {
      if (on) el.classList.add('spoiler-shield-revealed');
      else el.classList.remove('spoiler-shield-revealed');
    });
  } catch {}
}

function addOverlay(hostEl, why) {
  try {
    const container = hostEl.closest('[data-spoiler-shield="1"]') || hostEl;
    if (!container || container.querySelector('.spoiler-shield-overlay')) return;
    const label = document.createElement('span');
    label.className = 'spoiler-shield-overlay';
    let reason = why || '';
    const from = collectMatchedTitles();
    const titleText = from.length ? ` for ${from.slice(0,3).join(', ')}${from.length>3?'…':''}` : '';
    label.textContent = reason ? `Blocked: ${reason}${titleText}` : (from.length ? `Blocked${titleText}` : 'Blocked by Spoiler Shield');
    container.appendChild(label);
  } catch {}
}

function collectMatchedTitles() {
  try {
    const titles = [];
    const items = JSON.parse(sessionStorage.getItem('__spoilerSelectedTitles') || 'null');
    if (Array.isArray(items)) return items;
    // fallback read from storage once per page
    chrome.storage.sync.get({ selectedMedia: [] }, store => {
      const arr = (store.selectedMedia || []).map(i => i.title).filter(Boolean);
      sessionStorage.setItem('__spoilerSelectedTitles', JSON.stringify(arr));
    });
    return titles;
  } catch { return []; }
}

function extractRelevantText(root) {
  // Prefer visible text inside
  let collected = root.textContent || '';
  // Look for image/caption metadata
  const el = root.closest('[data-spoiler-shield="1"]') ? root : root;
  const imgs = (el.querySelectorAll ? el.querySelectorAll('img') : []);
  if (imgs && imgs.length) {
    imgs.forEach(img => {
      collected += ' ' + (img.alt || '');
      collected += ' ' + (img.title || '');
      collected += ' ' + (img.getAttribute && img.getAttribute('aria-label') || '');
      const src = img.currentSrc || img.src || '';
      try { collected += ' ' + decodeURIComponent(src); } catch { collected += ' ' + src; }
    });
  }
  // Nearby captions
  if (el.querySelector) {
    const cap = el.querySelector('figcaption, [role="note"], [class*="caption" i]');
    if (cap) collected += ' ' + (cap.textContent || '');
  }
  return collected;
}

function processExisting(processor) {
  processor.walk(document.body);
  const matchCount = document.querySelectorAll('.spoiler-shield-blur').length;
  
  // MEDIUM #13: Send blur count to background for badge update
  try {
    chrome.runtime.sendMessage({ 
      type: 'spoiler-count-update', 
      count: matchCount 
    });
  } catch (e) {
    // Ignore errors if background script isn't ready
  }
  
  try {
    const ts = new Date().toLocaleString();
    const example = document.querySelector('[data-spoiler-why]') && document.querySelector('[data-spoiler-why]').getAttribute('data-spoiler-why');
    chrome.storage.sync.set({ diagTs: ts, diagMatches: matchCount, diagWhy: example || '' });
  } catch {}
}

let __mutationObserver = null;
let __mutationPaused = false; // Phase 3: Pause mutations during heavy processing

function observeMutations(processor) {
  // Disconnect any existing observer first
  if (__mutationObserver) {
    try { __mutationObserver.disconnect(); } catch {}
  }

  let mutationBatch = [];
  let batchTimeout = null;
  let processingInProgress = false;

  const processBatch = () => {
    if (mutationBatch.length === 0 || processingInProgress || __mutationPaused) return;
    
    processingInProgress = true;
    const startTime = performance.now();
    
    try {
      // Phase 3: Intelligent batching with size limits
      const MAX_BATCH_SIZE = 100; // Process max 100 mutations at once
      const batchToProcess = mutationBatch.splice(0, MAX_BATCH_SIZE);
      
      // Use a Set to deduplicate nodes and avoid reprocessing
      const nodesToProcess = new Set();
      
      for (const m of batchToProcess) {
        // Skip if node was already processed
        if (m.target && m.target.nodeType === Node.ELEMENT_NODE && 
            m.target.getAttribute && m.target.getAttribute('data-spoiler-shield') === '1') {
          continue;
        }
        
        if (m.type === 'childList' && m.addedNodes) {
          m.addedNodes.forEach(n => {
            // Only add meaningful nodes
            if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) {
              nodesToProcess.add(n);
            }
          });
        } else if (m.type === 'characterData') {
          nodesToProcess.add(m.target);
        } else if (m.type === 'attributes' && m.target) {
          const attrName = m.attributeName || '';
          if (['src','srcset','alt','title','poster','data-src','data-lazy-src'].includes(attrName)) {
            nodesToProcess.add(m.target);
          }
        }
      }
      
      // Phase 3: Limit nodes processed per batch to prevent freezing
      const MAX_NODES_PER_BATCH = 50;
      const nodesToProcessArray = Array.from(nodesToProcess).slice(0, MAX_NODES_PER_BATCH);
      
      // Process deduplicated nodes
      nodesToProcessArray.forEach(n => {
        try { 
          processor.walk(n); 
        } catch (e) {
          // Silently continue on error
        }
      });
      
      const processingTime = performance.now() - startTime;
      
      // Phase 3: Adaptive throttling based on processing time
      if (processingTime > 100) {
        // Slow processing detected, increase debounce delay
        console.log(`[Spoiler Shield] Slow mutation processing (${processingTime.toFixed(0)}ms), increasing delay`);
      }
      
      // If there are more mutations waiting, schedule next batch
      if (mutationBatch.length > 0) {
        const delay = processingTime > 100 ? 200 : 50; // Adaptive delay
        batchTimeout = setTimeout(processBatch, delay);
      } else {
        batchTimeout = null;
      }
      
    } finally {
      processingInProgress = false;
    }
  };

  const observer = new MutationObserver(mutations => {
    // Phase 3: Drop mutations if queue is too large (prevents memory leak)
    if (mutationBatch.length > 500) {
      console.warn('[Spoiler Shield] Mutation queue overflow, dropping old mutations');
      mutationBatch = mutationBatch.slice(-200); // Keep only recent 200
    }
    
    // Phase 3: Ignore mutations during pause
    if (__mutationPaused) {
      return;
    }
    
    // OPTIMIZATION: Throttle if too many mutations to prevent performance degradation
    if (mutationBatch.length > 200 && !batchTimeout) {
      // Queue is large, schedule immediate processing
      processBatch();
      return;
    }
    
    mutationBatch.push(...mutations);
    
    // Debounce processing: batch mutations over ~50ms window
    if (!batchTimeout && !processingInProgress) {
      batchTimeout = setTimeout(processBatch, 50);
    }
  });

  // Phase 3: Optimize observer config
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false, // Disable for performance (rarely needed)
    attributes: true,
    attributeFilter: ['src','srcset','alt','title','poster','data-src','data-lazy-src', 'data-background']
  });

  __mutationObserver = observer;
  
  console.log('[Spoiler Shield] Optimized mutation observer active');
}

// Phase 3: Pause/resume mutations during heavy operations
function pauseMutations() {
  __mutationPaused = true;
}

function resumeMutations() {
  __mutationPaused = false;
}

function escapeForRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let __spoilerShieldReprocessTimer = null;
function scheduleReprocess(immediate) {
  try {
    if (__spoilerShieldReprocessTimer) clearTimeout(__spoilerShieldReprocessTimer);
    __spoilerShieldReprocessTimer = setTimeout(() => { reprocessNow(); }, immediate ? 0 : 180);
  } catch {}
}

async function reprocessNow() {
  // Phase 1: Show processing indicator
  let scanInProgress = false;
  if (window.__spoilerShieldScanning) {
    return; // Already scanning, prevent overlapping scans
  }
  window.__spoilerShieldScanning = true;
  
  try {
    // Notify badge we're processing
    chrome.runtime.sendMessage({ type: 'badge-processing' }).catch(() => {});
    
    const store = await getSettings();
    const isEnabledForHost = evaluateEnablement(store);
    
    // Always reset previous processing first so disable/phrase changes can unblur.
    resetSpoilerShield();
    
    if (!isEnabledForHost) {
      chrome.runtime.sendMessage({ type: 'badge-clear' }).catch(() => {});
      return;
    }
    
    const phrases = await computePhrases(store);
    if (!phrases || phrases.length === 0) {
      chrome.runtime.sendMessage({ type: 'badge-clear' }).catch(() => {});
      return;
    }

    // Phase 1: Page size safety cap
    const MAX_SAFE_ELEMENTS = 3000;
    const allElements = document.querySelectorAll('*');
    const elementCount = allElements.length;
    
    if (elementCount > MAX_SAFE_ELEMENTS) {
      console.warn(`[Spoiler Shield] Large page detected (${elementCount} elements). Scanning visible viewport only.`);
      // Add user notification (subtle, non-intrusive)
      showLargePageNotification(elementCount);
    }

    // Ensure RL weights are present for processor
    store.rlWeights = store.rlWeights || {};
    installStyles(store);
    const processor = createProcessor(phrases, store);
    
    // Process existing content (with size limit consideration)
    if (elementCount > MAX_SAFE_ELEMENTS) {
      processViewportOnly(processor);
    } else {
      processExisting(processor);
    }
    
    observeMutations(processor);
    
  } finally {
    window.__spoilerShieldScanning = false;
  }
}

function resetSpoilerShield() {
  try {
    // Remove overlays and restore text nodes wrapped by Spoiler Shield
    const nodes = Array.from(document.querySelectorAll('[data-spoiler-shield="1"]'));
    // Process deepest nodes first (reduces unwrap ordering issues)
    nodes.reverse().forEach(el => {
      if (!el || !el.parentNode) return;
      const kind = el.getAttribute('data-spoiler-kind') || '';
      if (kind === 'text') {
        // Replace span with its text content
        const tn = document.createTextNode(el.textContent || '');
        el.parentNode.replaceChild(tn, el);
        return;
      }
      // Wrapper around media/other nodes: unwrap children
      if (el.classList && el.classList.contains('spoiler-shield-wrapper')) {
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        return;
      }
      // Fallback: if it's a plain blur span with text, unwrap to text node
      if (el.nodeName === 'SPAN') {
        const tn = document.createTextNode(el.textContent || '');
        el.parentNode.replaceChild(tn, el);
      }
    });

    // Remove any leftover overlays
    document.querySelectorAll('.spoiler-shield-overlay').forEach(o => o.remove());
    // Remove observer side effects: nothing to detach (we don't keep a reference), but safe to continue.
    // Remove our style tag; it will be re-added if enabled
    const style = document.querySelector('style[data-spoiler-shield-style]');
    if (style) style.remove();
  } catch {}
}


// ===============================
// SMART FALSE POSITIVE DETECTION
// ===============================

/**
 * Calculates a confidence score (0-1) for whether text is actually a spoiler
 * Lower scores indicate likely false positives
 */
function calculateSpoilerConfidence(matchedPhrase, contextText, rlWeights) {
  let confidence = 0.5; // Start neutral
  
  // Factor 1: RL Weight (most important)
  const rlWeight = rlWeights[matchedPhrase.toLowerCase()] || 0.5;
  confidence = confidence * 0.3 + rlWeight * 0.7; // 70% weight to RL
  
  // Factor 2: Phrase length (longer phrases are more specific)
  if (matchedPhrase.length > 15) {
    confidence += 0.15; // Bonus for longer phrases
  } else if (matchedPhrase.length < 5) {
    confidence -= 0.1; // Penalty for very short phrases
  }
  
  // Factor 3: Word count (multi-word phrases are more specific)
  const wordCount = matchedPhrase.split(/\s+/).length;
  if (wordCount >= 3) {
    confidence += 0.1;
  } else if (wordCount === 1) {
    // Single words can be common names
    confidence -= 0.05;
  }
  
  // Factor 4: Common word patterns (very basic heuristic)
  const lowerPhrase = matchedPhrase.toLowerCase();
  const commonPatterns = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
  const hasCommonWords = commonPatterns.some(w => lowerPhrase === w);
  if (hasCommonWords) {
    confidence -= 0.3; // Major penalty for common words
  }
  
  // Factor 5: Context analysis - check surrounding words
  if (contextText) {
    const lowerContext = contextText.toLowerCase();
    // Spoiler indicators in context
    if (lowerContext.includes('spoiler') || 
        lowerContext.includes('warning') || 
        lowerContext.includes('alert')) {
      confidence += 0.2; // Bonus if explicitly marked as spoiler
    }
    
    // False positive indicators
    if (lowerContext.includes('author') || 
        lowerContext.includes('directed by') ||
        lowerContext.includes('starring') ||
        lowerContext.includes('written by')) {
      confidence -= 0.15; // Likely just credits, not spoilers
    }
  }
  
  // Factor 6: All caps = likely clickbait or emphasis, not subtle spoiler
  if (matchedPhrase === matchedPhrase.toUpperCase() && matchedPhrase.length > 3) {
    confidence -= 0.1;
  }
  
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Auto-detect potential false positives based on frequency and context
 * Returns array of tokens that are likely false positives
 */
function detectPotentialFalsePositives(blurredMatches) {
  const tokenFrequency = {};
  const potentialFalsePositives = [];
  
  // Count how often each token appears
  blurredMatches.forEach(match => {
    const tokens = match.phrase.toLowerCase().split(/\s+/);
    tokens.forEach(token => {
      tokenFrequency[token] = (tokenFrequency[token] || 0) + 1;
    });
  });
  
  // If a token appears very frequently (>10 times), it might be a false positive
  Object.keys(tokenFrequency).forEach(token => {
    if (tokenFrequency[token] > 10 && token.length < 8) {
      // Short tokens that appear many times are suspicious
      potentialFalsePositives.push({
        token,
        frequency: tokenFrequency[token],
        reason: 'High frequency on page'
      });
    }
  });
  
  return potentialFalsePositives;
}

/**
 * Show user-friendly notification about potential false positives
 */
function notifyPotentialFalsePositives(potentialFPs) {
  if (potentialFPs.length === 0) return;
  
  // Only notify if there are 2+ potential false positives
  if (potentialFPs.length < 2) return;
  
  console.log('[Spoiler Shield] Potential false positives detected:', potentialFPs);
  
  // Store for later review (don't auto-add to avoid breaking legitimate blocks)
  chrome.storage.local.set({
    potentialFalsePositives: potentialFPs,
    potentialFPTimestamp: Date.now()
  });
}


// ===============================
// SITE-SPECIFIC TEXT EXTRACTION
// ===============================

/**
 * Extract text content specific to each site's structure
 * Returns more relevant text for matching on popular platforms
 */
function extractSiteSpecificText(element) {
  const hostname = window.location.hostname;
  let extractedText = '';
  
  try {
    // YouTube - Get video title, channel name, description
    if (hostname.includes('youtube.com')) {
      // Video title
      const titleEl = element.closest('ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
      if (titleEl) {
        const title = titleEl.querySelector('#video-title, .title');
        if (title) extractedText += title.textContent + ' ';
        
        const channelName = titleEl.querySelector('#channel-name, .ytd-channel-name');
        if (channelName) extractedText += channelName.textContent + ' ';
        
        const metadata = titleEl.querySelector('#metadata-line, .metadata-line');
        if (metadata) extractedText += metadata.textContent + ' ';
      }
    }
    
    // Twitter/X - Get tweet text, author, quoted tweets
    else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      const article = element.closest('article[data-testid="tweet"]');
      if (article) {
        const tweetText = article.querySelector('[data-testid="tweetText"]');
        if (tweetText) extractedText += tweetText.textContent + ' ';
        
        const username = article.querySelector('[data-testid="User-Name"]');
        if (username) extractedText += username.textContent + ' ';
        
        // Quoted tweet
        const quotedText = article.querySelector('[data-testid="card.layoutLarge.detail"]');
        if (quotedText) extractedText += quotedText.textContent + ' ';
      }
    }
    
    // Reddit - Get post title, subreddit, flair
    else if (hostname.includes('reddit.com')) {
      const post = element.closest('shreddit-post, div[data-testid="post-container"]');
      if (post) {
        const title = post.querySelector('h1, a[slot="title"]');
        if (title) extractedText += title.textContent + ' ';
        
        const subreddit = post.querySelector('a[data-click-id="subreddit"]');
        if (subreddit) extractedText += subreddit.textContent + ' ';
        
        const flair = post.querySelector('faceplate-tracker[source="post_flair"]');
        if (flair) extractedText += flair.textContent + ' ';
      }
    }
    
    // Facebook - Get post text, author
    else if (hostname.includes('facebook.com')) {
      const post = element.closest('[data-pagelet*="FeedUnit"], [role="article"]');
      if (post) {
        const text = post.querySelector('[data-ad-comet-preview="message"]');
        if (text) extractedText += text.textContent + ' ';
        
        const author = post.querySelector('h2 a, strong a');
        if (author) extractedText += author.textContent + ' ';
      }
    }
    
    // IMDb - Get title, year, cast
    else if (hostname.includes('imdb.com')) {
      const container = element.closest('[data-testid*="title"], .ipc-poster-card');
      if (container) {
        const title = container.querySelector('h3, a[href*="/title/"]');
        if (title) extractedText += title.textContent + ' ';
        
        const metadata = container.querySelector('.ipc-metadata-list');
        if (metadata) extractedText += metadata.textContent + ' ';
      }
    }
    
    // Netflix/Streaming - Get title from nearby elements
    else if (hostname.includes('netflix.com') || hostname.includes('primevideo.com') || hostname.includes('disneyplus.com')) {
      const titleCard = element.closest('[class*="title-card"], [class*="Card"]');
      if (titleCard) {
        const title = titleCard.querySelector('[class*="title"], [class*="name"]');
        if (title) extractedText += title.textContent + ' ';
      }
    }
    
  } catch (e) {
    console.warn('[Spoiler Shield] Site-specific extraction error:', e);
  }
  
  return extractedText.trim();
}

/**
 * Enhanced text extraction combining generic and site-specific methods
 */
function extractRelevantTextEnhanced(element) {
  // Try site-specific extraction first
  const siteSpecific = extractSiteSpecificText(element);
  if (siteSpecific && siteSpecific.length > 10) {
    return siteSpecific;
  }
  
  // Fall back to generic extraction
  return extractRelevantText(element);
}


// ===============================
// PHASE 1: PAGE SIZE SAFETY & NOTIFICATIONS
// ===============================

/**
 * Show subtle notification for large pages
 */
function showLargePageNotification(elementCount) {
  // Check if notification already exists
  if (document.getElementById('spoiler-shield-large-page-notice')) return;
  
  const notice = document.createElement('div');
  notice.id = 'spoiler-shield-large-page-notice';
  notice.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    z-index: 2147483647;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
    cursor: pointer;
  `;
  
  notice.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">🛡️</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 2px;">Large Page Detected</div>
        <div style="font-size: 11px; opacity: 0.9;">Scanning visible area only (${elementCount.toLocaleString()} elements)</div>
      </div>
      <span style="font-size: 18px; opacity: 0.7;">×</span>
    </div>
  `;
  
  // Add animation keyframes
  if (!document.getElementById('spoiler-shield-animations')) {
    const style = document.createElement('style');
    style.id = 'spoiler-shield-animations';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Click to dismiss
  notice.addEventListener('click', () => {
    notice.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notice.remove(), 300);
  });
  
  document.body.appendChild(notice);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (notice.parentNode) {
      notice.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => notice.remove(), 300);
    }
  }, 5000);
}

/**
 * Process only elements in the current viewport (for large pages)
 */
function processViewportOnly(processor) {
  if (!processor || !processor.walk) return;
  
  const viewportHeight = window.innerHeight;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollBottom = scrollTop + viewportHeight;
  
  // Get all text nodes and media elements in viewport
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip if already processed
        if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute && node.getAttribute('data-spoiler-shield') === '1') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Check if element is in viewport
        if (node.nodeType === Node.ELEMENT_NODE) {
          const rect = node.getBoundingClientRect();
          const elementTop = rect.top + scrollTop;
          const elementBottom = elementTop + rect.height;
          
          // Element is in or near viewport (with 500px buffer)
          if (elementBottom >= scrollTop - 500 && elementTop <= scrollBottom + 500) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const nodesToProcess = [];
  let node;
  while (node = walker.nextNode()) {
    nodesToProcess.push(node);
    // Limit batch size to prevent freezing
    if (nodesToProcess.length > 1000) break;
  }
  
  // Process collected nodes
  nodesToProcess.forEach(node => {
    try {
      processor.walk(node);
    } catch (e) {
      console.warn('[Spoiler Shield] Error processing node:', e);
    }
  });
  
  console.log(`[Spoiler Shield] Processed ${nodesToProcess.length} viewport elements`);
}
