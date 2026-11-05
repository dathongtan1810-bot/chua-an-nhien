import pg from 'pg';
import type { Pool, PoolClient } from 'pg';
import type { LanternStatus } from '../../../shared/protocol.js';
import type { AuditRow, LanternRow, Repositories, ReportRow, UserRow } from './types.js';

/**
 * Triển khai Postgres của lớp repository – ngữ nghĩa giống hệt sqlite.ts.
 * Mốc thời gian (ms) lưu BIGINT; pg trả BIGINT dạng chuỗi nên luôn ép Number khi đọc.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  device_hash TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'vi',
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS lanterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  "text" TEXT NOT NULL,
  color TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','hidden')),
  likes INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lanterns_status_created ON lanterns(status, created_at);
CREATE INDEX IF NOT EXISTS idx_lanterns_user_created ON lanterns(user_id, created_at);
CREATE TABLE IF NOT EXISTS lantern_likes (
  lantern_id TEXT NOT NULL REFERENCES lanterns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (lantern_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_user ON lantern_likes(user_id);
CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('lantern','user')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  source_hash TEXT NOT NULL DEFAULT '',
  UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
CREATE TABLE IF NOT EXISTS incense (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "count" INTEGER NOT NULL,
  "at" BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incense_at ON incense("at");
CREATE INDEX IF NOT EXISTS idx_incense_user ON incense(user_id);
CREATE TABLE IF NOT EXISTS daily_stats (
  day TEXT NOT NULL,
  "key" TEXT NOT NULL,
  value BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, "key")
);
CREATE TABLE IF NOT EXISTS banned_words (
  word TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS admin_audit (
  id BIGSERIAL PRIMARY KEY,
  "at" BIGINT NOT NULL,
  ip TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT ''
);
`;

type Raw = Record<string, unknown>;
const num = (v: unknown): number => Number(v);
const toUser = (r: Raw): UserRow => ({
  id: r.id as string,
  deviceHash: r.device_hash as string,
  nickname: r.nickname as string,
  lang: r.lang as string,
  banned: !!r.banned,
  flagged: !!r.flagged,
  createdAt: num(r.created_at),
  lastSeenAt: num(r.last_seen_at),
});
const toLantern = (r: Raw): LanternRow => ({
  id: r.id as string,
  userId: r.user_id as string,
  nickname: r.nickname as string,
  text: r.text as string,
  color: r.color as string,
  status: r.status as LanternStatus,
  likes: num(r.likes),
  reports: num(r.reports),
  createdAt: num(r.created_at),
  expiresAt: num(r.expires_at),
});
const toReport = (r: Raw): ReportRow => ({
  id: num(r.id),
  reporterId: r.reporter_id as string,
  targetType: r.target_type as ReportRow['targetType'],
  targetId: r.target_id as string,
  reason: r.reason as string,
  createdAt: num(r.created_at),
  resolved: !!r.resolved,
  sourceHash: (r.source_hash as string) || undefined,
});
const toAudit = (r: Raw): AuditRow => ({
  id: num(r.id),
  at: num(r.at),
  ip: r.ip as string,
  action: r.action as string,
  target: r.target as string,
  detail: r.detail as string,
});

type Queryable = Pick<Pool, 'query'> | PoolClient;

export async function createPostgresRepositories(pool: Pool): Promise<Repositories> {
  await pool.query(SCHEMA);

  const rows = async (c: Queryable, sql: string, params: unknown[] = []): Promise<Raw[]> =>
    (await c.query(sql, params)).rows as Raw[];
  const one = async (c: Queryable, sql: string, params: unknown[] = []): Promise<Raw | undefined> =>
    (await rows(c, sql, params))[0];
  const run = async (c: Queryable, sql: string, params: unknown[] = []): Promise<number> =>
    (await c.query(sql, params)).rowCount ?? 0;

  /** Chạy fn trong một giao dịch trên client riêng (tương đương db.transaction của SQLite). */
  async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      try {
        await c.query('ROLLBACK');
      } catch {
        /* bỏ qua lỗi rollback */
      }
      throw e;
    } finally {
      c.release();
    }
  }

  return {
    users: {
      async findByDeviceHash(hash) {
        const r = await one(pool, 'SELECT * FROM users WHERE device_hash = $1', [hash]);
        return r && toUser(r);
      },
      async findById(id) {
        const r = await one(pool, 'SELECT * FROM users WHERE id = $1', [id]);
        return r && toUser(r);
      },
      async create(u) {
        await run(
          pool,
          'INSERT INTO users (id, device_hash, nickname, lang, created_at, last_seen_at) VALUES ($1, $2, $3, $4, $5, $5)',
          [u.id, u.deviceHash, u.nickname, u.lang, u.createdAt],
        );
        return { ...u, banned: false, flagged: false, lastSeenAt: u.createdAt };
      },
      async touch(id, nickname, lang, at) {
        await run(pool, 'UPDATE users SET nickname = $1, lang = $2, last_seen_at = $3 WHERE id = $4', [nickname, lang, at, id]);
      },
      async setBanned(id, banned) {
        await run(pool, 'UPDATE users SET banned = $1 WHERE id = $2', [banned, id]);
      },
      async setFlagged(id, flagged) {
        await run(pool, 'UPDATE users SET flagged = $1 WHERE id = $2', [flagged, id]);
      },
      async listBanned() {
        return (await rows(pool, 'SELECT * FROM users WHERE banned = TRUE ORDER BY last_seen_at DESC LIMIT 500')).map(toUser);
      },
      async listFlagged() {
        return (await rows(pool, 'SELECT * FROM users WHERE flagged = TRUE ORDER BY last_seen_at DESC LIMIT 500')).map(toUser);
      },
      async deleteCascade(id) {
        return tx(async (c) => {
          await run(
            c,
            'UPDATE lanterns SET likes = GREATEST(likes - 1, 0) WHERE id IN (SELECT lantern_id FROM lantern_likes WHERE user_id = $1)',
            [id],
          );
          const likes = await run(c, 'DELETE FROM lantern_likes WHERE user_id = $1', [id]);
          await run(c, 'DELETE FROM lantern_likes WHERE lantern_id IN (SELECT id FROM lanterns WHERE user_id = $1)', [id]);
          const reports =
            (await run(c, 'DELETE FROM reports WHERE reporter_id = $1', [id])) +
            (await run(c, "DELETE FROM reports WHERE target_type = 'user' AND target_id = $1", [id])) +
            (await run(
              c,
              "DELETE FROM reports WHERE target_type = 'lantern' AND target_id IN (SELECT id FROM lanterns WHERE user_id = $1)",
              [id],
            ));
          const lanterns = await run(c, 'DELETE FROM lanterns WHERE user_id = $1', [id]);
          const blocks = await run(c, 'DELETE FROM blocks WHERE blocker_id = $1 OR blocked_id = $1', [id]);
          const incense = await run(c, 'DELETE FROM incense WHERE user_id = $1', [id]);
          // Thiết bị bị khoá/gắn cờ: giữ dòng user (đã ẩn danh) để không lách được khoá bằng cách tự xoá dữ liệu
          const keep = await one(c, 'SELECT banned, flagged FROM users WHERE id = $1', [id]);
          const user =
            keep && (keep.banned || keep.flagged)
              ? await run(c, "UPDATE users SET nickname = '(đã xoá)', lang = 'vi' WHERE id = $1", [id])
              : await run(c, 'DELETE FROM users WHERE id = $1', [id]);
          return { lanterns, likes, reports, blocks, incense, user };
        });
      },
    },
    lanterns: {
      async create(l) {
        await run(
          pool,
          `INSERT INTO lanterns (id, user_id, nickname, "text", color, status, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [l.id, l.userId, l.nickname, l.text, l.color, l.status, l.createdAt, l.expiresAt],
        );
        return { ...l, likes: 0, reports: 0 };
      },
      async findById(id) {
        const r = await one(pool, 'SELECT * FROM lanterns WHERE id = $1', [id]);
        return r && toLantern(r);
      },
      async listApproved({ since, now, limit }) {
        return (
          await rows(
            pool,
            `SELECT * FROM lanterns WHERE status = 'approved' AND created_at > $1 AND expires_at > $2
             ORDER BY created_at DESC LIMIT $3`,
            [since, now, limit],
          )
        ).map(toLantern);
      },
      async listByStatus(status, now, limit) {
        const rs =
          status === 'all'
            ? await rows(pool, 'SELECT * FROM lanterns WHERE expires_at > $1 ORDER BY created_at DESC LIMIT $2', [now, limit])
            : await rows(pool, 'SELECT * FROM lanterns WHERE status = $1 AND expires_at > $2 ORDER BY created_at DESC LIMIT $3', [
                status,
                now,
                limit,
              ]);
        return rs.map(toLantern);
      },
      async setStatus(id, status) {
        await run(pool, 'UPDATE lanterns SET status = $1 WHERE id = $2', [status, id]);
      },
      async countByUserSince(userId, since) {
        const r = await one(pool, 'SELECT COUNT(*) AS n FROM lanterns WHERE user_id = $1 AND created_at > $2', [userId, since]);
        return num(r?.n ?? 0);
      },
      async addLike(lanternId, userId, at) {
        return tx(async (c) => {
          const n = await run(
            c,
            'INSERT INTO lantern_likes (lantern_id, user_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [lanternId, userId, at],
          );
          if (n === 0) return false;
          await run(c, 'UPDATE lanterns SET likes = likes + 1 WHERE id = $1', [lanternId]);
          return true;
        });
      },
      async purgeExpired(now) {
        return tx(async (c) => {
          // Hương chỉ cần cho thống kê/khôi phục ngắn hạn → giữ 2 ngày.
          await run(c, 'DELETE FROM incense WHERE "at" < $1', [now - 2 * 24 * 3600_000]);
          return run(c, 'DELETE FROM lanterns WHERE expires_at <= $1', [now]);
        });
      },
      async listIdsByUser(userId) {
        return (await rows(pool, 'SELECT id FROM lanterns WHERE user_id = $1', [userId])).map((r) => r.id as string);
      },
    },
    reports: {
      async add(r) {
        return tx(async (c) => {
          const n = await run(
            c,
            `INSERT INTO reports (reporter_id, target_type, target_id, reason, created_at, source_hash)
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
            [r.reporterId, r.targetType, r.targetId, r.reason, r.createdAt, r.sourceHash ?? ''],
          );
          if (n === 0) return false;
          if (r.targetType === 'lantern') await run(c, 'UPDATE lanterns SET reports = reports + 1 WHERE id = $1', [r.targetId]);
          return true;
        });
      },
      async countDistinctReporters(t, id) {
        // Đếm theo nguồn (IP băm) để nhiều deviceId từ cùng 1 IP chỉ tính 1 người
        const r = await one(
          pool,
          `SELECT COUNT(DISTINCT CASE WHEN source_hash = '' THEN reporter_id ELSE source_hash END) AS n
           FROM reports WHERE target_type = $1 AND target_id = $2 AND resolved = FALSE`,
          [t, id],
        );
        return num(r?.n ?? 0);
      },
      async list({ resolved, limit }) {
        const rs =
          resolved === undefined
            ? await rows(pool, 'SELECT * FROM reports ORDER BY created_at DESC LIMIT $1', [limit])
            : await rows(pool, 'SELECT * FROM reports WHERE resolved = $1 ORDER BY created_at DESC LIMIT $2', [resolved, limit]);
        return rs.map(toReport);
      },
      async resolveTarget(t, id) {
        return run(pool, 'UPDATE reports SET resolved = TRUE WHERE target_type = $1 AND target_id = $2 AND resolved = FALSE', [t, id]);
      },
    },
    blocks: {
      async add(a, b, at) {
        await run(pool, 'INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [a, b, at]);
      },
      async related(id) {
        return (
          await rows(
            pool,
            'SELECT blocked_id AS uid FROM blocks WHERE blocker_id = $1 UNION SELECT blocker_id AS uid FROM blocks WHERE blocked_id = $1',
            [id],
          )
        ).map((r) => r.uid as string);
      },
    },
    incense: {
      async add(userId, count, at) {
        await run(pool, 'INSERT INTO incense (user_id, "count", "at") VALUES ($1, $2, $3)', [userId, count, at]);
      },
      async listSince(since) {
        return (
          await rows(
            pool,
            'SELECT i.user_id, u.nickname, i."count", i."at" FROM incense i JOIN users u ON u.id = i.user_id WHERE i."at" > $1 ORDER BY i."at" ASC',
            [since],
          )
        ).map((r) => ({
          userId: r.user_id as string,
          nickname: r.nickname as string,
          count: num(r.count),
          at: num(r.at),
        }));
      },
    },
    stats: {
      async incr(day, key, by = 1) {
        await run(
          pool,
          `INSERT INTO daily_stats (day, "key", value) VALUES ($1, $2, $3)
           ON CONFLICT (day, "key") DO UPDATE SET value = daily_stats.value + EXCLUDED.value`,
          [day, key, by],
        );
      },
      async max(day, key, value) {
        await run(
          pool,
          `INSERT INTO daily_stats (day, "key", value) VALUES ($1, $2, $3)
           ON CONFLICT (day, "key") DO UPDATE SET value = GREATEST(daily_stats.value, EXCLUDED.value)`,
          [day, key, value],
        );
      },
      async getDay(day) {
        const out: Record<string, number> = {};
        for (const r of await rows(pool, 'SELECT "key", value FROM daily_stats WHERE day = $1', [day])) out[r.key as string] = num(r.value);
        return out;
      },
      async range(from, to) {
        return (
          await rows(pool, 'SELECT day, "key", value FROM daily_stats WHERE day >= $1 AND day <= $2 ORDER BY day ASC', [from, to])
        ).map((r) => ({ day: r.day as string, key: r.key as string, value: num(r.value) }));
      },
    },
    words: {
      async list() {
        return (await rows(pool, 'SELECT word FROM banned_words ORDER BY word')).map((r) => r.word as string);
      },
      async replaceAll(words) {
        await tx(async (c) => {
          await run(c, 'DELETE FROM banned_words');
          for (const w of words) await run(c, 'INSERT INTO banned_words (word) VALUES ($1) ON CONFLICT DO NOTHING', [w]);
        });
      },
      async count() {
        const r = await one(pool, 'SELECT COUNT(*) AS n FROM banned_words');
        return num(r?.n ?? 0);
      },
    },
    audit: {
      async add(r) {
        await run(pool, 'INSERT INTO admin_audit ("at", ip, action, target, detail) VALUES ($1, $2, $3, $4, $5)', [
          r.at,
          r.ip,
          r.action,
          r.target,
          r.detail,
        ]);
      },
      async list(limit) {
        return (await rows(pool, 'SELECT * FROM admin_audit ORDER BY id DESC LIMIT $1', [limit])).map(toAudit);
      },
    },
    async backup(_destPath) {
      throw new Error('backup not supported on postgres; use pg_dump');
    },
    async close() {
      await pool.end();
    },
  };
}

export async function createPostgresRepositoriesFromUrl(url: string): Promise<Repositories> {
  const pool = new pg.Pool({ connectionString: url });
  try {
    return await createPostgresRepositories(pool);
  } catch (e) {
    await pool.end().catch(() => {});
    throw e;
  }
}
