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

describe.skipIf(!url)('Postgres thật – đồng thời', () => {
  it('thả tim/báo cáo trùng gửi đồng thời vẫn đếm đúng', async () => {
    const pool = new pg.Pool({ connectionString: url, max: 10 });
    const schema = `conc_${process.pid}_${Date.now()}`;
    await pool.query(`CREATE SCHEMA ${schema}`);
    await pool.end();
    const repos = await createPostgresRepositories(new pg.Pool({ connectionString: url, max: 10, options: `-c search_path=${schema}` }));
    const now = Date.now();
    await repos.users.create({ id: 'owner', deviceHash: 'h0', nickname: 'A', lang: 'vi', createdAt: now });
    for (let i = 0; i < 20; i++) await repos.users.create({ id: `u${i}`, deviceHash: `h${i + 1}`, nickname: 'x', lang: 'vi', createdAt: now });
    await repos.lanterns.create({ id: 'L', userId: 'owner', nickname: 'A', text: 't', color: 'red', status: 'approved', createdAt: now, expiresAt: now + 1e6 });
    // mỗi user thả tim 3 lần đồng thời
    const likes = await Promise.all(Array.from({ length: 60 }, (_, k) => repos.lanterns.addLike('L', `u${k % 20}`, now)));
    expect(likes.filter(Boolean)).toHaveLength(20);
    const reps = await Promise.all(
      Array.from({ length: 40 }, (_, k) => repos.reports.add({ reporterId: `u${k % 10}`, targetType: 'lantern', targetId: 'L', reason: '', createdAt: now, sourceHash: `s${k % 10}` })),
    );
    expect(reps.filter(Boolean)).toHaveLength(10);
    expect(await repos.lanterns.findById('L')).toMatchObject({ likes: 20, reports: 10 });
    expect(await repos.reports.countDistinctReporters('lantern', 'L')).toBe(10);
    // tạo user trùng deviceHash đồng thời: đúng 1 thành công
    const created = await Promise.allSettled([1, 2, 3].map((i) => repos.users.create({ id: `dup${i}`, deviceHash: 'same', nickname: 'd', lang: 'vi', createdAt: now })));
    expect(created.filter((c) => c.status === 'fulfilled')).toHaveLength(1);
    await repos.close();
  });
});

describe.skipIf(!url)('Postgres thật – khởi động đồng thời', () => {
  it('5 instance tạo schema cùng lúc không lỗi (advisory lock)', async () => {
    const admin = new pg.Pool({ connectionString: url });
    const schema = `boot_${process.pid}_${Date.now()}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.end();
    const all = await Promise.allSettled(
      Array.from({ length: 5 }, () => createPostgresRepositories(new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` }))),
    );
    expect(all.filter((r) => r.status === 'rejected').map((r) => String((r as PromiseRejectedResult).reason))).toEqual([]);
    for (const r of all) if (r.status === 'fulfilled') await r.value.close();
  });
});
