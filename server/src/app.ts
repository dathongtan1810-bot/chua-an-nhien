import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from './config.js';
import { createLogger, type Logger } from './logger.js';
import { createMetrics, type Metrics } from './metrics.js';
import { createSqliteRepositories } from './repo/sqlite.js';
import type { Repositories } from './repo/types.js';
import { ContentFilter, DEFAULT_UNACCENTED_ALSO, parseWordList } from './services/filter.js';
import { Hub, type IO } from './realtime/hub.js';
import { registerApi } from './http/api.js';
import { registerAdmin } from './http/admin.js';
import { SlidingWindowLimiter } from './services/rateLimit.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '..');
export const VERSION = '0.1.0';

export interface AppContext {
  config: Config;
  log: Logger;
  metrics: Metrics;
  repos: Repositories;
  filter: ContentFilter;
  hub: Hub;
  io: IO;
  app: FastifyInstance;
  startedAt: number;
  unaccentedAlso: string[];
}

/** Tìm danh sách từ cấm khởi tạo: BANNED_WORDS_PATH → data/tu-cam.json (từ content/) → data/banned-words.json. */
export function loadSeedWords(config: Config): { words: string[]; unaccentedAlso: string[]; substitutions: Record<string, string>; source: string } {
  const candidates = [config.BANNED_WORDS_PATH, path.join(SERVER_ROOT, 'data/tu-cam.json'), path.join(SERVER_ROOT, 'data/banned-words.json')].filter(Boolean);
  const merged = { words: [] as string[], unaccentedAlso: [...DEFAULT_UNACCENTED_ALSO], substitutions: {} as Record<string, string>, source: 'none' };
  const sources: string[] = [];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const parsed = parseWordList(JSON.parse(fs.readFileSync(file, 'utf8')));
      merged.words.push(...parsed.words);
      if (parsed.unaccentedAlso) merged.unaccentedAlso.push(...parsed.unaccentedAlso);
      if (parsed.substitutions) Object.assign(merged.substitutions, parsed.substitutions);
      sources.push(path.basename(file));
    } catch {
      // bỏ qua file hỏng, dùng nguồn tiếp theo
    }
  }
  merged.words = [...new Set(merged.words)];
  merged.unaccentedAlso = [...new Set(merged.unaccentedAlso)];
  merged.source = sources.join('+') || 'none';
  return merged;
}

export function clientIp(headers: Record<string, string | string[] | undefined>, remote: string | undefined, trustProxy: boolean): string {
  if (trustProxy) {
    const xf = headers['x-forwarded-for'];
    const first = (Array.isArray(xf) ? xf[0] : xf)?.split(',')[0]?.trim();
    if (first) return first;
    const fly = headers['fly-client-ip'];
    if (typeof fly === 'string' && fly) return fly;
  }
  return (remote ?? 'unknown').replace(/^::ffff:/, '');
}

export async function buildApp(config: Config, opts: { repos?: Repositories } = {}): Promise<AppContext> {
  const log = createLogger(config.LOG_LEVEL);
  const metrics = createMetrics();
  const repos = opts.repos ?? createSqliteRepositories(config.DB_PATH);

  const seed = loadSeedWords(config);
  if ((await repos.words.count()) === 0 && seed.words.length) await repos.words.replaceAll(seed.words);
  const filter = new ContentFilter({ words: await repos.words.list(), unaccentedAlso: seed.unaccentedAlso, substitutions: seed.substitutions });
  log.info({ words: filter.wordCount, source: seed.source }, 'banned words loaded');

  const app: FastifyInstance = Fastify({
    loggerInstance: log as unknown as FastifyBaseLogger,
    bodyLimit: config.MAX_PAYLOAD_BYTES,
    trustProxy: config.TRUST_PROXY,
  });

  const corsAll = config.corsOrigins.includes('*');
  await app.register(cors, {
    origin: corsAll ? true : config.corsOrigins,
    credentials: !corsAll,
  });
  await app.register(cookie);

  // Giới hạn tần suất HTTP theo IP (trừ health/metrics)
  const httpLimiter = new SlidingWindowLimiter(config.HTTP_RATE_PER_MIN, 60_000);
  const sweep = setInterval(() => httpLimiter.sweep(), 60_000);
  sweep.unref();
  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/') && !req.url.startsWith('/admin/api/')) return;
    if (req.url.startsWith('/api/health')) return;
    const r = httpLimiter.hit(req.ip);
    if (!r.ok) {
      metrics.rateLimited.inc({ event: 'http' });
      reply.header('retry-after', Math.ceil(r.retryAfterMs / 1000));
      return reply.code(429).send({ error: 'rate_limited', retryAfterMs: r.retryAfterMs });
    }
  });
  app.addHook('onResponse', async (req, reply) => {
    metrics.http.observe(
      { method: req.method, route: req.routeOptions.url ?? 'unknown', status: String(reply.statusCode) },
      reply.elapsedTime / 1000,
    );
  });
  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('x-frame-options', 'DENY');
    return payload;
  });

  const io: IO = new Server(app.server, {
    cors: { origin: corsAll ? true : config.corsOrigins, credentials: !corsAll },
    maxHttpBufferSize: config.MAX_PAYLOAD_BYTES,
    pingInterval: 20_000,
    pingTimeout: 20_000,
    connectTimeout: 10_000,
    perMessageDeflate: false,
    serveClient: false,
  });
  io.use((socket, next) => {
    socket.data.ip = clientIp(socket.handshake.headers, socket.handshake.address, config.TRUST_PROXY);
    next();
  });

  const hub = new Hub({ io, config, repos, log, metrics, filter });
  await hub.start();

  const ctx: AppContext = { config, log, metrics, repos, filter, hub, io, app, startedAt: Date.now(), unaccentedAlso: seed.unaccentedAlso };
  registerApi(ctx);
  await registerAdmin(ctx);

  const adminDir = process.env.ADMIN_DIR ?? path.resolve(SERVER_ROOT, '../admin');
  if (fs.existsSync(adminDir)) {
    await app.register(fastifyStatic, { root: adminDir, prefix: '/admin/', decorateReply: false });
    app.get('/admin', async (_req, reply) => reply.redirect('/admin/'));
  }

  app.addHook('onClose', async () => {
    clearInterval(sweep);
    hub.stop();
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await repos.close();
  });

  return ctx;
}
