import { z } from 'zod';

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));
const int = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number.parseInt(v, 10)))
    .pipe(z.number().int().nonnegative());

export const FEATURES = ['presence', 'incense', 'bell', 'lantern', 'report', 'room'] as const;
export type Feature = (typeof FEATURES)[number];

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: int(8080),
  LOG_LEVEL: z.string().default('info'),
  DB_PATH: z.string().default('./data/chua.db'),
  /** Nếu đặt (postgres://...), dùng PostgreSQL thay cho SQLite. */
  DATABASE_URL: z.string().default(''),
  /** Salt băm deviceId. BẮT BUỘC đổi trong production. */
  DEVICE_SALT: z.string().min(8).default('dev-salt-change-me'),
  ADMIN_PASSWORD: z.string().default(''),
  /** Bí mật ký cookie phiên admin; mặc định suy ra từ ADMIN_PASSWORD+DEVICE_SALT. */
  SESSION_SECRET: z.string().default(''),
  /** Danh sách origin, phân tách dấu phẩy; "*" = mọi origin. */
  CORS_ORIGINS: z.string().default('*'),
  /** "all" | "none" | danh sách: presence,incense,bell,lantern,report,room */
  ONLINE_FEATURES: z.string().default('all'),
  MODERATION_MODE: z.enum(['pre', 'post']).default('post'),
  /** Đèn chỉ chứa từ mức nhẹ (mucDo 1): "reject" = từ chối, nhắc người dùng sửa; "pending" = nhận nhưng chờ duyệt. */
  MILD_WORD_ACTION: z.enum(['reject', 'pending']).default('reject'),
  MAX_CONN_PER_IP: int(20),
  MAX_PAYLOAD_BYTES: int(4096),
  /** Số sự kiện tối đa / 10 giây cho mỗi socket (chống flood chung). */
  SOCKET_EVENTS_PER_10S: int(40),
  HTTP_RATE_PER_MIN: int(120),
  /** Số proxy tin cậy phía trước (hop). "true" = 1, "false"/"0" = không tin X-Forwarded-For. */
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((v) => {
      const t = (v ?? '').trim().toLowerCase();
      if (t === '' || t === 'false' || t === 'no' || t === 'off') return 0;
      if (t === 'true' || t === 'yes' || t === 'on') return 1;
      return Number.parseInt(t, 10);
    })
    .pipe(z.number().int().min(0).max(10)),
  BANNED_WORDS_PATH: z.string().default(''),
  PRESENCE_INTERVAL_MS: int(3000),
  METRICS_TOKEN: z.string().default(''),
});

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(env: Record<string, string | undefined> = process.env) {
  const e = EnvSchema.parse(env);
  const f = e.ONLINE_FEATURES.trim().toLowerCase();
  const features = new Set<Feature>(
    f === 'all' || f === ''
      ? FEATURES
      : f === 'none' || f === 'off' || f === 'false'
        ? []
        : (f.split(',').map((s) => s.trim()).filter((s): s is Feature => (FEATURES as readonly string[]).includes(s))),
  );
  if (e.NODE_ENV === 'production' && e.DEVICE_SALT === 'dev-salt-change-me') {
    throw new Error('DEVICE_SALT phải được đặt trong production');
  }
  return {
    ...e,
    corsOrigins: e.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    features,
    sessionSecret: e.SESSION_SECRET || `${e.ADMIN_PASSWORD}::${e.DEVICE_SALT}::session`,
  };
}

export function testConfig(over: Record<string, string> = {}): Config {
  return loadConfig({ NODE_ENV: 'test', DB_PATH: ':memory:', LOG_LEVEL: 'silent', ADMIN_PASSWORD: 'admin-test-pw', PORT: '0', ...over });
}
