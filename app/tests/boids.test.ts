import { describe, expect, it } from 'vitest';
import { eatFood, seededRand, stepBoids, type Boid, type BoidOptions } from '../src/rituals/boids';

function makeFlock(n: number, rand: () => number, cx: number, cy: number, spread: number): Boid[] {
  const out: Boid[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: cx + (rand() - 0.5) * spread,
      y: cy + (rand() - 0.5) * spread,
      vx: (rand() - 0.5) * 60,
      vy: (rand() - 0.5) * 60,
    });
  }
  return out;
}

const base = (rand: () => number): Omit<BoidOptions, 'bounds' | 'targets'> => ({
  maxSpeed: 80,
  separation: 1.2,
  cohesion: 0.4,
  alignment: 0.5,
  seek: 1.5,
  wander: 0.3,
  rand,
});

describe('stepBoids', () => {
  it('keeps fish inside a rect', () => {
    const rand = seededRand(1);
    const bounds = { x: 0, y: 0, w: 400, h: 300 };
    const flock = makeFlock(12, rand, 200, 150, 300);
    for (let t = 0; t < 2000; t++) stepBoids(flock, 1 / 60, { ...base(rand), bounds, targets: [] });
    for (const b of flock) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(400);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(300);
      expect(Number.isFinite(b.vx) && Number.isFinite(b.vy)).toBe(true);
    }
  });

  it('keeps fish inside an ellipse, even with a far target', () => {
    const rand = seededRand(2);
    const bounds = { cx: 300, cy: 300, rx: 200, ry: 120 };
    const flock = makeFlock(10, rand, 300, 300, 100);
    for (let t = 0; t < 1500; t++) {
      stepBoids(flock, 1 / 60, { ...base(rand), bounds, targets: [{ x: 2000, y: 300 }] });
    }
    for (const b of flock) {
      const d = ((b.x - 300) / 200) ** 2 + ((b.y - 300) / 120) ** 2;
      expect(d).toBeLessThanOrEqual(1.0001);
    }
  });

  it('moves toward food', () => {
    const rand = seededRand(3);
    const bounds = { x: 0, y: 0, w: 800, h: 600 };
    const flock = makeFlock(8, rand, 150, 300, 60);
    const food = { x: 600, y: 300 };
    const dist = () => flock.reduce((s, b) => s + Math.hypot(b.x - food.x, b.y - food.y), 0) / flock.length;
    const before = dist();
    for (let t = 0; t < 240; t++) stepBoids(flock, 1 / 60, { ...base(rand), bounds, targets: [food] });
    expect(dist()).toBeLessThan(before * 0.5);
  });

  it('ignores zero/negative dt', () => {
    const flock = [{ x: 10, y: 10, vx: 5, vy: 0 }];
    stepBoids(flock, 0, { ...base(Math.random), bounds: { x: 0, y: 0, w: 100, h: 100 }, targets: [] });
    expect(flock[0]).toEqual({ x: 10, y: 10, vx: 5, vy: 0 });
  });
});

describe('eatFood', () => {
  it('returns indices of pellets within radius', () => {
    const flock = [{ x: 100, y: 100, vx: 0, vy: 0 }];
    const foods = [
      { x: 105, y: 100 },
      { x: 300, y: 300 },
      { x: 100, y: 110 },
    ];
    expect(eatFood(flock, foods, 12)).toEqual([0, 2]);
  });

  it('fish eventually eat food they seek', () => {
    const rand = seededRand(4);
    const bounds = { x: 0, y: 0, w: 600, h: 400 };
    const flock = makeFlock(6, rand, 100, 200, 40);
    let foods = [
      { x: 450, y: 150 },
      { x: 480, y: 260 },
    ];
    let eatenTotal = 0;
    for (let t = 0; t < 900 && foods.length > 0; t++) {
      stepBoids(flock, 1 / 60, { ...base(rand), bounds, targets: foods });
      const eaten = eatFood(flock, foods, 14);
      eatenTotal += eaten.length;
      foods = foods.filter((_, i) => !eaten.includes(i));
    }
    expect(eatenTotal).toBe(2);
  });
});
