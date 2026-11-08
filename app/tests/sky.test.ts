import { describe, expect, it } from 'vitest';
import { celestialPosition, nightFactor, skyColors } from '../src/art/sky';

const lum = (c: number) => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);

describe('nightFactor', () => {
  it('is 1 at night and 0 at day', () => {
    expect(nightFactor(0)).toBe(1);
    expect(nightFactor(3)).toBe(1);
    expect(nightFactor(21)).toBe(1);
    expect(nightFactor(10)).toBe(0);
    expect(nightFactor(15)).toBe(0);
  });
  it('transitions smoothly at dawn and dusk', () => {
    const dawn = nightFactor(6);
    const dusk = nightFactor(18.25);
    expect(dawn).toBeGreaterThan(0.2);
    expect(dawn).toBeLessThan(0.8);
    expect(dusk).toBeGreaterThan(0.2);
    expect(dusk).toBeLessThan(0.8);
    for (let h = 0; h < 24; h += 0.05) {
      expect(Math.abs(nightFactor(h + 0.05) - nightFactor(h))).toBeLessThan(0.06);
    }
  });
  it('is monotonic across dusk and wraps hours', () => {
    let prev = -1;
    for (let h = 16; h <= 20; h += 0.1) {
      const n = nightFactor(h);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(nightFactor(24 + 10)).toBe(0);
    expect(nightFactor(-3)).toBe(1);
  });
});

describe('skyColors', () => {
  it('returns valid 24-bit colours for every hour', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const c = skyColors(h);
      for (const v of [c.top, c.mid, c.bottom]) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(0xffffff);
      }
    }
  });
  it('day is brighter than night and bluish', () => {
    const day = skyColors(11);
    const night = skyColors(23);
    expect(lum(day.top)).toBeGreaterThan(lum(night.top) + 60);
    expect(day.top & 255).toBeGreaterThan((day.top >> 16) & 255);
  });
  it('sunset horizon is warm (red > blue)', () => {
    const s = skyColors(18.2);
    expect((s.bottom >> 16) & 255).toBeGreaterThan(s.bottom & 255);
  });
  it('is continuous at midnight', () => {
    expect(skyColors(0)).toEqual(skyColors(24));
  });
});

describe('celestialPosition', () => {
  it('sun by day, moon by night, sun highest at midday', () => {
    expect(celestialPosition(12).kind).toBe('sun');
    expect(celestialPosition(22).kind).toBe('moon');
    expect(celestialPosition(12).y).toBeLessThan(celestialPosition(8).y);
  });
});
