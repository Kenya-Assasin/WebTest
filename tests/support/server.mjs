import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { modrinthFixture } from './modrinth.mjs';

const require = createRequire(import.meta.url);
let unavailable = false;
const backend = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:54399');
  const send = (status, data) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(data));
  };
  if (request.method === 'POST' && url.pathname === '/__test/reset') { unavailable = false; return send(200, {}); }
  if (request.method === 'POST' && url.pathname === '/__test/fail') { unavailable = true; return send(200, {}); }
  if (request.method === 'GET' && url.pathname.startsWith('/__modrinth/')) return modrinthFixture(url, send, unavailable);
  send(404, {});
});
backend.listen(54399, '127.0.0.1');
const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3100'], {
  stdio: 'inherit', env: { ...process.env, MOD_ATLAS_TEST: '1', MOD_ATLAS_TEST_MODRINTH_URL: 'http://127.0.0.1:54399/__modrinth' },
});
next.on('exit', code => { backend.close(); process.exit(code ?? 1); });
const stop = () => { next.kill(); backend.close(); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
