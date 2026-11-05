/**
 * Trạng thái dùng chung giữa các instance server.
 *  - LocalCluster: 1 instance, mọi thứ trong bộ nhớ (mặc định).
 *  - RedisCluster: nhiều instance (REDIS_URL) — cooldown chuông nguyên tử, presence gộp, phòng riêng lưu Redis.
 * Phát sự kiện giữa các instance do @socket.io/redis-adapter đảm nhiệm (xem app.ts).
 */
import { randomBytes } from 'node:crypto';
import type { Redis } from 'ioredis';
import { emptyAreaCounts, type Area, type AreaCounts } from '../../../shared/protocol.js';
import type { LimitResult } from '../services/rateLimit.js';
import { CooldownLimiter } from '../services/rateLimit.js';
import { Rooms, ROOM_IDLE_TTL_MS, ROOM_MAX_MEMBERS, MAX_ROOMS } from '../services/rooms.js';

export interface RoomInfo {
  code: string;
  members: Array<{ userId: string; nickname: string }>;
}

export interface PresenceSnapshot {
  online: number;
  areas: AreaCounts;
}

export interface Cluster {
  readonly distributed: boolean;
  /** Kiểm tra & đặt nguyên tử nhiều cooldown cùng lúc (vd chuông: theo user + toàn server). */
  cooldowns(items: Array<{ key: string; ms: number }>): Promise<LimitResult>;
  /** Gộp presence: nhận bản đồ userId→khu của instance này, trả snapshot toàn cụm. */
  syncPresence(local: Map<string, Area | null>): Promise<PresenceSnapshot>;
  areaOf(userId: string): Area | null;
  rooms: {
    create(userId: string, nickname: string): Promise<string | null>;
    get(code: string): Promise<RoomInfo | null>;
    join(code: string, userId: string, nickname: string): Promise<{ error?: 'room_not_found' | 'room_full'; left?: string }>;
    leave(userId: string): Promise<string | null>;
    roomOf(userId: string): Promise<string | null>;
    sweep(now?: number): Promise<void>;
    size(): Promise<number>;
  };
  close(): Promise<void>;
}

function snapshotOf(map: Map<string, Area | null>): PresenceSnapshot {
  const areas = emptyAreaCounts();
  for (const a of map.values()) if (a) areas[a]++;
  return { online: map.size, areas };
}

// ---------------------------------------------------------------------------
export class LocalCluster implements Cluster {
  readonly distributed = false;
  private cds = new Map<number, CooldownLimiter>();
  private last = new Map<string, Area | null>();
  private roomsImpl = new Rooms();
  private nick = new Map<string, string>();

  async cooldowns(items: Array<{ key: string; ms: number }>): Promise<LimitResult> {
    const lim = (ms: number) => {
      let l = this.cds.get(ms);
      if (!l) this.cds.set(ms, (l = new CooldownLimiter(ms)));
      return l;
    };
    let retry = 0;
    for (const it of items) retry = Math.max(retry, lim(it.ms).check(it.key).retryAfterMs);
    if (retry > 0) return { ok: false, retryAfterMs: retry };
    for (const it of items) lim(it.ms).commit(it.key);
    return { ok: true, retryAfterMs: 0 };
  }

  async syncPresence(local: Map<string, Area | null>): Promise<PresenceSnapshot> {
    this.last = local;
    return snapshotOf(local);
  }

  areaOf(userId: string): Area | null {
    return this.last.get(userId) ?? null;
  }

  readonly rooms = {
    create: async (userId: string, nickname: string) => {
      const r = this.roomsImpl.create(userId);
      if (!r) return null;
      const j = this.roomsImpl.join(r.code, userId); // người tạo tự vào phòng (tự rời phòng cũ)
      if (j.error) return null;
      this.nick.set(userId, nickname);
      return r.code;
    },
    get: async (code: string) => {
      const r = this.roomsImpl.get(code);
      return r ? { code, members: [...r.members].map((u) => ({ userId: u, nickname: this.nick.get(u) ?? '' })) } : null;
    },
    join: async (code: string, userId: string, nickname: string) => {
      const r = this.roomsImpl.join(code, userId);
      if (r.error) return { error: r.error };
      this.nick.set(userId, nickname);
      return { left: r.left?.code };
    },
    leave: async (userId: string) => {
      const r = this.roomsImpl.leave(userId);
      this.nick.delete(userId);
      return r?.code ?? null;
    },
    roomOf: async (userId: string) => this.roomsImpl.roomOf(userId)?.code ?? null,
    sweep: async (now?: number) => {
      this.roomsImpl.sweep(now);
      for (const l of this.cds.values()) l.sweep();
    },
    size: async () => this.roomsImpl.size,
  };

  async close(): Promise<void> {}
}

// ---------------------------------------------------------------------------
const COOLDOWN_LUA = `
local maxttl = 0
for i, k in ipairs(KEYS) do
  local t = redis.call('PTTL', k)
  if t > maxttl then maxttl = t end
end
if maxttl > 0 then return maxttl end
for i, k in ipairs(KEYS) do
  redis.call('SET', k, '1', 'PX', ARGV[i])
end
return 0`;

// Vào phòng nguyên tử: KEYS = [room meta, room members, user→room]; ARGV = [code, userId, nickname, max]
const JOIN_LUA = `
if redis.call('EXISTS', KEYS[1]) == 0 then return {'room_not_found', ''} end
if redis.call('HEXISTS', KEYS[2], ARGV[2]) == 1 then return {'ok', ''} end
if redis.call('HLEN', KEYS[2]) >= tonumber(ARGV[4]) then return {'room_full', ''} end
local prev = redis.call('GET', KEYS[3])
redis.call('HSET', KEYS[2], ARGV[2], ARGV[3])
redis.call('SET', KEYS[3], ARGV[1])
redis.call('PERSIST', KEYS[1])
redis.call('PERSIST', KEYS[2])
if prev and prev ~= ARGV[1] then return {'ok', prev} end
return {'ok', ''}`;

export class RedisCluster implements Cluster {
  readonly distributed = true;
  readonly instanceId = randomBytes(6).toString('hex');
  private merged = new Map<string, Area | null>();

  constructor(
    private readonly r: Redis,
    private readonly prefix = 'chua:',
    private readonly presenceTtlMs = 10_000,
  ) {}

  private k(s: string): string {
    return this.prefix + s;
  }

  async cooldowns(items: Array<{ key: string; ms: number }>): Promise<LimitResult> {
    const res = (await this.r.eval(COOLDOWN_LUA, items.length, ...items.map((i) => this.k(`cd:${i.key}`)), ...items.map((i) => String(i.ms)))) as number;
    return res > 0 ? { ok: false, retryAfterMs: res } : { ok: true, retryAfterMs: 0 };
  }

  async syncPresence(local: Map<string, Area | null>): Promise<PresenceSnapshot> {
    const mine = this.k(`presence:${this.instanceId}`);
    await this.r.set(mine, JSON.stringify(Object.fromEntries(local)), 'PX', this.presenceTtlMs);
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.r.scan(cursor, 'MATCH', this.k('presence:*'), 'COUNT', 200);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    const merged = new Map<string, Area | null>();
    const vals = keys.length ? await this.r.mget(...keys) : [];
    for (const v of vals) {
      if (!v) continue;
      for (const [uid, area] of Object.entries(JSON.parse(v) as Record<string, Area | null>)) {
        if (!merged.has(uid) || (area && !merged.get(uid))) merged.set(uid, area);
      }
    }
    this.merged = merged;
    return snapshotOf(merged);
  }

  areaOf(userId: string): Area | null {
    return this.merged.get(userId) ?? null;
  }

  readonly rooms = {
    create: async (userId: string, nickname: string): Promise<string | null> => {
      if ((await this.rooms.size()) >= MAX_ROOMS) return null;
      for (let i = 0; i < 20; i++) {
        const code = new Rooms().newCode();
        const ok = await this.r.set(this.k(`room:${code}`), JSON.stringify({ owner: userId, createdAt: Date.now() }), 'PX', ROOM_IDLE_TTL_MS, 'NX');
        if (!ok) continue;
        await this.r.sadd(this.k('rooms'), code);
        const j = await this.rooms.join(code, userId, nickname);
        if (j.error) return null;
        return code;
      }
      return null;
    },
    get: async (code: string): Promise<RoomInfo | null> => {
      if (!(await this.r.exists(this.k(`room:${code}`)))) return null;
      const m = await this.r.hgetall(this.k(`room:${code}:m`));
      return { code, members: Object.entries(m).map(([userId, nickname]) => ({ userId, nickname })) };
    },
    join: async (code: string, userId: string, nickname: string) => {
      const [status, prev] = (await this.r.eval(
        JOIN_LUA,
        3,
        this.k(`room:${code}`),
        this.k(`room:${code}:m`),
        this.k(`uroom:${userId}`),
        code,
        userId,
        nickname,
        String(ROOM_MAX_MEMBERS),
      )) as [string, string];
      if (status !== 'ok') return { error: status as 'room_not_found' | 'room_full' };
      if (prev) {
        await this.r.hdel(this.k(`room:${prev}:m`), userId);
        await this.expireIfEmpty(prev);
        return { left: prev };
      }
      return {};
    },
    leave: async (userId: string): Promise<string | null> => {
      const code = await this.r.get(this.k(`uroom:${userId}`));
      if (!code) return null;
      await this.r.del(this.k(`uroom:${userId}`));
      await this.r.hdel(this.k(`room:${code}:m`), userId);
      await this.expireIfEmpty(code);
      return code;
    },
    roomOf: async (userId: string) => this.r.get(this.k(`uroom:${userId}`)),
    sweep: async () => {
      // phòng hết hạn (key meta đã mất) → bỏ khỏi tập chỉ mục
      for (const code of await this.r.smembers(this.k('rooms'))) {
        if (!(await this.r.exists(this.k(`room:${code}`)))) await this.r.srem(this.k('rooms'), code);
      }
    },
    size: async () => this.r.scard(this.k('rooms')),
  };

  private async expireIfEmpty(code: string): Promise<void> {
    if ((await this.r.hlen(this.k(`room:${code}:m`))) === 0) {
      await this.r.pexpire(this.k(`room:${code}`), ROOM_IDLE_TTL_MS);
    }
  }

  async close(): Promise<void> {
    await this.r.del(this.k(`presence:${this.instanceId}`)).catch(() => undefined);
  }
}
