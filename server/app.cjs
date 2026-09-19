'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { DatabaseSync } = require('node:sqlite');
require('../extension/packs.js');
const C = require('../extension/core.js');
const scrypt = promisify(crypto.scrypt);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });
async function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}
async function passwordMatches(password, encoded) {
  const actual = Buffer.from(await passwordHash(password, encoded.split(':')[0]));
  const expected = Buffer.from(encoded);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
async function createPortal({ database = ':memory:', origin = 'http://127.0.0.1:4173', extensionOrigins = [], adminEmail, adminPassword, authLimit = 20 } = {}) {
  const site = new URL(origin);
  if (site.origin !== origin || (site.protocol !== 'https:' && !(site.protocol === 'http:' && site.hostname === '127.0.0.1'))) throw Error('Use an exact HTTPS site origin (or loopback HTTP for development).');
  if (extensionOrigins.some(value => !/^chrome-extension:\/\/[a-p]{32}$/.test(value))) throw Error('Use exact Chrome extension origins.');
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',tier TEXT NOT NULL DEFAULT 'free');
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,data TEXT NOT NULL,revision INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS policy(tier TEXT PRIMARY KEY,keyword_limit INTEGER);
    INSERT OR IGNORE INTO policy VALUES('free',2),('premium',10),('max',NULL);`);
  if (adminEmail && !db.prepare('SELECT id FROM users WHERE email=?').get(adminEmail.trim().toLowerCase())) {
    if (typeof adminPassword !== 'string' || adminPassword.length < 16) throw Error('Bootstrap admin password must contain at least 16 characters.');
    db.prepare('INSERT INTO users(id,email,password,role,tier) VALUES(?,?,?,?,?)').run(crypto.randomUUID(), adminEmail.trim().toLowerCase(), await passwordHash(adminPassword), 'admin', 'max');
  }
  const allowed = new Set([origin, ...extensionOrigins]);
  const attempts = new Map();
  const dummyHash = await passwordHash(crypto.randomBytes(32).toString('hex'));
  const policy = () => Object.fromEntries(db.prepare('SELECT * FROM policy').all().map(row => [row.tier, row.keyword_limit]));
  const publicUser = u => ({ id: u.id, email: u.email, role: u.role, tier: u.tier });
  async function body(req) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) throw fail(415, 'Send JSON.');
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 1050000) throw fail(413, 'Request is too large.'); chunks.push(chunk); }
    try { const result = JSON.parse(Buffer.concat(chunks)); if (!result || typeof result !== 'object' || Array.isArray(result)) throw Error(); return result; }
    catch { throw fail(400, 'Invalid JSON object.'); }
  }
  const server = http.createServer(async (req, res) => {
    const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      'Cache-Control': 'no-store', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
    if (origin.startsWith('https:')) headers['Strict-Transport-Security'] = 'max-age=31536000';
    if (allowed.has(req.headers.origin)) Object.assign(headers, { 'Access-Control-Allow-Origin': req.headers.origin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-Match', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' });
    const json = (status, data, extra = {}) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8', ...extra }); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, origin);
      if (req.method === 'OPTIONS') { if (!allowed.has(req.headers.origin)) throw fail(403, 'Origin not allowed.'); res.writeHead(204, headers); return res.end(); }
      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw fail(405, 'Method not allowed.');
        const routes = { '/': 'index.html', '/account': 'account.html', '/admin': 'admin.html', '/site.css': 'site.css', '/site.js': 'site.js', '/theme.js': 'theme.js', '/account.js': 'account.js', '/admin.js': 'admin.js', '/privacy': 'privacy.html' };
        const file = routes[url.pathname];
        if (!file) throw fail(404, 'Not found.');
        const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[path.extname(file)];
        res.writeHead(200, { ...headers, 'Content-Type': mime + '; charset=utf-8' });
        return res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(path.join(__dirname, file === 'theme.js' ? '../extension/theme.js' : '../website/' + file)));
      }
      // Cookie-authenticated writes require an exact trusted origin, including sign-in.
      if (['POST', 'PUT', 'DELETE'].includes(req.method) && !allowed.has(req.headers.origin)) throw fail(403, 'Origin not allowed.');
      if (url.pathname === '/api/policy' && req.method === 'GET') return json(200, { limits: policy(), capacity: C.LIMITS.keywords });
      if (['/api/login', '/api/register'].includes(url.pathname) && req.method === 'POST') {
        const key = req.socket.remoteAddress;
        const now = Date.now();
        for (const [ip, entry] of attempts) if (entry.until < now) attempts.delete(ip);
        const entry = attempts.get(key) || { count: 0, until: now + 600000 };
        if (++entry.count > authLimit) throw fail(429, 'Too many attempts. Try again in 10 minutes.');
        attempts.set(key, entry);
        const data = await body(req);
        const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 256) throw fail(400, 'Use a valid email and a password of 12–256 characters.');
        let user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
        if (url.pathname === '/api/register') {
          if (user) throw fail(409, 'Account cannot be created. Try signing in.');
          const id = crypto.randomUUID(), encoded = await passwordHash(data.password);
          try { db.prepare('INSERT INTO users(id,email,password) VALUES(?,?,?)').run(id, email, encoded); }
          catch { throw fail(409, 'Account cannot be created.'); }
          user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
        } else if (!await passwordMatches(data.password, user?.password || dummyHash) || !user) throw fail(401, 'Email or password is incorrect.');
        const token = crypto.randomBytes(32).toString('base64url');
        db.prepare('DELETE FROM sessions WHERE expires<?').run(now);
        db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), user.id, now + 30 * 86400000);
        return json(200, { user: publicUser(user), token, limits: policy() }, { 'Set-Cookie': `ss_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${origin.startsWith('https:') ? '; Secure' : ''}` });
      }
      const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : /(?:^|;\s*)ss_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
      const user = token && db.prepare('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.hash=? AND sessions.expires>?').get(digest(token), Date.now());
      if (!user) throw fail(401, 'Sign in to continue.');
      if (url.pathname === '/api/me' && req.method === 'GET') return json(200, { user: publicUser(user), limits: policy() });
      if (url.pathname === '/api/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(token));
        return json(200, { ok: true }, { 'Set-Cookie': 'ss_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
      }
      if (url.pathname === '/api/account' && req.method === 'DELETE') {
        const data = await body(req);
        if (user.role === 'admin') throw fail(403, 'Admin deletion requires server maintenance.');
        if (typeof data.password !== 'string' || data.password.length > 256 || !await passwordMatches(data.password, user.password)) throw fail(401, 'Password is incorrect.');
        db.prepare('DELETE FROM users WHERE id=?').run(user.id); return json(200, { ok: true });
      }
      if (url.pathname === '/api/settings' && req.method === 'GET') {
        const saved = db.prepare('SELECT * FROM settings WHERE user_id=?').get(user.id);
        return json(200, { config: saved ? JSON.parse(saved.data) : null, revision: saved?.revision || 0, limits: policy(), tier: user.tier });
      }
      if (url.pathname === '/api/settings' && req.method === 'PUT') {
        const data = await body(req), config = C.sanitize(data.config);
        if (!data.config || !Array.isArray(data.config.customKeywords)) throw fail(400, 'Invalid settings.');
        const limit = policy()[user.tier];
        if (limit !== null && config.customKeywords.length > limit) throw fail(403, `Your ${user.tier} tier allows ${limit} custom keywords.`);
        const serialized = JSON.stringify(config);
        if (Buffer.byteLength(serialized) > C.LIMITS.bytes) throw fail(413, 'Settings exceed device capacity.');
        const saved = db.prepare('SELECT revision FROM settings WHERE user_id=?').get(user.id);
        if (String(saved?.revision || 0) !== req.headers['if-match']) throw fail(409, 'Another device updated settings. Download the latest settings before uploading.');
        const revision = (saved?.revision || 0) + 1;
        db.prepare('INSERT INTO settings VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,revision=excluded.revision').run(user.id, serialized, revision);
        return json(200, { revision });
      }
      if (url.pathname.startsWith('/api/admin/')) {
        if (user.role !== 'admin') throw fail(403, 'Administrator access required.');
        if (url.pathname === '/api/admin/policy' && req.method === 'PUT') {
          const data = await body(req);
          for (const tier of ['free', 'premium', 'max']) if (data[tier] !== null && (!Number.isSafeInteger(data[tier]) || data[tier] < 0 || data[tier] > C.LIMITS.keywords)) throw fail(400, 'Limits must be null (unlimited) or 0–2000.');
          db.exec('BEGIN');
          try { for (const tier of ['free', 'premium', 'max']) db.prepare('UPDATE policy SET keyword_limit=? WHERE tier=?').run(data[tier], tier); db.exec('COMMIT'); }
          catch (error) { db.exec('ROLLBACK'); throw error; }
          return json(200, { limits: policy() });
        }
        if (url.pathname === '/api/admin/users' && req.method === 'GET') {
          const search = (url.searchParams.get('email') || '').slice(0, 254);
          return json(200, { users: db.prepare('SELECT id,email,role,tier FROM users WHERE instr(email,?)>0 ORDER BY email LIMIT 100').all(search) });
        }
        if (url.pathname === '/api/admin/tier' && req.method === 'PUT') {
          const data = await body(req);
          if (!['free', 'premium', 'max'].includes(data.tier) || typeof data.userId !== 'string') throw fail(400, 'Invalid tier or user.');
          if (!db.prepare('UPDATE users SET tier=? WHERE id=?').run(data.tier, data.userId).changes) throw fail(404, 'User not found.');
          return json(200, { ok: true });
        }
      }
      throw fail(404, 'Not found.');
    } catch (error) { if (!res.headersSent) json(error.status || 500, { error: error.status ? error.message : 'Request failed.' }); else res.end(); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.on('close', () => db.close());
  return server;
}
module.exports = { createPortal };
if (require.main === module) {
  const directory = path.join(__dirname, 'data'); fs.mkdirSync(directory, { recursive: true });
  const port = Number(process.env.PORT || 4173);
  createPortal({ database: path.join(directory, 'portal.sqlite'), origin: process.env.SITE_ORIGIN || `http://127.0.0.1:${port}`,
    extensionOrigins: (process.env.EXTENSION_ORIGINS || '').split(',').filter(Boolean), adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD })
    .then(server => server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Spoiler Shield website: http://127.0.0.1:${port}`)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
