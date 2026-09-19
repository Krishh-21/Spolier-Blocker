(function () {
  'use strict';
  if (globalThis.__ss2) { globalThis.__ss2.reload(); return; }
  const C = SpoilerCore;
  const cards = 'ytd-rich-item-renderer,ytd-video-renderer,ytd-compact-video-renderer,yt-lockup-view-model,ytd-reel-item-renderer,shreddit-post,[data-testid="tweet"],[data-testid="post-container"],article';
  const blocks = 'p,li,blockquote,td,th,h1,h2,h3,h4,h5,h6,figcaption,[role="listitem"]';
  const ignored = 'script,style,noscript,textarea,input,select,option,button,code,pre,svg,canvas,[contenteditable]:not([contenteditable="false"]),[role="textbox"],.ss2-control';
  let current = null, detector = null, legacy = null, active = false;
  let observer = null, pending = new Set(), walkers = [], timer = null, revision = 0;
  let positionFrame = null, countTimer = null;
  const marked = new Map();
  const seen = new WeakMap();
  let inspected = new Set();
  function send(message) { return chrome.runtime.sendMessage(message).catch(() => null); }
  function skipped(el) { return !el || !el.isConnected || Boolean(el.closest(ignored)); }
  function targetFor(el) {
    if (skipped(el) || ['HTML', 'BODY'].includes(el.tagName)) return null;
    const candidate = el.closest(cards) || el.closest(blocks) || el;
    // A post can contain an inline reply editor. Never hide that editor with its card.
    const editors = 'textarea,input,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]';
    if (!candidate.querySelector(editors)) return candidate;
    const block = el.closest(blocks) || el;
    return block.querySelector(editors) ? null : block;
  }
  function textFor(el) {
    // Keep matching in the page; never send page text or URLs to the background.
    const parts = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement?.closest(ignored) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let node;
    while ((node = walk.nextNode())) parts.push(node.data);
    if (current.settings.blurImages) {
      const media = [el, ...el.querySelectorAll('img,video,[aria-label],[title]')];
      for (const item of media) {
        if (item.closest(ignored)) continue;
        for (const attr of ['alt', 'title', 'aria-label']) parts.push(item.getAttribute(attr) || '');
        if (['IMG', 'VIDEO'].includes(item.tagName)) {
          for (const attr of ['src', 'poster', 'data-src']) {
            try { const path = new URL(item.getAttribute(attr), location.href).pathname; parts.push(decodeURIComponent(path)); } catch {}
          }
        }
      }
    }
    return parts.join(' ').trim();
  }
  function detect(text) {
    // Scan every chunk, with overlap so boundary-spanning phrases still match.
    for (let offset = 0; offset < text.length; offset += 10000) {
      const result = detector(text.slice(offset, offset + 12000));
      if (result.blocked) return result;
    }
    return { blocked: false };
  }
  function restore(el) {
    const record = marked.get(el);
    if (!record) return;
    clearTimeout(record.timer);
    el.classList.remove('ss2-covered', 'ss2-blurred', 'ss2-motion');
    if (record.surface) record.surface.hidden = true;
    if (record.aria === null) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', record.aria);
    el.inert = record.inert;
    if (record.radius) el.style.setProperty('--ss2-radius', record.radius); else el.style.removeProperty('--ss2-radius');
    record.host.remove();
    marked.delete(el);
  }
  function hide(el, record) {
    if (!el.isConnected || !active) return;
    record.revealed = false;
    el.classList.add(current.settings.presentation === 'blur' ? 'ss2-blurred' : current.settings.presentation === 'motion' ? 'ss2-motion' : 'ss2-covered');
    record.surface.hidden = !['cover', 'pixelated'].includes(current.settings.presentation);
    el.setAttribute('aria-hidden', 'true'); el.inert = true;
    record.button.textContent = 'Spoiler hidden · Reveal';
    record.button.setAttribute('aria-label', 'Reveal hidden spoiler');
    position();
  }
  function reveal(el, record) {
    record.revealed = true;
    el.classList.remove('ss2-covered', 'ss2-blurred', 'ss2-motion');
    if (record.surface) record.surface.hidden = true;
    if (record.aria === null) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', record.aria);
    el.inert = record.inert;
    record.button.textContent = 'Hide again';
    record.button.setAttribute('aria-label', 'Hide spoiler again');
    clearTimeout(record.timer);
    if (current.settings.reblurAfterMs) record.timer = setTimeout(() => hide(el, record), current.settings.reblurAfterMs);
    position();
  }
  function conceal(el, text) {
    if (marked.has(el)) {
      const old = marked.get(el);
      if (old.text !== text) { old.text = text; hide(el, old); }
      return;
    }
    for (const [child] of marked) if (el.contains(child)) restore(child);
    const host = document.createElement('span');
    host.className = 'ss2-control';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = '.surface{position:absolute;inset:0;background:#13251f;border-radius:8px;pointer-events:none}.surface.pixelated{background-color:#172e26;background-image:conic-gradient(#284d3d 25%,#183128 0 50%,#355b48 0 75%,#1c382e 0);background-size:24px 24px}.surface[hidden]{display:none}button{position:relative;pointer-events:auto;margin:4px}:host{color-scheme:dark}button{font:600 12px/1.3 system-ui;background:#153c35;color:#fff;border:1px solid #76ddc4;border-radius:8px;padding:8px 12px;cursor:pointer;max-width:240px;box-shadow:0 2px 8px #0006}button:focus-visible{outline:3px solid #ffd36a;outline-offset:2px}';
    const button = document.createElement('button'); button.type = 'button';
    const surface = document.createElement('span'); surface.className = 'surface' + (current.settings.presentation === 'pixelated' ? ' pixelated' : ''); surface.setAttribute('aria-hidden', 'true');
    button.hidden = !current.settings.showReveal;
    shadow.append(style, surface, button); document.documentElement.append(host);
    const record = { host, button, surface, aria: el.getAttribute('aria-hidden'), inert: el.inert, radius: el.style.getPropertyValue('--ss2-radius'), revealed: false, text, timer: null };
    marked.set(el, record);
    el.style.setProperty('--ss2-radius', `${current.settings.blurRadiusPx}px`);
    button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); record.revealed ? hide(el, record) : reveal(el, record); });
    const onYouTube = /(^|\.)youtube\.com$/.test(location.hostname);
    if (current.settings.showReveal && (!onYouTube || current.settings.previewOnYouTube)) {
      const preview = document.createElement('button'); preview.type = 'button'; preview.textContent = 'Preview';
      const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', 'Spoiler preview');
      dialog.style.cssText = 'position:fixed;inset:10vh auto auto 50%;transform:translateX(-50%);width:min(600px,85vw);max-height:75vh;overflow:auto;background:#14261f;color:#effaf2;padding:24px;border:1px solid #76ddc4;border-radius:16px;font:16px/1.6 system-ui;pointer-events:auto';
      const heading = document.createElement('h2'); heading.textContent = 'Spoiler preview';
      const content = document.createElement('p'); content.style.whiteSpace = 'pre-wrap';
      const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close preview';
      close.addEventListener('click', () => dialog.close());
      dialog.append(heading, content, close); shadow.append(preview, dialog);
      preview.addEventListener('click', () => { content.textContent = record.text.slice(0, 12000); dialog.showModal(); });
    }
    if (current.settings.showReveal && current.settings.revealOnHover) {
      host.addEventListener('mouseenter', () => reveal(el, record));
      host.addEventListener('mouseleave', () => hide(el, record));
    }
    hide(el, record);
  }
  function inspect(el) {
    const target = targetFor(el);
    if (!target || skipped(target)) return;
    if (inspected.has(target)) return;
    inspected.add(target);
    // Avoid processing smaller descendants when the full card already owns the decision.
    const text = textFor(target);
    if (seen.get(target)?.revision === revision && seen.get(target)?.text === text) return;
    seen.set(target, { revision, text });
    if (detect(text).blocked) conceal(target, text); else restore(target);
  }
  function schedule() { if (active && timer === null) timer = setTimeout(flush, 0); }
  function enqueue(node) {
    if (!active || !node) return;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!el || el.nodeType !== Node.ELEMENT_NODE || skipped(el)) return;
    pending.add(el);
    // Overflow becomes one complete rescan; nodes are never silently discarded.
    if (pending.size > 500) { pending.clear(); pending.add(document.body); walkers = []; }
    schedule();
  }
  function flush() {
    timer = null;
    if (!active) return;
    inspected = new Set();
    const deadline = performance.now() + 8;
    let steps = 0;
    while (performance.now() < deadline && steps++ < 100) {
      if (!walkers.length) {
        const root = pending.values().next().value;
        if (!root) break;
        pending.delete(root);
        if (!root.isConnected) continue;
        inspect(root);
        walkers.push(document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
          acceptNode: n => n.nodeType === Node.ELEMENT_NODE && n.matches(ignored) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        }));
      }
      const node = walkers[0].nextNode();
      if (!node) { walkers.shift(); continue; }
      if (node.nodeType === Node.TEXT_NODE && node.data.trim()) inspect(node.parentElement);
      else if (node.nodeType === Node.ELEMENT_NODE && node.matches('img,video,[aria-label],[title]')) inspect(node);
    }
    for (const [el] of marked) if (!el.isConnected) restore(el);
    position();
    clearTimeout(countTimer);
    countTimer = setTimeout(() => send({ type: 'count', count: marked.size, active }), 100);
    if (pending.size || walkers.length) schedule();
  }
  function position() {
    if (positionFrame !== null) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = null;
      for (const [el, record] of marked) {
        const rect = el.getBoundingClientRect();
        const visible = el.isConnected && rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
        record.host.style.setProperty('display', visible ? 'block' : 'none', 'important');
        if (visible) {
          record.host.style.setProperty('width', `${rect.width}px`, 'important');
          record.host.style.setProperty('height', `${rect.height}px`, 'important');
          record.host.style.setProperty('left', `${rect.left}px`, 'important');
          record.host.style.setProperty('top', `${rect.top}px`, 'important');
        }
      }
    });
  }
  function stop() {
    active = false;
    document.getElementById('ss2-motion-filter')?.parentElement?.remove();
    observer?.disconnect(); observer = null;
    clearTimeout(timer); timer = null;
    clearTimeout(countTimer); pending.clear(); walkers = [];
    for (const [el] of marked) restore(el);
  }
  async function reload() {
    const ownRevision = ++revision;
    stop();
    const result = await send({ type: 'get-config' });
    if (ownRevision !== revision || !result?.ok) return;
    current = C.sanitize(result.config);
    active = C.enabled(current.settings, location.hostname);
    await send({ type: 'count', count: 0, active });
    if (!active || ownRevision !== revision) return;
    try { legacy ||= new V4SpoilerDetector(); } catch {}
    detector = C.createDetector(current, legacy);
    if (current.settings.presentation === 'motion' && !document.getElementById('ss2-motion-filter')) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg'); svg.classList.add('ss2-control');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
      const filter = document.createElementNS(ns, 'filter'); filter.id = 'ss2-motion-filter';
      filter.setAttribute('x', '-50%'); filter.setAttribute('y', '-20%'); filter.setAttribute('width', '200%'); filter.setAttribute('height', '140%');
      const blur = document.createElementNS(ns, 'feGaussianBlur'); blur.setAttribute('stdDeviation', `${current.settings.blurRadiusPx} 3`);
      filter.append(blur); svg.append(filter); document.documentElement.append(svg);
    }
    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.target.nodeType === Node.ELEMENT_NODE && record.target.closest('.ss2-control')) continue;
        if (record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(n => n.nodeType === Node.ELEMENT_NODE && n.matches('.ss2-control'))) continue;
        if (record.type === 'childList') {
          enqueue(record.target);
          for (const added of record.addedNodes) enqueue(added);
        } else enqueue(record.target);
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['alt', 'title', 'aria-label', 'src', 'srcset', 'poster', 'data-src'] });
    enqueue(document.body);
  }
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (['config-changed', 'rescan'].includes(message?.type)) reload();
    if (message?.type === 'reveal-all' && current?.settings.showReveal) for (const [el, record] of marked) reveal(el, record);
    if (message?.type === 'hide-all') for (const [el, record] of marked) hide(el, record);
    if (message?.type === 'status') { respond({ count: marked.size, active }); return false; }
  });
  addEventListener('scroll', position, { passive: true, capture: true });
  addEventListener('resize', position, { passive: true });
  addEventListener('pagehide', stop);
  addEventListener('pageshow', event => { if (event.persisted) reload(); });
  globalThis.__ss2 = { reload };
  if (document.body) reload(); else document.addEventListener('DOMContentLoaded', reload, { once: true });
})();
