import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import axios from 'axios';
import Field from './components/field';

process.env.REACT_APP_TRANSLATE_ENDPOINT = 'https://dictionary.test/lookup';
process.env.REACT_APP_YANDEX_DICTIONARY_KEY = '';
process.env.REACT_APP_DIAGNOSTIC_TRANSLATION = '';
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
  expect(container.textContent).not.toContain('Контрольный вариант:');
});

test('a native input event after direct value assignment requests and displays the new word', async () => {
  await act(async () => { ReactDOM.render(<App />, container); });
  const input = container.querySelector('input');

  await act(async () => {
    input.value = 'кот';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][1].params).toEqual({ text: 'кот', lang: 'ru-en', ui: 'ru' });
  expect(container.querySelector('h1').textContent).toBe('cat');
});

test('a direct value change without events is detected by the fallback timer and cleaned up on unmount', async () => {
  jest.useFakeTimers();
  const clearTimer = jest.spyOn(global, 'clearInterval');
  try {
    await act(async () => { ReactDOM.render(<App />, container); });
    const input = container.querySelector('input');
    input.value = 'кот';
    expect(request).not.toHaveBeenCalled();

    await act(async () => { jest.advanceTimersByTime(100); });

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1].params).toEqual({ text: 'кот', lang: 'ru-en', ui: 'ru' });
    expect(container.querySelector('h1').textContent).toBe('cat');
    clearTimer.mockClear();
    act(() => { ReactDOM.unmountComponentAtNode(container); });
    expect(clearTimer).toHaveBeenCalledTimes(1);
  } finally {
    act(() => { ReactDOM.unmountComponentAtNode(container); });
    clearTimer.mockRestore();
    jest.useRealTimers();
  }
});

test('React change and native input handlers report one change for the same event', async () => {
  const onChange = jest.fn();
  await act(async () => { ReactDOM.render(<Field value="" onChange={onChange} label="Word" />, container); });
  const input = container.querySelector('input');

  await act(async () => { enterValue(input, 'кот'); });

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('кот');
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
