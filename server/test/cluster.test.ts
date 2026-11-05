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
