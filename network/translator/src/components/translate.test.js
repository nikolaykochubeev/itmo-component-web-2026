import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import Translate from './translate';
import App from '../App';

test('shows the missing configuration and clears it when input is emptied', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  try {
    await act(async () => { ReactDOM.render(<Translate language="en" text="Реакция" />, container); });
    expect(container.querySelector('[role="alert"]').textContent).toContain('REACT_APP_TRANSLATE_ENDPOINT');
    await act(async () => { ReactDOM.render(<Translate language="en" text="" />, container); });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('h1').textContent).toBe('');
  } finally {
    act(() => { ReactDOM.unmountComponentAtNode(container); });
    container.remove();
  }
});

test('keeps exactly one input and one h1 after the app shows a configuration error', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  try {
    await act(async () => { ReactDOM.render(<App />, container); });
    expect(container.querySelector('[role="alert"]').textContent).toContain('REACT_APP_TRANSLATE_ENDPOINT');
    expect(container.querySelectorAll('input')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1').textContent).toBe('');
  } finally {
    act(() => { ReactDOM.unmountComponentAtNode(container); });
    container.remove();
  }
});
