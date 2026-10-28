import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';

const module = await import('../checkinator-server.mjs');

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

test('exposes only checker routes, forwards the real numeric ID and logs no request data', async (t) => {
  assert.equal(typeof module.createCheckinatorServer, 'function', 'the isolated checker runtime must exist');
  const calls = [];
  const upstream = createServer((req, res) => {
    calls.push({ path: req.url, method: req.method, contentType: req.headers['content-type'] });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ login: 'fixture-login', extra: 'must-not-return' }));
  });
  t.after(() => upstream.close());
  const upstreamBase = await listen(upstream);
  const logs = [];
  const app = module.createCheckinatorServer({ usersBase: `${upstreamBase}/users/`, logger: event => logs.push(event) });
  t.after(() => app.close());
  const base = await listen(app);

  const health = await fetch(`${base}/`);
  assert.equal(health.status, 200);
  assert.equal(await health.text(), 'checkinator ready');
  const login = await fetch(`${base}/login`);
  assert.equal(login.status, 200);
  assert.equal(await login.text(), 'nkochubeev');
  const user = await fetch(`${base}/id/7?private=must-not-log`);
  assert.equal(user.status, 200);
  assert.equal(user.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await user.text(), 'fixture-login');
  assert.deepEqual(calls, [{ path: '/users/7', method: 'GET', contentType: undefined }]);

  for (const path of ['/index.html', '/server.js', '/.env', '/translator/', '/api/time', '/api/dictionary', '/id/no-number']) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 404, path);
    await response.text();
  }
  const post = await fetch(`${base}/id/7`, { method: 'POST', body: 'must-not-log' });
  assert.equal(post.status, 404);
  await post.text();
  assert.equal(calls.length, 1, 'denied routes must never reach an upstream');

  const allowedKeys = new Set(['time', 'method', 'routecategory', 'id', 'status', 'duration']);
  assert.equal(logs.length, 11);
  for (const log of logs) {
    assert.ok(Object.keys(log).every(key => allowedKeys.has(key)));
    assert.match(log.time, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(log.duration >= 0);
    if ('id' in log) assert.ok(Number.isSafeInteger(log.id));
  }
  assert.ok(logs.some(log => log.routecategory === 'id' && log.id === 7 && log.status === 200));
  assert.ok(!JSON.stringify(logs).includes('must-not'));
  assert.ok(!JSON.stringify(logs).includes('private'));
});
