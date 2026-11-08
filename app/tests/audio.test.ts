import { describe, it, expect } from 'vitest';
import {
  AudioEngine,
  audio,
  bellPartials,
  bellDecay,
  pentatonicScale,
  ambientMix,
  fillNoise,
  fillImpulse,
  clamp01,
  AMBIENT_AREAS,
} from '../src/audio/engine';
import { vibrate, setHapticsEnabled, isHapticsEnabled } from '../src/audio/haptics';

describe('bellPartials', () => {
  it('contains the expected inharmonic ratios', () => {
    const ratios = bellPartials(0.5).map((p) => p.ratio);
    for (const r of [0.5, 1, 1.19, 1.5, 2, 2.66, 3.2]) expect(ratios).toContain(r);
  });

  it('gains are normalised and positive', () => {
    for (const f of [0, 0.3, 1]) {
      const ps = bellPartials(f);
      const sum = ps.reduce((s, p) => s + p.gain, 0);
      expect(sum).toBeCloseTo(1, 6);
      for (const p of ps) expect(p.gain).toBeGreaterThan(0);
    }
  });

  it('decay scales with force in the 8..14 s range', () => {
    expect(bellDecay(0)).toBe(8);
    expect(bellDecay(1)).toBe(14);
    expect(bellDecay(5)).toBe(14);
    const soft = bellPartials(0);
    const hard = bellPartials(1);
    const maxSoft = Math.max(...soft.map((p) => p.decay));
    const maxHard = Math.max(...hard.map((p) => p.decay));
    expect(maxSoft).toBeGreaterThanOrEqual(8);
    expect(maxHard).toBeLessThanOrEqual(14);
    expect(maxHard).toBeGreaterThan(maxSoft);
  });

  it('harder strikes are brighter', () => {
    const top = (f: number) => bellPartials(f).find((p) => p.ratio === 3.2)!.gain;
    expect(top(1)).toBeGreaterThan(top(0));
  });

  it('has detuned pairs for beating on low partials', () => {
    const fund = bellPartials(0.5).find((p) => p.ratio === 1)!;
    expect(fund.beat).toBeGreaterThan(0);
  });

  it('handles NaN force', () => {
    expect(() => bellPartials(NaN)).not.toThrow();
    expect(bellPartials(NaN).every((p) => Number.isFinite(p.gain))).toBe(true);
  });
});

describe('pentatonicScale', () => {
  it('default is ngũ cung C D F G A over two octaves', () => {
    const s = pentatonicScale(261.63, 'default');
    expect(s).toHaveLength(11);
    expect(s[0]).toBeCloseTo(261.63, 2);
    expect(s[1]).toBeCloseTo(261.63 * Math.pow(2, 2 / 12), 2);
    expect(s[2]).toBeCloseTo(261.63 * Math.pow(2, 5 / 12), 2);
    expect(s[5]).toBeCloseTo(523.26, 2);
    expect(s[10]).toBeCloseTo(261.63 * 4, 2);
  });

  it('is ascending for every audible theme', () => {
    for (const th of ['default', 'dan-bau', 'sao-truc'] as const) {
      const s = pentatonicScale(200, th);
      expect(s.length).toBe(11);
      for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i - 1]);
    }
  });

  it('themes differ and tinh-lang is silent', () => {
    expect(pentatonicScale(200, 'dan-bau')).not.toEqual(pentatonicScale(200, 'default'));
    expect(pentatonicScale(200, 'tinh-lang')).toEqual([]);
    expect(pentatonicScale(0, 'default')).toEqual([]);
  });
});

describe('ambientMix', () => {
  const layers = ['wind', 'water', 'birds', 'insects', 'frogs', 'drone', 'reverb'] as const;

  it('values are within 0..1 for all areas', () => {
    for (const a of [...AMBIENT_AREAS, 'unknown']) {
      for (const n of [-1, 0, 0.5, 1, 2]) {
        const m = ambientMix(a, n);
        for (const k of layers) {
          expect(m[k]).toBeGreaterThanOrEqual(0);
          expect(m[k]).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('birds by day, insects and frogs by night', () => {
    const day = ambientMix('ho-sen', 0);
    const night = ambientMix('ho-sen', 1);
    expect(day.birds).toBeGreaterThan(0);
    expect(day.insects).toBe(0);
    expect(day.frogs).toBe(0);
    expect(night.birds).toBe(0);
    expect(night.insects).toBeGreaterThan(0);
    expect(night.frogs).toBeGreaterThan(0);
  });

  it('area character', () => {
    expect(ambientMix('bo-song', 0).water).toBeGreaterThan(ambientMix('ho-sen', 0).water);
    expect(ambientMix('ho-sen', 0).water).toBeGreaterThan(ambientMix('cong', 0).water);
    expect(ambientMix('cong', 0).wind).toBeGreaterThan(ambientMix('san', 0).wind);
    expect(ambientMix('lau-chuong', 0).wind).toBeGreaterThan(ambientMix('san', 0).wind);
    const cd = ambientMix('chinh-dien', 0);
    const td = ambientMix('thien-duong', 0);
    expect(cd.reverb).toBeGreaterThan(ambientMix('san', 0).reverb);
    expect(cd.birds).toBeLessThan(ambientMix('san', 0).birds);
    expect(td.wind + td.water + td.birds).toBeLessThan(0.15);
    expect(td.drone).toBeGreaterThan(0);
  });

  it('unknown area falls back to default', () => {
    expect(ambientMix('nowhere', 0.3)).toEqual(ambientMix('default', 0.3));
  });
});

describe('noise / impulse generators', () => {
  it('fillNoise produces normalised, loop-continuous data', () => {
    for (const c of ['white', 'pink', 'brown'] as const) {
      const d = new Float32Array(8000);
      fillNoise(d, c);
      let peak = 0;
      for (const v of d) peak = Math.max(peak, Math.abs(v));
      expect(peak).toBeCloseTo(1, 5);
      if (c === 'brown') {
        // wrap point should be smooth for brown noise
        expect(Math.abs(d[d.length - 1] - d[0])).toBeLessThan(0.2);
      }
    }
  });

  it('fillImpulse decays', () => {
    const d = new Float32Array(48000 * 3);
    fillImpulse(d, 48000, 3);
    const rms = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += d[i] * d[i];
      return Math.sqrt(s / (b - a));
    };
    expect(rms(1000, 5000)).toBeGreaterThan(rms(d.length - 4000, d.length) * 20);
  });

  it('clamp01', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
  });
});

describe('AudioEngine without AudioContext', () => {
  it('every method is a safe no-op before unlock', () => {
    const e = new AudioEngine();
    expect(() => {
      e.bell(1);
      e.bell(0.3, { distant: true });
      e.mo();
      e.mo(true);
      e.bowl();
      e.strike();
      e.bead();
      e.beadRound();
      e.sticksShake();
      e.stickDrop();
      e.splash();
      e.splash(1);
      e.uiTap();
      e.uiOpen();
      e.reward();
      e.setVolumes({ master: 0.5, sfx: 2, ambient: -1, music: 0.2 });
      e.setMuted(true);
      e.setMuted(false);
      e.setMusicTheme('dan-bau');
      e.setAmbient('ho-sen', 0.7);
      e.stopAmbient();
      e.unlock();
      e.unlock();
      e.bell(0.5);
      e.setAmbient('cong', 0);
      e.stopAmbient();
    }).not.toThrow();
    expect(e.isUnlocked).toBe(false);
    expect(e.getVolumes()).toEqual({ master: 0.5, sfx: 1, ambient: 0, music: 0.2 });
    expect(e.getMusicTheme()).toBe('dan-bau');
  });

  it('exports a singleton', () => {
    expect(audio).toBeInstanceOf(AudioEngine);
  });
});

describe('haptics', () => {
  it('never throws without navigator.vibrate', () => {
    expect(() => vibrate(20)).not.toThrow();
    expect(() => vibrate([10, 40, 10])).not.toThrow();
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);
    expect(() => vibrate(20)).not.toThrow();
    setHapticsEnabled(true);
    expect(isHapticsEnabled()).toBe(true);
  });
});
