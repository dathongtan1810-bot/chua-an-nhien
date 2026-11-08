/**
 * Soak test: nhiều đợt client kết nối → hoạt động → ngắt; sau mỗi đợt đọc /metrics để xem
 * cấu trúc trong bộ nhớ (chua_internal_entries) và heap có trở về mức nền không.
 *
 *   npm run build && node dist/soak.js --waves 8 --clients 300 --url http://127.0.0.1:8080
 *   (không có --url: tự chạy server con)
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io as ioc, type Socket } from 'socket.io-client';
import { AREAS } from '../../shared/protocol.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n: string, d: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function metrics(url: string) {
  const txt = await (await fetch(`${url}/metrics`)).text();
  const internal: Record<string, number> = {};
  let heap = 0;
  for (const line of txt.split('\n')) {
    const m = /^chua_internal_entries\{name="(\w+)"\} (\d+)/.exec(line);
    if (m) internal[m[1]!] = Number(m[2]);
    if (line.startsWith('chua_nodejs_heap_size_used_bytes ')) heap = Number(line.split(' ')[1]);
  }
  return { internal, heapMb: Math.round(heap / 1048576) };
}

async function wave(url: string, n: number, w: number) {
  const socks: Socket[] = [];
  await Promise.all(
    Array.from({ length: n }, (_, i) => new Promise<void>((resolve) => {
      const s = ioc(url, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { 'x-forwarded-for': `10.${w}.${i >> 8}.${i & 255}` } });
      socks.push(s);
      s.on('connect', () => s.emit('hello', { deviceId: `soak-${w}-${i}-${process.pid}`, lang: 'vi' }));
      s.once('welcome', () => {
        s.emit('enter_area', { area: AREAS[i % AREAS.length]! });
        if (i % 3 === 0) s.emit('light_incense', { count: 1 });
        if (i % 10 === 0) s.emit('room_create', {});
        if (i % 50 === 0) s.emit('release_lantern', { text: 'Cầu bình an', color: 'gold' });
        resolve();
      });
      s.on('connect_error', () => resolve());
    })),
  );
  await sleep(2000);
  for (const s of socks) s.disconnect();
  await sleep(4000); // > 1 chu kỳ presence
}

async function main() {
  const waves = Number(arg('waves', '8'));
  const clients = Number(arg('clients', '300'));
  let url = process.argv.includes('--url') ? arg('url', '') : '';
  let child;
  if (!url) {
    const port = 19000 + Math.floor(Math.random() * 900);
    child = spawn(process.execPath, ['--expose-gc', path.join(ROOT, 'dist/index.js')], {
      env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DB_PATH: path.join(os.tmpdir(), `soak-${Date.now()}.db`), LOG_LEVEL: 'warn', TRUST_PROXY: 'true', NODE_ENV: 'loadtest' },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) {
      await sleep(200);
      if (await fetch(`${url}/api/health`).then((r) => r.ok).catch(() => false)) break;
    }
  }
  const base = await metrics(url);
  console.log('base', JSON.stringify(base));
  for (let w = 0; w < waves; w++) {
    await wave(url, clients, w);
    console.log(`wave ${w + 1}`, JSON.stringify(await metrics(url)));
  }
  child?.kill('SIGTERM');
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
