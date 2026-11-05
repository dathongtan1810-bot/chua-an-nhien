/** Hai instance server dùng chung Redis + DB. Chạy khi có REDIS_TEST_URL (CI: service redis). */
import { afterEach, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { collect, emitAck, sleep, startServer, waitFor, type TestServer } from './helpers.js';

const url = process.env.REDIS_TEST_URL;
let A: TestServer | undefined;
let B: TestServer | undefined;
afterEach(async () => {
  await A?.close();
  await B?.close();
  A = B = undefined;
});

async function pair() {
  const env = {
    REDIS_URL: url!,
    REDIS_PREFIX: `t${process.pid}${Date.now()}:`,
    DB_PATH: path.join(os.tmpdir(), `cluster-${process.pid}-${Date.now()}.db`),
    PRESENCE_INTERVAL_MS: '150',
  };
  A = await startServer(env);
  B = await startServer(env);
  return { a: A, b: B };
}

describe.skipIf(!url)('cụm 2 instance qua Redis', () => {
  it('chuông/đèn/hương phát chéo instance; cooldown toàn server dùng chung', async () => {
    const { a, b } = await pair();
    const x = await a.hello();
    const y = await b.hello();
    const bell = waitFor(y.c, 'bell_rung');
    expect(await emitAck(x.c, 'ring_bell', { force: 0.5 })).toMatchObject({ ok: true });
    expect((await bell).force).toBe(0.5);
    // người khác ở instance B gõ ngay → bị giới hạn 3 s toàn server
    expect(await emitAck(y.c, 'ring_bell', { force: 1 })).toMatchObject({ ok: false, code: 'rate_limited' });
    const lan = waitFor(y.c, 'lantern_released');
    const r = await emitAck(x.c, 'release_lantern', { text: 'Cầu bình an', color: 'gold' });
    expect((await lan).id).toBe(r.id);
    await emitAck(x.c, 'light_incense', { count: 3 });
    const late = await b.hello();
    expect(late.w.incense.map((i) => i.userId)).toContain(x.w.userId);
  });

  it('presence gộp cả cụm', async () => {
    const { a, b } = await pair();
    const x = await a.hello();
    const y = await b.hello();
    x.c.emit('enter_area', { area: 'ho-sen' });
    y.c.emit('enter_area', { area: 'san' });
    const seen = collect(x.c, 'presence', 900);
    const got = await seen;
    const last = got.at(-1)!;
    expect(last.online).toBe(2);
    expect(last.areas['ho-sen']).toBe(1);
    expect(last.areas.san).toBe(1);
  });

  it('phòng riêng dùng chung giữa instance', async () => {
    const { a, b } = await pair();
    const x = await a.hello(undefined, 'Mẹ');
    const y = await b.hello(undefined, 'Con');
    const { code } = await emitAck(x.c, 'room_create', {});
    const st = waitFor(x.c, 'room_state');
    expect(await emitAck(y.c, 'room_join', { code })).toMatchObject({ ok: true });
    const s1 = await st;
    expect(s1.members.map((m) => m.nickname).sort()).toEqual(['Con', 'Mẹ']);
    // B đổi khu → A thấy (sau 1 chu kỳ presence)
    y.c.emit('enter_area', { area: 'chinh-dien' });
    await sleep(400);
    const st2 = waitFor(x.c, 'room_state');
    x.c.emit('enter_area', { area: 'san' });
    const s2 = await st2;
    expect(s2.members.find((m) => m.nickname === 'Con')?.area).toBe('chinh-dien');
    expect(await emitAck(y.c, 'room_join', { code: 'ZZZZZZ' })).toMatchObject({ ok: false, code: 'room_not_found' });
  });

  it('khoá thiết bị ở instance A ngắt kết nối user ở instance B', async () => {
    const { a, b } = await pair();
    const y = await b.hello();
    const dc = new Promise((r) => y.c.once('disconnect', r));
    await a.ctx.repos.users.setBanned(y.w.userId, true);
    a.ctx.hub.disconnectUser(y.w.userId, 'banned', 'Thiết bị đã bị khoá');
    expect(await dc).toBeDefined();
  });
});

describe.skipIf(!url)('đóng server ở chế độ cụm', () => {
  it('đóng khi còn lệnh Redis đang chạy không sinh unhandled rejection', async () => {
    const errs: unknown[] = [];
    const h = (e: unknown) => errs.push(e);
    process.on('unhandledRejection', h);
    try {
      for (let i = 0; i < 8; i++) {
        const s = await startServer({ REDIS_URL: url!, REDIS_PREFIX: `close${process.pid}${i}:`, PRESENCE_INTERVAL_MS: '1' });
        const { c } = await s.hello();
        c.emit('ring_bell', { force: 1 });
        c.emit('room_create', {});
        await sleep(i % 3);
        await s.close();
      }
      await sleep(200);
    } finally {
      process.off('unhandledRejection', h);
    }
    expect(errs.map(String)).toEqual([]);
  });
});

describe.skipIf(!url)('guardFireAndForget', () => {
  it('lệnh bị bỏ rơi khi đóng kết nối không thành unhandled; lệnh có await vẫn nhận lỗi', async () => {
    const { Redis } = await import('ioredis');
    const { guardFireAndForget } = await import('../src/realtime/redis.js');
    const run = async (guard: boolean) => {
      const errs: unknown[] = [];
      const h = (e: unknown) => errs.push(e);
      process.on('unhandledRejection', h);
      // proxy làm chậm phản hồi 30 ms để lệnh còn đang chờ khi đóng kết nối (như trên CI)
      const net = await import('node:net');
      const target = new URL(url!);
      const proxy = net.createServer((c) => {
        const u = net.connect(Number(target.port || 6379), target.hostname);
        c.on('data', (d) => u.write(d));
        u.on('data', (d) => setTimeout(() => c.writable && c.write(d), 30));
        c.on('close', () => u.destroy());
        u.on('close', () => c.destroy());
        c.on('error', () => undefined);
        u.on('error', () => undefined);
      });
      await new Promise<void>((ok) => proxy.listen(0, '127.0.0.1', () => ok()));
      const port = (proxy.address() as import('node:net').AddressInfo).port;
      const r = new Redis({ host: '127.0.0.1', port });
      await new Promise((ok) => r.once('ready', ok));
      if (guard) guardFireAndForget(r);
      void r.publish('x', 'y'); // giống adapter: không chờ
      const awaited = r.get('k').then(() => 'ok', (e: Error) => e.message);
      r.disconnect();
      const res = await awaited;
      await sleep(80);
      process.off('unhandledRejection', h);
      proxy.close();
      return { unhandled: errs.length, awaited: res };
    };
    const bad = await run(false);
    const good = await run(true);
    expect(bad.unhandled).toBeGreaterThan(0); // tái hiện lỗi CI
    expect(good.unhandled).toBe(0);
    expect(good.awaited).toMatch(/Connection is closed/);
  });
});
