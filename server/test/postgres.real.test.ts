/** Chỉ chạy khi có PG_TEST_URL (CI dùng service postgres). Kiểm chứng SQL trên Postgres thật. */
import { afterEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createPostgresRepositories } from '../src/repo/postgres.js';
import { devId, emitAck, startServer, type TestServer } from './helpers.js';

const url = process.env.PG_TEST_URL;
let s: TestServer | undefined;
afterEach(async () => {
  await s?.close();
  s = undefined;
});

describe.skipIf(!url)('Postgres thật', () => {
  it('schema tạo được (idempotent) và luồng chính chạy', async () => {
    const pool = new pg.Pool({ connectionString: url });
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await (await createPostgresRepositories(new pg.Pool({ connectionString: url }))).close(); // lần 1
    const repos = await createPostgresRepositories(new pg.Pool({ connectionString: url })); // lần 2: IF NOT EXISTS
    await pool.end();
    s = await startServer({ TRUST_PROXY: 'true' }, { repos });
    const d = devId();
    const a = await s.hello(d);
    const others = await Promise.all([1, 2, 3].map((i) => s!.hello(undefined, undefined, `10.1.1.${i}`)));
    const r = await emitAck(a.c, 'release_lantern', { text: 'Cầu bình an', color: 'gold' });
    expect(r.ok).toBe(true);
    for (const o of others) await emitAck(o.c, 'like_lantern', { id: r.id });
    for (const o of others) await emitAck(o.c, 'report', { type: 'lantern', id: r.id, reason: 'x' });
    expect((await repos.lanterns.findById(r.id))).toMatchObject({ likes: 3, reports: 3, status: 'pending' });
    await repos.stats.max('2026-01-01', 'peak', 5);
    await repos.stats.max('2026-01-01', 'peak', 2);
    expect(await repos.stats.getDay('2026-01-01')).toEqual({ peak: 5 });
    const del = await (await fetch(`${s.url}/api/me/delete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: d }) })).json();
    expect(del.deleted).toMatchObject({ user: 1, lanterns: 1, likes: 0, reports: 3 });
  });
});
