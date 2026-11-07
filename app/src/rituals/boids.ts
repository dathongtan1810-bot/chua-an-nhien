/**
 * Pure, framework-free flocking for koi fish in the lotus pond.
 * Mutates boids in place. Units: px and seconds.
 */

export interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface RectBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EllipseBounds {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export type BoidBounds = RectBounds | EllipseBounds;

export interface BoidOptions {
  bounds: BoidBounds;
  /** Food pellets the fish swim toward. */
  targets: Point[];
  /** Max speed in px/s. */
  maxSpeed: number;
  /** Separation weight (avoid crowding). */
  separation: number;
  /** Cohesion weight (move toward neighbours' centre). */
  cohesion: number;
  /** Alignment weight (match neighbours' heading). */
  alignment: number;
  /** Seek weight (move toward nearest food). */
  seek: number;
  /** Wander weight (random drift). */
  wander: number;
  /** Random source in [0,1). Defaults to Math.random. */
  rand?: () => number;
  /** Neighbour radius in px (default 70). */
  neighborRadius?: number;
  /** Desired minimum spacing in px (default 26). */
  separationRadius?: number;
  /** Minimum cruise speed in px/s (default maxSpeed * 0.25). */
  minSpeed?: number;
}

function isEllipse(b: BoidBounds): b is EllipseBounds {
  return (b as EllipseBounds).rx !== undefined;
}

/** Steering vector pushing a point back inside the bounds (0 when well inside). */
function boundsForce(b: BoidBounds, x: number, y: number): Point {
  if (isEllipse(b)) {
    const nx = (x - b.cx) / b.rx;
    const ny = (y - b.cy) / b.ry;
    const d = Math.sqrt(nx * nx + ny * ny);
    const margin = 0.8;
    if (d <= margin) return { x: 0, y: 0 };
    const k = (d - margin) / (1 - margin);
    const len = d || 1;
    return { x: (-nx / len) * k, y: (-ny / len) * k };
  }
  const mx = Math.min(60, b.w * 0.2);
  const my = Math.min(60, b.h * 0.2);
  let fx = 0;
  let fy = 0;
  if (x < b.x + mx) fx = (b.x + mx - x) / mx;
  else if (x > b.x + b.w - mx) fx = -(x - (b.x + b.w - mx)) / mx;
  if (y < b.y + my) fy = (b.y + my - y) / my;
  else if (y > b.y + b.h - my) fy = -(y - (b.y + b.h - my)) / my;
  return { x: fx, y: fy };
}

/** Hard clamp a boid inside bounds (safety net after integration). */
function clampInside(b: BoidBounds, boid: Boid): void {
  if (isEllipse(b)) {
    const nx = (boid.x - b.cx) / b.rx;
    const ny = (boid.y - b.cy) / b.ry;
    const d = Math.sqrt(nx * nx + ny * ny);
    if (d > 0.98) {
      const s = 0.98 / d;
      boid.x = b.cx + nx * s * b.rx;
      boid.y = b.cy + ny * s * b.ry;
      // reflect the outward component of velocity
      const ox = nx / d;
      const oy = ny / d;
      const dot = boid.vx * ox + boid.vy * oy;
      if (dot > 0) {
        boid.vx -= 1.5 * dot * ox;
        boid.vy -= 1.5 * dot * oy;
      }
    }
    return;
  }
  if (boid.x < b.x) {
    boid.x = b.x;
    boid.vx = Math.abs(boid.vx) * 0.5;
  } else if (boid.x > b.x + b.w) {
    boid.x = b.x + b.w;
    boid.vx = -Math.abs(boid.vx) * 0.5;
  }
  if (boid.y < b.y) {
    boid.y = b.y;
    boid.vy = Math.abs(boid.vy) * 0.5;
  } else if (boid.y > b.y + b.h) {
    boid.y = b.y + b.h;
    boid.vy = -Math.abs(boid.vy) * 0.5;
  }
}

/** Advance the flock by dt seconds (clamped to 0.1 s to stay stable). */
export function stepBoids(boids: Boid[], dt: number, opts: BoidOptions): void {
  if (dt <= 0 || boids.length === 0) return;
  const step = Math.min(dt, 0.1);
  const rand = opts.rand ?? Math.random;
  const nr = opts.neighborRadius ?? 70;
  const sr = opts.separationRadius ?? 26;
  const nr2 = nr * nr;
  const sr2 = sr * sr;
  const maxSpeed = opts.maxSpeed;
  const minSpeed = opts.minSpeed ?? maxSpeed * 0.25;
  const n = boids.length;
  const ax = new Float64Array(n);
  const ay = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const b = boids[i];
    let cx = 0;
    let cy = 0;
    let avx = 0;
    let avy = 0;
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const o = boids[j];
      const dx = o.x - b.x;
      const dy = o.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nr2) {
        cx += o.x;
        cy += o.y;
        avx += o.vx;
        avy += o.vy;
        count++;
        if (d2 < sr2 && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (sr - d) / sr;
          sx -= (dx / d) * push;
          sy -= (dy / d) * push;
        }
      }
    }
    let fx = 0;
    let fy = 0;
    if (count > 0) {
      cx /= count;
      cy /= count;
      fx += ((cx - b.x) / nr) * opts.cohesion;
      fy += ((cy - b.y) / nr) * opts.cohesion;
      avx /= count;
      avy /= count;
      fx += ((avx - b.vx) / maxSpeed) * opts.alignment;
      fy += ((avy - b.vy) / maxSpeed) * opts.alignment;
    }
    fx += sx * opts.separation;
    fy += sy * opts.separation;

    // seek nearest food
    if (opts.targets.length > 0 && opts.seek > 0) {
      let best = -1;
      let bestD = Infinity;
      for (let k = 0; k < opts.targets.length; k++) {
        const t = opts.targets[k];
        const d2 = (t.x - b.x) ** 2 + (t.y - b.y) ** 2;
        if (d2 < bestD) {
          bestD = d2;
          best = k;
        }
      }
      if (best >= 0) {
        const t = opts.targets[best];
        const d = Math.sqrt(bestD) || 1;
        // desired velocity toward food, slowing on arrival
        const desired = Math.min(maxSpeed, d * 2);
        fx += (((t.x - b.x) / d) * desired - b.vx) / maxSpeed * opts.seek;
        fy += (((t.y - b.y) / d) * desired - b.vy) / maxSpeed * opts.seek;
      }
    }

    // wander
    if (opts.wander > 0) {
      const a = rand() * Math.PI * 2;
      fx += Math.cos(a) * opts.wander;
      fy += Math.sin(a) * opts.wander;
    }

    const bf = boundsForce(opts.bounds, b.x, b.y);
    fx += bf.x * 4;
    fy += bf.y * 4;

    ax[i] = fx * maxSpeed * 2;
    ay[i] = fy * maxSpeed * 2;
  }

  for (let i = 0; i < n; i++) {
    const b = boids[i];
    b.vx += ax[i] * step;
    b.vy += ay[i] * step;
    const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > maxSpeed) {
      b.vx = (b.vx / sp) * maxSpeed;
      b.vy = (b.vy / sp) * maxSpeed;
    } else if (sp < minSpeed) {
      if (sp < 1e-6) {
        const a = rand() * Math.PI * 2;
        b.vx = Math.cos(a) * minSpeed;
        b.vy = Math.sin(a) * minSpeed;
      } else {
        b.vx = (b.vx / sp) * minSpeed;
        b.vy = (b.vy / sp) * minSpeed;
      }
    }
    b.x += b.vx * step;
    b.y += b.vy * step;
    clampInside(opts.bounds, b);
  }
}

/**
 * Fish eat pellets within `radius`. Returns indices (ascending) of eaten foods;
 * the caller removes them from its list.
 */
export function eatFood(boids: Boid[], foods: Point[], radius: number): number[] {
  const r2 = radius * radius;
  const eaten: number[] = [];
  for (let k = 0; k < foods.length; k++) {
    const f = foods[k];
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      if ((b.x - f.x) ** 2 + (b.y - f.y) ** 2 <= r2) {
        eaten.push(k);
        break;
      }
    }
  }
  return eaten;
}

/** Deterministic PRNG (mulberry32) handy for tests and stable scenes. */
export function seededRand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
