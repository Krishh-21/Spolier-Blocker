const { test, expect, chromium } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
let context, worker, extensionId, profile;
test.beforeAll(async () => {
  const extension = path.resolve(__dirname, '../../extension');
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'spoiler-shield-test-'));
  context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  extensionId = worker.url().split('/')[2];
  await worker.evaluate(() => initialize());
});
test.afterAll(async () => { await context?.close(); fs.rmSync(profile, { recursive: true, force: true }); });
async function configure(config) {
  await worker.evaluate(async config => { await chrome.storage.local.set({ config }); const tabs = await chrome.tabs.query({}); await Promise.all(tabs.map(t => chrome.tabs.sendMessage(t.id, { type: 'config-changed' }).catch(() => {}))); }, config);
}
async function pageWith(html, config = { customKeywords: ['Mira Vale'] }) {
  await configure(config);
  const page = await context.newPage();
  await page.route('https://fixture.example/**', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>${html}</body></html>` }));
  await page.goto('https://fixture.example/');
  return page;
}
async function shadowNodes(page) {
  const client = await context.newCDPSession(page);
  const { root } = await client.send('DOM.getDocument', { depth: -1, pierce: true });
  const nodes = [];
  function visit(node) { nodes.push(node); for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) visit(child); }
  visit(root); return { client, nodes };
}
async function clickShadowButton(page, label) {
  // The overlay positions itself on animation frames. Wait for a stable painted
  // layout before reading coordinates, as Playwright's normal click does.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const { client, nodes } = await shadowNodes(page);
  try {
    const node = nodes.find(n => n.nodeName === 'BUTTON' && n.children?.some(c => c.nodeValue.includes(label)));
    expect(node, 'Closed-shadow button: ' + label).toBeTruthy();
    const { model } = await client.send('DOM.getBoxModel', { nodeId: node.nodeId });
    await page.mouse.click((model.content[0] + model.content[4]) / 2, (model.content[1] + model.content[5]) / 2);
  } finally { await client.detach(); }
}
test('covers custom keywords, preserves page DOM, restores and stays disabled', async () => {
  const page = await pageWith('<article id="post"><a href="/next">Mira Vale dies</a><img alt="portrait"></article><p id="safe">A normal post</p>');
  await expect(page.locator('#post')).toHaveClass(/ss2-covered/);
  await expect(page.locator('#safe')).not.toHaveClass(/ss2-covered/);
  expect(await page.locator('#post').evaluate(el => el.parentElement.tagName)).toBe('BODY');
  await configure({ settings: { enabled: false }, customKeywords: ['Mira Vale'] });
  await expect(page.locator('#post')).not.toHaveClass(/ss2-covered/);
  await page.evaluate(() => { const p = document.createElement('p'); p.id = 'later'; p.textContent = 'Mira Vale dies'; document.body.append(p); });
  await expect(page.locator('#later')).not.toHaveClass(/ss2-covered/);
  await expect(page.locator('.ss2-control')).toHaveCount(0);
  await page.close();
});
test('handles 180 new cards, lazy alt attributes, recycled text and short spoilers', async () => {
  const page = await pageWith('<p id="changing">Safe initially</p><img id="lazy" alt="loading">');
  await page.evaluate(() => {
    document.getElementById('lazy').alt = 'Mira Vale';
    document.getElementById('changing').firstChild.data = 'Mira Vale';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 180; i++) { const p = document.createElement('p'); p.className = 'batch'; p.textContent = 'Mira Vale ' + i; fragment.append(p); }
    document.body.append(fragment);
  });
  await expect(page.locator('.batch.ss2-covered')).toHaveCount(180, { timeout: 15000 });
  await expect(page.locator('#lazy')).toHaveClass(/ss2-covered/);
  await expect(page.locator('#changing')).toHaveClass(/ss2-covered/);
  await page.locator('#changing').evaluate(el => { el.textContent = 'Safe again'; });
  await expect(page.locator('#changing')).not.toHaveClass(/ss2-covered/);
  await page.close();
});
test('does not alter editors; catches spoilers beyond old 3000-element limit', async () => {
  const page = await pageWith('<div contenteditable="true"><p id="editor">Mira Vale</p></div><article id="replyCard"><p id="postText">Mira Vale</p><textarea id="reply">My draft</textarea></article>' + '<div><span>safe</span></div>'.repeat(3100) + '<p id="last">Mira Vale</p>');
  await expect(page.locator('#last')).toHaveClass(/ss2-covered/, { timeout: 15000 });
  await expect(page.locator('#editor')).not.toHaveClass(/ss2-covered/);
  await expect(page.locator('#postText')).toHaveClass(/ss2-covered/);
  await expect(page.locator('#replyCard')).not.toHaveClass(/ss2-covered/);
  await expect(page.locator('#reply')).toBeEditable();
  await page.close();
});
test('renders untrusted titles as text; saves settings and previews backup imports', async () => {
  const page = await context.newPage();
  await configure({ selectedMedia: [{ title: '<img src=x onerror=alert(1)>', phrases: [] }] });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.locator('#save')).toBeEnabled();
  await expect(page.locator('#titles')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#titles img')).toHaveCount(0);
  await page.locator('#keywords').fill('Mira Vale\nA different title');
  await page.locator('#save').click();
  await expect(page.locator('#status')).toContainText('Saved');
  await page.locator('#importFile').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 2, settings: {}, customKeywords: ['restored'], tmdbToken: 'NEVER IMPORT' })) });
  await expect(page.locator('#importPreview')).toBeVisible();
  await page.locator('#confirmImport').click();
  await expect(page.locator('#keywords')).toHaveValue('restored');
  expect(await worker.evaluate(async () => (await chrome.storage.local.get('tmdbToken')).tmdbToken)).toBeUndefined();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/settings.png', fullPage: true });
  await page.close();
});
test('reveal is deliberate, does not navigate links, re-hides and protects recycled cards', async () => {
  const page = await pageWith('<article id="post"><a href="/next">Mira Vale dies</a></article>', { customKeywords: ['Mira Vale'], settings: { reblurAfterMs: 1000, showReveal: true } });
  await expect(page.locator('#post')).toHaveClass(/ss2-covered/);
  await expect(page.locator('#post')).toHaveAttribute('aria-hidden', 'true');
  await clickShadowButton(page, 'Spoiler hidden');
  await expect(page.locator('#post')).not.toHaveClass(/ss2-covered/);
  expect(page.url()).toBe('https://fixture.example/');
  await expect(page.locator('#post')).toHaveClass(/ss2-covered/, { timeout: 3000 });
  await clickShadowButton(page, 'Spoiler hidden');
  await page.locator('#post').evaluate(el => { el.textContent = 'Mira Vale new spoiler'; });
  await expect(page.locator('#post')).toHaveClass(/ss2-covered/);
  await page.close();
});

test('preview is opt-in, keeps original hidden, and works on YouTube with a separate switch', async () => {
  const page = await context.newPage();
  await page.route('https://www.youtube.com/**', route => route.fulfill({ contentType: 'text/html', body: '<article id="post">Mira Vale secret</article>' }));
  await configure({ customKeywords: ['Mira Vale'] }); await page.goto('https://www.youtube.com/');
  await expect(page.locator('#post')).toHaveClass(/ss2-covered/);
  let tree = await shadowNodes(page);
  expect(tree.nodes.filter(n => n.nodeName === 'BUTTON').every(n => n.attributes.includes('hidden'))).toBe(true); await tree.client.detach();
  await configure({ customKeywords: ['Mira Vale'], settings: { showReveal: true } });
  await expect.poll(async () => { const t = await shadowNodes(page); const found = t.nodes.some(n => n.nodeName === 'BUTTON' && n.children?.some(c => c.nodeValue === 'Preview')); await t.client.detach(); return found; }).toBe(true);
  await clickShadowButton(page, 'Preview');
  await expect(page.locator('#post')).toHaveClass(/ss2-covered/);
  await expect.poll(async () => { const t = await shadowNodes(page); const open = t.nodes.some(n => n.nodeName === 'DIALOG' && n.attributes.includes('open')); await t.client.detach(); return open; }).toBe(true);
  await clickShadowButton(page, 'Close preview');
  await configure({ customKeywords: ['Mira Vale'], settings: { showReveal: true, previewOnYouTube: false } });
  await expect.poll(async () => { const t = await shadowNodes(page); const found = t.nodes.some(n => n.nodeName === 'BUTTON' && n.children?.some(c => c.nodeValue === 'Preview')); await t.client.detach(); return found; }).toBe(false);
  await configure({ customKeywords: ['Mira Vale'], settings: { protectYouTube: false } });
  await expect(page.locator('#post')).not.toHaveClass(/ss2-covered/); await page.close();
});

test('all four concealment styles apply and restore page state', async () => {
  for (const [presentation, className] of [['cover', 'ss2-covered'], ['pixelated', 'ss2-covered'], ['blur', 'ss2-blurred'], ['motion', 'ss2-motion']]) {
    const page = await pageWith('<p id="post">Mira Vale secret</p>', { customKeywords: ['Mira Vale'], settings: { presentation } });
    await expect(page.locator('#post')).toHaveClass(new RegExp(className));
    expect(await page.locator('#post').evaluate(el => el.inert)).toBe(true);
    if (presentation === 'motion') await expect(page.locator('#ss2-motion-filter')).toHaveCount(1);
    await configure({ settings: { enabled: false } });
    await expect(page.locator('#post')).not.toHaveClass(/ss2-/);
    expect(await page.locator('#post').evaluate(el => el.inert)).toBe(false);
    await page.close();
  }
});

test('title suggestions populate aliases and Free quota reports a useful error', async () => {
  await configure({}); const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.locator('#save')).toBeEnabled();
  await page.locator('#newTitle').fill('Elden Ring');
  expect(await page.locator('#newAliases').inputValue()).toContain('Malenia');
  await page.locator('#keywords').fill('one\ntwo\nthree'); await page.locator('#save').click();
  await expect(page.locator('#status')).toContainText('allows 2');
  await page.close();
});

test('extension theme persists across popup and settings and follows system changes', async () => {
  const page = await context.newPage(); await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.locator('[data-theme-select]').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(245, 245, 237)');
  await page.reload(); await expect(page.locator('[data-theme-select]')).toHaveValue('light');
  const popup = await context.newPage(); await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator('html')).toHaveAttribute('data-theme', 'light');
  await popup.locator('[data-theme-select]').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('[data-theme-select]').selectOption('system');
  await page.emulateMedia({ colorScheme: 'light' }); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' }); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'test-results/extension-dark.png', fullPage: true });
  await page.close(); await popup.close();
});
test('each iframe runs protection and per-site exclusions do not match lookalikes', async () => {
  const page = await pageWith('<p id="top">Mira Vale</p><iframe src="https://fixture.example/frame"></iframe>', { customKeywords: ['Mira Vale'], settings: { excludeDomains: ['notfixture.example'] } });
  // Route fulfills both documents; frame markup is bounded to avoid nested iframe creation.
  await page.route('https://fixture.example/frame', route => route.fulfill({ contentType: 'text/html', body: '<p id="framed">Mira Vale</p>' }));
  await page.locator('iframe').evaluate(el => { el.src = 'https://fixture.example/frame'; });
  await expect(page.locator('#top')).toHaveClass(/ss2-covered/);
  await expect(page.frameLocator('iframe').locator('#framed')).toHaveClass(/ss2-covered/);
  await page.close();
});
