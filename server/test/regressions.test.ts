/** Test hồi quy cho các lỗi tìm thấy khi review (xem HANDOFF.md). */
import { afterEach, describe, expect, it } from 'vitest';
import { clientIp } from '../src/app.js';
import { collect, devId, emitAck, sleep, startServer, waitFor, type TestServer } from './helpers.js';

let s: TestServer;
afterEach(async () => {
  await s?.close();
});

describe('review regressions', () => {
  it('#1 gửi đồng loạt release_lantern không vượt 3 đèn/giờ', async () => {
    s = await startServer();
    const { c, w } = await s.hello();
    const rs = await Promise.all(Array.from({ length: 12 }, (_, i) => emitAck(c, 'release_lantern', { text: `Nguyện số ${i}`, color: 'red' })));
    expect(rs.filter((r) => r.ok).length).toBeLessThanOrEqual(3);
    expect(rs.filter((r) => !r.ok).every((r) => r.code === 'rate_limited')).toBe(true);
    for (let i = 0; i < 5; i++) await emitAck(c, 'release_lantern', { text: `Tuần tự ${i}`, color: 'red' });
    const stored = (await s.ctx.repos.lanterns.listByStatus('all', Date.now(), 100)).filter((l) => l.userId === w.userId);
    expect(stored).toHaveLength(3);
  });

  it('#2 clientIp lấy theo hop từ phải, không tin phần client tự đặt', () => {
    expect(clientIp({ 'x-forwarded-for': '6.6.6.6, 10.0.0.1' }, '127.0.0.1', 1)).toBe('10.0.0.1');
    expect(clientIp({ 'x-forwarded-for': '6.6.6.6, 10.0.0.1, 172.16.0.1' }, '127.0.0.1', 2)).toBe('10.0.0.1');
    expect(clientIp({ 'x-forwarded-for': '6.6.6.6' }, '::ffff:127.0.0.1', 0)).toBe('127.0.0.1');
    expect(clientIp({}, '127.0.0.1', 1)).toBe('127.0.0.1');
  });

  it('#2 không lách được giới hạn kết nối/IP & login bằng X-Forwarded-For giả', async () => {
    s = await startServer({ TRUST_PROXY: 'true', MAX_CONN_PER_IP: '2' });
    await s.connect({ headers: { 'x-forwarded-for': '1.1.1.1, 10.0.0.9' } });
    await s.connect({ headers: { 'x-forwarded-for': '2.2.2.2, 10.0.0.9' } });
    await expect(s.connect({ headers: { 'x-forwarded-for': '3.3.3.3, 10.0.0.9' } })).rejects.toThrow(/too_many_connections/);
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await fetch(`${s.url}/admin/api/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `9.9.9.${i}, 10.0.0.8` },
        body: JSON.stringify({ password: 'sai' }),
      });
      codes.push(r.status);
    }
    expect(codes.at(-1)).toBe(429);
  });

  it('#3 thiết bị bị khoá tự xoá dữ liệu vẫn bị khoá', async () => {
    s = await startServer();
    const d = devId();
    const a = await s.hello(d);
    await emitAck(a.c, 'release_lantern', { text: 'trước khi khoá', color: 'red' });
    await s.ctx.repos.users.setBanned(a.w.userId, true);
    a.c.disconnect();
    const del = await (await fetch(`${s.url}/api/me/delete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: d }) })).json();
    expect(del.deleted.lanterns).toBe(1);
    const c = await s.connect();
    expect(await emitAck(c, 'hello', { deviceId: d, lang: 'vi' })).toMatchObject({ ok: false, code: 'banned' });
    const u = await s.ctx.repos.users.findById(a.w.userId);
    expect(u?.nickname).toBe('(đã xoá)');
  });

  it('#4 người bị chặn không nhận đèn được duyệt khi tác giả đã offline', async () => {
    s = await startServer({ MODERATION_MODE: 'pre' });
    const a = await s.hello();
    const b = await s.hello();
    await emitAck(b.c, 'block_user', { userId: a.w.userId });
    const { id } = await emitAck(a.c, 'release_lantern', { text: 'chờ duyệt', color: 'red' });
    a.c.disconnect();
    await sleep(100);
    const seen = collect(b.c, 'lantern_released', 300);
    await s.ctx.repos.lanterns.setStatus(id, 'approved');
    await s.ctx.hub.lanternApproved(id);
    expect(await seen).toHaveLength(0);
  });

  it('#5 không lách HTTP rate limit bằng đường dẫn mã hoá %', async () => {
    s = await startServer({ HTTP_RATE_PER_MIN: '3' });
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await fetch(`${s.url}/%61pi/stats`)).status);
    expect(codes.at(-1)).toBe(429);
  });

  it('#6 hello đổi deviceId trên cùng socket rời phòng cũ', async () => {
    s = await startServer();
    const a = await s.hello();
    const b = await s.hello();
    const { code } = await emitAck(a.c, 'room_create', {});
    await emitAck(b.c, 'room_join', { code });
    const st = waitFor(a.c, 'room_state');
    const w = waitFor(b.c, 'welcome');
    b.c.emit('hello', { deviceId: devId(), lang: 'vi' });
    await w;
    expect((await st).members.map((m) => m.userId)).toEqual([a.w.userId]);
    const after = collect(b.c, 'room_state', 300);
    a.c.emit('enter_area', { area: 'san' });
    expect(await after).toHaveLength(0);
  });
});
