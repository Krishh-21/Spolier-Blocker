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
  const page = await pageWith('<article id="post"><a href="/next">Mira Vale dies</a></article>', { customKeywords: ['Mira Vale'], settings: { reblurAfterMs: 1000 } });
  await expect(page.locator('#post')).toHaveClass(/ss2-covered/);
  await expect(page.locator('#post')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('.ss2-control').click();
  await expect(page.locator('#post')).not.toHaveClass(/ss2-covered/);
  expect(page.url()).toBe('https://fixture.example/');
  await expect(page.locator('#post')).toHaveClass(/ss2-covered/, { timeout: 3000 });
  await page.locator('.ss2-control').click();
  await page.locator('#post').evaluate(el => { el.textContent = 'Mira Vale new spoiler'; });
  await expect(page.locator('#post')).toHaveClass(/ss2-covered/);
  await page.close();
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
