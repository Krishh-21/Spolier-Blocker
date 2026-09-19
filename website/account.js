'use strict';
const $ = id => document.getElementById(id);
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
async function api(path, method = 'GET', data) {
  const response = await fetch('/api/' + path, { method, headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
}
async function refresh() {
  try {
    const { user, limits } = await api('me'); $('auth').hidden = true; $('profile').hidden = false;
    $('accountEmail').textContent = user.email; $('plan').textContent = `${user.tier.toUpperCase()} · ${limits[user.tier] === null ? 'No tier quota for' : limits[user.tier]} custom keyword entries`;
    $('adminLink').hidden = user.role !== 'admin';
    const saved = await api('settings'); $('cloud').textContent = saved.config ? `Cloud settings saved · revision ${saved.revision}` : 'No cloud settings yet. Upload from the extension when you are ready.';
  } catch { $('auth').hidden = false; $('profile').hidden = true; }
}
for (const [form, email, password] of [['login', 'email', 'password'], ['register', 'newEmail', 'newPassword']]) $(form).addEventListener('submit', async event => {
  event.preventDefault(); const button = $(form).querySelector('button'); button.disabled = true;
  try { await api(form, 'POST', { email: $(email).value, password: $(password).value }); $(password).value = ''; status('Signed in.'); await refresh(); }
  catch (error) { status(error.message, true); } finally { button.disabled = false; }
});
$('logout').addEventListener('click', async () => { try { await api('logout', 'POST'); await refresh(); status('Signed out.'); } catch (error) { status(error.message, true); } });
$('exportCloud').addEventListener('click', async () => { try {
  const saved = await api('settings'); if (!saved.config) throw Error('There are no cloud settings to download.');
  const url = URL.createObjectURL(new Blob([JSON.stringify(saved.config, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'spoiler-shield-cloud-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
} catch (error) { status(error.message, true); } });
$('deleteAccount').addEventListener('click', async () => { try {
  if (!confirm('Permanently delete this account and its cloud settings?')) return;
  await api('account', 'DELETE', { password: $('deletePassword').value }); $('deletePassword').value = ''; await refresh(); status('Account deleted.');
} catch (error) { status(error.message, true); } });
refresh();
