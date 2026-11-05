/**
 * Pure, framework-free helpers for the bell, beads, meditation and bow rituals.
 * No Phaser / DOM imports so they run in node tests.
 */

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------- bell

export const BELL_MIN_FORCE = 0.15;

/** Strike force 0.15..1 from how far the log was pulled back. */
export function bellForce(pullPx: number, maxPx: number): number {
  if (!Number.isFinite(pullPx) || !Number.isFinite(maxPx) || maxPx <= 0) return BELL_MIN_FORCE;
  return clamp(pullPx / maxPx, BELL_MIN_FORCE, 1);
}

// ---------------------------------------------------------------- beads

export const BEADS_PER_ROUND = 108;

export interface BeadState {
  /** Beads counted in the current round, 0..107. */
  n: number;
  /** Current round number, starts at 1. */
  round: number;
}

/**
 * Move one bead. When the 108th bead is reached the round is completed:
 * `n` wraps to 0 and `round` increments.
 */
export function advanceBead(state: BeadState): BeadState & { completedRound: boolean } {
  const n = Math.max(0, Math.floor(state.n)) + 1;
  const round = Math.max(1, Math.floor(state.round));
  if (n >= BEADS_PER_ROUND) return { n: 0, round: round + 1, completedRound: true };
  return { n, round, completedRound: false };
}

// ---------------------------------------------------------------- meditation

export const BREATH_IN_MS = 4000;
export const BREATH_HOLD_MS = 4000;
export const BREATH_OUT_MS = 6000;
export const BREATH_CYCLE_MS = BREATH_IN_MS + BREATH_HOLD_MS + BREATH_OUT_MS;
export const BREATH_MIN_SCALE = 0.6;
export const BREATH_MAX_SCALE = 1;

export type BreathPhaseName = 'in' | 'hold' | 'out';

const easeInOut = (p: number): number => (1 - Math.cos(Math.PI * clamp(p, 0, 1))) / 2;

/** 4-4-6 breathing: inhale 4 s (grow), hold 4 s, exhale 6 s (shrink). Cycle 14 s. */
export function breathPhase(elapsedMs: number): { phase: BreathPhaseName; progress: number; scale: number } {
  const e = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const t = ((e % BREATH_CYCLE_MS) + BREATH_CYCLE_MS) % BREATH_CYCLE_MS;
  const span = BREATH_MAX_SCALE - BREATH_MIN_SCALE;
  if (t < BREATH_IN_MS) {
    const progress = t / BREATH_IN_MS;
    return { phase: 'in', progress, scale: BREATH_MIN_SCALE + span * easeInOut(progress) };
  }
  if (t < BREATH_IN_MS + BREATH_HOLD_MS) {
    return { phase: 'hold', progress: (t - BREATH_IN_MS) / BREATH_HOLD_MS, scale: BREATH_MAX_SCALE };
  }
  const progress = (t - BREATH_IN_MS - BREATH_HOLD_MS) / BREATH_OUT_MS;
  return { phase: 'out', progress, scale: BREATH_MAX_SCALE - span * easeInOut(progress) };
}

/** Whole minutes in an elapsed duration. */
export function wholeMinutes(ms: number): number {
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 60000) : 0;
}

/** "m:ss" formatting for the remaining time. */
export function formatMmSs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- bow

/**
 * Forgiving judgement of one bow: the press-and-hold must cover at least
 * half of the grow phase [growStart, growStart + growMs].
 */
export function judgeHold(holdStartMs: number, holdEndMs: number, growStartMs: number, growMs: number): boolean {
  if (!(growMs > 0) || !(holdEndMs > holdStartMs)) return false;
  const overlap = Math.min(holdEndMs, growStartMs + growMs) - Math.max(holdStartMs, growStartMs);
  return overlap >= growMs * 0.5;
}
