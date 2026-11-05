import { afterEach, describe, expect, it } from 'vitest';
import { collect, devId, emitAck, sleep, startServer, waitFor, type TestServer } from './helpers.js';

let s: TestServer;
afterEach(async () => {
  await s?.close();
});

describe('đèn hoa đăng (post-moderation)', () => {
  it('thả đèn → mọi người nhận lantern_released; REST trả về', async () => {
    s = await startServer();
    const a = await s.hello();
    const b = await s.hello();
    const got = waitFor(b.c, 'lantern_released');
    const r = await emitAck(a.c, 'release_lantern', { text: '  Cầu   bình an  ', color: '#ffcc00' });
    expect(r).toMatchObject({ ok: true, status: 'approved' });
    const ev = await got;
    expect(ev).toMatchObject({ id: r.id, text: 'Cầu bình an', color: '#ffcc00', nickname: a.w.nickname, likes: 0 });
    const res = await fetch(`${s.url}/api/lanterns`);
    const body = await res.json();
    expect(body.lanterns.map((l: any) => l.id)).toContain(r.id);
    const since = await (await fetch(`${s.url}/api/lanterns?since=${encodeURIComponent(new Date(Date.now() + 1000).toISOString())}`)).json();
    expect(since.lanterns).toHaveLength(0);
    expect((await fetch(`${s.url}/api/lanterns?since=abc`)).status).toBe(400);
  });

  it('lọc nội dung → content_rejected, không lưu', async () => {
    s = await startServer();
    const { c } = await s.hello();
    for (const text of ['đ.ị.t mẹ', 'zalo 0912345678', 'xem https://x.com', 'a'.repeat(121), '']) {
      const e = waitFor(c, 'error');
      const r = await emitAck(c, 'release_lantern', { text, color: 'red' });
      expect(r, text).toMatchObject({ ok: false, code: 'content_rejected' });
      expect((await e).code).toBe('content_rejected');
    }
    expect((await s.ctx.repos.lanterns.listByStatus('all', Date.now(), 100)).length).toBe(0);
  });

  it('3 đèn/giờ/người, bền qua kết nối lại', async () => {
    s = await startServer();
    const d = devId();
    const a = await s.hello(d);
    for (let i = 0; i < 3; i++) expect(await emitAck(a.c, 'release_lantern', { text: `Nguyện ${i}`, color: 'red' })).toMatchObject({ ok: true });
    const rl = waitFor(a.c, 'rate_limited');
    expect(await emitAck(a.c, 'release_lantern', { text: 'thứ tư', color: 'red' })).toMatchObject({ ok: false, code: 'rate_limited' });
    expect((await rl).event).toBe('release_lantern');
    a.c.disconnect();
    const a2 = await s.hello(d);
    expect(await emitAck(a2.c, 'release_lantern', { text: 'lại', color: 'red' })).toMatchObject({ ok: false, code: 'rate_limited' });
  });

  it('màu sai → invalid_payload', async () => {
    s = await startServer();
    const { c } = await s.hello();
    expect(await emitAck(c, 'release_lantern', { text: 'x', color: 'javascript:alert(1)' })).toMatchObject({ ok: false, code: 'invalid_payload' });
  });

  it('thả tim 1 lần/người, phát lantern_liked', async () => {
    s = await startServer();
    const a = await s.hello();
    const b = await s.hello();
    const { id } = await emitAck(a.c, 'release_lantern', { text: 'Mong an lành', color: 'pink' });
    const liked = waitFor(a.c, 'lantern_liked');
    expect(await emitAck(b.c, 'like_lantern', { id })).toMatchObject({ ok: true, likes: 1 });
    expect(await liked).toEqual({ id, likes: 1 });
    expect(await emitAck(b.c, 'like_lantern', { id })).toMatchObject({ ok: false, code: 'already_liked' });
    expect(await emitAck(b.c, 'like_lantern', { id: 'khong-co' })).toMatchObject({ ok: false, code: 'not_found' });
    const l = await s.ctx.repos.lanterns.findById(id);
    expect(l?.likes).toBe(1);
  });
});

describe('MODERATION_MODE=pre', () => {
  it('đèn pending: chỉ tác giả thấy, duyệt xong mọi người thấy', async () => {
    s = await startServer({ MODERATION_MODE: 'pre' });
    const a = await s.hello();
    const b = await s.hello();
    const bSeen = collect(b.c, 'lantern_released', 300);
    const aSeen = waitFor(a.c, 'lantern_released');
    const r = await emitAck(a.c, 'release_lantern', { text: 'Chờ duyệt', color: 'blue' });
    expect(r.status).toBe('pending');
    expect((await aSeen).id).toBe(r.id);
    expect(await bSeen).toHaveLength(0);
    expect((await (await fetch(`${s.url}/api/lanterns`)).json()).lanterns).toHaveLength(0);
    // admin duyệt
    const bGot = waitFor(b.c, 'lantern_released');
    await s.ctx.repos.lanterns.setStatus(r.id, 'approved');
    await s.ctx.hub.lanternApproved(r.id);
    expect((await bGot).id).toBe(r.id);
  });
});

describe('báo cáo', () => {
  it('3 người khác nhau báo cáo → tự ẩn chờ duyệt', async () => {
    s = await startServer({ TRUST_PROXY: 'true' });
    const a = await s.hello();
    const rs = await Promise.all([s.hello(undefined, undefined, '10.0.0.1'), s.hello(undefined, undefined, '10.0.0.2'), s.hello(undefined, undefined, '10.0.0.3')]);
    const { id } = await emitAck(a.c, 'release_lantern', { text: 'Đèn bị báo cáo', color: 'red' });
    expect(await emitAck(a.c, 'report', { type: 'lantern', id, reason: 'x' })).toMatchObject({ ok: false, code: 'cannot_target_self' });
    expect(await emitAck(rs[0]!.c, 'report', { type: 'lantern', id, reason: 'tục' })).toMatchObject({ ok: true, autoHidden: false });
    expect(await emitAck(rs[0]!.c, 'report', { type: 'lantern', id, reason: 'tục' })).toMatchObject({ ok: false, code: 'already_reported' });
    expect(await emitAck(rs[1]!.c, 'report', { type: 'lantern', id })).toMatchObject({ ok: true, autoHidden: false });
    const removed = waitFor(a.c, 'lantern_removed');
    expect(await emitAck(rs[2]!.c, 'report', { type: 'lantern', id, reason: '' })).toMatchObject({ ok: true, autoHidden: true });
    expect(await removed).toEqual({ id });
    expect((await s.ctx.repos.lanterns.findById(id))?.status).toBe('pending');
  });

  it('nhiều deviceId cùng 1 IP chỉ tính 1 người báo cáo', async () => {
    s = await startServer();
    const a = await s.hello();
    const rs = await Promise.all([s.hello(), s.hello(), s.hello(), s.hello()]);
    const { id } = await emitAck(a.c, 'release_lantern', { text: 'Đèn', color: 'red' });
    for (const r of rs) expect(await emitAck(r.c, 'report', { type: 'lantern', id })).toMatchObject({ ok: true, autoHidden: false });
    expect((await s.ctx.repos.lanterns.findById(id))?.status).toBe('approved');
  });

  it('báo cáo user đủ 3 → gắn cờ, đèn mới thành pending', async () => {
    s = await startServer({ TRUST_PROXY: 'true' });
    const a = await s.hello();
    const rs = await Promise.all([s.hello(undefined, undefined, '10.0.1.1'), s.hello(undefined, undefined, '10.0.1.2'), s.hello(undefined, undefined, '10.0.1.3')]);
    const first = await emitAck(a.c, 'release_lantern', { text: 'trước', color: 'red' });
    for (const r of rs) await emitAck(r.c, 'report', { type: 'user', id: a.w.userId, reason: 'spam' });
    expect((await s.ctx.repos.users.findById(a.w.userId))?.flagged).toBe(true);
    expect((await s.ctx.repos.lanterns.findById(first.id))?.status).toBe('pending');
    const r = await emitAck(a.c, 'release_lantern', { text: 'sau', color: 'red' });
    expect(r.status).toBe('pending');
  });
});

describe('chặn', () => {
  it('hai bên không thấy hương/đèn của nhau', async () => {
    s = await startServer();
    const a = await s.hello();
    const b = await s.hello();
    const c = await s.hello();
    expect(await emitAck(a.c, 'block_user', { userId: a.w.userId })).toMatchObject({ ok: false, code: 'cannot_target_self' });
    expect(await emitAck(a.c, 'block_user', { userId: b.w.userId })).toMatchObject({ ok: true });
    const bSeen = collect(b.c, 'lantern_released', 300);
    const cSeen = waitFor(c.c, 'lantern_released');
    await emitAck(a.c, 'release_lantern', { text: 'của A', color: 'red' });
    expect(await bSeen).toHaveLength(0);
    expect((await cSeen).text).toBe('của A');
    const aSeen = collect(a.c, 'incense_lit', 300);
    b.c.emit('light_incense', { count: 1 });
    expect(await aSeen).toHaveLength(0);
    // welcome của người chặn không có hương của người bị chặn (cùng device A kết nối lại)
    // REST lọc theo x-device-id: B không thấy đèn của A
  });

  it('REST lọc theo x-device-id', async () => {
    s = await startServer();
    const da = devId();
    const db = devId();
    const a = await s.hello(da);
    const b = await s.hello(db);
    await emitAck(a.c, 'release_lantern', { text: 'đèn A', color: 'red' });
    await emitAck(b.c, 'block_user', { userId: a.w.userId });
    const list = await (await fetch(`${s.url}/api/lanterns`, { headers: { 'x-device-id': db } })).json();
    expect(list.lanterns).toHaveLength(0);
    const all = await (await fetch(`${s.url}/api/lanterns`)).json();
    expect(all.lanterns).toHaveLength(1);
  });
});

describe('POST /api/me/delete', () => {
  it('xoá toàn bộ dữ liệu theo deviceId', async () => {
    s = await startServer();
    const d = devId();
    const a = await s.hello(d);
    const b = await s.hello();
    const { id } = await emitAck(a.c, 'release_lantern', { text: 'sẽ bị xoá', color: 'red' });
    await emitAck(b.c, 'like_lantern', { id });
    const { id: idB } = await emitAck(b.c, 'release_lantern', { text: 'đèn B', color: 'red' });
    await emitAck(a.c, 'like_lantern', { id: idB });
    await emitAck(a.c, 'report', { type: 'user', id: b.w.userId, reason: 'x' });
    await emitAck(a.c, 'block_user', { userId: b.w.userId });
    a.c.emit('light_incense', { count: 3 });
    await sleep(100);
    const removed = waitFor(b.c, 'lantern_removed');
    const res = await fetch(`${s.url}/api/me/delete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: d }) });
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, deleted: { user: 1, lanterns: 1, likes: 1, reports: 1, blocks: 1, incense: 1 } });
    expect(await removed).toEqual({ id });
    expect((await s.ctx.repos.lanterns.findById(idB))?.likes).toBe(0);
    expect(await s.ctx.repos.users.findById(a.w.userId)).toBeUndefined();
    const late = await s.hello();
    expect(late.w.incense).toHaveLength(0);
    // deviceId không tồn tại vẫn ok
    const r2 = await fetch(`${s.url}/api/me/delete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: 'khong-ton-tai-123' }) });
    expect((await r2.json()).deleted.user).toBe(0);
    const r3 = await fetch(`${s.url}/api/me/delete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(r3.status).toBe(400);
  });
});
