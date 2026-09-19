const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
test('real Express/middleware stack: health stays local, API failure is redacted, rate limit enforced', async () => {
  const file = path.resolve('Spolier blocker v1/Spolier blocker Cursor new/tmdb-proxy/server.js');
  const localRequire = createRequire(file);
  let server, fetches = 0;
  const express = localRequire('express');
  const wrapper = () => {
    const app = express();
    app.listen = () => { server = require('node:http').createServer(app).listen(0, '127.0.0.1'); return server; };
    return app;
  };
  wrapper.json = express.json;
  const sandbox = { process: { env: { DEFAULT_TMDB_KEY: 'DUMMY_TEST_KEY', PORT: '0' } }, URLSearchParams, console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (name === 'express') return wrapper;
      if (name === 'dotenv') return { config() {} };
      if (name === 'node-fetch') return async () => { fetches++; throw new Error('request to https://api.themoviedb.org?api_key=DUMMY_TEST_KEY failed'); };
      return localRequire(name);
    } };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = { Origin: 'chrome-extension://test' };
  try {
    for (let i = 0; i < 5; i++) {
      const response = await fetch(origin + '/health', { headers });
      assert.equal(response.status, 200); assert.equal((await response.text()).includes('DUMMY_TEST_KEY'), false);
    }
    assert.equal(fetches, 0);
    const failure = await fetch(origin + '/3/movie/1', { headers });
    assert.equal(failure.status, 502); assert.equal((await failure.text()).includes('DUMMY_TEST_KEY'), false);
    let limited;
    for (let i = 0; i < 101; i++) { const r = await fetch(origin + '/3/disallowed', { headers }); await r.text(); limited = r.status; }
    assert.equal(limited, 429);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
