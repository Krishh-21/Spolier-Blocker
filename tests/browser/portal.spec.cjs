const { test, expect, chromium } = require('@playwright/test');
const { createPortal } = require('../../server/app.cjs');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
let server, base, context, extensionId, worker, directory;
test.beforeAll(async () => {
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve)); base = `http://127.0.0.1:${port}`;
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'spoiler-portal-'));
  const extension = path.join(directory, 'extension'); fs.cpSync(path.resolve('extension'), extension, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'))); manifest.optional_host_permissions.push(base + '/*');
  // Simulate the user's host-permission consent; native permission prompts cannot be accepted in headless Chromium.
  manifest.host_permissions = [base + '/*'];
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(extension, 'account-config.js'), 'globalThis.SpoilerAccount = Object.freeze(' + JSON.stringify({ origin: base }) + ');');
  context = await chromium.launchPersistentContext(path.join(directory, 'profile'), { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'); extensionId = worker.url().split('/')[2];
  await worker.evaluate(() => initialize());
  server = await createPortal({ origin: base, extensionOrigins: ['chrome-extension://' + extensionId], adminEmail: 'admin@example.test', adminPassword: 'test-admin-password-only' });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
});
test.afterAll(async () => { await context?.close(); if (server) await new Promise(resolve => server.close(resolve)); if (directory) fs.rmSync(directory, { recursive: true, force: true }); });

test('landing is responsive, interactive, and renders without CSP errors', async () => {
  const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(base);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('plot twist');
  await page.getByRole('button', { name: 'Pixelated', exact: true }).click(); await expect(page.locator('#demoContent')).toHaveClass(/pixelated/);
  await page.locator('#demoPreview').click(); await expect(page.locator('#demoDialog')).toBeVisible(); await page.locator('#closeDemo').click();
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/landing-mobile.png', fullPage: true });
  expect(errors).toEqual([]); await page.close();
});

test('website theme persists across account/admin pages and honors system preferences', async () => {
  const page = await context.newPage(); await page.goto(base);
  await page.locator('[data-theme-select]').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(16, 28, 24)');
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: 'test-results/landing-dark.png' });
  await page.goto(base + '/account'); await expect(page.locator('[data-theme-select]')).toHaveValue('dark');
  await page.goto(base + '/admin'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('[data-theme-select]').selectOption('light'); await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('[data-theme-select]').selectOption('system');
  await page.emulateMedia({ colorScheme: 'dark' }); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' }); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto(base); await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.close();
});

test('admin changes limits and plans; non-admin account never sees admin controls', async () => {
  const page = await context.newPage(); await page.goto(base + '/account');
  await page.locator('#email').fill('admin@example.test'); await page.locator('#password').fill('test-admin-password-only'); await page.locator('#login button').click();
  await expect(page.locator('#adminLink')).toBeVisible(); await page.locator('#adminLink').click();
  await expect(page.locator('#adminContent')).toBeVisible(); await page.locator('#free').fill('3'); await page.locator('#policy button').click();
  await expect(page.locator('#status')).toContainText('Limits saved');
  await page.screenshot({ path: 'test-results/admin.png', fullPage: true });
  await page.goto(base + '/account'); await page.locator('#logout').click();
  await page.locator('#newEmail').fill('reader@example.test'); await page.locator('#newPassword').fill('test-reader-password-only'); await page.locator('#register button').click();
  await expect(page.locator('#profile')).toBeVisible(); await expect(page.locator('#adminLink')).toBeHidden();
  await page.goto(base + '/admin'); await expect(page.locator('#status')).toContainText('Administrator access required'); await expect(page.locator('#adminContent')).toBeHidden();
  await page.close();
});

test('configured extension signs in and round-trips settings without credentials', async () => {
  const page = await context.newPage(); await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.locator('#accountLogin')).toBeEnabled();
  await page.locator('#accountEmail').fill('reader@example.test'); await page.locator('#accountPassword').fill('test-reader-password-only');
  await page.locator('#accountLogin').click();
  await expect(page.locator('#status')).toContainText('Signed in');
  await expect(page.locator('#accountStatus')).toContainText('reader@example.test');
  await page.locator('#keywords').fill('Mira Vale\nOther topic\nThird topic'); await page.locator('#save').click();
  await expect(page.locator('#status')).toContainText('Saved');
  await page.locator('#accountUpload').click(); await expect(page.locator('#status')).toContainText('uploaded');
  await page.locator('#keywords').fill('changed'); await page.locator('#save').click(); await expect(page.locator('#status')).toContainText('Saved');
  await page.locator('#accountDownload').click(); await expect(page.locator('#cloudPreview')).toBeVisible(); await page.locator('#confirmCloud').click();
  await expect(page.locator('#keywords')).toHaveValue('Mira Vale\nOther topic\nThird topic');
  const saved = await worker.evaluate(async () => accountRequest('settings'));
  expect(JSON.stringify(saved)).not.toContain('token'); expect(saved.config.customKeywords.length).toBe(3);
  await page.locator('#accountLogout').click(); await expect(page.locator('#accountStatus')).toContainText('Not signed in'); await page.close();
});
