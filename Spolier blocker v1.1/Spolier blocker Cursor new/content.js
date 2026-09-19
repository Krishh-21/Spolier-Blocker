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
      // Site adapters
      try {
        const siteEls = node.querySelectorAll && node.querySelectorAll(
          [
            // YouTube
            'ytd-thumbnail', 'yt-image', 'a#thumbnail', 'img.yt-core-image',
            // X/Twitter
            '[data-testid="tweetPhoto"] img', '[data-testid="tweetPhoto"] div[style*="background-image"]',
            // Reddit
            '.ImageBox-image', 'img[src*="preview.redd.it"]', 'shreddit-media img'
          ].join(', ')
        );
        if (siteEls && siteEls.length) {
          siteEls.forEach(el => {
            if (el.tagName === 'IMG') processImage(el); else processBackground(el);
          });
        }
      } catch {}
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
  // Page sessionStorage is readable by the visited site. Never cache the watchlist there.
  try { sessionStorage.removeItem('__spoilerSelectedTitles'); } catch {}
  return [];
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
  try {
    const ts = new Date().toLocaleString();
    const example = document.querySelector('[data-spoiler-why]') && document.querySelector('[data-spoiler-why]').getAttribute('data-spoiler-why');
    chrome.storage.sync.set({ diagTs: ts, diagMatches: matchCount, diagWhy: example || '' });
  } catch {}
}

let __mutationObserver = null;
function observeMutations(processor) {
  // Disconnect any existing observer first
  if (__mutationObserver) {
    try { __mutationObserver.disconnect(); } catch {}
  }

  let mutationBatch = [];
  let batchTimeout = null;

  const processBatch = () => {
    if (mutationBatch.length === 0) return;
    // Use a Set to deduplicate nodes and avoid reprocessing
    const nodesToProcess = new Set();
    for (const m of mutationBatch) {
      if (m.type === 'childList' && m.addedNodes) {
        m.addedNodes.forEach(n => nodesToProcess.add(n));
      } else if (m.type === 'characterData') {
        nodesToProcess.add(m.target);
      } else if (m.type === 'attributes' && m.target) {
        const attrName = m.attributeName || '';
        if (['src','srcset','alt','title','poster','data-src','data-lazy-src'].includes(attrName)) {
          nodesToProcess.add(m.target);
        }
      }
    }
    mutationBatch = [];
    batchTimeout = null;
    // Process deduplicated nodes
    nodesToProcess.forEach(n => {
      try { processor.walk(n); } catch (e) {}
    });
  };

  const observer = new MutationObserver(mutations => {
    // OPTIMIZATION: Throttle if too many mutations to prevent performance degradation
    if (mutationBatch.length > 200) {
      // Skip adding more mutations until current batch is processed
      return;
    }
    mutationBatch.push(...mutations);
    // Debounce processing: batch mutations over ~50ms window
    if (batchTimeout) clearTimeout(batchTimeout);
    batchTimeout = setTimeout(processBatch, 50);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['src','srcset','alt','title','poster','data-src','data-lazy-src']
  });

  __mutationObserver = observer;
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
  const store = await getSettings();
  const isEnabledForHost = evaluateEnablement(store);
  // Always reset previous processing first so disable/phrase changes can unblur.
  resetSpoilerShield();
  if (!isEnabledForHost) return;
  const phrases = await computePhrases(store);
  if (!phrases || phrases.length === 0) return;

  // Ensure RL weights are present for processor
  store.rlWeights = store.rlWeights || {};
  installStyles(store);
  const processor = createProcessor(phrases, store);
  processExisting(processor);
  observeMutations(processor);
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