import { beforeEach, describe, expect, it } from 'vitest';
import { createSqliteRepositories } from '../src/repo/sqlite.js';
import type { Repositories } from '../src/repo/types.js';

let r: Repositories;
const now = Date.now();
beforeEach(async () => {
  r = createSqliteRepositories(':memory:');
  await r.users.create({ id: 'u1', deviceHash: 'h1', nickname: 'A', lang: 'vi', createdAt: now });
  await r.users.create({ id: 'u2', deviceHash: 'h2', nickname: 'B', lang: 'vi', createdAt: now });
});
const lantern = (id: string, userId: string, over: Partial<{ createdAt: number; expiresAt: number; status: 'approved' | 'pending' | 'hidden' }> = {}) =>
  r.lanterns.create({ id, userId, nickname: 'x', text: 't', color: 'red', status: 'approved', createdAt: now, expiresAt: now + 1000, ...over });

describe('sqlite repositories', () => {
  it('users: tìm theo hash, ban, flag', async () => {
    expect((await r.users.findByDeviceHash('h1'))?.id).toBe('u1');
    await r.users.setBanned('u1', true);
    await r.users.setFlagged('u2', true);
    expect((await r.users.listBanned()).map((u) => u.id)).toEqual(['u1']);
    expect((await r.users.listFlagged()).map((u) => u.id)).toEqual(['u2']);
    await r.users.touch('u1', 'A2', 'en', now + 1);
    expect(await r.users.findById('u1')).toMatchObject({ nickname: 'A2', lang: 'en', banned: true });
  });

  it('lanterns: list approved, hết hạn, đếm, like duy nhất, purge', async () => {
    await lantern('l1', 'u1');
    await lantern('l2', 'u1', { status: 'pending' });
    await lantern('l3', 'u2', { expiresAt: now - 1 });
    await lantern('l4', 'u2', { createdAt: now - 5000 });
    const ap = await r.lanterns.listApproved({ since: 0, now, limit: 10 });
    expect(ap.map((l) => l.id)).toEqual(['l1', 'l4']);
    expect((await r.lanterns.listApproved({ since: now - 1000, now, limit: 10 })).map((l) => l.id)).toEqual(['l1']);
    expect(await r.lanterns.countByUserSince('u1', now - 1)).toBe(2);
    expect(await r.lanterns.addLike('l1', 'u2', now)).toBe(true);
    expect(await r.lanterns.addLike('l1', 'u2', now)).toBe(false);
    expect((await r.lanterns.findById('l1'))?.likes).toBe(1);
    expect(await r.lanterns.purgeExpired(now)).toBe(1);
    expect(await r.lanterns.findById('l3')).toBeUndefined();
  });

  it('reports: duy nhất theo người, đếm, resolve', async () => {
    await lantern('l1', 'u1');
    expect(await r.reports.add({ reporterId: 'u2', targetType: 'lantern', targetId: 'l1', reason: 'a', createdAt: now })).toBe(true);
    expect(await r.reports.add({ reporterId: 'u2', targetType: 'lantern', targetId: 'l1', reason: 'b', createdAt: now })).toBe(false);
    expect(await r.reports.countDistinctReporters('lantern', 'l1')).toBe(1);
    expect((await r.lanterns.findById('l1'))?.reports).toBe(1);
    expect(await r.reports.resolveTarget('lantern', 'l1')).toBe(1);
    expect(await r.reports.countDistinctReporters('lantern', 'l1')).toBe(0);
    expect(await r.reports.list({ resolved: true, limit: 10 })).toHaveLength(1);
  });

  it('blocks hai chiều; deleteCascade', async () => {
    await r.blocks.add('u1', 'u2', now);
    expect(await r.blocks.related('u2')).toEqual(['u1']);
    await lantern('l1', 'u1');
    await lantern('l2', 'u2');
    await r.lanterns.addLike('l2', 'u1', now);
    await r.lanterns.addLike('l1', 'u2', now);
    await r.incense.add('u1', 3, now);
    const d = await r.users.deleteCascade('u1');
    expect(d).toEqual({ lanterns: 1, likes: 1, reports: 0, blocks: 1, incense: 1, user: 1 });
    expect((await r.lanterns.findById('l2'))?.likes).toBe(0);
    expect(await r.blocks.related('u2')).toEqual([]);
  });

  it('stats & words', async () => {
    await r.stats.incr('2026-11-05', 'lanterns');
    await r.stats.incr('2026-11-05', 'lanterns', 2);
    await r.stats.max('2026-11-05', 'peak', 5);
    await r.stats.max('2026-11-05', 'peak', 3);
    expect(await r.stats.getDay('2026-11-05')).toEqual({ lanterns: 3, peak: 5 });
    expect(await r.stats.range('2026-11-01', '2026-11-30')).toHaveLength(2);
    await r.words.replaceAll(['a', 'b', 'a']);
    expect(await r.words.list()).toEqual(['a', 'b']);
    expect(await r.words.count()).toBe(2);
  });
});
