const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPortal } = require('../server/app.cjs');

test('portal authorization, configurable quotas, isolated settings, conflicts and session revocation', async () => {
  const origin = 'http://127.0.0.1:4173';
  const server = await createPortal({ origin, adminEmail: 'admin@example.test', adminPassword: 'test-admin-password-only', authLimit: 100 });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function api(path, method = 'GET', body, token, extra = {}) {
    const res = await fetch(base + '/api/' + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, data: await res.json(), headers: res.headers };
  }
  try {
    assert.equal((await api('admin/users')).status, 401);
    const registration = await api('register', 'POST', { email: 'user@example.test', password: 'test-user-password-only', role: 'admin', tier: 'max' });
    const token = registration.data.token;
    assert.equal(registration.data.user.tier, 'free'); assert.equal(registration.data.user.role, 'user');
    assert.match(registration.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    assert.equal((await api('admin/users', 'GET', null, token)).status, 403);
    assert.equal((await api('register', 'POST', { email: 'evil@example.test', password: 'test-user-password-only' }, null, { Origin: 'https://evil.example' })).status, 403);
    const config = { customKeywords: ['one', 'two', 'three'], settings: { showReveal: true }, tmdbToken: 'SECRET', accountSession: { token: 'SECRET' } };
    assert.equal((await api('settings', 'PUT', { config }, token, { 'If-Match': '0' })).status, 403);
    const admin = (await api('login', 'POST', { email: 'admin@example.test', password: 'test-admin-password-only' })).data.token;
    assert.equal((await api('admin/policy', 'PUT', { free: 3, premium: 10, max: null }, admin)).status, 200);
    assert.equal((await api('settings', 'PUT', { config }, token, { 'If-Match': '0' })).status, 200);
    const saved = await api('settings', 'GET', null, token);
    assert.equal(saved.data.config.customKeywords.length, 3); assert.equal(JSON.stringify(saved.data).includes('SECRET'), false);
    assert.equal((await api('settings', 'PUT', { config }, token, { 'If-Match': '0' })).status, 409);
    const other = (await api('register', 'POST', { email: 'other@example.test', password: 'test-other-password' })).data.token;
    assert.equal((await api('settings', 'GET', null, other)).data.config, null);
    assert.equal((await api('admin/tier', 'PUT', { userId: registration.data.user.id, tier: 'premium' }, admin)).status, 200);
    assert.equal((await api('me', 'GET', null, token)).data.user.tier, 'premium');
    assert.equal((await api('admin/policy', 'PUT', { free: -1, premium: 10, max: null }, admin)).status, 400);
    assert.equal((await api('logout', 'POST', null, token)).status, 200);
    assert.equal((await api('me', 'GET', null, token)).status, 401);
    const login = (await api('login', 'POST', { email: 'user@example.test', password: 'test-user-password-only' })).data.token;
    assert.equal((await api('account', 'DELETE', { password: 'test-user-password-only' }, login)).status, 200);
    assert.equal((await api('me', 'GET', null, login)).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('authentication throttles repeated guesses', async () => {
  const server = await createPortal({ authLimit: 2 });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/login`, { method: 'POST', headers: { Origin: 'http://127.0.0.1:4173', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'none@example.test', password: 'not-the-password' }) });
      assert.equal(response.status, i < 2 ? 401 : 429); await response.text();
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
