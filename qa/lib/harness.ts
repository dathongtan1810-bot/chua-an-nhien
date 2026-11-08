/**
 * Bộ khung QA hộp đen: chạy server THẬT (server/dist/index.js) như một tiến trình riêng,
 * DB SQLite tạm, cổng ngẫu nhiên; client Socket.IO thật (cùng thư viện app dùng).
 * Không import mã nguồn server — chỉ nói chuyện qua mạng như client thật.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_DIR = path.resolve(here, '../../server');
export const ADMIN_PASSWORD = 'qa-admin-password';

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(p));
    });
    s.on('error', reject);
  });
}

export interface RunningServer {
  url: string;
  port: number;
  proc: ChildProcess;
  logs: string[];
  stop(): Promise<void>;
  restart(): Promise<void>;
}

export async function startServer(env: Record<string, string> = {}): Promise<RunningServer> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'qa-chua-'));
  const port = await freePort();
  const logs: string[] = [];
  const fullEnv = {
    ...process.env,
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: String(port),
    DB_PATH: path.join(dir, 'qa.db'),
    LOG_LEVEL: 'warn',
    ADMIN_PASSWORD,
    PRESENCE_INTERVAL_MS: '300',
    ...env,
  };
  const srv: RunningServer = {
    url: `http://127.0.0.1:${port}`,
    port,
    proc: undefined as unknown as ChildProcess,
    logs,
    async stop() {
      await kill(srv.proc);
    },
    async restart() {
      await kill(srv.proc);
      srv.proc = await launch(fullEnv, logs, srv.url);
    },
  };
  srv.proc = await launch(fullEnv, logs, srv.url);
  const origStop = srv.stop;
  srv.stop = async () => {
    await origStop();
    rmSync(dir, { recursive: true, force: true });
  };
  return srv;
}

async function launch(env: NodeJS.ProcessEnv, logs: string[], url: string): Promise<ChildProcess> {
  const proc = spawn(process.execPath, ['--enable-source-maps', 'dist/index.js'], { cwd: SERVER_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout!.on('data', (d) => logs.push(String(d)));
  proc.stderr!.on('data', (d) => logs.push(String(d)));
  const t0 = Date.now();
  while (Date.now() - t0 < 15_000) {
    if (proc.exitCode !== null) throw new Error(`server thoát sớm (${proc.exitCode}):\n${logs.join('')}`);
    try {
      const r = await fetch(`${url}/api/health`);
      if (r.ok) return proc;
    } catch {
      /* chưa lên */
    }
    await sleep(100);
  }
  proc.kill('SIGKILL');
  throw new Error(`server không lên sau 15 s:\n${logs.join('')}`);
}

async function kill(p: ChildProcess): Promise<void> {
  if (p.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    const t = setTimeout(() => p.kill('SIGKILL'), 5000);
    p.once('exit', () => {
      clearTimeout(t);
      resolve();
    });
    p.kill('SIGTERM');
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Ack {
  ok: boolean;
  code?: string;
  retryAfterMs?: number;
  [k: string]: unknown;
}

/** Client thật, ghi lại mọi sự kiện server gửi. */
export class Client {
  readonly socket: Socket;
  readonly events: Array<{ ev: string; data: any; t: number }> = [];
  welcome: any;
  constructor(
    readonly url: string,
    readonly deviceId = `qa-${randomUUID()}`,
    opts: { headers?: Record<string, string>; transports?: string[] } = {},
  ) {
    this.socket = io(url, {
      transports: (opts.transports as any) ?? ['websocket'],
      reconnection: false,
      forceNew: true,
      extraHeaders: opts.headers,
      timeout: 5000,
    });
    this.socket.onAny((ev, data) => this.events.push({ ev, data, t: Date.now() }));
  }

  async connect(): Promise<void> {
    if (this.socket.connected) return;
    await new Promise<void>((resolve, reject) => {
      this.socket.once('connect', () => resolve());
      this.socket.once('connect_error', (e) => reject(e));
    });
  }

  emit(ev: string, payload?: unknown): Promise<Ack> {
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve({ ok: false, code: 'ack_timeout' }), 5000);
      this.socket.emit(ev, payload, (a: Ack) => {
        clearTimeout(t);
        resolve(a);
      });
    });
  }

  async hello(nickname: string | null = null, lang = 'vi'): Promise<any> {
    await this.connect();
    const w = this.waitFor('welcome');
    const a = await this.emit('hello', { deviceId: this.deviceId, nickname, lang });
    if (!a.ok) throw new Error(`hello thất bại: ${JSON.stringify(a)}`);
    this.welcome = await w;
    return this.welcome;
  }

  /** Chờ sự kiện `ev` (thoả `pred`) xuất hiện sau thời điểm gọi, hoặc đã có trong `since`. */
  waitFor(ev: string, pred: (d: any) => boolean = () => true, timeoutMs = 4000, since = Date.now()): Promise<any> {
    return new Promise((resolve, reject) => {
      const found = this.events.find((e) => e.ev === ev && e.t >= since && pred(e.data));
      if (found) return resolve(found.data);
      const t = setTimeout(() => {
        this.socket.offAny(h);
        reject(new Error(`không nhận được '${ev}' sau ${timeoutMs} ms`));
      }, timeoutMs);
      const h = (e: string, d: any) => {
        if (e === ev && pred(d)) {
          clearTimeout(t);
          this.socket.offAny(h);
          resolve(d);
        }
      };
      this.socket.onAny(h);
    });
  }

  got(ev: string, pred: (d: any) => boolean = () => true): any[] {
    return this.events.filter((e) => e.ev === ev && pred(e.data)).map((e) => e.data);
  }

  close(): void {
    this.socket.close();
  }
}

export async function newUser(url: string, nickname: string | null = null, deviceId?: string, opts?: ConstructorParameters<typeof Client>[2]): Promise<Client> {
  const c = new Client(url, deviceId, opts);
  await c.hello(nickname);
  return c;
}

export async function getJson(url: string, init?: RequestInit): Promise<{ status: number; body: any; headers: Headers }> {
  const r = await fetch(url, init);
  const text = await r.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* không phải JSON */
  }
  return { status: r.status, body, headers: r.headers };
}

export async function postJson(url: string, data: unknown, headers: Record<string, string> = {}) {
  return getJson(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) });
}

/** Đăng nhập admin, trả cookie. */
export async function adminLogin(base: string): Promise<string> {
  const r = await fetch(`${base}/admin/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
  if (!r.ok) throw new Error(`admin login ${r.status}`);
  return r.headers.get('set-cookie')!.split(';')[0]!;
}

export async function admin(base: string, cookie: string, method: string, p: string, body?: unknown) {
  return getJson(`${base}${p}`, {
    method,
    headers: { cookie, 'x-admin-request': '1', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
