'use strict';
// Loaded only in the service worker. Session credentials never enter content messages/backups.
const DEFAULT_LIMITS = Object.freeze({ free: 2, premium: 10, max: null });
async function accountRequest(path, { method = 'GET', data, revision } = {}) {
  await initialize();
  const origin = SpoilerAccount.origin;
  if (!origin) throw new Error('Account service is not configured in this build. Offline protection still works.');
  if (!await chrome.permissions.contains({ origins: [origin + '/*'] })) throw new Error('Enable account access in settings first.');
  const { accountSession } = await chrome.storage.local.get('accountSession');
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (accountSession?.token) headers.Authorization = 'Bearer ' + accountSession.token;
    if (revision !== undefined) headers['If-Match'] = String(revision);
    const response = await fetch(origin + '/api/' + path, { method, headers, credentials: 'omit', redirect: 'error', signal: controller.signal, ...(data ? { body: JSON.stringify(data) } : {}) });
    const reader = response.body.getReader(); let size = 0, text = ''; const decoder = new TextDecoder();
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 1100000) { await reader.cancel(); throw new Error('Account response is too large.'); } text += decoder.decode(value, { stream: true }); }
    const result = JSON.parse(text + decoder.decode());
    if (!response.ok) { const error = new Error(String(result.error || 'Account request failed.').slice(0, 300)); error.status = response.status; throw error; }
    return result;
  } catch (error) { if (error.status) throw error; throw new Error('Account service is unavailable. Local settings are unchanged.'); }
  finally { clearTimeout(timeout); }
}
function safeLimits(value) {
  const result = { ...DEFAULT_LIMITS };
  for (const tier of ['free', 'premium', 'max']) if (value?.[tier] === null || (Number.isSafeInteger(value?.[tier]) && value[tier] >= 0 && value[tier] <= C.LIMITS.keywords)) result[tier] = value[tier];
  return result;
}
async function entitlement(refresh = false) {
  await initialize();
  let { accountSession, accountPolicy } = await chrome.storage.local.get(['accountSession', 'accountPolicy']);
  if (refresh && SpoilerAccount.origin) {
    try {
      const data = await accountRequest(accountSession ? 'me' : 'policy');
      accountPolicy = safeLimits(data.limits);
      if (accountSession && data.user) { accountSession.user = data.user; await chrome.storage.local.set({ accountSession }); }
      await chrome.storage.local.set({ accountPolicy });
    } catch (error) {
      if (error.status === 401) { await chrome.storage.local.remove('accountSession'); accountSession = null; }
      else throw error;
    }
  }
  const tier = ['premium', 'max'].includes(accountSession?.user?.tier) ? accountSession.user.tier : 'free';
  const limits = safeLimits(accountPolicy);
  return { tier, limit: limits[tier], limits, user: accountSession?.user || null, origin: SpoilerAccount.origin, revision: accountSession?.revision || 0 };
}
async function enforceKeywordQuota(next, previous) {
  const { limit, tier } = await entitlement();
  // Preserve existing protection on upgrades/downgrades. Only expansion beyond quota is rejected.
  if (limit !== null && next.customKeywords.length > limit && next.customKeywords.length > previous.customKeywords.length) throw new Error(`${tier} allows ${limit} custom keyword entries. Remove an entry or change your plan.`);
}
async function accountAction(message) {
  switch (message.type) {
    case 'account-status': return { account: await entitlement(Boolean(message.refresh)) };
    case 'account-login': {
      if (!['login', 'register'].includes(message.mode)) throw new Error('Invalid account action.');
      const result = await accountRequest(message.mode, { method: 'POST', data: { email: message.email, password: message.password } });
      await chrome.storage.local.set({ accountSession: { token: result.token, user: result.user, revision: 0 }, accountPolicy: safeLimits(result.limits) });
      return { account: await entitlement() };
    }
    case 'account-logout': {
      let notice = '';
      try { await accountRequest('logout', { method: 'POST' }); } catch { notice = 'Signed out locally. The server session could not be revoked and will expire automatically.'; }
      await chrome.storage.local.remove('accountSession'); return { account: await entitlement(), notice };
    }
    case 'account-upload': {
      await entitlement(true);
      const { accountSession } = await chrome.storage.local.get('accountSession');
      if (!accountSession) throw new Error('Sign in first.');
      const result = await accountRequest('settings', { method: 'PUT', data: { config: await config() }, revision: accountSession.revision });
      accountSession.revision = result.revision; await chrome.storage.local.set({ accountSession }); return {};
    }
    case 'account-download': {
      await entitlement(true);
      const result = await accountRequest('settings');
      const { accountSession } = await chrome.storage.local.get('accountSession');
      if (!accountSession) throw new Error('Sign in first.');
      accountSession.revision = result.revision; await chrome.storage.local.set({ accountSession, accountPolicy: safeLimits(result.limits) });
      if (!result.config) throw new Error('No cloud settings saved yet. You can upload local settings.');
      return { config: await mutate(() => result.config) };
    }
    default: throw new Error('Unsupported account request.');
  }
}
