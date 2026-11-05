import type { LanternStatus } from '../../../shared/protocol.js';

/**
 * Lớp repository: toàn bộ truy cập dữ liệu đi qua các interface này (bất đồng bộ)
 * để có thể thay SQLite bằng Postgres mà không đụng tới logic nghiệp vụ.
 */
export interface UserRow {
  id: string;
  deviceHash: string;
  nickname: string;
  lang: string;
  banned: boolean;
  flagged: boolean;
  createdAt: number;
  lastSeenAt: number;
}

export interface LanternRow {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  color: string;
  status: LanternStatus;
  likes: number;
  reports: number;
  createdAt: number;
  expiresAt: number;
}

export interface ReportRow {
  id: number;
  reporterId: string;
  targetType: 'lantern' | 'user';
  targetId: string;
  reason: string;
  createdAt: number;
  resolved: boolean;
  /** Băm nguồn (IP) của người báo cáo – để đếm "người khác nhau" chống lạm dụng nhiều deviceId. */
  sourceHash?: string;
}

export interface UsersRepo {
  findByDeviceHash(hash: string): Promise<UserRow | undefined>;
  findById(id: string): Promise<UserRow | undefined>;
  create(u: Omit<UserRow, 'banned' | 'flagged' | 'lastSeenAt'>): Promise<UserRow>;
  touch(id: string, nickname: string, lang: string, at: number): Promise<void>;
  setBanned(id: string, banned: boolean): Promise<void>;
  setFlagged(id: string, flagged: boolean): Promise<void>;
  listBanned(): Promise<UserRow[]>;
  listFlagged(): Promise<UserRow[]>;
  /** Xoá user + mọi dữ liệu liên quan. Trả số bản ghi đã xoá theo loại. */
  deleteCascade(id: string): Promise<Record<'lanterns' | 'likes' | 'reports' | 'blocks' | 'incense' | 'user', number>>;
}

export interface LanternsRepo {
  create(l: Omit<LanternRow, 'likes' | 'reports'>): Promise<LanternRow>;
  findById(id: string): Promise<LanternRow | undefined>;
  /** Đèn approved, chưa hết hạn, tạo sau `since`, mới nhất trước. */
  listApproved(opts: { since: number; now: number; limit: number }): Promise<LanternRow[]>;
  /** Mới nhất trước; `before` (ms) để phân trang: chỉ lấy đèn tạo trước mốc này. */
  listByStatus(status: LanternStatus | 'all', now: number, limit: number, before?: number): Promise<LanternRow[]>;
  setStatus(id: string, status: LanternStatus): Promise<void>;
  countByUserSince(userId: string, since: number): Promise<number>;
  /** true nếu thêm tim mới; false nếu đã thả trước đó. */
  addLike(lanternId: string, userId: string, at: number): Promise<boolean>;
  purgeExpired(now: number): Promise<number>;
  listIdsByUser(userId: string): Promise<string[]>;
}

export interface ReportsRepo {
  /** false nếu reporter đã báo cáo mục tiêu này rồi. */
  add(r: Omit<ReportRow, 'id' | 'resolved'>): Promise<boolean>;
  countDistinctReporters(targetType: ReportRow['targetType'], targetId: string): Promise<number>;
  list(opts: { resolved?: boolean; limit: number }): Promise<ReportRow[]>;
  resolveTarget(targetType: ReportRow['targetType'], targetId: string): Promise<number>;
}

export interface BlocksRepo {
  add(blockerId: string, blockedId: string, at: number): Promise<void>;
  /** Mọi userId có quan hệ chặn với user (hai chiều). */
  related(userId: string): Promise<string[]>;
}

export interface IncenseRepo {
  add(userId: string, count: number, at: number): Promise<void>;
  /** Các lượt thắp từ `since`, để khôi phục lư hương khi khởi động lại. */
  listSince(since: number): Promise<Array<{ userId: string; nickname: string; count: number; at: number }>>;
}

export interface StatsRepo {
  incr(day: string, key: string, by?: number): Promise<void>;
  max(day: string, key: string, value: number): Promise<void>;
  getDay(day: string): Promise<Record<string, number>>;
  range(fromDay: string, toDay: string): Promise<Array<{ day: string; key: string; value: number }>>;
}

export interface WordsRepo {
  list(): Promise<string[]>;
  replaceAll(words: string[]): Promise<void>;
  count(): Promise<number>;
}

export interface AuditRow {
  id: number;
  at: number;
  ip: string;
  action: string;
  target: string;
  detail: string;
}

export interface AuditRepo {
  add(r: Omit<AuditRow, 'id'>): Promise<void>;
  list(limit: number): Promise<AuditRow[]>;
}

export interface Repositories {
  users: UsersRepo;
  lanterns: LanternsRepo;
  reports: ReportsRepo;
  blocks: BlocksRepo;
  incense: IncenseRepo;
  stats: StatsRepo;
  words: WordsRepo;
  audit: AuditRepo;
  /** Sao lưu nóng toàn bộ dữ liệu ra file (SQLite: online backup API). */
  backup(destPath: string): Promise<void>;
  close(): Promise<void>;
}
