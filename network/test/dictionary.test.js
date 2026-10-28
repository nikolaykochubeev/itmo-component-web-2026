import assert from 'node:assert/strict';
import test from 'node:test';

const dictionary = await import('../translator/src/components/dictionary.mjs');

test('constructs Dictionary lookup parameters without corrupting user text', () => {
  assert.equal(typeof dictionary.createLookupParams, 'function', 'Dictionary lookup parameters must be implemented');
  assert.deepEqual(dictionary.createLookupParams('чай & кофе', 'en', 'fixture-key-not-real'), {
    key: 'fixture-key-not-real', lang: 'ru-en', text: 'чай & кофе', ui: 'ru'
  });
  assert.throws(() => dictionary.createLookupParams('чай', 'en', ''), /ключ/);
});

test('reads Dictionary translations and handles a missing word', () => {
  assert.equal(typeof dictionary.readLookupResult, 'function', 'Dictionary response parsing must be implemented');
  assert.equal(dictionary.readLookupResult({ def: [{ tr: [{ text: 'reaction' }, { text: 'response' }] }] }), 'reaction');
  assert.equal(dictionary.readLookupResult({ def: [] }), 'Перевод не найден.');
  assert.equal(dictionary.readLookupResult({}), 'Перевод не найден.');
});

test('proxy lookup parameters do not contain an API key', () => {
  assert.equal(typeof dictionary.createProxyParams, 'function', 'proxy parameters must be implemented');
  assert.deepEqual(dictionary.createProxyParams('чай & кофе', 'en'), { lang: 'ru-en', text: 'чай & кофе', ui: 'ru' });
});
