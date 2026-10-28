export const DELAY_URLS = [
  'https://web-scriptor.ru/sleep/?n=7',
  'https://node-server.ru/r/fivesec'
];

async function completeRequest(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return { url, status: response.status, body: await response.text() };
}

export async function measureRequests(urls = DELAY_URLS) {
  const sequentialStart = performance.now();
  const sequentialResponses = [];
  for (const url of urls) sequentialResponses.push(await completeRequest(url));
  const sequential = { milliseconds: performance.now() - sequentialStart, responses: sequentialResponses };

  const concurrentStart = performance.now();
  const concurrentResponses = await Promise.all(urls.map(completeRequest));
  const concurrent = { milliseconds: performance.now() - concurrentStart, responses: concurrentResponses };
  return { sequential, concurrent };
}

export function extractTime(html) {
  const clock = html.match(/<[^>]+\bid\s*=\s*["']theTime["'][^>]*>([\s\S]*?)<\//i);
  const match = clock?.[1].replace(/<[^>]*>/g, '').trim().match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) throw new Error('Не найдено время сервера (clock #theTime).');
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const period = match[4]?.toUpperCase();
  if (minutes > 59 || seconds > 59 || hours > (period ? 12 : 23) || (period && hours < 1)) {
    throw new Error('Некорректное время сервера (clock #theTime).');
  }
  if (period) hours = hours % 12 + (period === 'PM' ? 12 : 0);
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}
