import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';

const helpers = await import('../public/exercises.js');
const serverModule = await import('../server.js');

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

test('extracts the source clock and converts AM/PM to HH:MM:SS', () => {
  assert.equal(typeof helpers.extractTime, 'function', 'time extraction must be implemented');
  assert.equal(helpers.extractTime('<p>11:11:11</p><span id="theTime">03:41:59 AM</span>'), '03:41:59');
  assert.equal(helpers.extractTime('<span class="fontTS" id="theTime">3:07:09 PM</span>'), '15:07:09');
  assert.equal(helpers.extractTime('<span id="theTime">12:00:00 AM</span>'), '00:00:00');
  assert.equal(helpers.extractTime('<span id="theTime">12:00:00 PM</span>'), '12:00:00');
  assert.equal(helpers.extractTime('<span id="theTime">23:59:58</span>'), '23:59:58');
  assert.throws(() => helpers.extractTime('<p>Page unavailable 12:45:00</p>'), /clock|время/i);
  assert.throws(() => helpers.extractTime('<span id="theTime">27:10:10</span>'), /clock|время/i);
});

test('measures complete sequential and concurrent responses with real HTTP requests', async (t) => {
  assert.equal(typeof helpers.measureRequests, 'function', 'benchmark must be implemented');
  let active = 0;
  let maxActive = 0;
  const starts = [];
  const upstream = createServer((req, res) => {
    starts.push(req.url);
    active += 1;
    maxActive = Math.max(active, maxActive);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('begin');
    setTimeout(() => { active -= 1; res.end(' end'); }, req.url === '/first' ? 80 : 120);
  });
  t.after(() => upstream.close());
  const base = await listen(upstream);
  const result = await helpers.measureRequests([`${base}/first`, `${base}/second`]);
  assert.deepEqual(starts, ['/first', '/second', '/first', '/second']);
  assert.equal(maxActive, 2, 'Promise.all must overlap requests');
  assert.equal(result.sequential.responses[0].body, 'begin end');
  assert.equal(result.concurrent.responses[1].body, 'begin end');
  assert.ok(result.sequential.milliseconds >= 180, 'must include delayed bodies');
  assert.ok(result.concurrent.milliseconds >= 110, 'must include the slower body');
  assert.ok(result.concurrent.milliseconds < result.sequential.milliseconds);
});

test('/login and /id/N satisfy the fetch checker without outgoing Content-Type', async (t) => {
  assert.equal(typeof serverModule.createApp, 'function', 'HTTP application must be implemented');
  const requests = [];
  const upstream = createServer((req, res) => {
    requests.push({ url: req.url, method: req.method, contentType: req.headers['content-type'] });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ login: 'fixture-user' }));
  });
  t.after(() => upstream.close());
  const upstreamBase = await listen(upstream);
  const app = serverModule.createApp({ usersBase: `${upstreamBase}/users/` });
  t.after(() => app.close());
  const base = await listen(app);
  const login = await fetch(`${base}/login`);
  assert.equal(await login.text(), 'nkochubeev');
  const user = await fetch(`${base}/id/7`);
  assert.equal(user.status, 200);
  assert.equal(await user.text(), 'fixture-user');
  assert.deepEqual(requests, [{ url: '/users/7', method: 'GET', contentType: undefined }]);
  assert.equal((await fetch(`${base}/id/not-a-number`)).status, 404);
});

test('the time relay returns source HTML with CORS headers and handles upstream failures', async (t) => {
  assert.equal(typeof serverModule.createApp, 'function');
  const upstream = createServer((req, res) => {
    if (req.url === '/error') { res.writeHead(503); res.end('unavailable'); return; }
    res.end('<span id="theTime">7:08:09 PM</span>');
  });
  t.after(() => upstream.close());
  const upstreamBase = await listen(upstream);
  const app = serverModule.createApp({ timeUrl: `${upstreamBase}/clock` });
  const failingApp = serverModule.createApp({ timeUrl: `${upstreamBase}/error` });
  t.after(() => { app.close(); failingApp.close(); });
  const [base, failingBase] = await Promise.all([listen(app), listen(failingApp)]);
  const response = await fetch(`${base}/api/time`);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(helpers.extractTime(await response.text()), '19:08:09');
  assert.equal((await fetch(`${failingBase}/api/time`)).status, 502);
});

test('Dictionary proxy keeps the runtime key on the server and reports a missing key', async (t) => {
  let upstreamQuery;
  const upstream = createServer((req, res) => {
    upstreamQuery = new URL(req.url, 'http://localhost').searchParams;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ def: [{ tr: [{ text: 'tea' }] }] }));
  });
  t.after(() => upstream.close());
  const upstreamBase = await listen(upstream);
  const app = serverModule.createApp({ dictionaryKey: 'fixture-key-not-real', dictionaryUrl: `${upstreamBase}/lookup` });
  const unconfigured = serverModule.createApp({ dictionaryKey: '' });
  t.after(() => { app.close(); unconfigured.close(); });
  const [base, unconfiguredBase] = await Promise.all([listen(app), listen(unconfigured)]);
  const query = new URLSearchParams({ text: 'чай & кофе', lang: 'ru-en' });
  const response = await fetch(`${base}/api/dictionary?${query}`);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.equal(JSON.parse(body).def[0].tr[0].text, 'tea');
  assert.ok(!body.includes('fixture-key-not-real'));
  assert.equal(upstreamQuery.get('key'), 'fixture-key-not-real');
  assert.equal(upstreamQuery.get('text'), 'чай & кофе');
  assert.equal(upstreamQuery.get('lang'), 'ru-en');
  assert.equal((await fetch(`${base}/api/dictionary?text=x&lang=en-ru`)).status, 400);
  assert.equal((await fetch(`${unconfiguredBase}/api/dictionary?${query}`)).status, 503);
});
