import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { IdSchema } from '../../../shared/protocol.js';
import type { AppContext } from '../app.js';
import { SlidingWindowLimiter } from '../services/rateLimit.js';
import { iso, vnDay } from '../time.js';

export const ADMIN_COOKIE = 'chua_admin';
const SESSION_TTL_MS = 12 * 3600_000;

function sign(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}
function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // so sánh trên HMAC để độ dài bằng nhau, tránh lộ thời gian
  const ha = createHmac('sha256', 'cmp').update(ab).digest();
  const hb = createHmac('sha256', 'cmp').update(bb).digest();
  return timingSafeEqual(ha, hb) && ab.length === bb.length;
}

export function makeSession(secret: string, now = Date.now()): string {
  const exp = String(now + SESSION_TTL_MS);
  return `${exp}.${sign(secret, exp)}`;
}
export function verifySession(secret: string, token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (!safeEq(sig, sign(secret, exp))) return false;
  return Number(exp) > now;
}

const LoginSchema = z.object({ password: z.string().min(1).max(256) });
const StatusQuery = z.object({ status: z.enum(['pending', 'approved', 'hidden', 'all']).default('pending') });
const IdParam = z.object({ id: IdSchema });
const BanBody = z.object({ banned: z.boolean().default(true) });
const WordsBody = z.object({ words: z.array(z.string().trim().min(1).max(60)).max(5000) });
const ReportsQuery = z.object({ resolved: z.enum(['true', 'false', 'all']).default('false') });
const ResolveBody = z.object({ targetType: z.enum(['lantern', 'user']), targetId: IdSchema });
const StatsQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

export async function registerAdmin(ctx: AppContext): Promise<void> {
  const { app, config, repos, hub, filter } = ctx;
  const loginLimiter = new SlidingWindowLimiter(5, 60_000);
  const secure = config.NODE_ENV === 'production';

  const guard = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!config.ADMIN_PASSWORD) return reply.code(503).send({ error: 'admin_disabled', message: 'Chưa đặt ADMIN_PASSWORD' });
    if (!verifySession(config.sessionSecret, req.cookies[ADMIN_COOKIE])) return reply.code(401).send({ error: 'unauthorized' });
    // chống CSRF: yêu cầu header tuỳ chỉnh cho mọi thao tác ghi (form chéo site không gửi được)
    if (req.method !== 'GET' && req.headers['x-admin-request'] !== '1') return reply.code(403).send({ error: 'csrf' });
  };

  app.post('/admin/api/login', async (req, reply) => {
    if (!config.ADMIN_PASSWORD) return reply.code(503).send({ error: 'admin_disabled' });
    const lim = loginLimiter.hit(req.ip);
    if (!lim.ok) return reply.code(429).send({ error: 'rate_limited', retryAfterMs: lim.retryAfterMs });
    const body = LoginSchema.safeParse(req.body);
    if (!body.success || !safeEq(body.data.password, config.ADMIN_PASSWORD)) {
      ctx.log.warn({ ip: req.ip }, 'admin login failed');
      return reply.code(401).send({ error: 'invalid_password' });
    }
    reply.setCookie(ADMIN_COOKIE, makeSession(config.sessionSecret), {
      httpOnly: true,
      sameSite: 'strict',
      secure,
      path: '/admin',
      maxAge: SESSION_TTL_MS / 1000,
    });
    return { ok: true };
  });

  app.post('/admin/api/logout', async (_req, reply) => {
    reply.clearCookie(ADMIN_COOKIE, { path: '/admin' });
    return { ok: true };
  });

  app.register(async (r) => {
    r.addHook('preHandler', guard);

    r.get('/admin/api/me', async () => ({ ok: true, moderationMode: config.MODERATION_MODE, features: [...config.features] }));

    r.get('/admin/api/lanterns', async (req) => {
      const { status } = StatusQuery.parse(req.query);
      const rows = await repos.lanterns.listByStatus(status, Date.now(), 500);
      return { lanterns: rows.map((l) => ({ ...l, createdAt: iso(l.createdAt), expiresAt: iso(l.expiresAt) })) };
    });

    const setStatus = (status: 'approved' | 'hidden') => async (req: FastifyRequest, reply: FastifyReply) => {
      const p = IdParam.safeParse(req.params);
      if (!p.success) return reply.code(400).send({ error: 'invalid_id' });
      const l = await repos.lanterns.findById(p.data.id);
      if (!l) return reply.code(404).send({ error: 'not_found' });
      await repos.lanterns.setStatus(l.id, status);
      await repos.reports.resolveTarget('lantern', l.id);
      if (status === 'approved' && l.status !== 'approved') await hub.lanternApproved(l.id);
      if (status === 'hidden' && l.status === 'approved') hub.lanternRemoved(l.id);
      ctx.log.info({ id: l.id, status }, 'admin lantern status');
      return { ok: true };
    };
    r.post('/admin/api/lanterns/:id/approve', setStatus('approved'));
    r.post('/admin/api/lanterns/:id/hide', setStatus('hidden'));

    r.get('/admin/api/reports', async (req) => {
      const { resolved } = ReportsQuery.parse(req.query);
      const rows = await repos.reports.list({ resolved: resolved === 'all' ? undefined : resolved === 'true', limit: 500 });
      // gom theo mục tiêu
      const groups = new Map<string, { targetType: string; targetId: string; count: number; reasons: string[]; lastAt: number; preview?: string; ownerId?: string }>();
      for (const rep of rows) {
        const k = `${rep.targetType}:${rep.targetId}`;
        const g = groups.get(k) ?? { targetType: rep.targetType, targetId: rep.targetId, count: 0, reasons: [], lastAt: 0 };
        g.count++;
        if (rep.reason) g.reasons.push(rep.reason);
        g.lastAt = Math.max(g.lastAt, rep.createdAt);
        groups.set(k, g);
      }
      for (const g of groups.values()) {
        if (g.targetType === 'lantern') {
          const l = await repos.lanterns.findById(g.targetId);
          g.preview = l ? `[${l.status}] ${l.nickname}: ${l.text}` : '(đã xoá/hết hạn)';
          g.ownerId = l?.userId;
        } else {
          const u = await repos.users.findById(g.targetId);
          g.preview = u ? `${u.nickname}${u.flagged ? ' (đang bị gắn cờ)' : ''}${u.banned ? ' (đã khoá)' : ''}` : '(đã xoá)';
          g.ownerId = u?.id;
        }
      }
      return { reports: [...groups.values()].sort((a, b) => b.lastAt - a.lastAt).map((g) => ({ ...g, lastAt: iso(g.lastAt) })) };
    });

    r.post('/admin/api/reports/resolve', async (req, reply) => {
      const b = ResolveBody.safeParse(req.body);
      if (!b.success) return reply.code(400).send({ error: 'invalid_payload' });
      const n = await repos.reports.resolveTarget(b.data.targetType, b.data.targetId);
      if (b.data.targetType === 'user') await repos.users.setFlagged(b.data.targetId, false);
      return { ok: true, resolved: n };
    });

    r.get('/admin/api/users', async () => {
      const [banned, flagged] = await Promise.all([repos.users.listBanned(), repos.users.listFlagged()]);
      const strip = (u: (typeof banned)[number]) => ({ id: u.id, nickname: u.nickname, banned: u.banned, flagged: u.flagged, lastSeenAt: iso(u.lastSeenAt) });
      return { banned: banned.map(strip), flagged: flagged.map(strip) };
    });

    r.post('/admin/api/users/:id/ban', async (req, reply) => {
      const p = IdParam.safeParse(req.params);
      const b = BanBody.safeParse(req.body ?? {});
      if (!p.success || !b.success) return reply.code(400).send({ error: 'invalid_payload' });
      const u = await repos.users.findById(p.data.id);
      if (!u) return reply.code(404).send({ error: 'not_found' });
      await repos.users.setBanned(u.id, b.data.banned);
      if (b.data.banned) {
        // ẩn mọi đèn đang hiển thị của thiết bị bị khoá
        for (const id of await repos.lanterns.listIdsByUser(u.id)) {
          const l = await repos.lanterns.findById(id);
          if (l?.status === 'approved') {
            await repos.lanterns.setStatus(id, 'hidden');
            hub.lanternRemoved(id);
          }
        }
        hub.disconnectUser(u.id, 'banned', 'Thiết bị đã bị khoá');
      }
      ctx.log.info({ userId: u.id, banned: b.data.banned }, 'admin ban');
      return { ok: true };
    });

    r.get('/admin/api/words', async () => ({ words: await repos.words.list() }));

    r.put('/admin/api/words', { bodyLimit: 256 * 1024 }, async (req, reply) => {
      const b = WordsBody.safeParse(req.body);
      if (!b.success) return reply.code(400).send({ error: 'invalid_payload' });
      const words = [...new Set(b.data.words)];
      await repos.words.replaceAll(words);
      filter.setWords(words, ctx.unaccentedAlso);
      return { ok: true, count: filter.wordCount };
    });

    r.post('/admin/api/words/test', async (req, reply) => {
      const b = z.object({ text: z.string().max(1000) }).safeParse(req.body);
      if (!b.success) return reply.code(400).send({ error: 'invalid_payload' });
      return filter.check(b.data.text);
    });

    r.get('/admin/api/stats', async (req) => {
      const { days } = StatsQuery.parse(req.query);
      const to = vnDay();
      const from = vnDay(Date.now() - (days - 1) * 86400_000);
      const rows = await repos.stats.range(from, to);
      const byDay = new Map<string, Record<string, number>>();
      for (let i = days - 1; i >= 0; i--) byDay.set(vnDay(Date.now() - i * 86400_000), {});
      for (const r0 of rows) {
        const d = byDay.get(r0.day);
        if (d) d[r0.key] = r0.value;
      }
      return {
        days: [...byDay.entries()].map(([day, v]) => ({
          day,
          lanterns: v.lanterns ?? 0,
          incense: v.incense ?? 0,
          bells: v.bells ?? 0,
          reports: v.reports ?? 0,
          newUsers: v.new_users ?? 0,
          peakOnline: v.peak_online ?? 0,
        })),
        now: hub.onlineSnapshot,
      };
    });
  });
}
