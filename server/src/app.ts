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
import { createPostgresRepositoriesFromUrl } from './repo/postgres.js';
import type { Repositories } from './repo/types.js';
import { ContentFilter, DEFAULT_UNACCENTED_ALSO, parseWordList } from './services/filter.js';
import { Hub, type IO } from './realtime/hub.js';
import { LocalCluster, RedisCluster, type Cluster } from './realtime/cluster.js';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
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

/**
 * Danh sách từ cấm khởi tạo — dùng MỘT nguồn, theo thứ tự ưu tiên:
 *   BANNED_WORDS_PATH → data/tu-cam.json (bản sao content/tu-cam.json của nhóm nội dung) → data/banned-words.json.
 * Nguồn hỏng/không đọc được thì thử nguồn kế tiếp. Danh sách mặc định của server chỉ là dự phòng
 * (nhóm nội dung là nguồn chuẩn và cố ý loại các dạng không dấu dễ chặn nhầm như "dit").
 */
export function loadSeedWords(config: Config): { words: string[]; unaccentedAlso: string[]; substitutions: Record<string, string>; source: string } {
  const candidates = [config.BANNED_WORDS_PATH, path.join(SERVER_ROOT, 'data/tu-cam.json'), path.join(SERVER_ROOT, 'data/banned-words.json')].filter(Boolean);
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const parsed = parseWordList(JSON.parse(fs.readFileSync(file, 'utf8')));
      if (!parsed.words.length) continue;
      const isServerDefault = path.basename(file) === 'banned-words.json';
      return {
        words: parsed.words,
        unaccentedAlso: parsed.unaccentedAlso ?? (isServerDefault ? DEFAULT_UNACCENTED_ALSO : []),
        substitutions: parsed.substitutions ?? {},
        source: path.basename(file),
      };
    } catch {
      // bỏ qua file hỏng, dùng nguồn tiếp theo
    }
  }
  return { words: [], unaccentedAlso: DEFAULT_UNACCENTED_ALSO, substitutions: {}, source: 'none' };
}

/**
 * IP client khi có `hops` proxy tin cậy phía trước: lấy phần tử thứ `hops` tính từ PHẢI của X-Forwarded-For
 * (proxy nối IP thật vào cuối; phần bên trái do client tự đặt nên không tin). Khớp hành vi `trustProxy: <số>` của Fastify.
 */
export function clientIp(headers: Record<string, string | string[] | undefined>, remote: string | undefined, hops: number): string {
  const strip = (x: string) => x.trim().replace(/^::ffff:/, '');
  if (hops > 0) {
    const xf = headers['x-forwarded-for'];
    const list = (Array.isArray(xf) ? xf.join(',') : (xf ?? ''))
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (list.length) return strip(list[Math.max(0, list.length - hops)]!);
  }
  return strip(remote ?? 'unknown');
}

export async function buildApp(config: Config, opts: { repos?: Repositories } = {}): Promise<AppContext> {
  const log = createLogger(config.LOG_LEVEL);
  const metrics = createMetrics();
  const repos =
    opts.repos ?? (config.DATABASE_URL ? await createPostgresRepositoriesFromUrl(config.DATABASE_URL) : createSqliteRepositories(config.DB_PATH));

  const seed = loadSeedWords(config);
  if ((await repos.words.count()) === 0 && seed.words.length) await repos.words.replaceAll(seed.words);
  const filter = new ContentFilter({ words: await repos.words.list(), unaccentedAlso: seed.unaccentedAlso, substitutions: seed.substitutions });
  log.info({ words: filter.wordCount, source: seed.source }, 'banned words loaded');

  const app: FastifyInstance = Fastify({
    loggerInstance: log as unknown as FastifyBaseLogger,
    bodyLimit: config.MAX_PAYLOAD_BYTES,
    // tin đúng N hop gần nhất (tương đương trustProxy: N)
    trustProxy: config.TRUST_PROXY > 0 ? (_addr: string, i: number) => i < config.TRUST_PROXY : false,
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
    // Dựa trên route đã khớp (đường dẫn đã giải mã) – tránh lách bằng "/%61pi/..."
    const route = req.routeOptions.url ?? '';
    if (!route.startsWith('/api/') && !route.startsWith('/admin/api/')) return;
    if (route === '/api/health') return;
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

  // Nhiều instance: Redis adapter cho Socket.IO + trạng thái dùng chung
  let cluster: Cluster = new LocalCluster();
  const redisClients: Redis[] = [];
  if (config.REDIS_URL) {
    const pub = new Redis(config.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 3 });
    const sub = pub.duplicate();
    const state = pub.duplicate();
    redisClients.push(pub, sub, state);
    io.adapter(createAdapter(pub, sub, { key: `${config.REDIS_PREFIX}sio` }));
    cluster = new RedisCluster(state, config.REDIS_PREFIX, Math.max(10_000, config.PRESENCE_INTERVAL_MS * 4));
    if (!config.DATABASE_URL) log.warn('REDIS_URL đã đặt nhưng không có DATABASE_URL: các instance phải dùng chung một DB (Postgres)');
    log.info({ instance: (cluster as RedisCluster).instanceId }, 'cluster mode (redis)');
  }

  const hub = new Hub({ io, config, repos, log, metrics, filter, cluster });
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
    await cluster.close();
    for (const r of redisClients) r.disconnect();
    await repos.close();
  });

  return ctx;
}
