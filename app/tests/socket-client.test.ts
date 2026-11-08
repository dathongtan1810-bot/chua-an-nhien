import { describe, expect, it } from 'vitest';
import { SocketClient } from '../src/net/socket-client';
import { clampNickname, NICKNAME_MAX_CHARS, randomNickname, randomNicknameEn } from '../src/logic/nickname';

/** Socket.IO giả: ghi lại các emit, cho phép phát sự kiện từ "server". */
function fakeSocket() {
  const handlers = new Map<string, ((d?: unknown) => void)[]>();
  const sent: [string, unknown][] = [];
  const sock = {
    connected: false,
    active: true,
    on(ev: string, cb: (d?: unknown) => void) {
      handlers.set(ev, [...(handlers.get(ev) ?? []), cb]);
      return sock;
    },
    emit(ev: string, d: unknown) {
      sent.push([ev, d]);
      return sock;
    },
    removeAllListeners() {
      handlers.clear();
      return sock;
    },
    disconnect() {
      return sock;
    },
    fire(ev: string, d?: unknown) {
      if (ev === 'connect') sock.connected = true;
      for (const cb of handlers.get(ev) ?? []) cb(d);
    },
  };
  return { sock, sent };
}

describe('SocketClient — thứ tự hello/welcome (server trả not_hello nếu gửi sớm)', () => {
  it('chỉ gửi hello khi vừa kết nối; enter_area & hành động gửi sau welcome', () => {
    const { sock, sent } = fakeSocket();
    const c = new SocketClient({ serverUrl: 'http://x', ioFactory: (() => sock) as never });
    c.connect({ deviceId: 'device-12345', nickname: 'Khách', lang: 'vi' });
    sock.fire('connect');
    c.emit('enter_area', { area: 'san' });
    c.emit('light_incense', { count: 3 });
    expect(sent.map(([e]) => e)).toEqual(['hello']);
    sock.fire('welcome', { userId: 'u1', nickname: 'Khách', online: 1, areas: {}, incense: [], serverTime: '' });
    expect(sent.map(([e]) => e)).toEqual(['hello', 'enter_area', 'light_incense']);
    c.emit('ring_bell', { force: 0.5 });
    expect(sent.at(-1)?.[0]).toBe('ring_bell');
  });

  it('kết nối lại: gửi lại hello rồi enter_area sau welcome mới', () => {
    const { sock, sent } = fakeSocket();
    const c = new SocketClient({ serverUrl: 'http://x', ioFactory: (() => sock) as never });
    c.connect({ deviceId: 'device-12345', nickname: 'Khách', lang: 'vi' });
    sock.fire('connect');
    sock.fire('welcome', {});
    c.emit('enter_area', { area: 'ho-sen' });
    sent.length = 0;
    sock.fire('connect');
    expect(sent.map(([e]) => e)).toEqual(['hello']);
    sock.fire('welcome', {});
    expect(sent).toContainEqual(['enter_area', { area: 'ho-sen' }]);
  });
});

describe('biệt danh ≤ 24 ký tự (LIMITS.NICKNAME_MAX_CHARS của server)', () => {
  it('ngẫu nhiên luôn vừa giới hạn', () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2000; i++) {
      expect([...randomNickname(rand)].length).toBeLessThanOrEqual(NICKNAME_MAX_CHARS);
      expect([...randomNicknameEn(rand)].length).toBeLessThanOrEqual(NICKNAME_MAX_CHARS);
    }
  });
  it('cắt ở ranh giới từ', () => {
    expect(clampNickname('Khách hành hương Mây Trắng')).toBe('Khách hành hương Mây');
    expect(clampNickname('  Lữ khách   Sen Hồng ')).toBe('Lữ khách Sen Hồng');
  });
});
