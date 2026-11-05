import type { Server, Socket } from 'socket.io';
import type { ZodTypeAny } from 'zod';
import {
  C2S_SCHEMAS,
  LIMITS,
  type Ack,
  type C2SEvent,
  type ClientToServerEvents,
  type ErrorCode,
  type IncenseItem,
  type LanternPayload,
  type RoomStatePayload,
  type ServerToClientEvents,
} from '../../../shared/protocol.js';
import type { Config, Feature } from '../config.js';
import type { Logger } from '../logger.js';
import type { Metrics } from '../metrics.js';
import type { LanternRow, Repositories, UserRow } from '../repo/types.js';
import { ContentFilter } from '../services/filter.js';
import { hashDevice, newId, randomNickname, sanitizeNickname } from '../services/identity.js';
import { Presence } from '../services/presence.js';
import { CooldownLimiter, SlidingWindowLimiter } from '../services/rateLimit.js';
import { Rooms } from '../services/rooms.js';
import { iso, vnDay } from '../time.js';
import { translate } from '../i18n.js';

export type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export interface SocketData {
  ip: string;
  deviceHash?: string;
  lang?: string;
  userId?: string;
  nickname?: string;
}

const LOBBY = 'lobby';
const userRoom = (id: string) => `u:${id}`;
const privRoom = (code: string) => `r:${code}`;

const FEATURE_OF: Partial<Record<C2SEvent, Feature>> = {
  enter_area: 'presence',
  light_incense: 'incense',
  ring_bell: 'bell',
  release_lantern: 'lantern',
  like_lantern: 'lantern',
  report: 'report',
  block_user: 'report',
  room_create: 'room',
  room_join: 'room',
  room_leave: 'room',
};

/** Giới hạn theo sự kiện: [số lần, cửa sổ ms] cho mỗi user; IP gấp IP_FACTOR lần. */
const EVENT_LIMITS: Partial<Record<C2SEvent, [number, number]>> = {
  hello: [5, 60_000],
  enter_area: [30, 60_000],
  light_incense: [1, 15_000],
  like_lantern: [60, 60_000],
  report: [10, 600_000],
  block_user: [20, 600_000],
  room_create: [5, 600_000],
  room_join: [20, 600_000],
  room_leave: [20, 600_000],
};
const IP_FACTOR = 5;

class HandledError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
class RateLimitedError extends Error {
  constructor(
    public event: string,
    public retryAfterMs: number,
  ) {
    super('rate_limited');
  }
}

export interface HubDeps {
  io: IO;
  config: Config;
  repos: Repositories;
  log: Logger;
  metrics: Metrics;
  filter: ContentFilter;
}

export class Hub {
  readonly presence = new Presence();
  readonly rooms = new Rooms();
  private incense: Array<IncenseItem & { ts: number }> = [];
  /** userId → tập userId có quan hệ chặn (hai chiều), nạp khi hello. */
  private blockCache = new Map<string, Set<string>>();
  private userSockets = new Map<string, Set<string>>();
  private connPerIp = new Map<string, number>();
  private limiters = new Map<string, SlidingWindowLimiter>();
  private floodLimiter: SlidingWindowLimiter;
  private bellUser = new CooldownLimiter(LIMITS.BELL_USER_COOLDOWN_MS);
  private bellGlobal = new CooldownLimiter(LIMITS.BELL_GLOBAL_COOLDOWN_MS);
  private bellIp = new SlidingWindowLimiter(IP_FACTOR, LIMITS.BELL_USER_COOLDOWN_MS);
  private lanternUser = new SlidingWindowLimiter(LIMITS.LANTERNS_PER_HOUR, 3600_000);
  private lanternIp = new SlidingWindowLimiter(LIMITS.LANTERNS_PER_HOUR * IP_FACTOR, 3600_000);
  private timers: NodeJS.Timeout[] = [];
  private floodStrikes = new Map<string, number>();
  private lanternInflight = new Set<string>();

  constructor(private readonly d: HubDeps) {
    this.floodLimiter = new SlidingWindowLimiter(d.config.SOCKET_EVENTS_PER_10S, 10_000);
    for (const [ev, [max, win]] of Object.entries(EVENT_LIMITS)) {
      this.limiters.set(`u:${ev}`, new SlidingWindowLimiter(max, win));
      this.limiters.set(`ip:${ev}`, new SlidingWindowLimiter(max * IP_FACTOR, win));
    }
  }

  // ---------------------------------------------------------------- lifecycle
  async start(): Promise<void> {
    const { io, config } = this.d;
    // Khôi phục lư hương sau khi khởi động lại
    const since = Date.now() - LIMITS.INCENSE_WINDOW_MS;
    for (const r of await this.d.repos.incense.listSince(since)) {
      this.incense.push({ userId: r.userId, nickname: r.nickname, count: r.count, at: iso(r.at), ts: r.at });
    }

    io.use((socket, next) => {
      const ip = socket.data.ip;
      const n = this.connPerIp.get(ip) ?? 0;
      if (n >= config.MAX_CONN_PER_IP) {
        this.d.metrics.connRejected.inc({ reason: 'per_ip' });
        return next(new Error('too_many_connections'));
      }
      this.connPerIp.set(ip, n + 1);
      socket.on('disconnect', () => {
        const m = (this.connPerIp.get(ip) ?? 1) - 1;
        if (m <= 0) this.connPerIp.delete(ip);
        else this.connPerIp.set(ip, m);
      });
      next();
    });
    io.on('connection', (s) => this.onConnection(s));

    const presenceTick = setInterval(() => this.broadcastPresence(), config.PRESENCE_INTERVAL_MS);
    const sweepTick = setInterval(() => void this.sweep(), 60_000);
    presenceTick.unref();
    sweepTick.unref();
    this.timers.push(presenceTick, sweepTick);
  }

  stop(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  private broadcastPresence(): void {
    const { metrics, io, config } = this.d;
    metrics.connections.set(io.engine.clientsCount);
    // Dọn kết nối chết (socket đã mất mà chưa kịp gỡ khỏi presence)
    this.presence.sweep((id) => io.sockets.sockets.has(id));
    if (!this.presence.changed) return;
    const snap = this.presence.snapshot();
    metrics.online.set(snap.online);
    for (const [a, n] of Object.entries(snap.areas)) metrics.areaOnline.set({ area: a }, n);
    this.d.repos.stats.max(vnDay(), 'peak_online', snap.online).catch((err) => this.d.log.error({ err }, 'stats.max failed'));
    if (config.features.has('presence')) io.to(LOBBY).emit('presence', snap);
  }

  async sweep(now = Date.now()): Promise<void> {
    this.pruneIncense(now);
    this.rooms.sweep(now);
    for (const l of this.limiters.values()) l.sweep();
    this.floodLimiter.sweep();
    this.bellUser.sweep();
    this.bellIp.sweep();
    this.lanternUser.sweep();
    this.lanternIp.sweep();
    this.floodStrikes.clear();
    try {
      const n = await this.d.repos.lanterns.purgeExpired(now);
      if (n) this.d.log.info({ n }, 'purged expired lanterns');
    } catch (err) {
      this.d.log.error({ err }, 'purge failed');
    }
  }

  private pruneIncense(now = Date.now()): void {
    const cut = now - LIMITS.INCENSE_WINDOW_MS;
    if (this.incense.length && this.incense[0]!.ts <= cut) this.incense = this.incense.filter((i) => i.ts > cut);
  }

  // ---------------------------------------------------------------- helpers
  private blocked(userId: string): Set<string> {
    return this.blockCache.get(userId) ?? new Set();
  }

  /** Phát tới sảnh, bỏ qua những người có quan hệ chặn với `authorId`. */
  private async emitFromAuthor<E extends keyof ServerToClientEvents>(authorId: string, ev: E, ...args: Parameters<ServerToClientEvents[E]>) {
    // Tác giả có thể đã offline (cache bị xoá) → lấy từ DB
    const ex = [...(await this.blockedOf(authorId))].map(userRoom);
    const target = ex.length ? this.d.io.to(LOBBY).except(ex) : this.d.io.to(LOBBY);
    (target.emit as (e: string, ...a: unknown[]) => void)(ev, ...args);
  }

  toPayload(l: LanternRow): LanternPayload {
    return { id: l.id, text: l.text, color: l.color, nickname: l.nickname, at: iso(l.createdAt), likes: l.likes };
  }

  private limit(event: C2SEvent, s: Sock): void {
    const u = this.limiters.get(`u:${event}`);
    if (!u) return;
    const ipL = this.limiters.get(`ip:${event}`)!;
    const r1 = u.peek(s.data.userId ?? s.id);
    const r2 = ipL.peek(s.data.ip);
    if (!r1.ok || !r2.ok) throw new RateLimitedError(event, Math.max(r1.retryAfterMs, r2.retryAfterMs));
    u.hit(s.data.userId ?? s.id);
    ipL.hit(s.data.ip);
  }

  private requireUser(s: Sock): string {
    if (!s.data.userId) throw new HandledError('not_hello', 'Cần gửi hello trước');
    return s.data.userId;
  }

  // ---------------------------------------------------------------- connection
  private onConnection(s: Sock): void {
    const { log, metrics } = this.d;

    for (const ev of Object.keys(C2S_SCHEMAS) as C2SEvent[]) {
      s.on(ev as keyof ClientToServerEvents, async (...args: unknown[]) => {
        const ack = typeof args[args.length - 1] === 'function' ? (args.pop() as Ack) : undefined;
        metrics.events.inc({ event: ev });
        try {
          // chống flood chung theo socket
          const fl = this.floodLimiter.hit(s.id);
          if (!fl.ok) {
            const strikes = (this.floodStrikes.get(s.id) ?? 0) + 1;
            this.floodStrikes.set(s.id, strikes);
            if (strikes > this.d.config.SOCKET_EVENTS_PER_10S) {
              log.warn({ ip: s.data.ip, userId: s.data.userId }, 'flood → disconnect');
              s.disconnect(true);
              return;
            }
            throw new RateLimitedError('*', fl.retryAfterMs);
          }
          const feature = FEATURE_OF[ev];
          if (feature && !this.d.config.features.has(feature)) throw new HandledError('feature_disabled', `Tính năng ${feature} đang tắt`);
          if (ev === 'hello' && this.d.config.features.size === 0) throw new HandledError('feature_disabled', 'Chế độ ngoại tuyến');
          const schema = C2S_SCHEMAS[ev] as ZodTypeAny;
          const parsed = schema.safeParse(args[0]);
          if (!parsed.success) {
            metrics.invalid.inc({ event: ev });
            throw new HandledError('invalid_payload', parsed.error.issues.map((i) => `${i.path.join('.') || ev}: ${i.message}`).join('; ').slice(0, 300));
          }
          if (ev !== 'hello') this.requireUser(s);
          this.limit(ev, s);
          const res = await this.dispatch(ev, s, parsed.data);
          ack?.({ ok: true, ...(res ?? {}) });
        } catch (err) {
          if (err instanceof RateLimitedError) {
            metrics.rateLimited.inc({ event: err.event });
            s.emit('rate_limited', { event: err.event === '*' ? ev : err.event, retryAfterMs: err.retryAfterMs });
            ack?.({ ok: false, code: 'rate_limited', retryAfterMs: err.retryAfterMs });
          } else if (err instanceof HandledError) {
            s.emit('error', { code: err.code, message: translate(err.message, s.data.lang) });
            ack?.({ ok: false, code: err.code });
            if (err.code === 'banned') s.disconnect(true);
          } else {
            log.error({ err, ev }, 'handler error');
            s.emit('error', { code: 'internal', message: translate('Lỗi máy chủ', s.data.lang) });
            ack?.({ ok: false, code: 'internal' });
          }
        }
      });
    }

    s.on('disconnect', () => {
      this.floodLimiter.reset(s.id);
      this.floodStrikes.delete(s.id);
      this.presence.remove(s.id);
      const uid = s.data.userId;
      if (!uid) return;
      const set = this.userSockets.get(uid);
      set?.delete(s.id);
      if (!set || set.size === 0) {
        this.userSockets.delete(uid);
        this.blockCache.delete(uid);
        const room = this.rooms.leave(uid);
        if (room) this.emitRoomState(room.code);
      } else {
        const room = this.rooms.roomOf(uid);
        if (room) this.emitRoomState(room.code);
      }
    });
  }

  private async dispatch(ev: C2SEvent, s: Sock, p: any): Promise<Record<string, unknown> | void> {
    switch (ev) {
      case 'hello':
        return this.onHello(s, p);
      case 'enter_area':
        return this.onEnterArea(s, p);
      case 'light_incense':
        return this.onIncense(s, p);
      case 'ring_bell':
        return this.onBell(s, p);
      case 'release_lantern':
        return this.onLantern(s, p);
      case 'like_lantern':
        return this.onLike(s, p);
      case 'report':
        return this.onReport(s, p);
      case 'block_user':
        return this.onBlock(s, p);
      case 'room_create':
        return this.onRoomCreate(s);
      case 'room_join':
        return this.onRoomJoin(s, p);
      case 'room_leave':
        return this.onRoomLeave(s);
    }
  }

  // ---------------------------------------------------------------- handlers
  private async onHello(s: Sock, p: { deviceId: string; nickname?: string | null; lang: string }) {
    const { repos, config } = this.d;
    const now = Date.now();
    const hash = hashDevice(p.deviceId, config.DEVICE_SALT);
    // Không cho đổi thiết bị giữa chừng trên cùng kết nối (tránh reset giới hạn theo user bằng deviceId mới)
    if (s.data.deviceHash && s.data.deviceHash !== hash) throw new HandledError('invalid_payload', 'Không thể đổi deviceId trên cùng kết nối');
    s.data.deviceHash = hash;
    s.data.lang = p.lang;
    let nickname = sanitizeNickname(p.nickname, LIMITS.NICKNAME_MAX_CHARS);
    if (nickname && !this.d.filter.check(nickname).ok) nickname = '';
    let user: UserRow | undefined = await repos.users.findByDeviceHash(hash);
    if (user?.banned) throw new HandledError('banned', 'Thiết bị đã bị khoá');
    if (!user) {
      try {
        user = await repos.users.create({ id: newId('u'), deviceHash: hash, nickname: nickname || randomNickname(), lang: p.lang, createdAt: now });

        await repos.stats.incr(vnDay(now), 'new_users');
      } catch (err) {
        // hai tab cùng thiết bị hello đồng thời → bản ghi đã được tạo bởi tab kia
        user = await repos.users.findByDeviceHash(hash);
        if (!user) throw err;
      }
    } else {
      user = { ...user, nickname: nickname || user.nickname, lang: p.lang };
      await repos.users.touch(user.id, user.nickname, user.lang, now);
    }

    // Gửi hello lần 2 trên cùng socket (đổi biệt danh) → cập nhật, không nhân đôi presence.
    const prevUid = s.data.userId;
    if (prevUid && prevUid !== user.id) {
      s.leave(userRoom(prevUid));
      const set = this.userSockets.get(prevUid);
      set?.delete(s.id);
      const oldRoom = this.rooms.roomOf(prevUid);
      if (oldRoom) s.leave(privRoom(oldRoom.code));
      if (!set || set.size === 0) {
        this.userSockets.delete(prevUid);
        this.blockCache.delete(prevUid);
        const left = this.rooms.leave(prevUid);
        if (left) this.emitRoomState(left.code);
      }
    }
    s.data.userId = user.id;
    s.data.nickname = user.nickname;
    s.join([LOBBY, userRoom(user.id)]);
    if (!this.userSockets.has(user.id)) this.userSockets.set(user.id, new Set());
    this.userSockets.get(user.id)!.add(s.id);
    if (!this.presence.get(s.id) || prevUid !== user.id) this.presence.add(s.id, user.id);
    this.blockCache.set(user.id, new Set(await repos.blocks.related(user.id)));

    this.pruneIncense(now);
    const blocked = this.blocked(user.id);
    const snap = this.presence.snapshot();
    s.emit('welcome', {
      userId: user.id,
      nickname: user.nickname,
      online: snap.online,
      areas: snap.areas,
      incense: this.incense.filter((i) => !blocked.has(i.userId)).map(({ ts: _ts, ...i }) => i),
      serverTime: iso(now),
    });
    return { userId: user.id };
  }

  private onEnterArea(s: Sock, p: { area: import('../../../shared/protocol.js').Area }) {
    this.presence.setArea(s.id, p.area);
    const room = this.rooms.roomOf(s.data.userId!);
    if (room) this.emitRoomState(room.code);
  }

  private async onIncense(s: Sock, p: { count: number }) {
    const uid = s.data.userId!;
    const now = Date.now();
    const item: IncenseItem = { userId: uid, nickname: s.data.nickname!, count: p.count, at: iso(now) };
    this.incense.push({ ...item, ts: now });
    if (this.incense.length > 5000) this.incense.splice(0, this.incense.length - 5000);
    await this.d.repos.incense.add(uid, p.count, now);
    await this.d.repos.stats.incr(vnDay(now), 'incense', p.count);
    this.d.metrics.incense.inc(p.count);
    await this.emitFromAuthor(uid, 'incense_lit', item);
  }

  private async onBell(s: Sock, p: { force: number }) {
    const uid = s.data.userId!;
    const u = this.bellUser.check(uid);
    const g = this.bellGlobal.check('g');
    const ip = this.bellIp.peek(s.data.ip);
    if (!u.ok || !g.ok || !ip.ok) throw new RateLimitedError('ring_bell', Math.max(u.retryAfterMs, g.retryAfterMs, ip.retryAfterMs));
    this.bellUser.commit(uid);
    this.bellGlobal.commit('g');
    this.bellIp.hit(s.data.ip);
    const now = Date.now();
    await this.d.repos.stats.incr(vnDay(now), 'bells');
    this.d.metrics.bells.inc();
    this.d.io.to(LOBBY).emit('bell_rung', { force: p.force, at: iso(now) });
  }

  private async onLantern(s: Sock, p: { text: string; color: string }) {
    const uid = s.data.userId!;
    const now = Date.now();
    // Tuần tự hoá theo user: không cho nhiều release_lantern của cùng 1 người chạy song song
    // (nếu không, các lời gọi đồng thời cùng vượt qua bước kiểm tra trước khi có bản ghi nào được chèn).
    if (this.lanternInflight.has(uid)) throw new RateLimitedError('release_lantern', 1000);
    const lu = this.lanternUser.peek(uid);
    if (!lu.ok) throw new RateLimitedError('release_lantern', lu.retryAfterMs);
    // IP: ghi nhận ngay (đồng bộ, trước mọi await) để nhiều user cùng IP không vượt rào song song
    const li = this.lanternIp.hit(s.data.ip);
    if (!li.ok) throw new RateLimitedError('release_lantern', li.retryAfterMs);
    this.lanternInflight.add(uid);
    try {
      return await this.createLantern(s, uid, p, now);
    } finally {
      this.lanternInflight.delete(uid);
    }
  }

  private async createLantern(s: Sock, uid: string, p: { text: string; color: string }, now: number) {
    const { repos, config, metrics, filter } = this.d;
    // Bền qua kết nối lại/khởi động lại: đếm trong DB
    const n = await repos.lanterns.countByUserSince(uid, now - 3600_000);
    if (n >= LIMITS.LANTERNS_PER_HOUR) throw new RateLimitedError('release_lantern', 60_000);

    const res = filter.check(p.text);
    if (!res.ok) {
      metrics.rejected.inc({ reason: res.reason! });
      throw new HandledError('content_rejected', REJECT_MSG[res.reason!] ?? 'Nội dung không hợp lệ');
    }
    const lu = this.lanternUser.hit(uid);
    if (!lu.ok) throw new RateLimitedError('release_lantern', lu.retryAfterMs);
    const user = await repos.users.findById(uid);
    const status = config.MODERATION_MODE === 'pre' || user?.flagged ? 'pending' : 'approved';
    const row = await repos.lanterns.create({
      id: newId('l'),
      userId: uid,
      nickname: s.data.nickname!,
      text: res.clean,
      color: p.color,
      status,
      createdAt: now,
      expiresAt: now + LIMITS.LANTERN_TTL_MS,
    });
    await repos.stats.incr(vnDay(now), 'lanterns');
    metrics.lanterns.inc({ status });
    const payload = this.toPayload(row);
    if (status === 'approved') await this.emitFromAuthor(uid, 'lantern_released', payload);
    else this.d.io.to(userRoom(uid)).emit('lantern_released', payload); // tác giả vẫn thấy đèn của mình
    return { id: row.id, status };
  }

  private async onLike(s: Sock, p: { id: string }) {
    const { repos } = this.d;
    const uid = s.data.userId!;
    const l = await repos.lanterns.findById(p.id);
    if (!l || l.status !== 'approved' || l.expiresAt <= Date.now() || this.blocked(uid).has(l.userId)) {
      throw new HandledError('not_found', 'Không tìm thấy đèn');
    }
    const added = await repos.lanterns.addLike(l.id, uid, Date.now());
    if (!added) throw new HandledError('already_liked', 'Bạn đã thả tim đèn này');
    const likes = l.likes + 1;
    await this.emitFromAuthor(l.userId, 'lantern_liked', { id: l.id, likes });
    return { likes };
  }

  private async onReport(s: Sock, p: { type: 'lantern' | 'user'; id: string; reason: string }) {
    const { repos, metrics } = this.d;
    const uid = s.data.userId!;
    const now = Date.now();
    let ownerId: string;
    if (p.type === 'lantern') {
      const l = await repos.lanterns.findById(p.id);
      if (!l) throw new HandledError('not_found', 'Không tìm thấy đèn');
      ownerId = l.userId;
    } else {
      const u = await repos.users.findById(p.id);
      if (!u) throw new HandledError('not_found', 'Không tìm thấy người dùng');
      ownerId = u.id;
    }
    if (ownerId === uid) throw new HandledError('cannot_target_self', 'Không thể báo cáo chính mình');
    const sourceHash = hashDevice(`ip:${s.data.ip}`, this.d.config.DEVICE_SALT).slice(0, 32);
    const added = await repos.reports.add({ reporterId: uid, targetType: p.type, targetId: p.id, reason: p.reason, createdAt: now, sourceHash });
    if (!added) throw new HandledError('already_reported', 'Bạn đã báo cáo mục này');
    metrics.reports.inc({ type: p.type });
    await repos.stats.incr(vnDay(now), 'reports');
    const count = await repos.reports.countDistinctReporters(p.type, p.id);
    let autoHidden = false;
    if (count >= LIMITS.REPORTS_TO_AUTOHIDE) {
      if (p.type === 'lantern') {
        const l = await repos.lanterns.findById(p.id);
        if (l?.status === 'approved') {
          await repos.lanterns.setStatus(l.id, 'pending');
          this.d.io.to(LOBBY).emit('lantern_removed', { id: l.id });
          autoHidden = true;
        }
      } else {
        const u = await repos.users.findById(p.id);
        if (u && !u.flagged) {
          await repos.users.setFlagged(u.id, true);
          for (const id of await repos.lanterns.listIdsByUser(u.id)) {
            const l = await repos.lanterns.findById(id);
            if (l?.status !== 'approved') continue;
            await repos.lanterns.setStatus(l.id, 'pending');
            this.d.io.to(LOBBY).emit('lantern_removed', { id: l.id });
          }
          autoHidden = true;
        }
      }
      if (autoHidden) this.d.log.info({ type: p.type, id: p.id }, 'auto-hidden after reports');
    }
    return { autoHidden };
  }

  private async onBlock(s: Sock, p: { userId: string }) {
    const { repos } = this.d;
    const uid = s.data.userId!;
    if (p.userId === uid) throw new HandledError('cannot_target_self', 'Không thể chặn chính mình');
    const target = await repos.users.findById(p.userId);
    if (!target) throw new HandledError('not_found', 'Không tìm thấy người dùng');
    await repos.blocks.add(uid, target.id, Date.now());
    this.blockCache.get(uid)?.add(target.id);
    this.blockCache.get(target.id)?.add(uid);
    // Gỡ nội dung của nhau khỏi màn hình hai bên
    for (const id of await repos.lanterns.listIdsByUser(target.id)) this.d.io.to(userRoom(uid)).emit('lantern_removed', { id });
    for (const id of await repos.lanterns.listIdsByUser(uid)) this.d.io.to(userRoom(target.id)).emit('lantern_removed', { id });
  }

  // ---------------------------------------------------------------- rooms (EXT)
  private roomState(code: string): RoomStatePayload | null {
    const r = this.rooms.get(code);
    if (!r) return null;
    const members = [...r.members].map((uid) => {
      const sid = this.userSockets.get(uid)?.values().next().value as string | undefined;
      const nickname = sid ? (this.d.io.sockets.sockets.get(sid)?.data.nickname ?? '') : '';
      return { userId: uid, nickname, area: this.presence.areaOf(uid) };
    });
    return { code, members };
  }

  private emitRoomState(code: string): void {
    const st = this.roomState(code);
    if (st) this.d.io.to(privRoom(code)).emit('room_state', st);
  }

  private joinSockets(uid: string, code: string, join: boolean): void {
    for (const sid of this.userSockets.get(uid) ?? []) {
      const sock = this.d.io.sockets.sockets.get(sid);
      if (!sock) continue;
      if (join) sock.join(privRoom(code));
      else sock.leave(privRoom(code));
    }
  }

  private onRoomCreate(s: Sock) {
    const uid = s.data.userId!;
    const room = this.rooms.create(uid);
    if (!room) throw new HandledError('internal', 'Hết chỗ tạo phòng');
    return this.onRoomJoin(s, { code: room.code });
  }

  private onRoomJoin(s: Sock, p: { code: string }) {
    const uid = s.data.userId!;
    const r = this.rooms.join(p.code, uid);
    if (r.error) throw new HandledError(r.error, r.error === 'room_full' ? 'Phòng đã đủ người' : 'Mã phòng không tồn tại');
    if (r.left) {
      this.joinSockets(uid, r.left.code, false);
      this.d.io.to(userRoom(uid)).emit('room_left', { code: r.left.code });
      this.emitRoomState(r.left.code);
    }
    this.joinSockets(uid, p.code, true);
    this.emitRoomState(p.code);
    return { code: p.code };
  }

  private onRoomLeave(s: Sock) {
    const uid = s.data.userId!;
    const room = this.rooms.leave(uid);
    if (!room) return { code: null };
    this.joinSockets(uid, room.code, false);
    this.d.io.to(userRoom(uid)).emit('room_left', { code: room.code });
    this.emitRoomState(room.code);
    return { code: room.code };
  }

  // ---------------------------------------------------------------- admin / REST hooks
  async lanternApproved(id: string): Promise<void> {
    const l = await this.d.repos.lanterns.findById(id);
    if (l && l.status === 'approved' && l.expiresAt > Date.now()) await this.emitFromAuthor(l.userId, 'lantern_released', this.toPayload(l));
  }

  lanternRemoved(id: string): void {
    this.d.io.to(LOBBY).emit('lantern_removed', { id });
  }

  disconnectUser(userId: string, code?: ErrorCode, message?: string): void {
    for (const sid of this.userSockets.get(userId) ?? []) {
      const sock = this.d.io.sockets.sockets.get(sid);
      if (!sock) continue;
      if (code) sock.emit('error', { code, message: message ?? code });
      sock.disconnect(true);
    }
  }

  /** Gỡ dữ liệu trong bộ nhớ của user (sau POST /api/me/delete). */
  forgetUser(userId: string): void {
    this.incense = this.incense.filter((i) => i.userId !== userId);
    this.blockCache.delete(userId);
    for (const set of this.blockCache.values()) set.delete(userId);
    const room = this.rooms.leave(userId);
    if (room) this.emitRoomState(room.code);
  }

  async blockedOf(userId: string): Promise<Set<string>> {
    return this.blockCache.get(userId) ?? new Set(await this.d.repos.blocks.related(userId));
  }

  /** Kích thước các cấu trúc trong bộ nhớ (dùng cho test rò rỉ & debug). */
  debugSizes() {
    return {
      presence: this.presence.connections,
      userSockets: this.userSockets.size,
      connPerIp: this.connPerIp.size,
      blockCache: this.blockCache.size,
      floodStrikes: this.floodStrikes.size,
      rooms: this.rooms.size,
      incense: this.incense.length,
    };
  }

  get onlineSnapshot() {
    return this.presence.snapshot();
  }
}

const REJECT_MSG: Record<string, string> = {
  empty: 'Lời nguyện đang trống',
  too_long: `Lời nguyện tối đa ${LIMITS.LANTERN_MAX_CHARS} ký tự`,
  banned_word: 'Lời nguyện có từ ngữ không phù hợp',
  link: 'Không được chèn đường dẫn',
  phone: 'Không được chèn số điện thoại',
  ads: 'Không được quảng cáo',
  spam: 'Nội dung lặp lại bất thường',
};
