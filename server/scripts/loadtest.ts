/**
 * Load test: giả lập N client Socket.IO (mặc định 500 và 1000).
 *
 *   npm run build && node dist/loadtest.js                # tự chạy server con, 500 rồi 1000 client, ghi LOADTEST.md
 *   node dist/loadtest.js --clients 800 --duration 30
 *   node dist/loadtest.js --url https://chua.example --clients 200   # đánh vào server có sẵn (KHÔNG ghi đè LOADTEST.md)
 *
 * Mỗi client: hello → enter_area ngẫu nhiên → mỗi ~10 s đổi khu, thỉnh thoảng thắp hương / gõ chuông / thả đèn / thả tim.
 * Đo: thời gian kết nối, hello→welcome, độ trễ fan-out chuông (gửi → mọi client nhận), lỗi, CPU/RAM server (từ /metrics).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io as ioc, type Socket } from 'socket.io-client';
import { AREAS } from '../../shared/protocol.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pct = (arr: number[], p: number) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
};
const rnd = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!;

interface RunResult {
  clients: number;
  connected: number;
  connectFailed: number;
  durationSec: number;
  connectP50: number;
  connectP95: number;
  welcomeP50: number;
  welcomeP95: number;
  bellFanoutP50: number;
  bellFanoutP95: number;
  bellFanoutP99: number;
  bellsSent: number;
  bellReceipts: number;
  eventsSent: number;
  eventsReceived: number;
  rateLimited: number;
  errors: Record<string, number>;
  disconnects: number;
  serverCpuPct: number;
  serverRssMb: number;
  serverHeapMb: number;
  lastOnline: number;
}

async function scrape(url: string): Promise<Record<string, number>> {
  try {
    const txt = await (await fetch(`${url}/metrics`)).text();
    const out: Record<string, number> = {};
    for (const line of txt.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const [k, v] = line.split(' ');
      if (k && v && !k.includes('{')) out[k] = Number(v);
    }
    return out;
  } catch {
    return {};
  }
}

async function run(url: string, n: number, durationSec: number): Promise<RunResult> {
  const sockets: Socket[] = [];
  const connectTimes: number[] = [];
  const welcomeTimes: number[] = [];
  const bellLat: number[] = [];
  let connectFailed = 0;
  let eventsSent = 0;
  let eventsReceived = 0;
  let rateLimited = 0;
  let disconnects = 0;
  let lastOnline = 0;
  let bellsSent = 0;
  let bellReceipts = 0;
  const errors: Record<string, number> = {};
  const bellSentAt = new Map<string, number>(); // at(ISO server) không biết trước → dùng thời điểm gửi gần nhất
  let lastBellEmit = 0;
  const lanternIds: string[] = [];

  const m0 = await scrape(url);
  const t0 = Date.now();

  // Kết nối theo đợt 50 client / 100 ms để giống thực tế
  const batch = 50;
  for (let i = 0; i < n; i += batch) {
    const group = Array.from({ length: Math.min(batch, n - i) }, (_, j) => i + j);
    await Promise.all(
      group.map(
        (idx) =>
          new Promise<void>((resolve) => {
            const start = performance.now();
            const s = ioc(url, {
              transports: ['websocket'],
              forceNew: true,
              reconnection: false,
              timeout: 20_000,
              extraHeaders: { 'x-forwarded-for': `10.${(idx >> 16) & 255}.${(idx >> 8) & 255}.${idx & 255}` },
            });
            sockets.push(s);
            s.on('connect', () => {
              connectTimes.push(performance.now() - start);
              const h = performance.now();
              s.once('welcome', () => {
                welcomeTimes.push(performance.now() - h);
                s.emit('enter_area', { area: rnd(AREAS) });
                eventsSent++;
                resolve();
              });
              s.emit('hello', { deviceId: `load-${process.pid}-${idx}-${t0}`, nickname: null, lang: 'vi' });
              eventsSent++;
            });
            s.on('connect_error', () => {
              connectFailed++;
              resolve();
            });
            s.on('disconnect', () => disconnects++);
            s.onAny(() => eventsReceived++);
            s.on('presence', (p) => (lastOnline = p.online));
            s.on('rate_limited', () => rateLimited++);
            s.on('error', (e: { code: string }) => (errors[e.code] = (errors[e.code] ?? 0) + 1));
            s.on('bell_rung', () => {
              bellReceipts++;
              if (lastBellEmit) bellLat.push(performance.now() - lastBellEmit);
            });
            s.on('lantern_released', (l: { id: string }) => {
              if (lanternIds.length < 200) lanternIds.push(l.id);
            });
          }),
      ),
    );
    await sleep(100);
  }
  const connected = sockets.filter((s) => s.connected).length;
  console.log(`  ${connected}/${n} connected in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Pha hoạt động
  const end = Date.now() + durationSec * 1000;
  const tick = setInterval(() => {
    for (const s of sockets) {
      if (!s.connected) continue;
      const r = Math.random();
      if (r < 0.01) {
        s.emit('enter_area', { area: rnd(AREAS) });
        eventsSent++;
      } else if (r < 0.013) {
        s.emit('light_incense', { count: rnd([1, 3, 5]) });
        eventsSent++;
      } else if (r < 0.0135) {
        s.emit('release_lantern', { text: rnd(['Cầu bình an', 'Mong gia đình mạnh khỏe', 'Nguyện thi đỗ', 'An nhiên mỗi ngày']), color: rnd(['red', 'gold', '#ff8800']) });
        eventsSent++;
      } else if (r < 0.016 && lanternIds.length) {
        s.emit('like_lantern', { id: rnd(lanternIds) });
        eventsSent++;
      }
    }
  }, 100);
  // Chuông: mỗi 3.5 s một người ngẫu nhiên gõ (sát giới hạn toàn server 3 s)
  const bell = setInterval(() => {
    const live = sockets.filter((s) => s.connected);
    if (!live.length) return;
    lastBellEmit = performance.now();
    bellsSent++;
    rnd(live).emit('ring_bell', { force: Math.random() });
    eventsSent++;
  }, 3500);
  while (Date.now() < end) await sleep(500);
  clearInterval(tick);
  clearInterval(bell);
  await sleep(1500);

  const m1 = await scrape(url);
  const elapsed = (Date.now() - t0) / 1000;
  const cpuSec = (m1.chua_process_cpu_seconds_total ?? 0) - (m0.chua_process_cpu_seconds_total ?? 0);
  for (const s of sockets) s.disconnect();
  await sleep(500);
  void bellSentAt;

  return {
    clients: n,
    connected,
    connectFailed,
    durationSec: Math.round(elapsed),
    connectP50: pct(connectTimes, 50),
    connectP95: pct(connectTimes, 95),
    welcomeP50: pct(welcomeTimes, 50),
    welcomeP95: pct(welcomeTimes, 95),
    bellFanoutP50: pct(bellLat, 50),
    bellFanoutP95: pct(bellLat, 95),
    bellFanoutP99: pct(bellLat, 99),
    bellsSent,
    bellReceipts,
    eventsSent,
    eventsReceived,
    rateLimited,
    errors,
    disconnects,
    serverCpuPct: Math.round((cpuSec / elapsed) * 1000) / 10,
    serverRssMb: Math.round((m1.chua_process_resident_memory_bytes ?? 0) / 1048576),
    serverHeapMb: Math.round((m1.chua_nodejs_heap_size_used_bytes ?? 0) / 1048576),
    lastOnline,
  };
}

async function startChild(port: number): Promise<ChildProcess> {
  const db = path.join(os.tmpdir(), `chua-load-${Date.now()}.db`);
  const child = spawn(process.execPath, [path.join(ROOT, 'dist/index.js')], {
    env: {
      ...process.env,
      NODE_ENV: 'loadtest',
      PORT: String(port),
      HOST: '127.0.0.1',
      DB_PATH: db,
      LOG_LEVEL: 'warn',
      TRUST_PROXY: 'true',
      MAX_CONN_PER_IP: '20',
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  for (let i = 0; i < 50; i++) {
    await sleep(200);
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return child;
    } catch {
      /* chưa sẵn sàng */
    }
  }
  child.kill();
  throw new Error('server không khởi động');
}

function fmt(r: RunResult): string {
  const ms = (x: number) => `${x.toFixed(1)} ms`;
  return [
    `| Client | ${r.clients} (kết nối được ${r.connected}, lỗi ${r.connectFailed}) |`,
    `| Thời lượng | ${r.durationSec} s |`,
    `| Kết nối p50 / p95 | ${ms(r.connectP50)} / ${ms(r.connectP95)} |`,
    `| hello→welcome p50 / p95 | ${ms(r.welcomeP50)} / ${ms(r.welcomeP95)} |`,
    `| Fan-out chuông p50 / p95 / p99 | ${ms(r.bellFanoutP50)} / ${ms(r.bellFanoutP95)} / ${ms(r.bellFanoutP99)} |`,
    `| Chuông gửi / lượt nhận | ${r.bellsSent} / ${r.bellReceipts} (kỳ vọng ≈ ${r.bellsSent * r.connected}) |`,
    `| Sự kiện C→S / S→C | ${r.eventsSent} / ${r.eventsReceived} |`,
    `| rate_limited | ${r.rateLimited} |`,
    `| error | ${JSON.stringify(r.errors)} |`,
    `| Ngắt kết nối ngoài ý muốn | ${Math.max(0, r.disconnects - r.connected)} |`,
    `| presence.online cuối | ${r.lastOnline} |`,
    `| CPU server (trung bình 1 lõi) | ${r.serverCpuPct}% |`,
    `| RSS / heap server | ${r.serverRssMb} MB / ${r.serverHeapMb} MB |`,
  ].join('\n');
}

async function main() {
  const external = arg('url');
  const duration = Number(arg('duration', '30'));
  const counts = arg('clients') ? [Number(arg('clients'))] : [500, 1000];
  let child: ChildProcess | undefined;
  let url = external;
  if (!url) {
    const port = 18000 + Math.floor(Math.random() * 1000);
    child = await startChild(port);
    url = `http://127.0.0.1:${port}`;
  }
  const results: RunResult[] = [];
  try {
    for (const n of counts) {
      console.log(`→ ${n} client, ${duration}s`);
      const r = await run(url, n, duration);
      console.log(fmt(r));
      results.push(r);
      await sleep(2000);
    }
  } finally {
    child?.kill('SIGTERM');
  }
  if (!external && !process.argv.includes('--no-write')) {
    const cpu = os.cpus()[0]?.model ?? 'unknown';
    const md = [
      '# Kết quả load test',
      '',
      `Chạy: \`npm run build && npm run loadtest\` — ${new Date().toISOString()}`,
      '',
      `Máy: ${os.cpus().length} vCPU (${cpu}), RAM ${Math.round(os.totalmem() / 1073741824)} GB, Node ${process.version}.`,
      'Server chạy tiến trình con trên cùng máy (client và server dùng chung CPU → số liệu là cận trên bi quan).',
      'Mỗi client có IP giả qua `x-forwarded-for` (TRUST_PROXY=true) để không bị giới hạn kết nối/IP.',
      '',
      ...results.flatMap((r) => [`## ${r.clients} client`, '', '| Chỉ số | Giá trị |', '|---|---|', fmt(r), '']),
      '## Nhận xét',
      '',
      '- Chuông được fan-out tới mọi client; độ trễ đo từ lúc client gửi tới lúc từng client nhận (cùng đồng hồ máy).',
      '- `rate_limited` là bình thường: script cố ý gõ chuông sát giới hạn 3 s toàn server và thắp hương ngẫu nhiên.',
      '- Xem `HANDOFF.md` cho các tối ưu đã làm và hướng scale ngang.',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(ROOT, 'LOADTEST.md'), md);
    console.log('đã ghi LOADTEST.md');
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
