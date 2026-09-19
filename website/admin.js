'use strict';
const $ = id => document.getElementById(id);
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
async function api(path, method = 'GET', data) { const response = await fetch('/api/' + path, { method, headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) }); const result = await response.json(); if (!response.ok) throw Error(result.error); return result; }
async function users() {
  const data = await api('admin/users?email=' + encodeURIComponent($('searchEmail').value)); $('users').replaceChildren();
  for (const user of data.users) {
    const row = document.createElement('div'); row.className = 'account-row';
    const text = document.createElement('span'); text.textContent = `${user.email} · ${user.role}`;
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Plan for ' + user.email);
    for (const tier of ['free', 'premium', 'max']) { const option = document.createElement('option'); option.value = tier; option.textContent = tier; select.append(option); }
    select.value = user.tier; const button = document.createElement('button'); button.className = 'button light small'; button.textContent = 'Save plan';
    button.addEventListener('click', async () => { button.disabled = true; try { await api('admin/tier', 'PUT', { userId: user.id, tier: select.value }); status('Plan saved.'); } catch (error) { status(error.message, true); } finally { button.disabled = false; } });
    row.append(text, select, button); $('users').append(row);
  }
}
$('policy').addEventListener('submit', async event => { event.preventDefault(); try {
  const data = {};
  for (const tier of ['free', 'premium', 'max']) { const value = $(tier).value.trim().toLowerCase(); if (value !== 'unlimited' && !/^\d+$/.test(value)) throw Error('Enter a non-negative number or unlimited.'); data[tier] = value === 'unlimited' ? null : Number(value); }
  await api('admin/policy', 'PUT', data); status('Limits saved. Connected clients refresh on account access.');
} catch (error) { status(error.message, true); } });
$('findUsers').addEventListener('submit', event => { event.preventDefault(); users().catch(error => status(error.message, true)); });
(async () => { const data = await api('me'); if (data.user.role !== 'admin') throw Error('Administrator access required. Sign in with your administrator account.');
  for (const tier of ['free', 'premium', 'max']) $(tier).value = data.limits[tier] === null ? 'unlimited' : data.limits[tier];
  $('adminContent').hidden = false; await users(); status('Administrator access verified.');
})().catch(error => status(error.message + ' Use the My account link to sign in.', true));
