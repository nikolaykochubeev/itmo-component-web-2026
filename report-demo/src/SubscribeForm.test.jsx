import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SubscribeForm } from './SubscribeForm';

describe('Форма подписки', () => {
  // Удаление связи label/input сломает доступное имя и первый сценарий.
  test('поле доступно по имени, форму можно отправить с клавиатуры', async () => {
    const user = userEvent.setup();
    const subscribe = vi.fn().mockResolvedValue(undefined);
    render(<SubscribeForm subscribe={subscribe} />);

    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Электронная почта' })).toHaveFocus();
    await user.keyboard('reader@example.org{Enter}');

    expect(await screen.findByRole('status')).toHaveTextContent('reader@example.org');
    expect(subscribe).toHaveBeenCalledWith('reader@example.org');
  });

  // Удаление trim или проверки пустого значения пропустит некорректный запрос.
  test('пустой адрес показывает ошибку и не вызывает сохранение', async () => {
    const user = userEvent.setup();
    const subscribe = vi.fn();
    render(<SubscribeForm subscribe={subscribe} />);

    await user.type(screen.getByRole('textbox'), '   ');
    await user.click(screen.getByRole('button', { name: 'Подписаться' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Введите электронную почту');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Введите электронную почту');
    expect(subscribe).not.toHaveBeenCalled();
  });

  // Удаление проверки формата отправит заведомо неверный адрес.
  test('неверный формат адреса не отправляется', async () => {
    const user = userEvent.setup();
    const subscribe = vi.fn();
    render(<SubscribeForm subscribe={subscribe} />);

    await user.type(screen.getByRole('textbox'), 'reader.example.org');
    await user.click(screen.getByRole('button', { name: 'Подписаться' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Проверьте адрес');
    expect(subscribe).not.toHaveBeenCalled();
  });

  // Потеря нормализации или ранний success сломает контракт и результат.
  test('после сохранения показывает адрес без пробелов', async () => {
    const user = userEvent.setup();
    const subscribe = vi.fn().mockResolvedValue(undefined);
    render(<SubscribeForm subscribe={subscribe} />);

    await user.type(screen.getByRole('textbox'), '  reader@example.org  ');
    await user.click(screen.getByRole('button', { name: 'Подписаться' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Подписка оформлена для reader@example.org');
    expect(subscribe).toHaveBeenCalledExactlyOnceWith('reader@example.org');
    expect(screen.getByRole('button', { name: 'Подписаться' })).toBeEnabled();
  });

  // Удаление disabled приведёт к повторному действию во время запроса.
  test('блокирует повторную отправку до завершения запроса', async () => {
    const user = userEvent.setup();
    let resolveRequest;
    const subscribe = vi.fn(() => new Promise((resolve) => { resolveRequest = resolve; }));
    render(<SubscribeForm subscribe={subscribe} />);

    await user.type(screen.getByRole('textbox'), 'reader@example.org');
    await user.click(screen.getByRole('button', { name: 'Подписаться' }));

    const savingButton = screen.getByRole('button', { name: 'Сохраняем…' });
    expect(savingButton).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(savingButton);
    expect(subscribe).toHaveBeenCalledTimes(1);

    await act(async () => { resolveRequest(); });
    expect(await screen.findByRole('status')).toHaveTextContent('Подписка');
  });

  // Удаление catch или сброса pending лишит пользователя повторной попытки.
  test('после ошибки сервера позволяет повторить отправку', async () => {
    const user = userEvent.setup();
    const subscribe = vi.fn()
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(undefined);
    render(<SubscribeForm subscribe={subscribe} />);

    await user.type(screen.getByRole('textbox'), 'reader@example.org');
    await user.click(screen.getByRole('button', { name: 'Подписаться' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Подписаться' }));

    expect(await screen.findByRole('status')).toHaveTextContent('reader@example.org');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(subscribe).toHaveBeenCalledTimes(2);
  });
});
