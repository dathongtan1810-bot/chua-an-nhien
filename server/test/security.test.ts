import { afterEach, describe, expect, it } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitAck, sleep, startServer, waitFor, type TestServer } from './helpers.js';

let s: TestServer;
afterEach(async () => {
  await s?.close();
});

describe('payload lỗi / flood', () => {
  it('payload rác các kiểu không làm sập server', async () => {
    s = await startServer();
    const { c } = await s.hello();
    const junk: unknown[] = [null, undefined, 1, 'x', [], { text: 1 }, { __proto__: { area: 'san' } }, { area: 'san', extra: 'x'.repeat(100) }];
    for (const j of junk) {
      for (const ev of ['enter_area', 'light_incense', 'release_lantern', 'like_lantern', 'report', 'block_user', 'room_join'] as const) {
        const r = await emitAck(c, ev, j);
        if (ev === 'enter_area' && j && typeof j === 'object' && 'area' in (j as object) && Object.hasOwn(j as object, 'area')) continue;
        expect(r.ok, `${ev} ${JSON.stringify(j)}`).toBe(false);
      }
    }
    // vẫn hoạt động bình thường
    expect(await emitAck(c, 'enter_area', { area: 'san' })).toMatchObject({ ok: true });
  });

  it('hello sai deviceId bị từ chối', async () => {
    s = await startServer();
    const c = await s.connect();
    for (const deviceId of ['', 'abc', 'x'.repeat(200), 'có dấu nhé 12345', '<script>alert</script>']) {
      expect(await emitAck(c, 'hello', { deviceId, lang: 'vi' })).toMatchObject({ ok: false, code: 'invalid_payload' });
    }
  });

  it('gói vượt MAX_PAYLOAD_BYTES bị ngắt', async () => {
    s = await startServer({ MAX_PAYLOAD_BYTES: '2048' });
    const { c } = await s.hello();
    const dc = new Promise((r) => c.once('disconnect', r));
    c.emit('release_lantern', { text: 'x'.repeat(10_000), color: 'red' });
    expect(await dc).toBeDefined();
  });

  it('flood sự kiện → rate_limited rồi bị ngắt', async () => {
    s = await startServer({ SOCKET_EVENTS_PER_10S: '10' });
    const { c } = await s.hello();
    const rl = waitFor(c, 'rate_limited');
    const dc = new Promise((r) => c.once('disconnect', r));
    for (let i = 0; i < 40; i++) c.emit('enter_area', { area: 'san' });
    expect((await rl).event).toBe('enter_area');
    expect(await dc).toBeDefined();
  });
});

describe('giới hạn kết nối / IP', () => {
  it('vượt MAX_CONN_PER_IP → connect_error too_many_connections', async () => {
    s = await startServer({ MAX_CONN_PER_IP: '3' });
    await s.connect();
    await s.connect();
    await s.connect();
    await expect(s.connect()).rejects.toThrow(/too_many_connections/);
  });

  it('ngắt kết nối giải phóng hạn mức', async () => {
    s = await startServer({ MAX_CONN_PER_IP: '1' });
    const c = await s.connect();
    c.disconnect();
    await sleep(100);
    await expect(s.connect()).resolves.toBeDefined();
  });

  it('TRUST_PROXY đọc x-forwarded-for', async () => {
    s = await startServer({ MAX_CONN_PER_IP: '1', TRUST_PROXY: 'true' });
    await s.connect({ headers: { 'x-forwarded-for': '10.0.0.1' } });
    await expect(s.connect({ headers: { 'x-forwarded-for': '10.0.0.2' } })).resolves.toBeDefined();
    await expect(s.connect({ headers: { 'x-forwarded-for': '10.0.0.1' } })).rejects.toThrow();
  });
});

describe('HTTP', () => {
  it('rate limit HTTP theo IP', async () => {
    s = await startServer({ HTTP_RATE_PER_MIN: '5' });
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await fetch(`${s.url}/api/stats`)).status);
    expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
    expect(codes.at(-1)).toBe(429);
    expect((await fetch(`${s.url}/api/health`)).status).toBe(200); // health không bị giới hạn
  });

  it('body quá lớn → 413', async () => {
    s = await startServer({ MAX_PAYLOAD_BYTES: '1024' });
    const r = await fetch(`${s.url}/api/me/delete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: 'x'.repeat(5000) }) });
    expect(r.status).toBe(413);
  });

  it('CORS theo env', async () => {
    s = await startServer({ CORS_ORIGINS: 'https://chua.example' });
    const ok = await fetch(`${s.url}/api/health`, { headers: { origin: 'https://chua.example' } });
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://chua.example');
    const bad = await fetch(`${s.url}/api/health`, { headers: { origin: 'https://evil.example' } });
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('health / metrics (có token)', async () => {
    s = await startServer({ METRICS_TOKEN: 'tok' });
    const h = await (await fetch(`${s.url}/api/health`)).json();
    expect(h).toMatchObject({ ok: true, version: expect.any(String) });
    expect((await fetch(`${s.url}/metrics`)).status).toBe(401);
    const { c } = await s.hello();
    await emitAck(c, 'ring_bell', { force: 1 });
    const m = await (await fetch(`${s.url}/metrics`, { headers: { authorization: 'Bearer tok' } })).text();
    expect(m).toContain('chua_bells_total 1');
    expect(m).toContain('chua_socket_events_total');
    expect(m).toContain('process_cpu');
  });
});

describe('ONLINE_FEATURES', () => {
  it('tắt lantern → feature_disabled, chuông vẫn chạy', async () => {
    s = await startServer({ ONLINE_FEATURES: 'presence,bell,incense' });
    const { c } = await s.hello();
    expect(await emitAck(c, 'release_lantern', { text: 'a', color: 'red' })).toMatchObject({ ok: false, code: 'feature_disabled' });
    expect(await emitAck(c, 'ring_bell', { force: 1 })).toMatchObject({ ok: true });
  });

  it('none → hello bị từ chối', async () => {
    s = await startServer({ ONLINE_FEATURES: 'none' });
    const c = await s.connect();
    expect(await emitAck(c, 'hello', { deviceId: 'device-12345', lang: 'vi' })).toMatchObject({ ok: false, code: 'feature_disabled' });
  });
});

describe('khởi động lại', () => {
  it('hương được khôi phục từ DB', async () => {
    const path = join(tmpdir(), `chua-restart-${process.pid}-${Date.now()}.db`);
    s = await startServer({ DB_PATH: path });
    const { c } = await s.hello();
    await emitAck(c, 'light_incense', { count: 5 });
    await s.close();
    s = await startServer({ DB_PATH: path });
    const { w } = await s.hello();
    expect(w.incense).toHaveLength(1);
    expect(w.incense[0]!.count).toBe(5);
  });
});


describe('rò rỉ bộ nhớ', () => {
  it('churn 150 kết nối → các map nội bộ trở về 0', async () => {
    s = await startServer({ TRUST_PROXY: 'true' });
    for (let round = 0; round < 3; round++) {
      const cs = await Promise.all(Array.from({ length: 50 }, (_, i) => s.hello(undefined, undefined, `10.9.${round}.${i}`)));
      await Promise.all(cs.map(({ c }, i) => emitAck(c, i % 2 ? 'room_create' : 'enter_area', i % 2 ? {} : { area: 'san' })));
      for (const { c } of cs) c.disconnect();
      await sleep(150);
    }
    const sz = s.ctx.hub.debugSizes();
    expect(sz).toMatchObject({ presence: 0, userSockets: 0, connPerIp: 0, blockCache: 0, floodStrikes: 0 });
    await s.ctx.hub.sweep(Date.now() + 11 * 60_000);
    expect(s.ctx.hub.debugSizes().rooms).toBe(0);
  });
});
