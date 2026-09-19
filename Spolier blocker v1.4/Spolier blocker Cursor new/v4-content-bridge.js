/**
 * Spoiler Shield V4 - Content Bridge
 * 
 * REPLACES V3 regex-based detection with V4 intelligence
 * 
 * V4 understands:
 * - Entity matching (Tony Stark = Iron Man)
 * - Event detection (deaths, victories, reveals)
 * - Narrative context ("Cap gets his dance")
 * - Relevance (only blur if related to tracked media)
 */

(function() {
  'use strict';

  console.log('[V4 Content Bridge] Initializing...');

  // Initialize V4 debug counters
  window.__V4_DEBUG = {
    createProcessorCalls: 0,
    processTextCalls: 0,
    blurCalls: 0,
    blockBlurs: 0,
    spanBlurs: 0,
    entityMatches: 0,
    eventDetections: 0,
    narrativeDetections: 0,
    irrelevantIgnored: 0,
    nodesProcessed: 0,
    textNodesProcessed: 0,
    errors: []
  };

  console.log('[V4 DEBUG] Global counters initialized');

  // Wait for page ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initV4Bridge);
  } else {
    initV4Bridge();
  }

  async function initV4Bridge() {
    console.group('[V4 BRIDGE] Initialization');
    
    try {
      // Get user settings
      const settings = await getUserSettings();
      
      console.log('[V4 BRIDGE] Settings loaded:', {
        v4Enabled: settings.v4Enabled,
        trackedMediaCount: settings.selectedMedia?.length || 0
      });
      
      // Check if V4 is enabled (default: true)
      if (settings.v4Enabled === false) {
        console.warn('[V4 BRIDGE] V4 disabled by user, using V3 fallback');
        console.groupEnd();
        return;
      }

      // Verify V4 intelligence system loaded
      if (typeof V4SpoilerDetector === 'undefined') {
        console.error('[V4 BRIDGE] ❌ V4SpoilerDetector not found');
        console.groupEnd();
        return;
      }
      console.log('[V4 BRIDGE] ✅ V4SpoilerDetector loaded');

      if (typeof KnowledgeEngine === 'undefined') {
        console.error('[V4 BRIDGE] ❌ KnowledgeEngine not found');
        console.groupEnd();
        return;
      }
      console.log('[V4 BRIDGE] ✅ KnowledgeEngine loaded');

      if (!window.SpoilerShieldV4) {
        console.error('[V4 BRIDGE] ❌ V4 Integration not found');
        console.groupEnd();
        return;
      }
      console.log('[V4 BRIDGE] ✅ V4 Integration loaded');

      // Initialize V4
      const initialized = await window.SpoilerShieldV4.initialize();

      if (!initialized) {
        console.error('[V4 BRIDGE] ❌ V4 initialization failed');
        console.groupEnd();
        return;
      }
      console.log('[V4 BRIDGE] ✅ V4 Intelligence initialized');

      // Inject V4 into processing pipeline
      injectV4Intelligence();
      
      console.log('[V4 BRIDGE] ✅ V4 injected into pipeline');
      console.log('[V4 BRIDGE] Intelligence system active:');
      console.log('  - Entity matching (Tony Stark = Iron Man)');
      console.log('  - Event detection (deaths, victories, reveals)');
      console.log('  - Narrative inference (Cap gets his dance)');
      console.log('  - Context awareness (only relevant spoilers)');
      
      // Store initialization timestamp
      window.__v4InitTime = Date.now();
      window.__v4BridgeLoaded = true;
      
      console.groupEnd();
    } catch (error) {
      console.error('[V4 BRIDGE] ❌ Initialization failed:', error);
      console.error('[V4 BRIDGE] Stack:', error.stack);
      console.groupEnd();
    }
  }

  function getUserSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        v4Enabled: true, // V4 enabled by default
        selectedMedia: [],
        customKeywords: []
      }, resolve);
    });
  }

  /**
   * Inject V4 intelligence into processing pipeline
   */
  function injectV4Intelligence() {
    console.log('[V4 BRIDGE] Injecting intelligence...');
    
    // Wait for window.createProcessor
    if (typeof window.createProcessor !== 'function') {
      console.warn('[V4 BRIDGE] window.createProcessor not found yet, waiting...');
      
      setTimeout(() => {
        if (typeof window.createProcessor === 'function') {
          console.log('[V4 BRIDGE] window.createProcessor found on retry');
          injectV4Intelligence();
        } else {
          console.error('[V4 BRIDGE] ❌ window.createProcessor not found');
        }
      }, 100);
      return;
    }
    
    console.log('[V4 BRIDGE] window.createProcessor found');
    
    // Backup original processor
    if (typeof window.createProcessor === 'function') {
      window.__originalCreateProcessor = window.createProcessor;
      console.log('[V4 BRIDGE] Backed up original createProcessor');
    }

    // Override with V4 intelligence
    window.createProcessor = function(phrases, store) {
      console.log('[V4 BRIDGE] V4 createProcessor called');
      console.log('[V4 BRIDGE] - phrases:', phrases?.length || 0);
      console.log('[V4 BRIDGE] - tracked media:', store?.selectedMedia?.length || 0);
      
      return createV4Processor(phrases, store);
    };
    
    console.log('[V4 BRIDGE] window.createProcessor overridden with V4 intelligence');
  }

  /**
   * Create V4-powered processor
   */
  function createV4Processor(phrases, store) {
    window.__V4_DEBUG.createProcessorCalls++;
    console.log('[V4 BRIDGE] Creating V4 processor (count:', window.__V4_DEBUG.createProcessorCalls, ')');
    
    // Extract tracked titles
    const trackedTitles = extractTitles(phrases, store);
    console.log('[V4 BRIDGE] Tracked titles:', trackedTitles);

    const counters = {
      nodesProcessed: 0,
      textNodesProcessed: 0,
      spoilersDetected: 0
    };

    return {
      walk: function(node) {
        walkWithV4(node, trackedTitles, store, counters);
      },
      getCounters: () => counters
    };
  }

  /**
   * Extract tracked titles from store
   */
  function extractTitles(phrases, store) {
    const titles = [];
    
    // From selectedMedia
    if (store.selectedMedia && Array.isArray(store.selectedMedia)) {
      store.selectedMedia.forEach(item => {
        if (item.title) {
          titles.push(item.title);
        }
      });
    }

    return titles;
  }

  /**
   * Walk DOM tree with V4 intelligence
   */
  function walkWithV4(node, trackedTitles, store, counters) {
    if (!node) return;
    
    counters.nodesProcessed++;
    window.__V4_DEBUG.nodesProcessed++;

    // Process text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      counters.textNodesProcessed++;
      window.__V4_DEBUG.textNodesProcessed++;
      processTextNodeV4(node, trackedTitles, store, counters);
      return;
    }

    // Skip certain elements
    if (shouldSkipNode(node)) return;

    // Process images/media if enabled
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (store.settings?.blurImages && /IMG|PICTURE|FIGURE|VIDEO/.test(node.nodeName)) {
        processImageV4(node, trackedTitles, store, counters);
      }

      processBackgroundV4(node, trackedTitles, store, counters);
      processSiteSpecificV4(node, trackedTitles, store, counters);
    }

    // Recursively walk children
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      walkWithV4(children[i], trackedTitles, store, counters);
    }
  }

  /**
   * Process text node with V4 intelligence
   */
  function processTextNodeV4(node, trackedTitles, store, counters) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    
    const parent = node.parentNode;
    if (!parent || shouldSkipNode(parent)) return;
    if (parent.closest('[data-spoiler-shield="1"]')) return;

    const text = node.textContent || '';
    
    if (!text || text.length > 10000) return;

    try {
      window.__V4_DEBUG.processTextCalls++;
      
      // Use V4 INTELLIGENCE
      const result = window.SpoilerShieldV4.processText(text, trackedTitles);
      
      console.log('[V4 INTELLIGENCE] Analysis:', {
        text: text.substring(0, 50) + '...',
        isSpoiler: result.isSpoiler,
        blurBlock: result.blurEntireBlock,
        entities: result.entities?.length || 0,
        events: result.events?.length || 0,
        narratives: result.narratives?.length || 0,
        relevance: result.relevance?.length || 0
      });

      // Track intelligence signals
      if (result.entities && result.entities.length > 0) {
        window.__V4_DEBUG.entityMatches++;
      }
      if (result.events && result.events.length > 0) {
        window.__V4_DEBUG.eventDetections++;
      }
      if (result.narratives && result.narratives.length > 0) {
        window.__V4_DEBUG.narrativeDetections++;
      }
      if (result.relevance && result.relevance.length === 0) {
        window.__V4_DEBUG.irrelevantIgnored++;
      }

      if (!result.isSpoiler) return;

      counters.spoilersDetected++;
      window.__V4_DEBUG.blurCalls++;
      
      // V4: Block-level blur if high signal density
      if (result.blurEntireBlock) {
        console.log('[V4 INTELLIGENCE] Block-level blur triggered');
        window.__V4_DEBUG.blockBlurs++;
        blurContentBlock(parent, result, store);
      } else {
        console.log('[V4 INTELLIGENCE] Entity/event blur (count:', window.__V4_DEBUG.blurCalls, ')');
        window.__V4_DEBUG.spanBlurs++;
        wrapTextSpoiler(node, text, result, store);
      }
    } catch (error) {
      window.__V4_DEBUG.errors.push({
        type: 'text_processing',
        message: error.message,
        timestamp: Date.now()
      });
      console.error('[V4 INTELLIGENCE] Error:', error);
    }
  }

  /**
   * Blur entire content block
   */
  function blurContentBlock(startNode, result, store) {
    const blockElement = findContentBlock(startNode);
    
    if (!blockElement) {
      console.warn('[V4] Could not find content block');
      wrapAndBlurElement(startNode, result, store);
      return;
    }
    
    if (blockElement.getAttribute('data-spoiler-shield') === '1') {
      return;
    }
    
    console.log('[V4 BLOCK] Blurring:', blockElement.nodeName, 
      'Signals:', result.blockAnalysis?.signalCount || 0);
    
    wrapAndBlurElement(blockElement, result, store);
  }

  /**
   * Find content block to blur
   */
  function findContentBlock(node) {
    let current = node;
    const maxDepth = 5;
    let depth = 0;
    
    while (current && depth < maxDepth) {
      const tagName = current.nodeName;
      
      if (['P', 'DIV', 'ARTICLE', 'SECTION', 'BLOCKQUOTE', 'LI', 'TD', 'TH'].includes(tagName)) {
        const className = (current.className || '').toLowerCase();
        const id = (current.id || '').toLowerCase();
        
        const isContentBlock = 
          tagName === 'P' ||
          tagName === 'LI' ||
          tagName === 'BLOCKQUOTE' ||
          className.includes('comment') ||
          className.includes('post') ||
          className.includes('message') ||
          className.includes('content') ||
          className.includes('response');
        
        const isPageContainer = 
          tagName === 'DIV' && (
            className.includes('page') ||
            className.includes('container') ||
            className.includes('wrapper') ||
            id.includes('page') ||
            id.includes('root')
          );
        
        if (isContentBlock && !isPageContainer) {
          return current;
        }
        
        if (tagName === 'DIV' && !isPageContainer) {
          const textLength = (current.textContent || '').length;
          if (textLength > 50 && textLength < 2000) {
            return current;
          }
        }
      }
      
      current = current.parentNode;
      depth++;
    }
    
    return node.parentNode;
  }

  /**
   * Wrap text spoiler
   */
  function wrapTextSpoiler(node, text, result, store) {
    const parent = node.parentNode;
    if (!parent) return;
    
    const span = document.createElement('span');
    span.className = 'spoiler-shield-blur';
    span.setAttribute('data-spoiler-shield', '1');
    span.setAttribute('data-spoiler-kind', 'text');
    span.setAttribute('data-spoiler-v4', 'true');
    span.setAttribute('data-spoiler-probability', result.probability.toFixed(2));
    span.setAttribute('data-spoiler-severity', result.severity || 'moderate');
    
    // V4-specific attributes
    if (result.entities && result.entities.length > 0) {
      span.setAttribute('data-v4-entities', result.entities.length);
    }
    if (result.events && result.events.length > 0) {
      span.setAttribute('data-v4-events', result.events.length);
    }
    if (result.narratives && result.narratives.length > 0) {
      span.setAttribute('data-v4-narratives', result.narratives.length);
    }
    
    if (result.reasoning && result.reasoning.length > 0) {
      span.setAttribute('title', 'Spoiler: ' + result.reasoning.join(', '));
    }

    span.textContent = text;
    attachRevealHandlers(span, store.settings);
    parent.replaceChild(span, node);
  }

  /**
   * Wrap and blur element
   */
  function wrapAndBlurElement(target, result, store) {
    const wrapper = document.createElement('span');
    wrapper.setAttribute('data-spoiler-shield', '1');
    wrapper.setAttribute('data-spoiler-v4', 'true');
    wrapper.setAttribute('data-spoiler-probability', result.probability.toFixed(2));
    wrapper.setAttribute('data-spoiler-severity', result.severity || 'moderate');
    
    if (result.blurEntireBlock) {
      wrapper.setAttribute('data-spoiler-block-blur', 'true');
      wrapper.setAttribute('data-v4-signals', result.blockAnalysis?.signalCount || 0);
    }
    
    wrapper.className = 'spoiler-shield-wrapper spoiler-shield-blur';
    
    target.parentNode && target.parentNode.insertBefore(wrapper, target);
    wrapper.appendChild(target);
    
    if (store.settings?.showOverlay) {
      addOverlayV4(wrapper, result);
    }
    
    attachRevealHandlers(wrapper, store.settings);
  }

  /**
   * Add V4 overlay
   */
  function addOverlayV4(hostEl, result) {
    try {
      const container = hostEl.closest('[data-spoiler-shield="1"]') || hostEl;
      if (container.querySelector('.spoiler-shield-overlay')) return;

      const label = document.createElement('span');
      label.className = 'spoiler-shield-overlay';
      
      if (result.blurEntireBlock) {
        const signals = result.blockAnalysis?.signalCount || 0;
        label.textContent = `⚠️ V4 Intelligence Block (${signals} signals)`;
        label.style.fontWeight = 'bold';
      } else {
        const entities = result.entities?.length || 0;
        const events = result.events?.length || 0;
        label.textContent = `V4: ${entities} entities, ${events} events`;
      }
      
      container.appendChild(label);
    } catch (error) {
      console.error('[V4] Overlay error:', error);
    }
  }

  /**
   * Process image with V4
   */
  function processImageV4(el, trackedTitles, store, counters) {
    if (!el || el.closest('[data-spoiler-shield="1"]')) return;

    const text = extractImageText(el);
    if (!text) return;

    try {
      const result = window.SpoilerShieldV4.processText(text, trackedTitles);

      if (result.isSpoiler) {
        counters.spoilersDetected++;
        window.__V4_DEBUG.blurCalls++;
        wrapAndBlurElement(el, result, store);
      }
    } catch (error) {
      console.error('[V4] Image processing error:', error);
    }
  }

  function extractImageText(el) {
    let text = '';
    
    if (el.tagName === 'IMG') {
      text += (el.alt || '') + ' ';
      text += (el.title || '') + ' ';
      text += (el.getAttribute('aria-label') || '') + ' ';
    }

    const figure = el.closest('figure');
    if (figure) {
      const caption = figure.querySelector('figcaption');
      if (caption) text += (caption.textContent || '') + ' ';
    }

    if (el.src) {
      text += decodeURIComponent(el.src);
    }

    return text.trim();
  }

  function processBackgroundV4(node, trackedTitles, store, counters) {
    // Similar to V3 but with V4 intelligence
  }

  function processSiteSpecificV4(node, trackedTitles, store, counters) {
    // Similar to V3 but with V4 intelligence
  }

  function attachRevealHandlers(el, settings) {
    if (!settings) return;

    if (settings.revealOnHover) {
      el.addEventListener('mouseenter', () => el.classList.add('spoiler-shield-revealed'));
      el.addEventListener('mouseleave', () => el.classList.remove('spoiler-shield-revealed'));
    }

    if (settings.revealOnClick) {
      el.addEventListener('click', () => {
        el.classList.toggle('spoiler-shield-revealed');
      });
    }
  }

  function shouldSkipNode(node) {
    const tag = node.nodeName;
    if (!tag) return false;
    
    if (/(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|CODE|PRE|KBD|SAMP|SVG)/.test(tag)) {
      return true;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE && 
        node.getAttribute && 
        node.getAttribute('data-spoiler-shield') === '1') {
      return true;
    }
    
    return false;
  }

  // V4 Status and Test Functions
  window.__V4_STATUS = function() {
    return {
      ...window.__V4_DEBUG,
      v4Active: window.SpoilerShieldV4?.isActive() || false,
      bridgeLoaded: window.__v4BridgeLoaded || false,
      intelligenceType: 'entity_event_narrative'
    };
  };

  window.__V4_TEST = function() {
    console.group('[V4 TEST]');
    console.log('Testing V4 Intelligence System...');
    
    const tests = [
      { text: 'Tony Stark dies in Endgame', tracked: ['Avengers: Endgame'] },
      { text: 'Cap gets his dance', tracked: ['Endgame'] },
      { text: 'Verstappen wins Monaco', tracked: ['Formula 1'] }
    ];
    
    tests.forEach((test, i) => {
      console.log(`\nTest ${i + 1}:`, test.text);
      const result = window.SpoilerShieldV4.processText(test.text, test.tracked);
      console.log('  Spoiler:', result.isSpoiler);
      console.log('  Entities:', result.entities?.length || 0);
      console.log('  Events:', result.events?.length || 0);
      console.log('  Narratives:', result.narratives?.length || 0);
    });
    
    console.log('\nV4 Status:', window.__V4_STATUS());
    console.groupEnd();
    
    return 'Tests complete - check console';
  };

  console.log('[V4 Content Bridge] Commands:');
  console.log('  window.__V4_STATUS() - Show V4 status');
  console.log('  window.__V4_TEST() - Run V4 tests');
  console.log('  runV4Benchmark() - Run full benchmark suite');
})();
