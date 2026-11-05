/**
 * Hợp đồng giao thức realtime "Chùa An Nhiên".
 * Nguồn sự thật duy nhất cho cả client (app/) và server (server/).
 * Mọi payload C→S đều được server kiểm tra bằng các zod schema dưới đây.
 *
 * Quy ước:
 *  - Thời gian (`at`, `serverTime`) là chuỗi ISO-8601 UTC, ví dụ "2026-11-05T03:15:32.000Z".
 *  - Các sự kiện "MỞ RỘNG" (đánh dấu EXT) là bổ sung, không phá hợp đồng gốc;
 *    client cũ có thể bỏ qua.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Khu vực trong chùa
// ---------------------------------------------------------------------------
export const AREAS = [
  'cong',
  'san',
  'chinh-dien',
  'lau-chuong',
  'ho-sen',
  'bo-song',
  'am-xam',
  'thien-duong',
] as const;
export const AreaSchema = z.enum(AREAS);
export type Area = z.infer<typeof AreaSchema>;
export type AreaCounts = Record<Area, number>;

// ---------------------------------------------------------------------------
// Giới hạn dùng chung
// ---------------------------------------------------------------------------
export const LIMITS = {
  LANTERN_MAX_CHARS: 120,
  LANTERNS_PER_HOUR: 3,
  LANTERN_TTL_MS: 24 * 60 * 60 * 1000,
  INCENSE_WINDOW_MS: 3 * 60 * 1000,
  INCENSE_MAX_COUNT: 9,
  BELL_USER_COOLDOWN_MS: 20_000,
  BELL_GLOBAL_COOLDOWN_MS: 3_000,
  PRESENCE_INTERVAL_MS: 3_000,
  REPORTS_TO_AUTOHIDE: 3,
  NICKNAME_MAX_CHARS: 24,
  REPORT_REASON_MAX_CHARS: 200,
} as const;

const trimmed = (max: number) => z.string().trim().max(max);

// ---------------------------------------------------------------------------
// C → S
// ---------------------------------------------------------------------------
export const HelloSchema = z.object({
  /** Mã thiết bị ngẫu nhiên do client sinh & lưu cục bộ (UUID khuyến nghị). */
  deviceId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  /** Biệt danh mong muốn; rỗng → server cấp biệt danh ngẫu nhiên tiếng Việt. */
  nickname: trimmed(LIMITS.NICKNAME_MAX_CHARS).optional().nullable(),
  lang: z.string().trim().min(2).max(10).default('vi'),
});
export type HelloPayload = z.input<typeof HelloSchema>;

export const EnterAreaSchema = z.object({ area: AreaSchema });
export type EnterAreaPayload = z.infer<typeof EnterAreaSchema>;

export const LightIncenseSchema = z.object({
  count: z.number().int().min(1).max(LIMITS.INCENSE_MAX_COUNT),
});
export type LightIncensePayload = z.infer<typeof LightIncenseSchema>;

export const RingBellSchema = z.object({
  /** Lực gõ 0..1 (client dùng để chỉnh âm lượng/độ ngân). */
  force: z.number().min(0).max(1),
});
export type RingBellPayload = z.infer<typeof RingBellSchema>;

export const LanternColorSchema = z
  .string()
  .trim()
  .regex(/^(#[0-9a-fA-F]{6}|[a-z][a-z-]{0,19})$/, 'color phải là #rrggbb hoặc tên màu a-z');

export const ReleaseLanternSchema = z.object({
  text: z.string().max(1000), // kiểm tra độ dài thật (≤120 ký tự) ở bộ lọc sau khi chuẩn hoá
  color: LanternColorSchema,
});
export type ReleaseLanternPayload = z.infer<typeof ReleaseLanternSchema>;

export const IdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);

export const LikeLanternSchema = z.object({ id: IdSchema });
export type LikeLanternPayload = z.infer<typeof LikeLanternSchema>;

export const ReportSchema = z.object({
  type: z.enum(['lantern', 'user']),
  id: IdSchema,
  reason: trimmed(LIMITS.REPORT_REASON_MAX_CHARS).default(''),
});
export type ReportPayload = z.input<typeof ReportSchema>;

export const BlockUserSchema = z.object({ userId: IdSchema });
export type BlockUserPayload = z.infer<typeof BlockUserSchema>;

// ---- EXT: phòng riêng đi chùa cùng gia đình ------------------------------
export const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/; // bỏ I, O, 0, 1 cho dễ đọc
export const RoomCodeSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(ROOM_CODE_REGEX));

export const RoomCreateSchema = z.object({}).strict().or(z.undefined()).or(z.null());
export const RoomJoinSchema = z.object({ code: RoomCodeSchema });
export type RoomJoinPayload = z.input<typeof RoomJoinSchema>;
export const RoomLeaveSchema = z.object({}).strict().or(z.undefined()).or(z.null());

export const C2S_SCHEMAS = {
  hello: HelloSchema,
  enter_area: EnterAreaSchema,
  light_incense: LightIncenseSchema,
  ring_bell: RingBellSchema,
  release_lantern: ReleaseLanternSchema,
  like_lantern: LikeLanternSchema,
  report: ReportSchema,
  block_user: BlockUserSchema,
  // EXT
  room_create: RoomCreateSchema,
  room_join: RoomJoinSchema,
  room_leave: RoomLeaveSchema,
} as const;
export type C2SEvent = keyof typeof C2S_SCHEMAS;

// ---------------------------------------------------------------------------
// S → C
// ---------------------------------------------------------------------------
export interface IncenseItem {
  userId: string;
  nickname: string;
  count: number;
  at: string;
}

export interface WelcomePayload {
  userId: string;
  nickname: string;
  online: number;
  areas: AreaCounts;
  /** Hương thắp trong 3 phút gần nhất (đã lọc người bị chặn). */
  incense: IncenseItem[];
  serverTime: string;
}
export interface PresencePayload {
  online: number;
  areas: AreaCounts;
}
export type IncenseLitPayload = IncenseItem;
export interface BellRungPayload {
  force: number;
  at: string;
}
export type LanternStatus = 'pending' | 'approved' | 'hidden';
export interface LanternPayload {
  id: string;
  text: string;
  color: string;
  nickname: string;
  at: string;
  likes: number;
}
export interface LanternRemovedPayload {
  id: string;
}
export interface RateLimitedPayload {
  event: string;
  retryAfterMs: number;
}
export const ERROR_CODES = [
  'invalid_payload',
  'not_hello', // gửi sự kiện trước khi hello
  'banned', // thiết bị bị khoá
  'feature_disabled',
  'content_rejected',
  'not_found',
  'already_liked',
  'already_reported',
  'cannot_target_self',
  'room_not_found',
  'room_full',
  'too_many_connections',
  'internal',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

// ---- EXT ------------------------------------------------------------------
/** EXT: số tim của đèn thay đổi. */
export interface LanternLikedPayload {
  id: string;
  likes: number;
}
export interface RoomMember {
  userId: string;
  nickname: string;
  area: Area | null;
}
/** EXT: trạng thái phòng riêng (gửi khi tạo/vào phòng và mỗi khi thành viên thay đổi). */
export interface RoomStatePayload {
  code: string;
  members: RoomMember[];
}
/** EXT: đã rời phòng (chủ động hoặc mất kết nối quá lâu). */
export interface RoomLeftPayload {
  code: string;
}

export interface ServerToClientEvents {
  welcome: (p: WelcomePayload) => void;
  presence: (p: PresencePayload) => void;
  incense_lit: (p: IncenseLitPayload) => void;
  bell_rung: (p: BellRungPayload) => void;
  lantern_released: (p: LanternPayload) => void;
  lantern_removed: (p: LanternRemovedPayload) => void;
  rate_limited: (p: RateLimitedPayload) => void;
  error: (p: ErrorPayload) => void;
  // EXT
  lantern_liked: (p: LanternLikedPayload) => void;
  room_state: (p: RoomStatePayload) => void;
  room_left: (p: RoomLeftPayload) => void;
}

/** Ack tuỳ chọn: client có thể truyền callback làm tham số cuối. */
export type Ack = (res: { ok: true; [k: string]: unknown } | { ok: false; code: ErrorCode | 'rate_limited'; retryAfterMs?: number }) => void;

export interface ClientToServerEvents {
  hello: (p: HelloPayload, ack?: Ack) => void;
  enter_area: (p: EnterAreaPayload, ack?: Ack) => void;
  light_incense: (p: LightIncensePayload, ack?: Ack) => void;
  ring_bell: (p: RingBellPayload, ack?: Ack) => void;
  release_lantern: (p: ReleaseLanternPayload, ack?: Ack) => void;
  like_lantern: (p: LikeLanternPayload, ack?: Ack) => void;
  report: (p: ReportPayload, ack?: Ack) => void;
  block_user: (p: BlockUserPayload, ack?: Ack) => void;
  // EXT
  room_create: (p?: Record<string, never> | null, ack?: Ack) => void;
  room_join: (p: RoomJoinPayload, ack?: Ack) => void;
  room_leave: (p?: Record<string, never> | null, ack?: Ack) => void;
}

// ---------------------------------------------------------------------------
// REST
// ---------------------------------------------------------------------------
export interface HealthResponse {
  ok: true;
  uptimeSec: number;
  version: string;
  serverTime: string;
}
export interface LanternsResponse {
  lanterns: LanternPayload[];
  serverTime: string;
}
export interface StatsResponse {
  online: number;
  areas: AreaCounts;
  today: { lanterns: number; incense: number; bells: number };
  serverTime: string;
}
export const LanternsQuerySchema = z.object({
  since: z.string().datetime({ offset: true }).optional(),
});
export const DeleteMeSchema = z.object({ deviceId: HelloSchema.shape.deviceId });
export interface DeleteMeResponse {
  ok: true;
  deleted: { lanterns: number; likes: number; reports: number; blocks: number; incense: number; user: number };
}

export function emptyAreaCounts(): AreaCounts {
  return Object.fromEntries(AREAS.map((a) => [a, 0])) as AreaCounts;
}
