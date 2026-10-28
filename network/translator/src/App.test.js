import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import axios from 'axios';

process.env.REACT_APP_TRANSLATE_ENDPOINT = 'https://dictionary.test/lookup';
process.env.REACT_APP_YANDEX_DICTIONARY_KEY = '';
const App = require('./App').default;

let container;
let request;

function enterValue(input, value) {
  // Use the browser value setter and a real input event, preserving React's onChange path.
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function typeAtCursor(input, text) {
  input.focus();
  for (const character of text) {
    await act(async () => { enterValue(input, input.value + character); });
  }
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  request = jest.spyOn(axios, 'get').mockResolvedValue({
    data: { def: [{ tr: [{ text: 'cat' }] }] }
  });
});

afterEach(() => {
  act(() => { ReactDOM.unmountComponentAtNode(container); });
  container.remove();
  request.mockRestore();
});

test('ordinary typing sends the entered word without a prefilled prefix', async () => {
  await act(async () => { ReactDOM.render(<App />, container); });
  const input = container.querySelector('input');

  await typeAtCursor(input, 'кот');

  expect(container.querySelector('[role="alert"]')?.textContent).toBeUndefined();
  expect(request).toHaveBeenCalled();
  const [, options] = request.mock.calls[request.mock.calls.length - 1];
  expect(options.params).toEqual({ text: 'кот', lang: 'ru-en', ui: 'ru' });
  expect(input.value).toBe('кот');
  expect(container.querySelector('h1').textContent).toBe('cat');
});

test('an empty field makes no request and clearing a word clears the translation', async () => {
  await act(async () => { ReactDOM.render(<App />, container); });
  const input = container.querySelector('input');
  expect(input.value).toBe('');
  expect(request).not.toHaveBeenCalled();
  expect(container.querySelector('h1').textContent).toBe('');

  await typeAtCursor(input, 'кот');
  expect(container.querySelector('h1').textContent).toBe('cat');
  request.mockClear();
  await act(async () => { enterValue(input, ''); });

  expect(request).not.toHaveBeenCalled();
  expect(container.querySelector('h1').textContent).toBe('');
});
