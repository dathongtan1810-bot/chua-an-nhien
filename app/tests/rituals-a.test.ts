import { describe, expect, it } from 'vitest';
import {
  advanceBead,
  bellForce,
  breathPhase,
  formatMmSs,
  judgeHold,
  wholeMinutes,
} from '../src/rituals/pure-a';

describe('bellForce', () => {
  it('scales with pull distance and clamps', () => {
    expect(bellForce(80, 160)).toBeCloseTo(0.5);
    expect(bellForce(160, 160)).toBe(1);
    expect(bellForce(400, 160)).toBe(1);
  });
  it('has a minimum of 0.15', () => {
    expect(bellForce(0, 160)).toBe(0.15);
    expect(bellForce(5, 160)).toBe(0.15);
    expect(bellForce(-20, 160)).toBe(0.15);
    expect(bellForce(50, 0)).toBe(0.15);
    expect(bellForce(NaN, 160)).toBe(0.15);
  });
});

describe('advanceBead', () => {
  it('advances one bead', () => {
    expect(advanceBead({ n: 0, round: 1 })).toEqual({ n: 1, round: 1, completedRound: false });
    expect(advanceBead({ n: 50, round: 3 })).toEqual({ n: 51, round: 3, completedRound: false });
  });
  it('completes a round at 108', () => {
    expect(advanceBead({ n: 107, round: 1 })).toEqual({ n: 0, round: 2, completedRound: true });
  });
  it('108 advances from zero make exactly one round', () => {
    let s = { n: 0, round: 1 };
    let rounds = 0;
    for (let i = 0; i < 108; i++) {
      const r = advanceBead(s);
      if (r.completedRound) rounds++;
      s = { n: r.n, round: r.round };
    }
    expect(rounds).toBe(1);
    expect(s).toEqual({ n: 0, round: 2 });
  });
});

describe('breathPhase', () => {
  it('follows 4-4-6', () => {
    expect(breathPhase(0).phase).toBe('in');
    expect(breathPhase(0).scale).toBeCloseTo(0.6);
    expect(breathPhase(2000).progress).toBeCloseTo(0.5);
    expect(breathPhase(3999).phase).toBe('in');
    expect(breathPhase(4000).phase).toBe('hold');
    expect(breathPhase(6000).scale).toBe(1);
    expect(breathPhase(8000).phase).toBe('out');
    expect(breathPhase(8000).scale).toBeCloseTo(1);
    expect(breathPhase(11000).progress).toBeCloseTo(0.5);
    expect(breathPhase(13999).phase).toBe('out');
    expect(breathPhase(13999).scale).toBeCloseTo(0.6, 2);
  });
  it('repeats every 14 s', () => {
    expect(breathPhase(14000 + 1000)).toEqual(breathPhase(1000));
    expect(breathPhase(14000 * 5 + 9000)).toEqual(breathPhase(9000));
  });
  it('grows monotonically while inhaling', () => {
    let prev = 0;
    for (let t = 0; t < 4000; t += 250) {
      const s = breathPhase(t).scale;
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});

describe('meditation helpers', () => {
  it('counts whole minutes', () => {
    expect(wholeMinutes(59999)).toBe(0);
    expect(wholeMinutes(60000)).toBe(1);
    expect(wholeMinutes(185000)).toBe(3);
    expect(wholeMinutes(-5)).toBe(0);
  });
  it('formats m:ss', () => {
    expect(formatMmSs(300000)).toBe('5:00');
    expect(formatMmSs(61500)).toBe('1:02');
    expect(formatMmSs(-1)).toBe('0:00');
  });
});

describe('judgeHold', () => {
  const G = 1000;
  const GROW = 2500;
  it('accepts a hold covering the grow phase', () => {
    expect(judgeHold(G, G + GROW, G, GROW)).toBe(true);
    expect(judgeHold(G - 300, G + GROW + 1500, G, GROW)).toBe(true);
  });
  it('is forgiving: half of the grow phase is enough', () => {
    expect(judgeHold(G + 1250, G + GROW + 800, G, GROW)).toBe(true);
    expect(judgeHold(G, G + 1250, G, GROW)).toBe(true);
  });
  it('rejects too-short or misplaced holds', () => {
    expect(judgeHold(G + 1300, G + GROW, G, GROW)).toBe(false);
    expect(judgeHold(G, G + 400, G, GROW)).toBe(false);
    expect(judgeHold(G + GROW, G + GROW + 2500, G, GROW)).toBe(false);
    expect(judgeHold(G + 500, G + 400, G, GROW)).toBe(false);
    expect(judgeHold(G, G + GROW, G, 0)).toBe(false);
  });
});
