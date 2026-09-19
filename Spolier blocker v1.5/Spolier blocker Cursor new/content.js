// Spoiler Shield V4.5 - Pure Intelligence Detection
// NO REGEX, NO PHRASE MATCHING, NO PATTERNS
// V4 Intelligence System Only

(async function initSpoilerShield() {
  if (window.__spoilerShieldBooted) {
    try { await reprocessNow(); } catch {}
    return;
  }
  window.__spoilerShieldBooted = true;

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

  const storageChangeHandler = (changes, area) => {
    if (area !== 'sync') return;
    if (changes.settings || changes.selectedMedia) {
      scheduleReprocess();
    }
  };
  chrome.storage.onChanged.addListener(storageChangeHandler);

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
        blurStyle: 'gaussian',
        reblurAfterMs: 0,
        rlThreshold: 0.3
      },
      selectedMedia: []
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

function installStyles(store) {
  const existing = document.querySelector('style[data-spoiler-shield-style]');
  if (existing) existing.remove();

  const radius = (store.settings && store.settings.blurRadiusPx) ?? 6;
  const blurStyle = (store.settings && store.settings.blurStyle) || 'gaussian';
  const overlayBg = (store.settings && store.settings.overlayColor) || '#0b1020';
  const overlayText = (store.settings && store.settings.overlayTextColor) || '#e7ecff';

  const style = document.createElement('style');
  style.setAttribute('data-spoiler-shield-style', '');

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
    .spoiler-shield-wrapper.spoiler-shield-block{display:block; width:100%; max-width:100%}
    .spoiler-shield-overlay{position:absolute; inset:auto 6px 6px auto; background:${overlayBg}; color:${overlayText}; font:600 11px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:4px 6px; border-radius:6px; pointer-events:none; opacity:.95; max-width:260px}
  `;
  document.documentElement.appendChild(style);
}

/**
 * Initialize V4 Intelligence System
 */
async function initializeV4System() {
  try {
    if (!window.SpoilerShieldV4) {
      console.error('[V4.5] V4 Integration not loaded');
      return false;
    }

    const ready = await window.SpoilerShieldV4.waitUntilReady(8000);
    if (!ready) {
      console.error('[V4.5] V4 failed to initialize in time');
      return false;
    }
    
    console.log('[V4.5] V4 Intelligence System initialized');
    return true;
  } catch (error) {
    console.error('[V4.5] Failed to initialize V4:', error);
    return false;
  }
}

/**
 * Extract tracked media (titles + character phrases from TMDB) for universal detection
 */
function extractTrackedMedia(store) {
  if (!store.selectedMedia || !Array.isArray(store.selectedMedia)) return [];
  return store.selectedMedia.map(item => ({
    title: item.title || '',
    phrases: item.phrases || [],
    type: item.type || 'movie'
  })).filter(item => item.title);
}

/**
 * Create V4-only processor
 */
function createV4Processor(trackedMedia, store) {
  const titles = trackedMedia.map(m => m.title);
  console.log('[V4.5] Creating V4 processor for:', titles);
  
  return {
    walk: function(node, scannedBlocks) {
      if (window.SpoilerShieldV4 && window.SpoilerShieldV4.isActive()) {
        walkWithV4Only(node, trackedMedia, store, scannedBlocks || new WeakSet());
      } else {
        console.warn('[V4.5] V4 not active, skipping processing');
      }
    }
  };
}

function walkWithV4Only(node, trackedMedia, store, processedBlocks) {
  if (!node) return;
  
  if (node.nodeType === Node.TEXT_NODE) {
    processTextWithV4(node, trackedMedia, store, processedBlocks);
    return;
  }
  
  if (shouldSkip(node)) return;
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (store.settings?.blurImages && /IMG|PICTURE|FIGURE|VIDEO/.test(node.nodeName)) {
      processImageWithV4(node, trackedMedia, store);
    }
  }
  
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    walkWithV4Only(children[i], trackedMedia, store, processedBlocks);
  }
}

/**
 * Find the nearest content block for a text node (paragraph, comment, post, etc.)
 */
function findContentBlock(node) {
  let current = node;
  const maxDepth = 8;
  let depth = 0;
  let bestCandidate = null;

  while (current && depth < maxDepth) {
    const tagName = current.nodeName;

    if (['P', 'DIV', 'ARTICLE', 'SECTION', 'BLOCKQUOTE', 'LI', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
      const className = (current.className || '').toString().toLowerCase();
      const id = (current.id || '').toLowerCase();

      const isContentBlock =
        ['P', 'LI', 'BLOCKQUOTE', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName) ||
        className.includes('comment') ||
        className.includes('post') ||
        className.includes('message') ||
        className.includes('content') ||
        className.includes('response') ||
        className.includes('tweet') ||
        className.includes('caption') ||
        className.includes('markdown') ||
        className.includes('prose');

      const isPageContainer =
        tagName === 'DIV' && (
          className.includes('page') ||
          className.includes('container') ||
          className.includes('wrapper') ||
          id.includes('page') ||
          id.includes('root') ||
          id === 'app'
        );

      if (isContentBlock && !isPageContainer) {
        bestCandidate = current;
        if (tagName === 'LI' || tagName === 'P') break;
      }

      if (tagName === 'DIV' && !isPageContainer) {
        const textLength = (current.textContent || '').length;
        if (textLength >= 10 && textLength < 4000) {
          bestCandidate = current;
        }
      }
    }

    current = current.parentNode;
    depth++;
  }

  return findBlurTarget(bestCandidate || node.parentNode);
}

/**
 * Escalate blur target to parent list items / message sections to avoid half-blur
 */
function findBlurTarget(blockElement) {
  if (!blockElement || blockElement.nodeType !== Node.ELEMENT_NODE) {
    return blockElement;
  }

  let target = blockElement;

  if (target.nodeName === 'SPAN') {
    const blockParent = target.closest('p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, article, section');
    if (blockParent) target = blockParent;
  }

  const liParent = target.closest('li');
  if (liParent) target = liParent;

  if (target.nodeName === 'P') {
    const divParent = target.parentElement;
    if (divParent && divParent.nodeName === 'DIV') {
      const cls = (divParent.className || '').toString().toLowerCase();
      const childPs = divParent.querySelectorAll(':scope > p');
      if (childPs.length > 0 && childPs.length <= 6 &&
          (cls.includes('markdown') || cls.includes('message') || cls.includes('prose') || cls.includes('text-base'))) {
        target = divParent;
      }
    }
  }

  let current = target;
  for (let i = 0; i < 4; i++) {
    const parent = current.parentElement;
    if (!parent) break;
    const cls = (parent.className || '').toString().toLowerCase();
    const role = (parent.getAttribute && parent.getAttribute('data-message-author-role')) || '';
    const testId = (parent.getAttribute && parent.getAttribute('data-testid')) || '';
    if (cls.includes('markdown') || cls.includes('message') || cls.includes('prose') ||
        cls.includes('agent-turn') || cls.includes('assistant') ||
        role === 'assistant' || testId.includes('conversation') || testId.includes('message')) {
      const len = (parent.textContent || '').length;
      if (len >= 20 && len < 12000) {
        target = parent;
        current = parent;
        continue;
      }
    }
    break;
  }

  return target;
}

function processTextWithV4(node, trackedMedia, store, processedBlocks) {
  const parent = node.parentNode;
  if (!parent || shouldSkip(parent)) return;
  if (parent.closest('[data-spoiler-shield="1"]')) return;

  const blockElement = findContentBlock(parent);
  if (!blockElement || processedBlocks.has(blockElement)) return;
  if (blockElement.closest('[data-spoiler-shield="1"]')) return;

  const text = (blockElement.textContent || '').trim();
  if (!text || text.length < 10 || text.length > 10000) return;

  processedBlocks.add(blockElement);

  try {
    const result = window.SpoilerShieldV4.processText(text, trackedMedia);

    if (!result.isSpoiler) return;

    // Always blur the entire content block to prevent half-blur leakage
    blurEntireBlock(blockElement, result, store);
  } catch (error) {
    console.error('[V4.5] Processing error:', error);
  }
}

function processImageWithV4(el, trackedMedia, store) {
  if (el.closest('[data-spoiler-shield="1"]')) return;
  
  const text = extractImageText(el);
  if (!text) return;
  
  try {
    const result = window.SpoilerShieldV4.processText(text, trackedMedia);
    if (result.isSpoiler) {
      blurElement(el, result, store);
    }
  } catch (error) {
    console.error('[V4.5] Image processing error:', error);
  }
}

function extractImageText(el) {
  let text = '';
  if (el.tagName === 'IMG') {
    text += (el.alt || '') + ' ';
    text += (el.title || '') + ' ';
  }
  return text.trim();
}

function blurText(node, text, result, store) {
  const parent = node.parentNode;
  if (!parent) return;
  
  const span = document.createElement('span');
  span.className = 'spoiler-shield-blur';
  span.setAttribute('data-spoiler-shield', '1');
  span.setAttribute('data-spoiler-v4', 'true');
  span.setAttribute('data-spoiler-why', result.reasoning ? result.reasoning.join(', ') : 'V4 Intelligence');
  span.textContent = text;
  attachRevealHandlers(span, store.settings);
  parent.replaceChild(span, node);
}

function blurEntireBlock(startNode, result, store) {
  const blockElement = startNode.nodeType === Node.ELEMENT_NODE
    ? startNode
    : findContentBlock(startNode);

  if (!blockElement || blockElement.getAttribute('data-spoiler-shield') === '1') return;

  blurElement(blockElement, result, store);
}

function blurElement(el, result, store) {
  const wrapper = document.createElement('span');
  wrapper.setAttribute('data-spoiler-shield', '1');
  wrapper.setAttribute('data-spoiler-v4', 'true');
  wrapper.setAttribute('data-spoiler-why', result.reasoning ? result.reasoning.join(', ') : 'V4 Intelligence');

  const isBlock = /^(P|DIV|LI|ARTICLE|SECTION|BLOCKQUOTE|H[1-6]|TD|TH)$/i.test(el.nodeName);
  wrapper.className = isBlock
    ? 'spoiler-shield-wrapper spoiler-shield-block spoiler-shield-blur'
    : 'spoiler-shield-wrapper spoiler-shield-blur';
  
  el.parentNode && el.parentNode.insertBefore(wrapper, el);
  wrapper.appendChild(el);
  
  attachRevealHandlers(wrapper, store.settings);
}

function shouldSkip(node) {
  const tag = node.nodeName;
  if (!tag) return false;
  if (/(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|CODE|PRE|KBD|SAMP|SVG)/.test(tag)) return true;
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

function extractRelevantText(root) {
  let collected = root.textContent || '';
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
  if (el.querySelector) {
    const cap = el.querySelector('figcaption, [role="note"], [class*="caption" i]');
    if (cap) collected += ' ' + (cap.textContent || '');
  }
  return collected;
}

function processExisting(processor) {
  processor.walk(document.body, new WeakSet());
  const matchCount = document.querySelectorAll('.spoiler-shield-blur').length;
  
  try {
    chrome.runtime.sendMessage({ 
      type: 'spoiler-count-update', 
      count: matchCount 
    });
  } catch (e) {}
  
  try {
    const ts = new Date().toLocaleString();
    const example = document.querySelector('[data-spoiler-why]') && document.querySelector('[data-spoiler-why]').getAttribute('data-spoiler-why');
    chrome.storage.sync.set({ diagTs: ts, diagMatches: matchCount, diagWhy: example || '' });
  } catch {}
}

let __mutationObserver = null;

function observeMutations(processor) {
  if (__mutationObserver) {
    try { __mutationObserver.disconnect(); } catch {}
  }

  let mutationBatch = [];
  let batchTimeout = null;
  let processingInProgress = false;

  const processBatch = () => {
    if (mutationBatch.length === 0 || processingInProgress) return;
    
    processingInProgress = true;
    
    try {
      const batchToProcess = mutationBatch.splice(0, 100);
      const nodesToProcess = new Set();
      
      for (const m of batchToProcess) {
        if (m.target && m.target.nodeType === Node.ELEMENT_NODE && 
            m.target.getAttribute && m.target.getAttribute('data-spoiler-shield') === '1') {
          continue;
        }
        
        if (m.type === 'childList' && m.addedNodes) {
          m.addedNodes.forEach(n => {
            if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) {
              nodesToProcess.add(n);
            }
          });
        } else if (m.type === 'characterData') {
          const block = findContentBlock(m.target);
          if (block) nodesToProcess.add(block);
          else nodesToProcess.add(m.target);
        }
      }
      
      Array.from(nodesToProcess).slice(0, 50).forEach(n => {
        try { processor.walk(n, new WeakSet()); } catch (e) {}
      });
      
      if (mutationBatch.length > 0) {
        batchTimeout = setTimeout(processBatch, 80);
      } else {
        batchTimeout = null;
      }
      
    } finally {
      processingInProgress = false;
    }
  };

  const observer = new MutationObserver(mutations => {
    if (mutationBatch.length > 400) {
      mutationBatch = mutationBatch.slice(-100);
    }
    
    mutationBatch.push(...mutations);
    
    if (!batchTimeout && !processingInProgress) {
      batchTimeout = setTimeout(processBatch, 50);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['src','srcset','alt','title','poster','data-src','data-lazy-src', 'data-background']
  });

  __mutationObserver = observer;
  console.log('[V4.5] Mutation observer active');
}

let __spoilerShieldReprocessTimer = null;
function scheduleReprocess(immediate) {
  try {
    if (__spoilerShieldReprocessTimer) clearTimeout(__spoilerShieldReprocessTimer);
    __spoilerShieldReprocessTimer = setTimeout(() => { reprocessNow(); }, immediate ? 0 : 180);
  } catch {}
}

async function reprocessNow() {
  if (window.__spoilerShieldScanning) {
    return;
  }
  window.__spoilerShieldScanning = true;
  
  try {
    chrome.runtime.sendMessage({ type: 'badge-processing' }).catch(() => {});
    
    const store = await getSettings();
    const isEnabledForHost = evaluateEnablement(store);
    
    resetSpoilerShield();
    
    if (!isEnabledForHost) {
      chrome.runtime.sendMessage({ type: 'badge-clear' }).catch(() => {});
      return;
    }

    // V4: Initialize intelligence system
    await initializeV4System();
    
    if (!window.SpoilerShieldV4 || !window.SpoilerShieldV4.isActive()) {
      console.error('[V4.5] V4 system not active, cannot process');
      chrome.runtime.sendMessage({ type: 'badge-clear' }).catch(() => {});
      return;
    }

    const trackedMedia = extractTrackedMedia(store);
    if (!trackedMedia || trackedMedia.length === 0) {
      console.log('[V4.5] No tracked titles, nothing to process');
      chrome.runtime.sendMessage({ type: 'badge-clear' }).catch(() => {});
      return;
    }

    console.log('[V4.5] Processing with V4 intelligence for:', trackedMedia.map(m => m.title));

    installStyles(store);
    
    const processor = createV4Processor(trackedMedia, store);
    
    processExisting(processor);
    observeMutations(processor);
    
  } finally {
    window.__spoilerShieldScanning = false;
  }
}

function resetSpoilerShield() {
  try {
    const nodes = Array.from(document.querySelectorAll('[data-spoiler-shield="1"]'));
    nodes.reverse().forEach(el => {
      if (!el || !el.parentNode) return;
      const kind = el.getAttribute('data-spoiler-kind') || '';
      if (kind === 'text') {
        const tn = document.createTextNode(el.textContent || '');
        el.parentNode.replaceChild(tn, el);
        return;
      }
      if (el.classList && el.classList.contains('spoiler-shield-wrapper')) {
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        return;
      }
      if (el.nodeName === 'SPAN') {
        const tn = document.createTextNode(el.textContent || '');
        el.parentNode.replaceChild(tn, el);
      }
    });

    document.querySelectorAll('.spoiler-shield-overlay').forEach(o => o.remove());
    const style = document.querySelector('style[data-spoiler-shield-style]');
    if (style) style.remove();
  } catch {}
}

// V4 Test Helper
window.testSpoilerShieldV4 = async function(text, titles) {
  console.group('[V4.5 TEST]');
  console.log('Testing text:', text);
  console.log('With titles:', titles);
  
  if (!window.SpoilerShieldV4) {
    console.error('V4 not loaded');
    console.groupEnd();
    return { error: 'V4 not loaded' };
  }
  
  if (!window.SpoilerShieldV4.isActive()) {
    console.log('Initializing V4...');
    await window.SpoilerShieldV4.initialize();
  }
  
  const result = window.SpoilerShieldV4.processText(text, titles || []);
  console.log('Result:', result);
  console.log('Is Spoiler:', result.isSpoiler);
  console.log('Entities found:', result.entities?.length || 0);
  console.log('Events detected:', result.events?.length || 0);
  console.log('Reasoning:', result.reasoning);
  
  console.groupEnd();
  return result;
};

console.log('[V4.5] Spoiler Shield loaded with V4 Intelligence Only');
console.log('[V4.5] Test helper: testSpoilerShieldV4(text, titles)');