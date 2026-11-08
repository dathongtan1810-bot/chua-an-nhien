import { describe, expect, it } from 'vitest';
import {
  charCount,
  clampChars,
  depthOf,
  driftSpeed,
  feedCounter,
  highPass,
  insideEllipse,
  lanternScale,
  laneY,
  pondEllipse,
  scatterPellets,
  shakeDetector,
  visibleIds,
  wrapX,
} from '../src/rituals/pure-b';
import { seededRand } from '../src/rituals/boids';

describe('shakeDetector', () => {
  it('fires after ~1.2 s of strong shaking', () => {
    const d = shakeDetector(12);
    let t = 0;
    let firedAt = -1;
    for (let i = 0; i < 200; i++) {
      t += 50;
      const s = i % 2 ? 15 : -15;
      if (d({ x: s, y: 0, z: 0 }, t) && firedAt < 0) firedAt = t;
    }
    expect(firedAt).toBeGreaterThan(900);
    expect(firedAt).toBeLessThanOrEqual(1300);
    expect(d.progress()).toBe(1);
  });

  it('never fires while calm', () => {
    const d = shakeDetector(12);
    for (let i = 0; i < 400; i++) expect(d({ x: 1, y: 2, z: 0.5 }, i * 16)).toBe(false);
    expect(d.progress()).toBe(0);
  });

  it('caps long gaps between samples and decays when calm', () => {
    const d = shakeDetector(10);
    d({ x: 20, y: 0, z: 0 }, 0);
    d({ x: 20, y: 0, z: 0 }, 10_000); // gap capped to 100 ms
    expect(d.progress()).toBeLessThan(0.2);
    const p = d.progress();
    for (let i = 1; i <= 10; i++) d({ x: 0, y: 0, z: 0 }, 10_000 + i * 50);
    expect(d.progress()).toBeLessThan(p);
  });

  it('reset clears the state', () => {
    const d = shakeDetector(5);
    for (let i = 0; i < 100; i++) d({ x: 10, y: 0, z: 0 }, i * 50);
    expect(d.progress()).toBe(1);
    d.reset();
    expect(d.progress()).toBe(0);
    expect(d({ x: 0, y: 0, z: 0 }, 0)).toBe(false);
  });

  it('highPass removes constant gravity', () => {
    const hp = highPass();
    let out = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 100; i++) out = hp({ x: 0, y: 0, z: 9.81 });
    expect(Math.abs(out.z)).toBeLessThan(0.01);
  });
});

describe('river helpers', () => {
  it('depth / scale / speed grow toward the bottom', () => {
    expect(depthOf(100, 100, 300)).toBe(0);
    expect(depthOf(300, 100, 300)).toBe(1);
    expect(depthOf(500, 100, 300)).toBe(1);
    expect(lanternScale(0)).toBeLessThan(lanternScale(1));
    expect(driftSpeed(0)).toBeLessThan(driftSpeed(1));
    expect(driftSpeed(1, true)).toBeLessThan(driftSpeed(1));
  });

  it('lanes stay inside the band', () => {
    for (let i = 0; i < 5; i++) {
      const y = laneY(i, 5, 600, 800);
      expect(y).toBeGreaterThanOrEqual(600);
      expect(y).toBeLessThanOrEqual(800);
    }
    expect(laneY(0, 5, 600, 800)).toBeLessThan(laneY(4, 5, 600, 800));
  });

  it('wraps around the world', () => {
    expect(wrapX(100, 1000)).toBe(100);
    expect(wrapX(1041, 1000)).toBeLessThan(0);
    expect(wrapX(-41, 1000)).toBeGreaterThan(1000);
  });

  it('visibleIds keeps mine and newest', () => {
    const items = [
      { id: 'a', at: 1, mine: true },
      { id: 'b', at: 5, mine: false },
      { id: 'c', at: 3, mine: false },
      { id: 'd', at: 4, mine: false },
    ];
    expect([...visibleIds(items, 2)].sort()).toEqual(['a', 'b']);
    expect(visibleIds(items, 10).size).toBe(4);
  });
});

describe('pond helpers', () => {
  const e = pondEllipse({ x: 300, y: 600, r: 200 });

  it('ellipse containment', () => {
    expect(insideEllipse(e, 300, 600)).toBe(true);
    expect(insideEllipse(e, 300, 600 + 200)).toBe(false);
    expect(insideEllipse(e, 490, 600)).toBe(true);
  });

  it('scattered pellets stay inside the pond', () => {
    const rand = seededRand(3);
    const ps = scatterPellets(e, 495, 600, 8, 40, rand);
    expect(ps).toHaveLength(8);
    for (const p of ps) expect(insideEllipse(e, p.x, p.y, 0.86)).toBe(true);
  });

  it('feedCounter grants one completion per 5 pellets, capped', () => {
    const c = feedCounter(5, 2);
    expect(c.eat(4)).toBe(0);
    expect(c.eat(1)).toBe(1);
    expect(c.eat(7)).toBe(1);
    expect(c.eat(50)).toBe(0);
    expect(c.completions()).toBe(2);
  });
});

describe('text helpers', () => {
  it('counts code points', () => {
    expect(charCount('Bình an')).toBe(7);
    expect(charCount('🙏🙏')).toBe(2);
    expect(clampChars('abcdef', 3)).toBe('abc');
    expect(clampChars('🙏🙏🙏', 2)).toBe('🙏🙏');
  });
});
