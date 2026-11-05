import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { LanternStatus } from '../../../shared/protocol.js';
import type { LanternRow, Repositories, ReportRow, UserRow } from './types.js';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  device_hash TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'vi',
  banned INTEGER NOT NULL DEFAULT 0,
  flagged INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lanterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  text TEXT NOT NULL,
  color TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','hidden')),
  likes INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lanterns_status_created ON lanterns(status, created_at);
CREATE INDEX IF NOT EXISTS idx_lanterns_user_created ON lanterns(user_id, created_at);
CREATE TABLE IF NOT EXISTS lantern_likes (
  lantern_id TEXT NOT NULL REFERENCES lanterns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (lantern_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_user ON lantern_likes(user_id);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('lantern','user')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
CREATE TABLE IF NOT EXISTS incense (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incense_at ON incense(at);
CREATE INDEX IF NOT EXISTS idx_incense_user ON incense(user_id);
CREATE TABLE IF NOT EXISTS daily_stats (
  day TEXT NOT NULL,
  key TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, key)
);
CREATE TABLE IF NOT EXISTS banned_words (
  word TEXT PRIMARY KEY
);
`;

type Raw = Record<string, unknown>;
const toUser = (r: Raw): UserRow => ({
  id: r.id as string,
  deviceHash: r.device_hash as string,
  nickname: r.nickname as string,
  lang: r.lang as string,
  banned: !!r.banned,
  flagged: !!r.flagged,
  createdAt: r.created_at as number,
  lastSeenAt: r.last_seen_at as number,
});
const toLantern = (r: Raw): LanternRow => ({
  id: r.id as string,
  userId: r.user_id as string,
  nickname: r.nickname as string,
  text: r.text as string,
  color: r.color as string,
  status: r.status as LanternStatus,
  likes: r.likes as number,
  reports: r.reports as number,
  createdAt: r.created_at as number,
  expiresAt: r.expires_at as number,
});
const toReport = (r: Raw): ReportRow => ({
  id: r.id as number,
  reporterId: r.reporter_id as string,
  targetType: r.target_type as ReportRow['targetType'],
  targetId: r.target_id as string,
  reason: r.reason as string,
  createdAt: r.created_at as number,
  resolved: !!r.resolved,
  sourceHash: (r.source_hash as string) || undefined,
});

/** Migration đơn giản theo PRAGMA user_version. */
function migrate(db: Database.Database): void {
  const v = db.pragma('user_version', { simple: true }) as number;
  if (v < 1) {
    const cols = (db.prepare('PRAGMA table_info(reports)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!cols.includes('source_hash')) db.exec("ALTER TABLE reports ADD COLUMN source_hash TEXT NOT NULL DEFAULT ''");
    db.pragma('user_version = 1');
  }
}

export function createSqliteRepositories(dbPath: string): Repositories {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new Database(dbPath);
  db.exec(SCHEMA);
  migrate(db);

  const q = {
    userByHash: db.prepare('SELECT * FROM users WHERE device_hash = ?'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    userInsert: db.prepare(
      'INSERT INTO users (id, device_hash, nickname, lang, created_at, last_seen_at) VALUES (@id, @deviceHash, @nickname, @lang, @createdAt, @createdAt)',
    ),
    userTouch: db.prepare('UPDATE users SET nickname = ?, lang = ?, last_seen_at = ? WHERE id = ?'),
    userBan: db.prepare('UPDATE users SET banned = ? WHERE id = ?'),
    userFlag: db.prepare('UPDATE users SET flagged = ? WHERE id = ?'),
    usersBanned: db.prepare('SELECT * FROM users WHERE banned = 1 ORDER BY last_seen_at DESC LIMIT 500'),
    usersFlagged: db.prepare('SELECT * FROM users WHERE flagged = 1 ORDER BY last_seen_at DESC LIMIT 500'),

    lanternInsert: db.prepare(
      `INSERT INTO lanterns (id, user_id, nickname, text, color, status, created_at, expires_at)
       VALUES (@id, @userId, @nickname, @text, @color, @status, @createdAt, @expiresAt)`,
    ),
    lanternById: db.prepare('SELECT * FROM lanterns WHERE id = ?'),
    lanternsApproved: db.prepare(
      `SELECT * FROM lanterns WHERE status = 'approved' AND created_at > ? AND expires_at > ?
       ORDER BY created_at DESC LIMIT ?`,
    ),
    lanternsByStatus: db.prepare('SELECT * FROM lanterns WHERE status = ? AND expires_at > ? ORDER BY created_at DESC LIMIT ?'),
    lanternsAll: db.prepare('SELECT * FROM lanterns WHERE expires_at > ? ORDER BY created_at DESC LIMIT ?'),
    lanternSetStatus: db.prepare('UPDATE lanterns SET status = ? WHERE id = ?'),
    lanternCountUser: db.prepare('SELECT COUNT(*) AS n FROM lanterns WHERE user_id = ? AND created_at > ?'),
    likeInsert: db.prepare('INSERT OR IGNORE INTO lantern_likes (lantern_id, user_id, created_at) VALUES (?, ?, ?)'),
    likeBump: db.prepare('UPDATE lanterns SET likes = likes + 1 WHERE id = ?'),
    lanternPurge: db.prepare('DELETE FROM lanterns WHERE expires_at <= ?'),
    lanternIdsByUser: db.prepare('SELECT id FROM lanterns WHERE user_id = ?'),

    reportInsert: db.prepare(
      `INSERT OR IGNORE INTO reports (reporter_id, target_type, target_id, reason, created_at, source_hash)
       VALUES (@reporterId, @targetType, @targetId, @reason, @createdAt, @sourceHash)`,
    ),
    reportBumpLantern: db.prepare('UPDATE lanterns SET reports = reports + 1 WHERE id = ?'),
    reportCount: db.prepare(
      // Đếm theo nguồn (IP băm) để nhiều deviceId từ cùng 1 IP chỉ tính 1 người
      "SELECT COUNT(DISTINCT CASE WHEN source_hash = '' THEN reporter_id ELSE source_hash END) AS n FROM reports WHERE target_type = ? AND target_id = ? AND resolved = 0",
    ),
    reportsList: db.prepare('SELECT * FROM reports WHERE resolved = ? ORDER BY created_at DESC LIMIT ?'),
    reportsListAll: db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ?'),
    reportsResolve: db.prepare('UPDATE reports SET resolved = 1 WHERE target_type = ? AND target_id = ? AND resolved = 0'),

    blockInsert: db.prepare('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)'),
    blocksRelated: db.prepare(
      'SELECT blocked_id AS uid FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id AS uid FROM blocks WHERE blocked_id = ?',
    ),

    incenseInsert: db.prepare('INSERT INTO incense (user_id, count, at) VALUES (?, ?, ?)'),
    incenseSince: db.prepare(
      'SELECT i.user_id, u.nickname, i.count, i.at FROM incense i JOIN users u ON u.id = i.user_id WHERE i.at > ? ORDER BY i.at ASC',
    ),
    incensePurge: db.prepare('DELETE FROM incense WHERE at < ?'),

    statIncr: db.prepare(
      'INSERT INTO daily_stats (day, key, value) VALUES (?, ?, ?) ON CONFLICT(day, key) DO UPDATE SET value = value + excluded.value',
    ),
    statMax: db.prepare(
      'INSERT INTO daily_stats (day, key, value) VALUES (?, ?, ?) ON CONFLICT(day, key) DO UPDATE SET value = MAX(value, excluded.value)',
    ),
    statDay: db.prepare('SELECT key, value FROM daily_stats WHERE day = ?'),
    statRange: db.prepare('SELECT day, key, value FROM daily_stats WHERE day >= ? AND day <= ? ORDER BY day ASC'),

    wordsList: db.prepare('SELECT word FROM banned_words ORDER BY word'),
    wordsCount: db.prepare('SELECT COUNT(*) AS n FROM banned_words'),
    wordsClear: db.prepare('DELETE FROM banned_words'),
    wordsInsert: db.prepare('INSERT OR IGNORE INTO banned_words (word) VALUES (?)'),
  };

  const del = {
    likesBy: db.prepare('DELETE FROM lantern_likes WHERE user_id = ?'),
    likesOn: db.prepare('DELETE FROM lantern_likes WHERE lantern_id IN (SELECT id FROM lanterns WHERE user_id = ?)'),
    lanterns: db.prepare('DELETE FROM lanterns WHERE user_id = ?'),
    reportsBy: db.prepare('DELETE FROM reports WHERE reporter_id = ?'),
    reportsOnUser: db.prepare("DELETE FROM reports WHERE target_type = 'user' AND target_id = ?"),
    reportsOnLanterns: db.prepare(
      "DELETE FROM reports WHERE target_type = 'lantern' AND target_id IN (SELECT id FROM lanterns WHERE user_id = ?)",
    ),
    blocks: db.prepare('DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?'),
    incense: db.prepare('DELETE FROM incense WHERE user_id = ?'),
    user: db.prepare('DELETE FROM users WHERE id = ?'),
    anonymize: db.prepare("UPDATE users SET nickname = '(đã xoá)', lang = 'vi' WHERE id = ?"),
    unlikeCounts: db.prepare(
      'UPDATE lanterns SET likes = MAX(likes - 1, 0) WHERE id IN (SELECT lantern_id FROM lantern_likes WHERE user_id = ?)',
    ),
  };

  const deleteCascade = db.transaction((id: string) => {
    del.unlikeCounts.run(id);
    const likes = del.likesBy.run(id).changes;
    del.likesOn.run(id);
    const reports = del.reportsBy.run(id).changes + del.reportsOnUser.run(id).changes + del.reportsOnLanterns.run(id).changes;
    const lanterns = del.lanterns.run(id).changes;
    const blocks = del.blocks.run(id, id).changes;
    const incense = del.incense.run(id).changes;
    // Thiết bị bị khoá/gắn cờ: giữ dòng user (đã ẩn danh) để không lách được khoá bằng cách tự xoá dữ liệu
    const keep = q.userById.get(id) as Raw | undefined;
    const user = keep && (keep.banned || keep.flagged) ? del.anonymize.run(id).changes : del.user.run(id).changes;
    return { lanterns, likes, reports, blocks, incense, user };
  });

  const addLike = db.transaction((lanternId: string, userId: string, at: number) => {
    const r = q.likeInsert.run(lanternId, userId, at);
    if (r.changes === 0) return false;
    q.likeBump.run(lanternId);
    return true;
  });

  const addReport = db.transaction((r: Omit<ReportRow, 'id' | 'resolved'>) => {
    const res = q.reportInsert.run({ ...r, sourceHash: r.sourceHash ?? '' });
    if (res.changes === 0) return false;
    if (r.targetType === 'lantern') q.reportBumpLantern.run(r.targetId);
    return true;
  });

  const replaceWords = db.transaction((words: string[]) => {
    q.wordsClear.run();
    for (const w of words) q.wordsInsert.run(w);
  });

  const purge = db.transaction((now: number) => {
    // Hương chỉ cần cho thống kê/khôi phục ngắn hạn → giữ 2 ngày.
    q.incensePurge.run(now - 2 * 24 * 3600_000);
    return q.lanternPurge.run(now).changes;
  });

  return {
    users: {
      async findByDeviceHash(hash) {
        const r = q.userByHash.get(hash) as Raw | undefined;
        return r && toUser(r);
      },
      async findById(id) {
        const r = q.userById.get(id) as Raw | undefined;
        return r && toUser(r);
      },
      async create(u) {
        q.userInsert.run(u);
        return { ...u, banned: false, flagged: false, lastSeenAt: u.createdAt };
      },
      async touch(id, nickname, lang, at) {
        q.userTouch.run(nickname, lang, at, id);
      },
      async setBanned(id, banned) {
        q.userBan.run(banned ? 1 : 0, id);
      },
      async setFlagged(id, flagged) {
        q.userFlag.run(flagged ? 1 : 0, id);
      },
      async listBanned() {
        return (q.usersBanned.all() as Raw[]).map(toUser);
      },
      async listFlagged() {
        return (q.usersFlagged.all() as Raw[]).map(toUser);
      },
      async deleteCascade(id) {
        return deleteCascade(id);
      },
    },
    lanterns: {
      async create(l) {
        q.lanternInsert.run(l);
        return { ...l, likes: 0, reports: 0 };
      },
      async findById(id) {
        const r = q.lanternById.get(id) as Raw | undefined;
        return r && toLantern(r);
      },
      async listApproved({ since, now, limit }) {
        return (q.lanternsApproved.all(since, now, limit) as Raw[]).map(toLantern);
      },
      async listByStatus(status, now, limit) {
        const rows = status === 'all' ? q.lanternsAll.all(now, limit) : q.lanternsByStatus.all(status, now, limit);
        return (rows as Raw[]).map(toLantern);
      },
      async setStatus(id, status) {
        q.lanternSetStatus.run(status, id);
      },
      async countByUserSince(userId, since) {
        return (q.lanternCountUser.get(userId, since) as { n: number }).n;
      },
      async addLike(lanternId, userId, at) {
        return addLike(lanternId, userId, at);
      },
      async purgeExpired(now) {
        return purge(now);
      },
      async listIdsByUser(userId) {
        return (q.lanternIdsByUser.all(userId) as Array<{ id: string }>).map((r) => r.id);
      },
    },
    reports: {
      async add(r) {
        return addReport(r);
      },
      async countDistinctReporters(t, id) {
        return (q.reportCount.get(t, id) as { n: number }).n;
      },
      async list({ resolved, limit }) {
        const rows = resolved === undefined ? q.reportsListAll.all(limit) : q.reportsList.all(resolved ? 1 : 0, limit);
        return (rows as Raw[]).map(toReport);
      },
      async resolveTarget(t, id) {
        return q.reportsResolve.run(t, id).changes;
      },
    },
    blocks: {
      async add(a, b, at) {
        q.blockInsert.run(a, b, at);
      },
      async related(id) {
        return (q.blocksRelated.all(id, id) as Array<{ uid: string }>).map((r) => r.uid);
      },
    },
    incense: {
      async add(userId, count, at) {
        q.incenseInsert.run(userId, count, at);
      },
      async listSince(since) {
        return (q.incenseSince.all(since) as Raw[]).map((r) => ({
          userId: r.user_id as string,
          nickname: r.nickname as string,
          count: r.count as number,
          at: r.at as number,
        }));
      },
    },
    stats: {
      async incr(day, key, by = 1) {
        q.statIncr.run(day, key, by);
      },
      async max(day, key, value) {
        q.statMax.run(day, key, value);
      },
      async getDay(day) {
        const out: Record<string, number> = {};
        for (const r of q.statDay.all(day) as Array<{ key: string; value: number }>) out[r.key] = r.value;
        return out;
      },
      async range(from, to) {
        return q.statRange.all(from, to) as Array<{ day: string; key: string; value: number }>;
      },
    },
    words: {
      async list() {
        return (q.wordsList.all() as Array<{ word: string }>).map((r) => r.word);
      },
      async replaceAll(words) {
        replaceWords(words);
      },
      async count() {
        return (q.wordsCount.get() as { n: number }).n;
      },
    },
    async close() {
      db.close();
    },
  };
}
