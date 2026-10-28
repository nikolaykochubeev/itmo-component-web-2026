import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SubscribeForm } from './SubscribeForm';
import './style.css';

// Учебный сервис: задержка управляет только показом состояния сохранения.
// Запросов по сети и записи данных здесь нет.
async function demoSubscribe(email) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (email === 'error@example.org') throw new Error('Demo service unavailable');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <main>
      <p className="eyebrow">Тестирование React-компонентов</p>
      <h1>Одна форма.<br />Шесть проверок.</h1>
      <p className="intro">Подпишитесь на новости учебного проекта.</p>
      <SubscribeForm subscribe={demoSubscribe} />
      <aside>
        <h2>Режим демонстрации</h2>
        <p>Любой корректный адрес приводит к успеху. Для ошибки сервиса введите <code>error@example.org</code>.</p>
        <p>Сервис отвечает через 600 мс. Данные никуда не отправляются.</p>
      </aside>
    </main>
  </StrictMode>,
);
