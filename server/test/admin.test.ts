import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emitAck, startServer, waitFor, type TestServer } from './helpers.js';
import { makeSession, verifySession } from '../src/http/admin.js';

let s: TestServer;
beforeEach(async () => {
  s = await startServer({ MODERATION_MODE: 'pre' });
});
afterEach(async () => {
  await s.close();
});

async function login(pw = 'admin-test-pw') {
  const res = await fetch(`${s.url}/admin/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-request': '1' },
    body: JSON.stringify({ password: pw }),
  });
  const cookie = res.headers.get('set-cookie')?.split(';')[0] ?? '';
  return { res, cookie };
}
const api = (cookie: string, path: string, init: RequestInit = {}) =>
  fetch(`${s.url}/admin/api${path}`, {
    ...init,
    headers: { cookie, 'x-admin-request': '1', ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) },
  });

describe('admin', () => {
  it('session token ký HMAC & hết hạn', () => {
    const t = makeSession('sec', 0);
    expect(verifySession('sec', t, 1)).toBe(true);
    expect(verifySession('other', t, 1)).toBe(false);
    expect(verifySession('sec', t, 13 * 3600_000)).toBe(false);
    expect(verifySession('sec', 'garbage', 1)).toBe(false);
    expect(verifySession('sec', undefined, 1)).toBe(false);
  });

  it('đăng nhập sai → 401; chưa đăng nhập → 401; cookie httpOnly', async () => {
    expect((await login('sai')).res.status).toBe(401);
    expect((await fetch(`${s.url}/admin/api/me`)).status).toBe(401);
    const { res, cookie } = await login();
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(res.headers.get('set-cookie')).toMatch(/SameSite=Strict/i);
    expect((await api(cookie, '/me')).status).toBe(200);
  });

  it('thao tác ghi thiếu x-admin-request → 403 (CSRF)', async () => {
    const { cookie } = await login();
    const r = await fetch(`${s.url}/admin/api/words`, { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ words: [] }) });
    expect(r.status).toBe(403);
  });

  it('brute force login bị chặn', async () => {
    for (let i = 0; i < 5; i++) await login('sai');
    expect((await login()).res.status).toBe(429);
  });

  it('duyệt / ẩn đèn phát sự kiện tới client', async () => {
    const { cookie } = await login();
    const a = await s.hello();
    const b = await s.hello();
    const { id } = await emitAck(a.c, 'release_lantern', { text: 'Chờ admin', color: 'red' });
    const pend = await (await api(cookie, '/lanterns?status=pending')).json();
    expect(pend.lanterns.map((l: any) => l.id)).toContain(id);
    const rel = waitFor(b.c, 'lantern_released');
    expect((await api(cookie, `/lanterns/${id}/approve`, { method: 'POST' })).status).toBe(200);
    expect((await rel).id).toBe(id);
    const rem = waitFor(b.c, 'lantern_removed');
    expect((await api(cookie, `/lanterns/${id}/hide`, { method: 'POST' })).status).toBe(200);
    expect((await rem).id).toBe(id);
    expect((await api(cookie, `/lanterns/khong-co/hide`, { method: 'POST' })).status).toBe(404);
  });

  it('khoá thiết bị: ngắt kết nối, hello sau đó bị banned', async () => {
    const { cookie } = await login();
    const d = `dev-ban-${Date.now()}`;
    const a = await s.hello(d);
    const err = waitFor(a.c, 'error');
    const r = await api(cookie, `/users/${a.w.userId}/ban`, { method: 'POST', body: JSON.stringify({ banned: true }) });
    expect(r.status).toBe(200);
    expect((await err).code).toBe('banned');
    const c = await s.connect();
    const e2 = waitFor(c, 'error');
    c.emit('hello', { deviceId: d, nickname: null, lang: 'vi' });
    expect((await e2).code).toBe('banned');
    const users = await (await api(cookie, '/users')).json();
    expect(users.banned.map((u: any) => u.id)).toContain(a.w.userId);
    await api(cookie, `/users/${a.w.userId}/ban`, { method: 'POST', body: JSON.stringify({ banned: false }) });
    const again = await s.hello(d);
    expect(again.w.userId).toBe(a.w.userId);
  });

  it('báo cáo gom nhóm + resolve', async () => {
    const { cookie } = await login();
    const a = await s.hello();
    const b = await s.hello();
    await emitAck(b.c, 'report', { type: 'user', id: a.w.userId, reason: 'nói bậy' });
    const rep = await (await api(cookie, '/reports')).json();
    expect(rep.reports[0]).toMatchObject({ targetType: 'user', targetId: a.w.userId, count: 1, reasons: ['nói bậy'] });
    await api(cookie, '/reports/resolve', { method: 'POST', body: JSON.stringify({ targetType: 'user', targetId: a.w.userId }) });
    expect((await (await api(cookie, '/reports')).json()).reports).toHaveLength(0);
  });

  it('sửa danh sách từ cấm có hiệu lực ngay', async () => {
    const { cookie } = await login();
    const { c } = await s.hello();
    expect(await emitAck(c, 'release_lantern', { text: 'hoa cúc vàng', color: 'red' })).toMatchObject({ ok: true });
    const words = (await (await api(cookie, '/words')).json()).words as string[];
    expect(words.length).toBeGreaterThan(10);
    await api(cookie, '/words', { method: 'PUT', body: JSON.stringify({ words: [...words, 'hoa cúc'] }) });
    expect(await emitAck(c, 'release_lantern', { text: 'hoa cuc vang', color: 'red' })).toMatchObject({ ok: false, code: 'content_rejected' });
    const t = await (await api(cookie, '/words/test', { method: 'POST', body: JSON.stringify({ text: 'tặng hoa cúc' }) })).json();
    expect(t).toMatchObject({ ok: false, reason: 'banned_word' });
  });

  it('nạp lại danh sách từ file gốc', async () => {
    const { cookie } = await login();
    await api(cookie, '/words', { method: 'PUT', body: JSON.stringify({ words: ['chỉ một từ'] }) });
    expect((await (await api(cookie, '/words')).json()).words).toEqual(['chỉ một từ']);
    const r = await (await api(cookie, '/words/reseed', { method: 'POST', body: '{}' })).json();
    expect(r.ok).toBe(true);
    expect(r.count).toBeGreaterThan(50);
    const { c } = await s.hello();
    expect(await emitAck(c, 'release_lantern', { text: 'chỉ một từ', color: 'red' })).toMatchObject({ ok: true });
  });

  it('phân trang danh sách đèn', async () => {
    const { cookie } = await login();
    const now = Date.now();
    const { w } = await s.hello();
    for (let i = 0; i < 7; i++) {
      await s.ctx.repos.lanterns.create({ id: `p${i}`, userId: w.userId, nickname: 'x', text: `đèn ${i}`, color: 'red', status: 'pending', createdAt: now - i * 1000, expiresAt: now + 1e6 });
    }
    const p1 = await (await api(cookie, '/lanterns?status=pending&limit=3')).json();
    expect(p1.lanterns.map((l: any) => l.id)).toEqual(['p0', 'p1', 'p2']);
    const p2 = await (await api(cookie, `/lanterns?status=pending&limit=3&before=${encodeURIComponent(p1.nextBefore)}`)).json();
    expect(p2.lanterns.map((l: any) => l.id)).toEqual(['p3', 'p4', 'p5']);
    const p3 = await (await api(cookie, `/lanterns?status=pending&limit=3&before=${encodeURIComponent(p2.nextBefore)}`)).json();
    expect(p3.lanterns.map((l: any) => l.id)).toEqual(['p6']);
    expect(p3.nextBefore).toBeNull();
    expect((await api(cookie, '/lanterns?before=abc')).status).toBe(400);
  });

  it('nhật ký quản trị ghi lại thao tác', async () => {
    await login('sai');
    const { cookie } = await login();
    const a = await s.hello();
    await api(cookie, `/users/${a.w.userId}/ban`, { method: 'POST', body: JSON.stringify({ banned: true }) });
    const log = await (await api(cookie, '/audit')).json();
    const actions = log.entries.map((e: any) => e.action);
    expect(actions.slice(0, 3)).toEqual(['user_ban', 'login', 'login_failed']);
    expect(log.entries[0]).toMatchObject({ target: a.w.userId, ip: '127.0.0.1' });
  });

  it('tải bản sao lưu SQLite', async () => {
    const { cookie } = await login();
    expect((await fetch(`${s.url}/admin/api/backup`)).status).toBe(401);
    const r = await api(cookie, '/backup');
    if (process.env.TEST_ALL_PG) {
      expect(r.status).toBe(501); // Postgres: dùng pg_dump
      return;
    }
    expect(r.status).toBe(200);
    const buf = Buffer.from(await r.arrayBuffer());
    expect(buf.subarray(0, 15).toString()).toBe('SQLite format 3');
  });

  it('thống kê theo ngày', async () => {
    const { cookie } = await login();
    const { c } = await s.hello();
    await emitAck(c, 'light_incense', { count: 3 });
    await emitAck(c, 'ring_bell', { force: 1 });
    const st = await (await api(cookie, '/stats?days=7')).json();
    expect(st.days).toHaveLength(7);
    expect(st.days.at(-1)).toMatchObject({ incense: 3, bells: 1, newUsers: 1 });
    const pub = await (await fetch(`${s.url}/api/stats`)).json();
    expect(pub.today).toMatchObject({ incense: 3, bells: 1 });
    expect(pub.online).toBe(1);
  });

  it('phục vụ trang admin tĩnh', async () => {
    const r = await fetch(`${s.url}/admin/`);
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('<html');
  });
});

describe('admin tắt khi không có ADMIN_PASSWORD', () => {
  it('503', async () => {
    const t = await startServer({ ADMIN_PASSWORD: '' });
    const r = await fetch(`${t.url}/admin/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'x' }) });
    expect(r.status).toBe(503);
    await t.close();
  });
});
