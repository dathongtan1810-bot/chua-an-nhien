import { io as ioc, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { buildApp, type AppContext } from '../src/app.js';
import { testConfig } from '../src/config.js';
import type { Repositories } from '../src/repo/types.js';
import type { ClientToServerEvents, ServerToClientEvents, WelcomePayload } from '../../shared/protocol.js';

export type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface TestServer {
  ctx: AppContext;
  url: string;
  clients: Client[];
  connect(opts?: { headers?: Record<string, string> }): Promise<Client>;
  hello(deviceId?: string, nickname?: string, ip?: string): Promise<{ c: Client; w: WelcomePayload }>;
  close(): Promise<void>;
}

let seq = 0;
export const devId = () => `dev-${process.pid}-${Date.now()}-${++seq}`;

/** TEST_ALL_PG=1 + PG_TEST_URL: chạy mọi test tích hợp trên Postgres thật, mỗi server một schema riêng. */
async function pgReposForTest(): Promise<Repositories | undefined> {
  const url = process.env.PG_TEST_URL;
  if (!url || !process.env.TEST_ALL_PG) return undefined;
  const pg = (await import('pg')).default;
  const { createPostgresRepositories } = await import('../src/repo/postgres.js');
  const schema = `t_${process.pid}_${++seq}_${Date.now()}`;
  const admin = new pg.Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.end();
  return createPostgresRepositories(new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` }));
}

export async function startServer(env: Record<string, string> = {}, opts: { repos?: Repositories } = {}): Promise<TestServer> {
  if (!opts.repos && !env.DB_PATH) opts = { ...opts, repos: await pgReposForTest() };
  const ctx = await buildApp(testConfig({ PRESENCE_INTERVAL_MS: '100', MAX_CONN_PER_IP: '200', SOCKET_EVENTS_PER_10S: '200', ...env }), opts);
  await ctx.app.listen({ host: '127.0.0.1', port: 0 });
  const port = (ctx.app.server.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}`;
  const clients: Client[] = [];
  const ts: TestServer = {
    ctx,
    url,
    clients,
    connect(opts = {}) {
      return new Promise((resolve, reject) => {
        const c: Client = ioc(url, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: opts.headers });
        clients.push(c);
        c.once('connect', () => resolve(c));
        c.once('connect_error', (e) => reject(e));
      });
    },
    async hello(deviceId = devId(), nickname, ip) {
      const c = await ts.connect(ip ? { headers: { 'x-forwarded-for': ip } } : {});
      const w = new Promise<WelcomePayload>((r) => c.once('welcome', r));
      c.emit('hello', { deviceId, nickname, lang: 'vi' });
      return { c, w: await w };
    },
    async close() {
      for (const c of clients) c.disconnect();
      await ctx.app.close();
    },
  };
  return ts;
}

export function waitFor<E extends keyof ServerToClientEvents>(c: Client, ev: E, ms = 3000): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${String(ev)}`)), ms);
    (c as any).once(ev, (p: any) => {
      clearTimeout(t);
      resolve(p);
    });
  });
}

/** Thu sự kiện trong `ms` mili giây. */
export function collect<E extends keyof ServerToClientEvents>(c: Client, ev: E, ms = 300): Promise<Array<Parameters<ServerToClientEvents[E]>[0]>> {
  const out: any[] = [];
  const h = (p: any) => out.push(p);
  (c as any).on(ev, h);
  return new Promise((r) => setTimeout(() => {
    (c as any).off(ev, h);
    r(out);
  }, ms));
}

export function emitAck(c: Client, ev: keyof ClientToServerEvents, payload?: unknown): Promise<any> {
  return new Promise((r) => (c as any).emit(ev, payload, r));
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
