import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { before, after, beforeEach, afterEach, test } from 'node:test';
import { chromium } from 'playwright';

let server, browser, page, origin;
let requests = new Map();
let packageEntry, packageName;
const timers = new Set();
const fixtures = {
  '/normal': '<title>  Книга &amp; Кофе  </title><h1>  Первый  заголовок &amp; текст  </h1><h1>Второй</h1>',
  '/empty': '<title>   </title><h1> \n </h1>',
  '/absent': '<p>Без title и h1</p>',
  '/unsafe': '<title>&lt;img src=x onerror=alert(1)&gt;</title><h1>&lt;svg onload=alert(1)&gt;</h1>',
  '/fast': '<title>Новый</title><h1>Свежий</h1>',
  '/slow': '<title>Старый</title><h1>Устаревший</h1>'
};

before(async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  packageName = manifest.name;
  packageEntry = import.meta.resolve(packageName);
  server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    requests.set(path, (requests.get(path) ?? 0) + 1);
    if (path === '/package-entry.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(await readFile(new URL(packageEntry)));
    } else if (path === '/' || path === '/pages/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><meta charset="utf-8"><script type="importmap">${JSON.stringify({ imports: { [packageName]: '/package-entry.js' } })}</script><script type="module">import ${JSON.stringify(packageName)};</script>`);
    } else if (path === '/network-error') {
      req.socket.destroy();
    } else if (fixtures[path]) {
      const finish = () => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fixtures[path]); };
      if (path === '/slow') {
        const timer = setTimeout(() => { timers.delete(timer); finish(); }, 250);
        timers.add(timer);
      } else finish();
    } else {
      res.writeHead(404); res.end('missing');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
});

after(async () => {
  for (const timer of timers) clearTimeout(timer);
  await browser?.close();
  server?.closeAllConnections();
  if (server) await new Promise(resolve => server.close(resolve));
});

beforeEach(async () => {
  requests = new Map();
  page = await browser.newPage();
  await page.goto(`${origin}/pages/index.html`);
  await page.waitForFunction(() => !!customElements.get('page-preview'));
});
afterEach(async () => { await page?.close(); });

async function add(src, id = 'preview') {
  await page.evaluate(({ src, id }) => {
    const element = document.createElement('page-preview');
    element.id = id;
    if (src !== null) element.setAttribute('src', src);
    document.body.append(element);
  }, { src, id });
}

async function status(expected, id = 'preview') {
  await page.waitForFunction(({ expected, id }) => document.getElementById(id)?.dataset.status === expected, { expected, id }, { timeout: 2000 });
}

async function card(id = 'preview') {
  return page.evaluate(id => {
    const el = document.getElementById(id), shadow = el.shadowRoot;
    const link = shadow.querySelector('[part="link"]');
    return {
      title: shadow.querySelector('[part="title"]').textContent,
      heading: shadow.querySelector('[part="heading"]').textContent,
      href: link.href,
      text: link.textContent,
      visible: link.getBoundingClientRect().width > 0 && link.getBoundingClientRect().height > 0,
      injected: shadow.querySelectorAll('img, svg, script').length
    };
  }, id);
}

test('registers class, isolates instances and resolves a relative URL', async () => {
  await add('../normal');
  await status('ready');
  const result = await card();
  assert.deepEqual(result, { title: 'Книга & Кофе', heading: 'Первый  заголовок & текст', href: `${origin}/normal`, text: 'Книга & Кофе', visible: true, injected: 0 });
  assert.equal(await page.evaluate(() => customElements.get('page-preview').name), 'PagePreview');
  assert.equal(requests.get('/normal'), 1, 'initial observed attribute must not duplicate fetch');
  await add('/fast', 'other');
  await status('ready', 'other');
  assert.equal((await card()).title, 'Книга & Кофе');
  assert.equal((await card('other')).title, 'Новый');
  assert.equal(await page.evaluate(() => document.querySelector('#preview').shadowRoot !== document.querySelector('#other').shadowRoot), true);
});

test('uses fallbacks for absent and whitespace-only metadata', async () => {
  for (const src of ['/empty', '/absent']) {
    await add(src, src.slice(1)); await status('ready', src.slice(1));
    const result = await card(src.slice(1));
    assert.equal(result.title, 'Название отсутствует');
    assert.equal(result.heading, 'Заголовок отсутствует');
    assert.equal(result.text, `${origin}${src}`);
  }
});

test('reports missing src, HTTP and network errors without uncaught exceptions', async () => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [id, src] of [['none', null], ['blank', '  '], ['http', '/missing'], ['network', '/network-error']]) {
    await add(src, id); await status('error', id);
  }
  assert.deepEqual(errors, []);
});

test('exposes loading and discards an older response after src changes', async () => {
  await add('/slow');
  assert.equal(await page.locator('#preview').getAttribute('data-status'), 'loading');
  await page.locator('#preview').evaluate(el => el.setAttribute('src', '/fast'));
  await status('ready');
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.equal((await card()).title, 'Новый');
  assert.equal((await card()).href, `${origin}/fast`);
});

test('does not update a detached element and reloads after reconnection', async () => {
  await add('/slow');
  await page.evaluate(() => { window.detached = document.querySelector('#preview'); window.detached.remove(); });
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.notEqual(await page.evaluate(() => window.detached.dataset.status), 'ready');
  await page.evaluate(() => { window.detached.setAttribute('src', '/fast'); document.body.append(window.detached); });
  await status('ready');
  assert.equal((await card()).title, 'Новый');
});

test('renders metadata as text rather than executable markup', async () => {
  await add('/unsafe'); await status('ready');
  const result = await card();
  assert.equal(result.title, '<img src=x onerror=alert(1)>');
  assert.equal(result.heading, '<svg onload=alert(1)>');
  assert.equal(result.injected, 0);
});

test('removing src transitions to error and clears stale preview', async () => {
  await add('/normal'); await status('ready');
  await page.locator('#preview').evaluate(el => el.removeAttribute('src'));
  await status('error');
  assert.notEqual((await card()).title, 'Книга & Кофе');
});
