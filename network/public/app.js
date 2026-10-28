import { extractTime, measureRequests } from './exercises.js';

const benchmarkButton = document.querySelector('#benchmark');
const benchmarkOutput = document.querySelector('#benchmark-output');
benchmarkButton.addEventListener('click', async () => {
  benchmarkButton.disabled = true;
  benchmarkOutput.textContent = 'Выполняются четыре запроса, около 20 секунд…';
  try {
    const result = await measureRequests();
    benchmarkOutput.textContent = `Последовательно: ${(result.sequential.milliseconds / 1000).toFixed(3)} с\nКонкурентно (Promise.all): ${(result.concurrent.milliseconds / 1000).toFixed(3)} с\n\n${JSON.stringify(result, null, 2)}`;
  } catch (error) { benchmarkOutput.textContent = error.message; }
  finally { benchmarkButton.disabled = false; }
});

const timeButton = document.querySelector('#get-time');
const clock = document.querySelector('#clock');
timeButton.addEventListener('click', async () => {
  timeButton.disabled = true;
  clock.textContent = 'Загрузка…';
  try {
    const response = await fetch('/api/time', { signal: AbortSignal.timeout(25000), cache: 'no-store' });
    if (!response.ok) throw new Error(`Сервер вернул HTTP ${response.status}`);
    clock.textContent = extractTime(await response.text());
  } catch (error) { clock.textContent = error.message; }
  finally { timeButton.disabled = false; }
});
