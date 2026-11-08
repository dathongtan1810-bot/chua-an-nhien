import type { Redis } from 'ioredis';

/**
 * @socket.io/redis-adapter gọi vài lệnh mà không chờ/bắt lỗi (vd (p)unsubscribe khi io.close(), publish khi phát).
 * Nếu kết nối đóng trước khi Redis trả lời, các promise đó reject "Connection is closed" thành unhandled rejection.
 * Gắn sẵn handler rỗng cho promise của MỌI lệnh trên client này: nơi nào `await` vẫn nhận lỗi bình thường,
 * chỉ các promise bị bỏ rơi mới không còn là unhandled. Chỉ dùng cho client của adapter (pub/sub).
 */
export function guardFireAndForget(r: Redis): Redis {
  const orig = r.sendCommand.bind(r) as (...a: unknown[]) => unknown;
  (r as unknown as { sendCommand: (...a: unknown[]) => unknown }).sendCommand = (...args: unknown[]) => {
    const p = orig(...args) as Promise<unknown> | undefined;
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
    return p;
  };
  return r;
}
