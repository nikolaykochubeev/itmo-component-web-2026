import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createApp } from './server.js';

export function createCheckinatorServer({ usersBase, logger = event => console.log(JSON.stringify(event)) } = {}) {
  // An explicit empty key avoids reading the optional dictionary configuration.
  const app = createApp({ usersBase, dictionaryKey: '' });
  const handler = app.listeners('request')[0];
  app.removeAllListeners('request');

  app.on('request', (req, res) => {
    const time = new Date().toISOString();
    const started = performance.now();
    const path = (req.url || '').split('?')[0];
    const match = /^\/id\/(\d+)$/.exec(path);
    const routecategory = path === '/' ? 'health' : path === '/login' ? 'login' : match ? 'id' : 'other';
    const id = match ? Number(match[1]) : undefined;
    res.once('finish', () => {
      logger({
        time,
        method: req.method,
        routecategory,
        ...(Number.isSafeInteger(id) ? { id } : {}),
        status: res.statusCode,
        duration: Number((performance.now() - started).toFixed(3))
      });
    });

    if (req.method !== 'GET' || routecategory === 'other') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    if (routecategory === 'health') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('checkinator ready');
      return;
    }
    return handler(req, res);
  });
  return app;
}

export function startCheckinatorServer({ env = process.env, ...options } = {}) {
  const port = Number(env.PORT || 30480);
  const host = env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
  return createCheckinatorServer(options).listen(port, host);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startCheckinatorServer();
}
