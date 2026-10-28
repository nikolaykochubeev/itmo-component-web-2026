import { useId, useState } from 'react';

export function SubscribeForm({ subscribe }) {
  const emailId = useId();
  const errorId = useId();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const isSaving = phase === 'saving';
  const isInvalid = phase === 'invalid';

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setMessage('Введите электронную почту');
      setPhase('invalid');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage('Проверьте адрес, например reader@example.org');
      setPhase('invalid');
      return;
    }

    setPhase('saving');
    setMessage('');
    try {
      await subscribe(normalizedEmail);
      setSavedEmail(normalizedEmail);
      setPhase('success');
    } catch {
      setMessage('Не удалось сохранить. Попробуйте ещё раз.');
      setPhase('error');
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={isSaving}>
      <label htmlFor={emailId}>Электронная почта</label>
      <input
        id={emailId}
        type="email"
        autoComplete="email"
        placeholder="reader@example.org"
        value={email}
        disabled={isSaving}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? errorId : undefined}
        onChange={(event) => {
          setEmail(event.target.value);
          setPhase('idle');
        }}
      />
      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Сохраняем…' : 'Подписаться'}
      </button>
      {(phase === 'invalid' || phase === 'error') && (
        <p id={errorId} role="alert" className="message error">{message}</p>
      )}
      {phase === 'success' && (
        <p role="status" className="message success">
          Подписка оформлена для {savedEmail}
        </p>
      )}
    </form>
  );
}
