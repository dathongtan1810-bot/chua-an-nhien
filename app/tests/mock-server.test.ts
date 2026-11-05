import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockServerClient } from '../src/net/mock-server';
import { createNetClient, NullClient } from '../src/net/client';
import type { S2CEvents } from '../src/net/protocol';
import { AREAS } from '../src/core/areas';

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const HELLO = { deviceId: 'dev-1', nickname: 'Lữ khách Sen Hồng', lang: 'vi' };

function record(c: MockServerClient) {
  const got: { [K in keyof S2CEvents]: S2CEvents[K][] } = {
    lantern_liked: [],
    welcome: [],
    presence: [],
    incense_lit: [],
    bell_rung: [],
    lantern_released: [],
    lantern_removed: [],
    rate_limited: [],
    error: [],
  };
  for (const k of Object.keys(got) as (keyof S2CEvents)[]) {
    c.on(k, (d) => (got[k] as unknown[]).push(d));
  }
  return got;
}

describe('MockServerClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T19:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function make(extra: ConstructorParameters<typeof MockServerClient>[0] = {}) {
    const c = new MockServerClient({ random: seeded(1), latencyMs: 10, initialLanterns: 5, ...extra });
    const got = record(c);
    return { c, got };
  }

  it('sends welcome after connect with realistic presence', () => {
    const { c, got } = make();
    const statuses: string[] = [];
    c.onStatus((s) => statuses.push(s));
    c.connect(HELLO);
    expect(c.connected).toBe(false);
    vi.advanceTimersByTime(20);
    expect(c.connected).toBe(true);
    expect(statuses).toEqual(['offline', 'connecting', 'online']);
    expect(got.welcome).toHaveLength(1);
    const w = got.welcome[0]!;
    expect(w.nickname).toBe(HELLO.nickname);
    expect(w.userId).toBeTruthy();
    expect(w.online).toBeGreaterThanOrEqual(6);
    expect(w.online).toBeLessThanOrEqual(41);
    expect(Object.keys(w.areas).sort()).toEqual([...AREAS].sort());
    expect(Object.values(w.areas).reduce((a, b) => a + b, 0)).toBe(w.online);
    expect(Array.isArray(w.incense)).toBe(true);
    expect(Number.isNaN(Date.parse(w.serverTime))).toBe(false);
    c.disconnect();
  });

  it('echoes own incense, bell and lantern', async () => {
    const { c, got } = make();
    c.connect(HELLO);
    vi.advanceTimersByTime(20);
    const me = got.welcome[0]!.userId;
    c.emit('light_incense', { count: 3 });
    c.emit('ring_bell', { force: 2 });
    c.emit('release_lantern', { text: 'Cầu cho mẹ luôn mạnh khỏe.', color: 'hong' });
    vi.advanceTimersByTime(20);
    expect(got.incense_lit.filter((i) => i.userId === me)).toEqual([
      expect.objectContaining({ userId: me, nickname: HELLO.nickname, count: 3 }),
    ]);
    expect(got.bell_rung.at(-1)?.force).toBe(1);
    const mine = got.lantern_released.find((l) => l.userId === me);
    expect(mine).toMatchObject({ text: 'Cầu cho mẹ luôn mạnh khỏe.', color: 'hong', likes: 0 });
    expect(mine!.id).toBeTruthy();
    const list = await c.fetchLanterns();
    expect(list.some((l) => l.id === mine!.id)).toBe(true);
    // like increments and re-emits lantern_released with same id
    c.emit('like_lantern', { id: mine!.id });
    vi.advanceTimersByTime(20);
    const updated = got.lantern_released.filter((l) => l.id === mine!.id).at(-1)!;
    expect(updated.likes).toBeGreaterThanOrEqual(1);
    c.disconnect();
  });

  it('enforces rate limits', () => {
    const { c, got } = make();
    c.connect(HELLO);
    vi.advanceTimersByTime(20);
    for (let i = 0; i < 4; i++) c.emit('light_incense', { count: 1 });
    c.emit('ring_bell', { force: 0.5 });
    c.emit('ring_bell', { force: 0.5 });
    vi.advanceTimersByTime(20);
    const me = got.welcome[0]!.userId;
    expect(got.incense_lit.filter((i) => i.userId === me)).toHaveLength(1);
    expect(got.rate_limited.map((r) => r.event).sort()).toEqual(['light_incense', 'light_incense', 'light_incense', 'ring_bell']);
    expect(got.rate_limited.every((r) => r.retryAfterMs > 0)).toBe(true);
    c.disconnect();
  });

  it('rejects profane lanterns with content_rejected', () => {
    const { c, got } = make();
    c.connect(HELLO);
    vi.advanceTimersByTime(20);
    c.emit('release_lantern', { text: 'đm cuộc đời', color: 'vang' });
    vi.advanceTimersByTime(20);
    expect(got.error).toEqual([expect.objectContaining({ code: 'content_rejected' })]);
    expect(got.lantern_released.filter((l) => l.text.includes('đm'))).toHaveLength(0);
    c.disconnect();
  });

  it('simulates bot activity over time', () => {
    const { c, got } = make();
    c.connect(HELLO);
    vi.advanceTimersByTime(20);
    vi.advanceTimersByTime(30 * 60_000);
    const bots = got.incense_lit.length + got.lantern_released.length + got.bell_rung.length;
    expect(bots).toBeGreaterThanOrEqual(15);
    expect(got.incense_lit.length).toBeGreaterThan(0);
    expect(got.lantern_released.length).toBeGreaterThan(0);
    expect(got.presence.length).toBeGreaterThanOrEqual(100);
    for (const p of got.presence) {
      expect(p.online).toBeGreaterThanOrEqual(5);
      expect(p.online).toBeLessThanOrEqual(41);
    }
    for (const l of got.lantern_released) expect(l.text.length).toBeLessThanOrEqual(120);
    c.disconnect();
  });

  it('speed multiplier accelerates activity', () => {
    const { c, got } = make({ speed: 10 });
    c.connect(HELLO);
    vi.advanceTimersByTime(3 * 60_000);
    expect(got.incense_lit.length + got.lantern_released.length + got.bell_rung.length).toBeGreaterThanOrEqual(15);
    c.disconnect();
  });

  it('report removes a lantern for this client', async () => {
    const { c, got } = make();
    c.connect(HELLO);
    vi.advanceTimersByTime(20);
    const before = await c.fetchLanterns();
    expect(before).toHaveLength(5);
    const target = before[0]!;
    c.emit('report', { type: 'lantern', id: target.id, reason: 'spam' });
    vi.advanceTimersByTime(20);
    expect(got.lantern_removed).toEqual([{ id: target.id }]);
    const after = await c.fetchLanterns();
    expect(after.some((l) => l.id === target.id)).toBe(false);
    c.disconnect();
  });

  it('block_user hides that user lanterns and incense', async () => {
    const { c, got } = make({ initialLanterns: 8 });
    c.connect(HELLO);
    vi.advanceTimersByTime(20);
    const before = await c.fetchLanterns();
    const uid = before[0]!.userId!;
    c.emit('block_user', { userId: uid });
    vi.advanceTimersByTime(20);
    expect(got.lantern_removed.length).toBeGreaterThanOrEqual(1);
    const after = await c.fetchLanterns();
    expect(after.some((l) => l.userId === uid)).toBe(false);
    vi.advanceTimersByTime(60 * 60_000);
    expect(got.incense_lit.some((i) => i.userId === uid)).toBe(false);
    expect(got.lantern_released.some((l) => l.userId === uid)).toBe(false);
    c.disconnect();
  });

  it('fetchLanterns respects since and 24h retention', async () => {
    const { c } = make({ initialLanterns: 10 });
    const all = await c.fetchLanterns();
    expect(all).toHaveLength(10);
    const mid = all[5]!.at;
    const newer = await c.fetchLanterns(mid);
    expect(newer.every((l) => l.at > mid)).toBe(true);
    vi.advanceTimersByTime(25 * 60 * 60_000);
    expect(await c.fetchLanterns()).toHaveLength(0);
  });

  it('disconnect stops all timers and events', () => {
    const { c, got } = make();
    c.connect(HELLO);
    vi.advanceTimersByTime(20);
    c.emit('light_incense', { count: 1 });
    c.disconnect();
    expect(c.connected).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    const n = got.incense_lit.length + got.presence.length + got.lantern_released.length;
    vi.advanceTimersByTime(60 * 60_000);
    expect(got.incense_lit.length + got.presence.length + got.lantern_released.length).toBe(n);
  });

  it('can reconnect after disconnect', () => {
    const { c, got } = make();
    c.connect(HELLO);
    vi.advanceTimersByTime(20);
    c.disconnect();
    c.connect(HELLO);
    vi.advanceTimersByTime(20);
    expect(got.welcome).toHaveLength(2);
    expect(got.welcome[1]!.userId).toBe(got.welcome[0]!.userId);
    c.disconnect();
  });
});

describe('createNetClient', () => {
  it('returns NullClient when offline', async () => {
    const c = createNetClient({ online: false, useMock: true });
    expect(c).toBeInstanceOf(NullClient);
    expect(c.connected).toBe(false);
    const s: string[] = [];
    c.onStatus((x) => s.push(x));
    c.connect(HELLO);
    expect(s).toEqual(['offline']);
    expect(await c.fetchLanterns()).toEqual([]);
  });
  it('returns MockServerClient when useMock', () => {
    const c = createNetClient({ online: true, useMock: true });
    expect(c).toBeInstanceOf(MockServerClient);
  });
});
