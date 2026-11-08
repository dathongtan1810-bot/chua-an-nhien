import { describe, expect, it } from 'vitest';
import { canAskToday, fnv1a, interpretationFor, mulberry32, pickFortune, stickNumber, TOPICS, topicLabel } from '../src/logic/fortune';
import type { QueXam } from '../src/data/content';
import sample from '../src/data/sample-que-xam.json';

const list = sample as QueXam[];

describe('hash / prng', () => {
  it('fnv1a matches known vectors', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
  });
  it('mulberry32 is deterministic and in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('pickFortune', () => {
  it('is deterministic per (device, topic, day)', () => {
    const opts = { deviceId: 'dev-1', topic: 'hoc-tap', dateKey: '2026-11-05' };
    const a = pickFortune(list, opts);
    expect(pickFortune(list, opts)).toBe(a);
  });
  it('varies across days and devices', () => {
    const seen = new Set<number>();
    for (let d = 1; d <= 28; d++) {
      seen.add(pickFortune(list, { deviceId: 'dev-1', topic: 'binh-an', dateKey: `2026-02-${String(d).padStart(2, '0')}` }).id);
      seen.add(pickFortune(list, { deviceId: `dev-${d}`, topic: 'binh-an', dateKey: '2026-02-01' }).id);
    }
    expect(seen.size).toBeGreaterThan(10);
  });
  it('prefers sticks covering the topic and honours rand', () => {
    const custom: QueXam[] = [
      { ...list[0], id: 1, chuDe: ['binh-an'] },
      { ...list[1], id: 2, chuDe: ['hoc-tap'] },
      { ...list[2], id: 3, chuDe: ['hoc-tap'] },
    ];
    const base = { deviceId: 'x', dateKey: '2026-01-01' };
    expect(pickFortune(custom, { ...base, topic: 'binh-an', rand: () => 0.99 }).id).toBe(1);
    expect(pickFortune(custom, { ...base, topic: 'hoc-tap', rand: () => 0 }).id).toBe(2);
    expect(pickFortune(custom, { ...base, topic: 'hoc-tap', rand: () => 0.999 }).id).toBe(3);
    expect(pickFortune(custom, { ...base, topic: 'unknown', rand: () => 0.5 }).id).toBe(2);
    expect(() => pickFortune([], { ...base, topic: 'x' })).toThrow();
  });
});

describe('helpers', () => {
  it('canAskToday allows one per topic per day', () => {
    const h = [{ topic: 'hoc-tap', dateKey: '2026-11-05' }];
    expect(canAskToday(h, 'hoc-tap', '2026-11-05')).toBe(false);
    expect(canAskToday(h, 'binh-an', '2026-11-05')).toBe(true);
    expect(canAskToday(h, 'hoc-tap', '2026-11-06')).toBe(true);
    expect(canAskToday([], 'hoc-tap', '2026-11-05')).toBe(true);
  });
  it('labels, stick number, interpretation', () => {
    expect(TOPICS).toHaveLength(6);
    expect(topicLabel('suc-khoe', 'vi')).toBe('Sức khỏe');
    expect(topicLabel('suc-khoe', 'en')).toBe('Health');
    expect(stickNumber(list[4])).toBe(5);
    expect(interpretationFor(list[0], 'gia-dao')).toBe(list[0].loiGiaiTheoChuDe['gia-dao']);
    expect(interpretationFor(list[0], 'nope')).toBe(list[0].loiGiai);
  });
});
