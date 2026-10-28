import { readLookupResult } from './dictionary.mjs';

test('selects the highest reported frequency and keeps the original order on ties', () => {
  const payload = { def: [{ tr: [
    { text: 'knot', fr: 5 },
    { text: 'node', fr: 10 },
    { text: 'site', fr: 10 }
  ] }] };

  expect(readLookupResult(payload)).toBe('node');
});

test('keeps the first translation when frequencies are absent', () => {
  const payload = { def: [{ tr: [{ text: 'first' }, { text: 'second' }] }] };

  expect(readLookupResult(payload)).toBe('first');
});

test('preserves the fallback for empty lookup responses', () => {
  for (const payload of [undefined, {}, { def: [] }, { def: [{ tr: [] }] }]) {
    expect(readLookupResult(payload)).toBe('Перевод не найден.');
  }
});
