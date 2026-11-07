import {
  DeleteMeSchema,
  HelloSchema,
  LanternsQuerySchema,
  LIMITS,
  type DeleteMeResponse,
  type HealthResponse,
  type LanternsResponse,
  type StatsResponse,
} from '../../../shared/protocol.js';
import type { AppContext } from '../app.js';
import { VERSION } from '../app.js';
import { hashDevice } from '../services/identity.js';
import { SlidingWindowLimiter } from '../services/rateLimit.js';
import { iso, vnDay } from '../time.js';

export function registerApi(ctx: AppContext): void {
  const { app, repos, hub, config, metrics } = ctx;
  const deleteLimiter = new SlidingWindowLimiter(5, 3600_000);

  app.get('/api/health', async (): Promise<HealthResponse> => ({
    ok: true,
    uptimeSec: Math.round((Date.now() - ctx.startedAt) / 1000),
    uptime: Math.round((Date.now() - ctx.startedAt) / 1000),
    online: hub.onlineSnapshot.online,
    version: VERSION,
    serverTime: iso(Date.now()),
  }));

  app.get('/api/lanterns', async (req, reply): Promise<LanternsResponse | void> => {
    const q = LanternsQuerySchema.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'invalid_query', message: 'since phải là chuỗi ISO-8601' });
    const now = Date.now();
    const since = Math.max(q.data.since ? Date.parse(q.data.since) : 0, now - LIMITS.LANTERN_TTL_MS);
    let rows = await repos.lanterns.listApproved({ since, now, limit: 200 });
    // Lọc người bị chặn nếu client gửi kèm header x-device-id
    const dev = req.headers['x-device-id'];
    if (typeof dev === 'string' && HelloSchema.shape.deviceId.safeParse(dev).success) {
      const u = await repos.users.findByDeviceHash(hashDevice(dev, config.DEVICE_SALT));
      if (u) {
        const blocked = await hub.blockedOf(u.id);
        if (blocked.size) rows = rows.filter((l) => !blocked.has(l.userId));
      }
    }
    reply.header('cache-control', 'no-store');
    return { lanterns: rows.map((l) => hub.toPayload(l)), serverTime: iso(now) };
  });

  app.get('/api/stats', async (): Promise<StatsResponse> => {
    const day = await repos.stats.getDay(vnDay());
    const snap = hub.onlineSnapshot;
    return {
      online: snap.online,
      areas: snap.areas,
      today: { lanterns: day.lanterns ?? 0, incense: day.incense ?? 0, bells: day.bells ?? 0 },
      lanternsToday: day.lanterns ?? 0,
      incenseToday: day.incense ?? 0,
      bellsToday: day.bells ?? 0,
      serverTime: iso(Date.now()),
    };
  });

  app.post('/api/me/delete', async (req, reply): Promise<DeleteMeResponse | void> => {
    const r = deleteLimiter.hit(req.ip);
    if (!r.ok) return reply.code(429).send({ error: 'rate_limited', retryAfterMs: r.retryAfterMs });
    const body = DeleteMeSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_payload', message: 'Cần deviceId hợp lệ' });
    const empty = { lanterns: 0, likes: 0, reports: 0, blocks: 0, incense: 0, user: 0 };
    const user = await repos.users.findByDeviceHash(hashDevice(body.data.deviceId, config.DEVICE_SALT));
    // deviceId không tồn tại vẫn trả ok (không lỗi). Người biết deviceId vốn đã "là" thiết bị đó nên số đếm không lộ thêm gì.
    if (!user) return { ok: true, deleted: empty };
    const lanternIds = await repos.lanterns.listIdsByUser(user.id);
    hub.disconnectUser(user.id);
    const deleted = await repos.users.deleteCascade(user.id);
    hub.forgetUser(user.id);
    for (const id of lanternIds) hub.lanternRemoved(id);
    ctx.log.info({ lanterns: deleted.lanterns }, 'user data deleted');
    return { ok: true, deleted };
  });

  app.get('/metrics', async (req, reply) => {
    if (config.METRICS_TOKEN && req.headers.authorization !== `Bearer ${config.METRICS_TOKEN}`) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    reply.header('content-type', metrics.registry.contentType);
    return metrics.registry.metrics();
  });
}
