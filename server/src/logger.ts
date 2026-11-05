import pino from 'pino';
export function createLogger(level: string) {
  return pino({
    level,
    base: { svc: 'chua-an-nhien' },
    // Không bao giờ ghi deviceId, cookie hay mật khẩu vào log.
    redact: { paths: ['deviceId', '*.deviceId', 'req.headers.cookie', 'req.headers.authorization', 'password', '*.password'], censor: '[redacted]' },
  });
}
export type Logger = ReturnType<typeof createLogger>;
