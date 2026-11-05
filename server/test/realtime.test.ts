import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collect, devId, emitAck, sleep, startServer, waitFor, type TestServer } from './helpers.js';
import { AREAS } from '../../shared/protocol.js';

let s: TestServer;
beforeEach(async () => {
  s = await startServer();
});
afterEach(async () => {
  await s.close();
});

describe('hello / welcome', () => {
  it('cấp userId + biệt danh ngẫu nhiên, đủ khu', async () => {
    const { w } = await s.hello();
    expect(w.userId).toMatch(/^u[A-Za-z0-9_-]+$/);
    expect(w.nickname.length).toBeGreaterThan(3);
    expect(Object.keys(w.areas).sort()).toEqual([...AREAS].sort());
    expect(w.online).toBe(1);
    expect(Array.isArray(w.incense)).toBe(true);
    expect(Date.parse(w.serverTime)).not.toBeNaN();
  });

  it('cùng deviceId → cùng userId; nickname tuỳ chọn được giữ', async () => {
    const d = devId();
    const a = await s.hello(d, 'Liên Hoa');
    const b = await s.hello(d);
    expect(b.w.userId).toBe(a.w.userId);
    expect(a.w.nickname).toBe('Liên Hoa');
    expect(b.w.nickname).toBe('Liên Hoa');
    expect(b.w.online).toBe(1); // 2 tab cùng thiết bị = 1 người
  });

  it('không lưu deviceId gốc', async () => {
    const d = devId();
    await s.hello(d);
    const u = await s.ctx.repos.users.findByDeviceHash(d);
    expect(u).toBeUndefined();
  });

  it('biệt danh tục bị thay bằng ngẫu nhiên', async () => {
    const { w } = await s.hello(devId(), 'đồ lồn');
    expect(w.nickname).not.toContain('lồn');
  });

  it('sự kiện trước hello → error not_hello', async () => {
    const c = await s.connect();
    const e = waitFor(c, 'error');
    c.emit('ring_bell', { force: 0.5 });
    expect((await e).code).toBe('not_hello');
  });
});

describe('presence', () => {
  it('đếm online & theo khu, phát gộp định kỳ', async () => {
    const a = await s.hello();
    const b = await s.hello();
    a.c.emit('enter_area', { area: 'chinh-dien' });
    b.c.emit('enter_area', { area: 'ho-sen' });
    await sleep(250);
    const p = await waitFor(a.c, 'presence', 2000).catch(() => null);
    // presence chỉ phát khi có thay đổi → ép thay đổi
    const p2 = p ?? (b.c.emit('enter_area', { area: 'san' }), await waitFor(a.c, 'presence'));
    expect(p2.online).toBe(2);
    const st = s.ctx.hub.onlineSnapshot;
    expect(st.areas['chinh-dien']).toBe(1);
    expect(st.areas['ho-sen'] + st.areas['san']).toBe(1);
  });

  it('dọn kết nối khi ngắt', async () => {
    const a = await s.hello();
    const b = await s.hello();
    const ps = collect(a.c, 'presence', 400);
    b.c.disconnect();
    const got = await ps;
    expect(got.at(-1)?.online).toBe(1);
  });

  it('area không hợp lệ → invalid_payload', async () => {
    const { c } = await s.hello();
    const r = await emitAck(c, 'enter_area', { area: 'nha-bep' });
    expect(r).toMatchObject({ ok: false, code: 'invalid_payload' });
  });
});

describe('hương', () => {
  it('broadcast incense_lit và người mới thấy trong welcome', async () => {
    const a = await s.hello();
    const b = await s.hello();
    const got = waitFor(b.c, 'incense_lit');
    a.c.emit('light_incense', { count: 3 });
    const ev = await got;
    expect(ev).toMatchObject({ userId: a.w.userId, nickname: a.w.nickname, count: 3 });
    const late = await s.hello();
    expect(late.w.incense).toHaveLength(1);
    expect(late.w.incense[0]).toMatchObject({ userId: a.w.userId, count: 3 });
  });

  it('count ngoài 1..9 bị từ chối, thắp liên tục bị rate_limited', async () => {
    const { c } = await s.hello();
    expect(await emitAck(c, 'light_incense', { count: 0 })).toMatchObject({ ok: false, code: 'invalid_payload' });
    expect(await emitAck(c, 'light_incense', { count: 100 })).toMatchObject({ ok: false });
    expect(await emitAck(c, 'light_incense', { count: 1 })).toMatchObject({ ok: true });
    const rl = waitFor(c, 'rate_limited');
    await emitAck(c, 'light_incense', { count: 1 });
    expect(await rl).toMatchObject({ event: 'light_incense' });
  });
});

describe('chuông', () => {
  it('broadcast bell_rung; người 20s/lần; toàn server 3s/lần', async () => {
    const a = await s.hello();
    const b = await s.hello();
    const got = waitFor(b.c, 'bell_rung');
    expect(await emitAck(a.c, 'ring_bell', { force: 0.8 })).toMatchObject({ ok: true });
    expect(await got).toMatchObject({ force: 0.8 });
    // cùng người gõ lại
    const r1 = await emitAck(a.c, 'ring_bell', { force: 1 });
    expect(r1).toMatchObject({ ok: false, code: 'rate_limited' });
    expect(r1.retryAfterMs).toBeGreaterThan(15_000);
    // người khác gõ trong 3s
    const rl = waitFor(b.c, 'rate_limited');
    const r2 = await emitAck(b.c, 'ring_bell', { force: 1 });
    expect(r2).toMatchObject({ ok: false, code: 'rate_limited' });
    expect(r2.retryAfterMs).toBeLessThanOrEqual(3000);
    expect(await rl).toMatchObject({ event: 'ring_bell' });
  });

  it('force ngoài 0..1 bị từ chối', async () => {
    const { c } = await s.hello();
    expect(await emitAck(c, 'ring_bell', { force: 2 })).toMatchObject({ ok: false, code: 'invalid_payload' });
    expect(await emitAck(c, 'ring_bell', 'x')).toMatchObject({ ok: false, code: 'invalid_payload' });
  });
});

describe('nhiều client', () => {
  it('20 client cùng nhận chuông', async () => {
    const cs = await Promise.all(Array.from({ length: 20 }, () => s.hello()));
    const all = Promise.all(cs.map(({ c }) => waitFor(c, 'bell_rung')));
    cs[0]!.c.emit('ring_bell', { force: 0.3 });
    expect((await all).length).toBe(20);
    const p = await collect(cs[1]!.c, 'presence', 300);
    expect(p.at(-1)?.online ?? s.ctx.hub.onlineSnapshot.online).toBe(20);
  });
});

describe('độ bền', () => {
  it('hai tab cùng thiết bị hello đồng thời → cùng userId', async () => {
    const d = devId();
    const [x, y] = await Promise.all([s.hello(d), s.hello(d)]);
    expect(x.w.userId).toBe(y.w.userId);
  });

  it('hello lần 2 đổi biệt danh, presence không nhân đôi; không đổi được deviceId', async () => {
    const d = devId();
    const { c } = await s.hello(d, 'Cũ');
    const w = waitFor(c, 'welcome');
    c.emit('hello', { deviceId: d, nickname: 'Mới', lang: 'vi' });
    expect((await w).nickname).toBe('Mới');
    expect(s.ctx.hub.onlineSnapshot.online).toBe(1);
    expect(await emitAck(c, 'hello', { deviceId: devId(), lang: 'vi' })).toMatchObject({ ok: false, code: 'invalid_payload' });
  });
});

describe('i18n', () => {
  it('lang=en → thông điệp lỗi tiếng Anh', async () => {
    const c = await s.connect();
    const w = waitFor(c, 'welcome');
    c.emit('hello', { deviceId: devId(), lang: 'en' });
    await w;
    const e = waitFor(c, 'error');
    c.emit('release_lantern', { text: 'xem https://x.com', color: 'red' });
    expect(await e).toEqual({ code: 'content_rejected', message: 'Links are not allowed' });
    const e2 = waitFor(c, 'error');
    c.emit('like_lantern', { id: 'nope' });
    expect((await e2).message).toBe('Lantern not found');
  });
});
