/**
 * Pure helpers for the fortune / lantern / fish rituals (no Phaser, no DOM) — unit tested.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Shaking time (ms) needed before a stick falls. */
export const SHAKE_NEEDED_MS = 1200;

export type ShakeDetector = ((accel: Vec3, tMs: number) => boolean) & {
  /** 0..1 progress toward a completed shake. */
  progress(): number;
  reset(): void;
};

/**
 * Accumulates "shake energy": every sample whose acceleration magnitude is ≥ `threshold`
 * adds the elapsed time (capped at 100 ms per sample, scaled up to ×1.5 for strong shakes);
 * calm samples slowly drain it. Returns true once ≥ 1.2 s-equivalent of shaking is reached
 * (and keeps returning true until reset()).
 *
 * Pass acceleration WITHOUT gravity (DeviceMotionEvent.acceleration) or run
 * `accelerationIncludingGravity` through `highPass()` first.
 */
export function shakeDetector(threshold: number, neededMs = SHAKE_NEEDED_MS): ShakeDetector {
  let energy = 0;
  let lastT: number | null = null;
  let done = false;
  const fn = ((accel: Vec3, tMs: number): boolean => {
    if (done) return true;
    const dt = lastT === null ? 16 : Math.max(0, Math.min(100, tMs - lastT));
    lastT = tMs;
    const mag = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
    if (Number.isFinite(mag) && mag >= threshold) {
      energy += dt * Math.min(1.5, mag / threshold);
    } else {
      energy = Math.max(0, energy - dt * 0.35);
    }
    if (energy >= neededMs) done = true;
    return done;
  }) as ShakeDetector;
  fn.progress = () => (done ? 1 : Math.min(1, energy / neededMs));
  fn.reset = () => {
    energy = 0;
    lastT = null;
    done = false;
  };
  return fn;
}

/** High-pass filter that strips gravity from accelerationIncludingGravity samples. */
export function highPass(alpha = 0.8): (a: Vec3) => Vec3 {
  let g: Vec3 | null = null;
  return (a: Vec3) => {
    if (!g) {
      g = { ...a };
      return { x: 0, y: 0, z: 0 };
    }
    g = { x: alpha * g.x + (1 - alpha) * a.x, y: alpha * g.y + (1 - alpha) * a.y, z: alpha * g.z + (1 - alpha) * a.z };
    return { x: a.x - g.x, y: a.y - g.y, z: a.z - g.z };
  };
}

// ------------------------------------------------------------------ river

/**
 * Perspective factor for a y inside the river band: 0 at the top (far), 1 at the bottom (near).
 */
export function depthOf(y: number, top: number, bottom: number): number {
  if (bottom <= top) return 1;
  return Math.max(0, Math.min(1, (y - top) / (bottom - top)));
}

/** Lantern scale for a depth (farther = smaller). */
export function lanternScale(depth: number): number {
  return 0.55 + 0.45 * depth;
}

/** Drift speed px/s for a depth (farther = slower). */
export function driftSpeed(depth: number, reducedMotion = false): number {
  const s = 6 + 10 * depth;
  return reducedMotion ? s * 0.5 : s;
}

/** Y of lane `i` of `n` evenly spread inside the band (with a small margin). */
export function laneY(i: number, n: number, top: number, bottom: number): number {
  const lanes = Math.max(1, n);
  const margin = (bottom - top) * 0.1;
  const span = bottom - top - margin * 2;
  if (lanes === 1) return (top + bottom) / 2;
  return top + margin + (span * (((i % lanes) + lanes) % lanes)) / (lanes - 1);
}

/** Wraps x so that items leaving at the right (beyond pad) re-enter at the left. */
export function wrapX(x: number, worldWidth: number, pad = 40): number {
  const span = worldWidth + pad * 2;
  if (x > worldWidth + pad) return x - span;
  if (x < -pad) return x + span;
  return x;
}

/**
 * Which items stay visible under a cap: always keeps `mine` ones, then newest first.
 * Returns the set of ids to SHOW.
 */
export function visibleIds(items: { id: string; at: number; mine: boolean }[], cap: number): Set<string> {
  const sorted = [...items].sort((a, b) => Number(b.mine) - Number(a.mine) || b.at - a.at);
  return new Set(sorted.slice(0, Math.max(0, cap)).map((i) => i.id));
}

// ------------------------------------------------------------------ fish / pond

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** Pond hotspot {x,y,r} → a flattened ellipse (perspective water surface). */
export function pondEllipse(p: { x: number; y: number; r: number }, flatten = 0.55): Ellipse {
  return { cx: p.x, cy: p.y, rx: p.r, ry: p.r * flatten };
}

export function insideEllipse(e: Ellipse, x: number, y: number, margin = 1): boolean {
  const nx = (x - e.cx) / e.rx;
  const ny = (y - e.cy) / e.ry;
  return nx * nx + ny * ny <= margin * margin;
}

/**
 * Scatter `count` pellets around (x,y) within `spread` px, clamped inside the ellipse (85%).
 */
export function scatterPellets(
  e: Ellipse,
  x: number,
  y: number,
  count: number,
  spread: number,
  rand: () => number = Math.random,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * spread;
    let px = x + Math.cos(a) * r;
    let py = y + Math.sin(a) * r * 0.6;
    const nx = (px - e.cx) / e.rx;
    const ny = (py - e.cy) / e.ry;
    const d = Math.sqrt(nx * nx + ny * ny);
    if (d > 0.85) {
      px = e.cx + (nx / d) * 0.85 * e.rx;
      py = e.cy + (ny / d) * 0.85 * e.ry;
    }
    out.push({ x: px, y: py });
  }
  return out;
}

/** Tracks eaten pellets → number of new completions (every `per` pellets, at most `max`). */
export function feedCounter(per = 5, max = 3): { eat(n: number): number; eaten(): number; completions(): number } {
  let eaten = 0;
  let done = 0;
  return {
    eat(n: number): number {
      eaten += Math.max(0, n);
      const target = Math.min(max, Math.floor(eaten / per));
      const fresh = Math.max(0, target - done);
      done += fresh;
      return fresh;
    },
    eaten: () => eaten,
    completions: () => done,
  };
}

// ------------------------------------------------------------------ text

/** Character count by code points (emoji-safe), matching the filter's length rule. */
export function charCount(s: string): number {
  return [...(s ?? '')].length;
}

/** Truncates to `max` code points. */
export function clampChars(s: string, max: number): string {
  const chars = [...(s ?? '')];
  return chars.length <= max ? s : chars.slice(0, max).join('');
}
