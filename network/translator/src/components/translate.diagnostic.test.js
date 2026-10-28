import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import axios from 'axios';

process.env.REACT_APP_TRANSLATE_ENDPOINT = 'https://dictionary.test/lookup';
process.env.REACT_APP_YANDEX_DICTIONARY_KEY = '';
process.env.REACT_APP_DIAGNOSTIC_TRANSLATION = 'node';
const App = require('../App').default;

let container;
let request;

function enterValue(value) {
  const input = container.querySelector('input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  request = jest.spyOn(axios, 'get');
});

afterEach(() => {
  act(() => { ReactDOM.unmountComponentAtNode(container); });
  container.remove();
  request.mockRestore();
});

test('the labelled control displays its fixed result only after the real request succeeds', async () => {
  let resolveResponse;
  request.mockReturnValue(new Promise(resolve => { resolveResponse = resolve; }));
  await act(async () => { ReactDOM.render(<App />, container); });

  expect(container.querySelectorAll('input')).toHaveLength(1);
  expect(container.querySelectorAll('h1')).toHaveLength(1);
  expect(container.querySelector('h1').textContent).toBe('');
  expect(request).not.toHaveBeenCalled();

  await act(async () => { enterValue('кот'); });
  expect(request.mock.calls[0][1].params).toEqual({ text: 'кот', lang: 'ru-en', ui: 'ru' });
  expect(container.querySelector('h1').textContent).toBe('');

  await act(async () => {
    resolveResponse({ data: { def: [{ tr: [{ text: 'cat' }] }] } });
  });
  expect(container.querySelector('h1').textContent).toBe('node');
  expect(container.textContent).toContain('Контрольный вариант: фиксированный ответ node');

  request.mockClear();
  await act(async () => { enterValue(''); });
  expect(container.querySelector('h1').textContent).toBe('');
  expect(request).not.toHaveBeenCalled();
});

test('the control preserves request errors and leaves the translation empty', async () => {
  request.mockRejectedValue(new Error('Upstream request failed'));
  await act(async () => { ReactDOM.render(<App />, container); });
  await act(async () => { enterValue('кот'); });

  expect(container.querySelector('[role="alert"]').textContent).toBe('Upstream request failed');
  expect(container.querySelector('h1').textContent).toBe('');
  expect(container.textContent).toContain('Контрольный вариант: фиксированный ответ node');
});
