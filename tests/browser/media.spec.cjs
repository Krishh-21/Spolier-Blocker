const { test, expect, chromium } = require('@playwright/test');
const path = require('node:path');
test('popup category search, watched action, welcome and modern YouTube cards', async () => {
  const extension = path.resolve('extension');
  const context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = worker.url().split('/')[2]; await worker.evaluate(() => initialize());
    await expect.poll(() => context.pages().some(p => p.url().endsWith('/spoiler-shield-landing.html'))).toBe(true);
    const welcome = context.pages().find(p => p.url().endsWith('/spoiler-shield-landing.html'));
    await welcome.screenshot({ path: 'test-results/welcome-purple.png', fullPage: true });
    const popup = await context.newPage(); await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.getByLabel('Media category').selectOption('game');
    await popup.getByLabel('Search media', { exact: true }).fill('Elden Ring');
    await popup.getByRole('button', { name: 'Search', exact: true }).click();
    await popup.getByRole('button', { name: '+ Block spoilers', exact: true }).click();
    await expect(popup.locator('#status')).toContainText('Title protected');
    expect(await worker.evaluate(async () => (await config()).enabledPacks)).toContain('elden-ring');
    await popup.getByRole('button', { name: 'Mark as watched' }).click();
    await expect(popup.locator('#status')).toContainText('Marked as watched');
    expect(await worker.evaluate(async () => (await config()).enabledPacks)).not.toContain('elden-ring');
    await popup.setViewportSize({ width: 360, height: 760 });
    await popup.screenshot({ path: 'test-results/popup-purple.png', fullPage: true });
    await worker.evaluate(() => chrome.storage.local.set({ config: { customKeywords: ['Mira Vale'] } }));
    const page = await context.newPage();
    await page.route('https://www.youtube.com/**', route => route.fulfill({ contentType: 'text/html', body: '<div class="yt-lockup-view-model" id="video"><a><img alt="Thumbnail"><h3>Mira Vale walkthrough</h3></a></div><ytm-video-with-context-renderer id="mobile">Mira Vale guide</ytm-video-with-context-renderer>' }));
    await page.goto('https://www.youtube.com/');
    await expect(page.locator('#video')).toHaveClass(/ss2-covered/);
    await expect(page.locator('#mobile')).toHaveClass(/ss2-covered/);
    await page.locator('#video h3').evaluate(el => { el.textContent = 'An ordinary cooking video'; document.dispatchEvent(new Event('yt-navigate-finish')); });
    await expect(page.locator('#video')).not.toHaveClass(/ss2-covered/);
    await page.locator('#video h3').evaluate(el => { el.textContent = 'Mira Vale ending'; });
    await expect(page.locator('#video')).toHaveClass(/ss2-covered/);
  } finally { await context.close(); }
});
