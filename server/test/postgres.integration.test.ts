/** Chạy luồng chính của server trên repository Postgres (pg-mem). */
import { afterEach, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { createPostgresRepositories } from '../src/repo/postgres.js';
import { devId, emitAck, startServer, waitFor, type TestServer } from './helpers.js';

let s: TestServer;
afterEach(async () => {
  await s?.close();
});

describe('server trên Postgres (pg-mem)', () => {
  it('hello → đèn → tim → báo cáo → xoá dữ liệu', async () => {
    const { Pool } = newDb().adapters.createPg();
    const repos = await createPostgresRepositories(new Pool());
    s = await startServer({}, { repos });
    const d = devId();
    const a = await s.hello(d);
    const b = await s.hello();
    const got = waitFor(b.c, 'lantern_released');
    const r = await emitAck(a.c, 'release_lantern', { text: 'Cầu bình an', color: 'gold' });
    expect(r).toMatchObject({ ok: true, status: 'approved' });
    expect((await got).id).toBe(r.id);
    expect(await emitAck(b.c, 'like_lantern', { id: r.id })).toMatchObject({ ok: true, likes: 1 });
    expect(await emitAck(b.c, 'like_lantern', { id: r.id })).toMatchObject({ ok: false, code: 'already_liked' });
    expect(await emitAck(b.c, 'report', { type: 'lantern', id: r.id, reason: 'x' })).toMatchObject({ ok: true });
    await emitAck(a.c, 'light_incense', { count: 3 });
    const list = await (await fetch(`${s.url}/api/lanterns`)).json();
    expect(list.lanterns).toHaveLength(1);
    const del = await (await fetch(`${s.url}/api/me/delete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: d }) })).json();
    expect(del.deleted).toMatchObject({ user: 1, lanterns: 1, incense: 1 });
    const stats = await (await fetch(`${s.url}/api/stats`)).json();
    expect(stats.today).toMatchObject({ lanterns: 1, incense: 3 });
  });
});
