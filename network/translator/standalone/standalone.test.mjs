import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function open(lookup) {
  const calls = [];
  const traces = [];
  const dom = new JSDOM(html, {
    url: 'https://example.test/translator/', runScripts: 'dangerously',
    beforeParse(window) {
      window.AbortController = AbortController;
      window.crypto = { randomUUID: () => 'e0411447-129a-47e0-bc84-0307ced2b596' };
      window.fetch = async (url, options = {}) => {
        if (new URL(url).pathname === '/api/translator-trace') {
          traces.push(JSON.parse(options.body));
          return { ok: true, status: 204 };
        }
        calls.push({ url: new URL(url), options });
        return lookup(url, options);
      };
    }
  });
  const input = dom.window.document.querySelector('input');
  const output = dom.window.document.querySelector('h1');
  const enter = (value, type = 'input') => {
    input.value = value;
    input.dispatchEvent(new dom.window.Event(type, { bubbles: true }));
  };
  return { dom, calls, traces, input, output, enter };
}

test('static HTML exposes the contract and normal DOM input displays the real dictionary result', async t => {
  const staticDocument = new JSDOM(html);
  assert.equal(staticDocument.window.document.title, 'nkochubeev');
  assert.equal(staticDocument.window.document.querySelectorAll('input').length, 1);
  assert.equal(staticDocument.window.document.querySelectorAll('h1').length, 1);
  staticDocument.window.close();
  const page = open(async () => ({ ok: true, status: 200, json: async () => ({ def: [{ tr: [{ text: 'cat', fr: 10 }] }] }) }));
  t.after(() => page.dom.window.close());
  assert.equal(page.calls.length, 0);
  page.enter('кот');
  await tick();
  assert.equal(page.calls.length, 1);
  assert.equal(page.calls[0].url.searchParams.get('text'), 'кот');
  assert.equal(page.calls[0].url.searchParams.get('lang'), 'ru-en');
  assert.equal(page.output.textContent, 'cat');
  assert.deepEqual(page.traces.map(trace => trace.stage), ['boot', 'input', 'api-start', 'api-end', 'rendered']);
  for (const trace of page.traces) {
    assert.deepEqual(Object.keys(trace).sort(), ['session', 'runId', 'stage', 'inputLength', 'outputLength', 'status', 'errorName', 'pathname', 'inputs', 'h1s'].sort());
    assert.equal(trace.session, '8f5ce70f-9038-49b5-bc5d-fc304863ad40');
    assert.equal(JSON.stringify(trace).includes('кот'), false);
    assert.equal(JSON.stringify(trace).includes('cat'), false);
  }
});

test('stale results cannot overwrite new input and empty input clears without a request', async t => {
  const pending = [];
  const page = open(() => new Promise(resolve => pending.push(resolve)));
  t.after(() => page.dom.window.close());
  page.enter('кот');
  page.enter('дом', 'change');
  assert.equal(page.calls[0].options.signal.aborted, true);
  pending[1]({ ok: true, status: 200, json: async () => ({ def: [{ tr: [{ text: 'house' }] }] }) });
  await tick();
  pending[0]({ ok: true, status: 200, json: async () => ({ def: [{ tr: [{ text: 'cat' }] }] }) });
  await tick();
  assert.equal(page.output.textContent, 'house');
  page.enter('');
  assert.equal(page.output.textContent, '');
  assert.equal(page.calls.length, 2);
});

test('request errors remain visible and pagehide stops the fallback timer', async t => {
  const page = open(async () => ({ ok: false, status: 502 }));
  t.after(() => page.dom.window.close());
  page.enter('кот', 'keyup');
  await tick();
  assert.equal(page.output.textContent, '');
  assert.match(page.dom.window.document.querySelector('[role="alert"]').textContent, /502/);
  page.dom.window.dispatchEvent(new page.dom.window.Event('pagehide'));
  page.input.value = 'дом';
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(page.calls.length, 1);
});
