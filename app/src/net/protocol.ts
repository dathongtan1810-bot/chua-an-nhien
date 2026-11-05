/**
 * Hợp đồng giao thức Socket.IO + REST giữa client và server Chùa An Nhiên.
 * Backend hiện thực đúng theo các kiểu dữ liệu ở đây.
 */
import type { AreaId } from '../core/areas';

export type Lang = 'vi' | 'en' | string;

/** Màu đèn hoa đăng: token có sẵn hoặc mã hex (#rrggbb). */
export const LANTERN_COLORS = ['hong', 'vang', 'trang', 'xanh', 'tim'] as const;
export type LanternColorToken = (typeof LANTERN_COLORS)[number];
export type LanternColor = LanternColorToken | string;

export const LANTERN_MAX_LEN = 120;

export type AreaCounts = Record<AreaId, number>;

// ---------- Client → Server ----------

export interface HelloPayload {
  deviceId: string;
  nickname: string;
  lang: Lang;
}

export interface EnterAreaPayload {
  area: AreaId;
}

export interface LightIncensePayload {
  count: number;
}

export interface RingBellPayload {
  /** 0..1 */
  force: number;
}

export interface ReleaseLanternPayload {
  text: string;
  color: LanternColor;
}

export interface LikeLanternPayload {
  id: string;
}

export type ReportType = 'lantern' | 'user';

export interface ReportPayload {
  type: ReportType;
  id: string;
  reason: string;
}

export interface BlockUserPayload {
  userId: string;
}

export interface C2SEvents {
  hello: HelloPayload;
  enter_area: EnterAreaPayload;
  light_incense: LightIncensePayload;
  ring_bell: RingBellPayload;
  release_lantern: ReleaseLanternPayload;
  like_lantern: LikeLanternPayload;
  report: ReportPayload;
  block_user: BlockUserPayload;
}

// ---------- Server → Client ----------

export interface IncenseLitPayload {
  userId: string;
  nickname: string;
  count: number;
  /** ISO string */
  at: string;
}

export interface WelcomePayload {
  userId: string;
  nickname: string;
  online: number;
  areas: AreaCounts;
  incense: IncenseLitPayload[];
  /** ISO string */
  serverTime: string;
}

export interface PresencePayload {
  online: number;
  areas: AreaCounts;
}

export interface BellRungPayload {
  force: number;
  at: string;
}

export interface LanternPayload {
  id: string;
  text: string;
  color: LanternColor;
  nickname: string;
  at: string;
  likes: number;
  userId?: string;
}

export interface LanternRemovedPayload {
  id: string;
}

export interface RateLimitedPayload {
  event: keyof C2SEvents | string;
  retryAfterMs: number;
}

export type ErrorCode = 'content_rejected' | 'bad_request' | 'not_found' | 'server_error' | string;

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export interface S2CEvents {
  welcome: WelcomePayload;
  presence: PresencePayload;
  incense_lit: IncenseLitPayload;
  bell_rung: BellRungPayload;
  lantern_released: LanternPayload;
  lantern_removed: LanternRemovedPayload;
  rate_limited: RateLimitedPayload;
  error: ErrorPayload;
}

// ---------- REST ----------

export interface HealthResponse {
  ok: boolean;
  version?: string;
  uptime?: number;
  online?: number;
  [k: string]: unknown;
}

/** Server có thể trả về mảng hoặc { lanterns: [...] } — client chấp nhận cả hai. */
export type LanternsResponse = LanternPayload[] | { lanterns: LanternPayload[] };

export interface StatsResponse {
  online?: number;
  areas?: Partial<AreaCounts>;
  incenseToday?: number;
  lanternsToday?: number;
  bellsToday?: number;
  [k: string]: unknown;
}

export interface DeleteMeRequest {
  deviceId: string;
}

export interface DeleteMeResponse {
  ok: boolean;
  [k: string]: unknown;
}

export function normalizeLanternsResponse(r: unknown): LanternPayload[] {
  if (Array.isArray(r)) return r as LanternPayload[];
  if (r && typeof r === 'object' && Array.isArray((r as { lanterns?: unknown }).lanterns)) {
    return (r as { lanterns: LanternPayload[] }).lanterns;
  }
  return [];
}

export const C2S_EVENT_NAMES: readonly (keyof C2SEvents)[] = [
  'hello',
  'enter_area',
  'light_incense',
  'ring_bell',
  'release_lantern',
  'like_lantern',
  'report',
  'block_user',
];

export const S2C_EVENT_NAMES: readonly (keyof S2CEvents)[] = [
  'welcome',
  'presence',
  'incense_lit',
  'bell_rung',
  'lantern_released',
  'lantern_removed',
  'rate_limited',
  'error',
];

/** Token màu hợp lệ hoặc mã hex #rgb / #rrggbb. */
export function isLanternColor(v: unknown): v is LanternColor {
  return (
    typeof v === 'string' &&
    ((LANTERN_COLORS as readonly string[]).includes(v) || /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v))
  );
}
