/**
 * Tương thích với client app (app/src/net/protocol.ts trên nhánh app): các trường client đọc phải có mặt.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { io as ioc } from 'socket.io-client';
import { emitAck, startServer, waitFor, type TestServer } from './helpers.js';
import { socketTransports } from '../src/app.js';
import { testConfig } from '../src/config.js';

let s: TestServer;
afterEach(async () => {
  await s?.close();
});

describe('tương thích client app', () => {
  it('lantern_released và GET /api/lanterns có userId tác giả (để chặn/báo cáo từ đèn)', async () => {
    s = await startServer();
    const a = await s.hello();
    const b = await s.hello();
    const got = waitFor(b.c, 'lantern_released');
    const { id } = await emitAck(a.c, 'release_lantern', { text: 'Bình an', color: 'vang' });
    expect(await got).toMatchObject({ id, userId: a.w.userId });
    const list = await (await fetch(`${s.url}/api/lanterns`)).json();
    expect(list.lanterns[0]).toMatchObject({ id, userId: a.w.userId });
    // từ userId trong đèn, B chặn được A
    expect(await emitAck(b.c, 'block_user', { userId: list.lanterns[0].userId })).toMatchObject({ ok: true });
  });

  it('màu #rgb và token màu của app được chấp nhận', async () => {
    s = await startServer();
    const { c } = await s.hello();
    expect(await emitAck(c, 'release_lantern', { text: 'một', color: '#fa0' })).toMatchObject({ ok: true });
    expect(await emitAck(c, 'release_lantern', { text: 'hai', color: 'hong' })).toMatchObject({ ok: true });
    expect(await emitAck(c, 'release_lantern', { text: 'ba', color: '#ggg' })).toMatchObject({ ok: false, code: 'invalid_payload' });
  });

  it('/api/stats có incenseToday/lanternsToday/bellsToday; /api/health có uptime/online', async () => {
    s = await startServer();
    const { c } = await s.hello();
    await emitAck(c, 'light_incense', { count: 3 });
    await emitAck(c, 'ring_bell', { force: 1 });
    const st = await (await fetch(`${s.url}/api/stats`)).json();
    expect(st).toMatchObject({ incenseToday: 3, bellsToday: 1, lanternsToday: 0, today: { incense: 3, bells: 1 } });
    const h = await (await fetch(`${s.url}/api/health`)).json();
    expect(h).toMatchObject({ ok: true, online: 1, uptime: expect.any(Number), uptimeSec: expect.any(Number) });
  });

  it.skipIf(!!process.env.TEST_ALL_REDIS)('client app dùng transports [websocket, polling] kết nối được (1 instance)', async () => {
    s = await startServer();
    const c = ioc(s.url, { transports: ['polling', 'websocket'], forceNew: true, reconnection: false });
    s.clients.push(c as never);
    await new Promise<void>((ok, bad) => {
      c.once('connect', () => ok());
      c.once('connect_error', bad);
    });
    const w = waitFor(c as never, 'welcome');
    c.emit('hello', { deviceId: 'polling-device-1', nickname: 'Mõ', lang: 'vi' });
    expect((await w).nickname).toBe('Mõ');
  });

  it('SOCKET_TRANSPORTS: mặc định; chế độ cụm chỉ websocket; ghi đè được', () => {
    expect(socketTransports(testConfig())).toEqual(['polling', 'websocket']);
    expect(socketTransports(testConfig({ REDIS_URL: 'redis://x' }))).toEqual(['websocket']);
    expect(socketTransports(testConfig({ REDIS_URL: 'redis://x', SOCKET_TRANSPORTS: 'websocket,polling' }))).toEqual(['websocket', 'polling']);
    expect(socketTransports(testConfig({ SOCKET_TRANSPORTS: 'websocket' }))).toEqual(['websocket']);
  });
});
