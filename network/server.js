import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
export const TIME_URL = 'https://www.worldtimeserver.com/current_time_in_RU-SPE.aspx?city=Saint_Petersburg';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(body);
}

export function createApp({ usersBase = 'https://nd.kodaktor.ru/users/', timeUrl = TIME_URL, dictionaryKey = process.env.YANDEX_DICTIONARY_KEY || '', dictionaryUrl = 'https://dictionary.yandex.net/api/v1/dicservice.json/lookup' } = {}) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' });
        res.end();
        return;
      }
      if (req.method !== 'GET') { send(res, 405, 'Method not allowed'); return; }
      if (url.pathname === '/translator') {
        res.writeHead(302, { Location: '/translator/' });
        res.end();
        return;
      }
      if (url.pathname === '/login') { send(res, 200, 'nkochubeev'); return; }
      const userMatch = url.pathname.match(/^\/id\/(\d+)$/);
      if (userMatch) {
        // A GET has no body and no Content-Type: this is checked by the course.
        const response = await fetch(new URL(userMatch[1], usersBase), { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`users upstream: HTTP ${response.status}`);
        const user = await response.json();
        if (typeof user.login !== 'string') throw new Error('users upstream: login is missing');
        send(res, 200, user.login);
        return;
      }
      if (url.pathname === '/api/time') {
        const response = await fetch(timeUrl, { signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`time upstream: HTTP ${response.status}`);
        send(res, 200, await response.text(), 'text/html; charset=utf-8');
        return;
      }
      if (url.pathname === '/api/dictionary') {
        const text = url.searchParams.get('text') || '';
        const lang = url.searchParams.get('lang') || '';
        const reply = (status, message) => send(res, status, JSON.stringify({ message }), 'application/json; charset=utf-8');
        if (!text.trim() || text.length > 2000 || !/^ru-(en|de|fr|es|it|tr|pl|uk)$/.test(lang)) {
          reply(400, 'Укажите текст и поддерживаемое направление перевода из русского.');
          return;
        }
        if (!dictionaryKey) {
          reply(503, 'На сервере не настроен личный ключ YANDEX_DICTIONARY_KEY.');
          return;
        }
        const upstream = new URL(dictionaryUrl);
        upstream.search = new URLSearchParams({ key: dictionaryKey, text, lang, ui: 'ru' }).toString();
        const response = await fetch(upstream, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`dictionary upstream: HTTP ${response.status}`);
        send(res, 200, JSON.stringify(await response.json()), 'application/json; charset=utf-8');
        return;
      }
      const translator = url.pathname === '/translator' || url.pathname.startsWith('/translator/');
      const directory = resolve(root, translator ? 'translator/build' : 'public');
      let pathname = decodeURIComponent(translator ? url.pathname.replace(/^\/translator\/?/, '') : url.pathname.slice(1));
      if (!pathname) pathname = 'index.html';
      const file = resolve(directory, pathname);
      if (!file.startsWith(directory + sep)) { send(res, 404, 'Not found'); return; }
      let body;
      try { body = await readFile(file); } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') { send(res, 404, 'Not found'); return; }
        throw error;
      }
      send(res, 200, body, `${types[extname(file)] || 'application/octet-stream'}${['.html', '.js', '.css', '.json'].includes(extname(file)) ? '; charset=utf-8' : ''}`);
    } catch (error) {
      console.error(error.message);
      send(res, 502, 'Upstream request failed');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3048);
  createApp().listen(port, '0.0.0.0', () => console.log(`Course 48: http://localhost:${port}`));
}
