/**
 * Chùa An Nhiên — 100% synthesized audio engine (Web Audio API).
 * No audio files are loaded: every sound is generated in code.
 *
 * All play methods are safe no-ops before `unlock()` or when no AudioContext
 * exists (e.g. Node tests / SSR).
 */

export type MusicTheme = 'default' | 'dan-bau' | 'sao-truc' | 'tinh-lang';

export interface VolumeSettings {
  master: number;
  sfx: number;
  ambient: number;
  music: number;
}

export interface BellPartial {
  /** Frequency ratio relative to the strike fundamental. */
  ratio: number;
  /** Normalised peak gain (all partials sum to 1). */
  gain: number;
  /** Decay time in seconds (to near silence). */
  decay: number;
  /** Beating width in Hz (0 = single oscillator, >0 = detuned pair). */
  beat: number;
}

export interface AmbientMix {
  wind: number;
  water: number;
  birds: number;
  insects: number;
  frogs: number;
  drone: number;
  /** Amount of ambience sent to the shared reverb. */
  reverb: number;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested, no Web Audio dependency)
// ---------------------------------------------------------------------------

export const clamp01 = (v: number): number =>
  Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;

export const BELL_FUNDAMENTAL = 98;

const BELL_TABLE: ReadonlyArray<{ r: number; g: number; d: number; beat: number }> = [
  { r: 0.5, g: 0.6, d: 1.0, beat: 0.35 }, // hum
  { r: 1.0, g: 1.0, d: 0.85, beat: 0.6 }, // strike / fundamental
  { r: 1.19, g: 0.42, d: 0.62, beat: 0.9 }, // minor-third-ish
  { r: 1.5, g: 0.38, d: 0.5, beat: 1.1 }, // fifth
  { r: 2.0, g: 0.32, d: 0.4, beat: 1.4 }, // nominal
  { r: 2.66, g: 0.2, d: 0.3, beat: 0 },
  { r: 3.2, g: 0.14, d: 0.22, beat: 0 },
  { r: 4.12, g: 0.08, d: 0.15, beat: 0 },
];

/** Bell decay length (seconds) for a given force: 8 s soft … 14 s full. */
export function bellDecay(force: number): number {
  return 8 + 6 * clamp01(force);
}

/**
 * Inharmonic partials of a large temple bell (đại hồng chung).
 * Harder strikes are longer and brighter (upper partials relatively louder).
 */
export function bellPartials(force: number): BellPartial[] {
  const f = clamp01(force);
  const base = bellDecay(f);
  const bright = 0.35 + 0.65 * f;
  const raw = BELL_TABLE.map((p, i) => ({
    ratio: p.r,
    gain: p.g * Math.pow(bright, Math.max(0, i - 1) * 0.6),
    decay: base * p.d,
    beat: p.beat,
  }));
  const sum = raw.reduce((s, p) => s + p.gain, 0) || 1;
  return raw.map((p) => ({ ...p, gain: p.gain / sum }));
}

const SCALE_INTERVALS: Record<MusicTheme, number[]> = {
  // Ngũ cung (C D F G A)
  default: [0, 2, 5, 7, 9],
  // Đàn bầu: điệu oán-like colour (C Eb F G Bb)
  'dan-bau': [0, 3, 5, 7, 10],
  // Sáo trúc: bright, open (C D E G A)
  'sao-truc': [0, 2, 4, 7, 9],
  // Tĩnh lặng: no music
  'tinh-lang': [],
};

/**
 * Pentatonic scale frequencies over two octaves (plus the top root),
 * ascending, starting at `root`. Returns [] for 'tinh-lang'.
 */
export function pentatonicScale(root: number, theme: MusicTheme = 'default'): number[] {
  const iv = SCALE_INTERVALS[theme] ?? SCALE_INTERVALS.default;
  if (iv.length === 0 || !(root > 0)) return [];
  const out: number[] = [];
  for (let oct = 0; oct < 2; oct++) {
    for (const s of iv) out.push(root * Math.pow(2, (s + 12 * oct) / 12));
  }
  out.push(root * 4);
  return out;
}

export const AMBIENT_AREAS = [
  'cong',
  'san',
  'lau-chuong',
  'chinh-dien',
  'thien-duong',
  'bo-song',
  'ho-sen',
] as const;

type BaseMix = Omit<AmbientMix, 'reverb'> & { reverb: number };

const AREA_MIX: Record<string, BaseMix> = {
  default: { wind: 0.32, water: 0.04, birds: 0.5, insects: 0.6, frogs: 0.12, drone: 0.5, reverb: 0.2 },
  cong: { wind: 0.6, water: 0.04, birds: 0.6, insects: 0.6, frogs: 0.1, drone: 0.45, reverb: 0.15 },
  san: { wind: 0.32, water: 0.04, birds: 0.55, insects: 0.6, frogs: 0.1, drone: 0.5, reverb: 0.2 },
  'lau-chuong': { wind: 0.65, water: 0, birds: 0.45, insects: 0.5, frogs: 0.05, drone: 0.45, reverb: 0.3 },
  'chinh-dien': { wind: 0.14, water: 0, birds: 0.14, insects: 0.22, frogs: 0, drone: 0.55, reverb: 0.6 },
  'thien-duong': { wind: 0.05, water: 0, birds: 0.03, insects: 0.05, frogs: 0, drone: 0.42, reverb: 0.7 },
  'bo-song': { wind: 0.35, water: 0.75, birds: 0.55, insects: 0.6, frogs: 0.7, drone: 0.45, reverb: 0.15 },
  'ho-sen': { wind: 0.25, water: 0.3, birds: 0.5, insects: 0.7, frogs: 0.8, drone: 0.5, reverb: 0.2 },
};

/** Target gains (0..1) per ambience layer for an area at a given night amount. */
export function ambientMix(area: string, night: number): AmbientMix {
  const n = clamp01(night);
  const b = AREA_MIX[area] ?? AREA_MIX.default;
  return {
    wind: clamp01(b.wind * (1 - 0.25 * n)),
    water: clamp01(b.water),
    birds: clamp01(b.birds * (1 - n)),
    insects: clamp01(b.insects * n),
    frogs: clamp01(b.frogs * n),
    drone: clamp01(b.drone),
    reverb: clamp01(b.reverb),
  };
}

/**
 * Fill `out` with noise of the given colour and make it seamlessly loopable
 * (the tail is cross-faded so the wrap point has no discontinuity).
 */
export function fillNoise(out: Float32Array, color: 'white' | 'pink' | 'brown', rand: () => number = Math.random): void {
  const n = out.length;
  const fade = Math.min(Math.floor(n / 4), 4096);
  const raw = new Float32Array(n + fade);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < raw.length; i++) {
    const w = rand() * 2 - 1;
    if (color === 'white') {
      raw[i] = w;
    } else if (color === 'pink') {
      // Paul Kellet's refined method
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      last = (last + 0.02 * w) / 1.02;
      raw[i] = last * 3.5;
    }
  }
  for (let i = 0; i < n; i++) {
    if (i < fade) {
      const a = i / fade;
      out[i] = raw[i] * a + raw[n + i] * (1 - a);
    } else {
      out[i] = raw[i];
    }
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] /= peak;
}

/** Synthetic reverb impulse response: exponentially decaying noise. */
export function fillImpulse(out: Float32Array, sampleRate: number, seconds: number, rand: () => number = Math.random): void {
  const tau = seconds / 6.9; // ≈ -60 dB at `seconds`
  const pre = Math.floor(sampleRate * 0.012);
  for (let i = 0; i < out.length; i++) {
    if (i < pre) {
      out[i] = 0;
      continue;
    }
    const t = (i - pre) / sampleRate;
    out[i] = (rand() * 2 - 1) * Math.exp(-t / tau) * 0.6;
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const DEFAULT_VOLUMES: VolumeSettings = { master: 0.8, sfx: 0.85, ambient: 0.6, music: 0.4 };
const CROSSFADE = 2;
const TICK_MS = 250;
const SILENT = 0.0001;

interface AmbientGraph {
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  wind: GainNode;
  water: GainNode;
  insects: GainNode;
  birds: GainNode;
  frogs: GainNode;
  music: GainNode;
  drone: GainNode;
  reverbSend: GainNode;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private reverbIn: GainNode | null = null;
  private white: AudioBuffer | null = null;
  private pink: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;

  private volumes: VolumeSettings = { ...DEFAULT_VOLUMES };
  private muted = false;

  private amb: AmbientGraph | null = null;
  private ambArea: string | null = null;
  private ambNight = 0;
  private mix: AmbientMix | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private theme: MusicTheme = 'default';
  private noteIdx = 4;
  private hiddenSuspended = false;

  constructor() {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => this.onVisibility());
    }
  }

  // ------------------------------------------------------------------ setup

  /** Create/resume the AudioContext. Call from a user gesture; safe to repeat. */
  unlock(): void {
    try {
      if (!this.ctx) {
        if (typeof window === 'undefined') return;
        const w = window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        };
        const Ctor = w.AudioContext ?? w.webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor({ latencyHint: 'interactive' });
        this.build(this.ctx);
      }
      const ctx = this.ctx;
      if (ctx.state !== 'running' && !this.isHidden()) {
        void ctx.resume().catch(() => undefined);
      }
      if (!this.unlocked) {
        this.unlocked = true;
        // iOS: play one silent sample inside the gesture to fully unlock output.
        const b = ctx.createBuffer(1, 1, ctx.sampleRate);
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.connect(ctx.destination);
        s.onended = () => s.disconnect();
        s.start(0);
        if (this.ambArea !== null) this.setAmbient(this.ambArea, this.ambNight);
      }
    } catch {
      /* never throw from audio */
    }
  }

  get isUnlocked(): boolean {
    return this.unlocked && !!this.ctx;
  }

  private build(ctx: AudioContext): void {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 20;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volumes.master;
    this.master.connect(comp);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.volumes.sfx;
    this.sfxBus.connect(this.master);
    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = this.volumes.ambient;
    this.ambBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.volumes.music;
    this.musicBus.connect(this.master);

    // Shared noise buffers (created once).
    const mk = (seconds: number, color: 'white' | 'pink' | 'brown'): AudioBuffer => {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
      fillNoise(buf.getChannelData(0), color);
      return buf;
    };
    this.white = mk(2, 'white');
    this.pink = mk(4, 'pink');
    this.brown = mk(5, 'brown');

    // Shared reverb (synthetic ~3 s IR, stereo decorrelated).
    const irLen = Math.floor(ctx.sampleRate * 3);
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    fillImpulse(ir.getChannelData(0), ctx.sampleRate, 3);
    fillImpulse(ir.getChannelData(1), ctx.sampleRate, 3);
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 3800;
    const ret = ctx.createGain();
    ret.gain.value = 0.55;
    this.reverbIn = ctx.createGain();
    this.reverbIn.connect(damp);
    damp.connect(conv);
    conv.connect(ret);
    ret.connect(this.master);
  }

  // ---------------------------------------------------------------- volumes

  setVolumes(v: Partial<VolumeSettings>): void {
    for (const k of ['master', 'sfx', 'ambient', 'music'] as const) {
      const val = v[k];
      if (typeof val === 'number') this.volumes[k] = clamp01(val);
    }
    this.applyVolumes();
  }

  getVolumes(): VolumeSettings {
    return { ...this.volumes };
  }

  setMuted(b: boolean): void {
    this.muted = !!b;
    this.applyVolumes();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  private applyVolumes(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      if (this.master) this.glide(this.master.gain, this.muted ? 0 : this.volumes.master, 0.25);
      if (this.sfxBus) this.glide(this.sfxBus.gain, this.volumes.sfx, 0.2);
      if (this.ambBus) this.glide(this.ambBus.gain, this.volumes.ambient, 0.2);
      if (this.musicBus) this.glide(this.musicBus.gain, this.volumes.music, 0.2);
    } catch {
      /* ignore */
    }
  }

  /** Smoothly move an AudioParam toward `value` over roughly `time` seconds. */
  private glide(param: AudioParam, value: number, time: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const p = param as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
    if (typeof p.cancelAndHoldAtTime === 'function') {
      p.cancelAndHoldAtTime(now);
    } else {
      const cur = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(cur, now);
    }
    param.setTargetAtTime(value, now, Math.max(0.01, time / 4));
  }

  // --------------------------------------------------------------- internals

  private live(): AudioContext | null {
    if (!this.unlocked || !this.ctx || !this.sfxBus) return null;
    return this.ctx;
  }

  private isHidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
  }

  private onVisibility(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      if (this.isHidden()) {
        if (ctx.state === 'running') {
          this.hiddenSuspended = true;
          void ctx.suspend().catch(() => undefined);
        }
      } else if (this.hiddenSuspended || ctx.state !== 'running') {
        this.hiddenSuspended = false;
        if (this.unlocked) void ctx.resume().catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
  }

  /** Disconnect `nodes` once `src` has finished. */
  private disposeAfter(src: AudioScheduledSourceNode, nodes: AudioNode[]): void {
    src.onended = () => {
      try {
        src.disconnect();
        for (const n of nodes) n.disconnect();
      } catch {
        /* ignore */
      }
    };
  }

  /** Output node routed to the sfx bus (+ optional reverb send). */
  private out(ctx: AudioContext, gain: number, reverb = 0, dest?: AudioNode): GainNode[] {
    const g = ctx.createGain();
    g.gain.value = gain;
    g.connect(dest ?? this.sfxBus!);
    const nodes: GainNode[] = [g];
    if (reverb > 0 && this.reverbIn) {
      const s = ctx.createGain();
      s.gain.value = reverb;
      g.connect(s);
      s.connect(this.reverbIn);
      nodes.push(s);
    }
    return nodes;
  }

  /** Percussive envelope: 0 → peak in `attack`, exponential decay to silence by `t+attack+decay`. */
  private perc(param: AudioParam, t: number, peak: number, attack: number, decay: number): void {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(Math.max(SILENT * 2, peak), t + attack);
    param.exponentialRampToValueAtTime(SILENT, t + attack + decay);
  }

  /** Simple oscillator voice with percussive envelope. Returns end time. */
  private tone(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscillatorType,
    freq: number,
    t: number,
    peak: number,
    attack: number,
    decay: number,
    endFreq?: number,
    sweep?: number,
  ): OscillatorNode {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq && endFreq > 0) o.frequency.exponentialRampToValueAtTime(endFreq, t + (sweep ?? attack + decay));
    const g = ctx.createGain();
    this.perc(g.gain, t, peak, attack, decay);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    this.disposeAfter(o, [g]);
    return o;
  }

  /** Filtered noise burst. */
  private noise(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    peak: number,
    attack: number,
    decay: number,
    type: BiquadFilterType,
    freq: number,
    q = 1,
    buf: AudioBuffer | null = this.white,
  ): AudioBufferSourceNode | null {
    if (!buf) return null;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.perc(g.gain, t, peak, attack, decay);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    const dur = attack + decay + 0.05;
    s.start(t, Math.random() * Math.max(0, buf.duration - dur - 0.01));
    s.stop(t + dur);
    this.disposeAfter(s, [f, g]);
    return s;
  }

  // -------------------------------------------------------------------- SFX

  /** Large temple bell (đại hồng chung). `distant` = another visitor ringing. */
  bell(force: number, opts: { distant?: boolean } = {}): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const f = clamp01(force);
      const distant = !!opts.distant;
      const t = ctx.currentTime + 0.02;
      const level = (distant ? 0.16 : 0.85) * (0.3 + 0.7 * f);
      const outs = this.out(ctx, level, distant ? 0.6 : 0.3);
      let head: AudioNode = outs[0];
      const extra: AudioNode[] = [];
      if (distant) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 850;
        lp.Q.value = 0.5;
        lp.connect(outs[0]);
        head = lp;
        extra.push(lp);
      }
      const f0 = BELL_FUNDAMENTAL * (1 + (Math.random() - 0.5) * 0.012);
      let longest: OscillatorNode | null = null;
      let longestEnd = 0;
      for (const p of bellPartials(f)) {
        const pair = p.beat > 0 ? [-0.5, 0.5] : [0];
        const attack = p.ratio < 1 ? 0.06 : 0.004;
        for (const k of pair) {
          const o = this.tone(
            ctx,
            head,
            'sine',
            f0 * p.ratio + k * p.beat,
            t,
            p.gain / pair.length,
            attack,
            p.decay,
          );
          const end = t + attack + p.decay;
          if (end > longestEnd) {
            longestEnd = end;
            longest = o;
          }
        }
      }
      // Soft wooden strike (the log hitting the bell).
      this.noise(ctx, head, t, 0.25 * (0.3 + 0.7 * f), 0.003, 0.09, 'bandpass', 380, 1.4);
      this.noise(ctx, head, t, 0.08 * f, 0.002, 0.04, 'bandpass', 1400, 2);
      if (longest) {
        const prev = longest.onended;
        longest.onended = (ev) => {
          if (typeof prev === 'function') prev.call(longest!, ev);
          for (const n of [...extra, ...outs]) {
            try {
              n.disconnect();
            } catch {
              /* ignore */
            }
          }
        };
      }
    } catch {
      /* ignore */
    }
  }

  /** Wooden fish (mõ) knock. */
  mo(accent = false): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + 0.005;
      const f = (accent ? 640 : 740) * rnd(0.96, 1.04);
      const peak = (accent ? 1.4 : 1.0) * rnd(0.9, 1.05);
      const outs = this.out(ctx, peak, 0.22);
      this.noise(ctx, outs[0], t, 0.35, 0.002, 0.07, 'bandpass', f * 1.05, 7);
      const o = this.tone(ctx, outs[0], 'sine', f * 1.45, t, 0.6, 0.002, rnd(0.11, 0.13), f * 0.92, 0.035);
      this.tone(ctx, outs[0], 'sine', f * 2.6, t, 0.08, 0.001, 0.04);
      this.disposeOuts(o, outs);
    } catch {
      /* ignore */
    }
  }

  private disposeOuts(src: AudioScheduledSourceNode, outs: AudioNode[]): void {
    const prev = src.onended;
    src.onended = (ev) => {
      if (typeof prev === 'function') prev.call(src, ev);
      for (const n of outs) {
        try {
          n.disconnect();
        } catch {
          /* ignore */
        }
      }
    };
  }

  /** Singing bowl / small khánh chime — long shimmering ~6 s. */
  bowl(): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + 0.02;
      const f0 = 523.25 * rnd(0.99, 1.01);
      const outs = this.out(ctx, 0.5, 0.4);
      const parts: Array<[number, number, number, number]> = [
        // ratio, gain, decay, beat
        [1, 0.5, 6.2, 1.6],
        [2.71, 0.22, 4.5, 2.6],
        [5.15, 0.08, 2.6, 3.4],
        [8.4, 0.03, 1.4, 0],
      ];
      let last: OscillatorNode | null = null;
      for (const [r, g, d, beat] of parts) {
        const pair = beat > 0 ? [-0.5, 0.5] : [0];
        for (const k of pair) {
          const o = this.tone(ctx, outs[0], 'sine', f0 * r + k * beat, t, g / pair.length, 0.012, d);
          if (r === 1) last = o;
        }
      }
      this.noise(ctx, outs[0], t, 0.08, 0.002, 0.05, 'bandpass', 2400, 1.5);
      if (last) this.disposeOuts(last, outs);
    } catch {
      /* ignore */
    }
  }

  /** Match / flame ignite whoosh (soft) for lighting incense. */
  strike(): void {
    const ctx = this.live();
    if (!ctx || !this.white) return;
    try {
      const t = ctx.currentTime + 0.005;
      const outs = this.out(ctx, 0.5, 0.08);
      // scratch
      this.noise(ctx, outs[0], t, 0.25, 0.01, 0.12, 'bandpass', 3200, 1.2);
      // whoosh with sweeping filter
      const s = ctx.createBufferSource();
      s.buffer = this.white;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(500, t + 0.05);
      bp.frequency.exponentialRampToValueAtTime(2200, t + 0.3);
      bp.frequency.exponentialRampToValueAtTime(700, t + 0.75);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + 0.05);
      g.gain.linearRampToValueAtTime(0.5, t + 0.2);
      g.gain.exponentialRampToValueAtTime(SILENT, t + 0.8);
      s.connect(bp);
      bp.connect(g);
      g.connect(outs[0]);
      s.start(t + 0.05, Math.random());
      s.stop(t + 0.85);
      this.disposeAfter(s, [bp, g]);
      this.disposeOuts(s, outs);
      // soft flame body
      this.noise(ctx, outs[0], t + 0.15, 0.18, 0.1, 0.6, 'lowpass', 450, 0.7, this.pink);
    } catch {
      /* ignore */
    }
  }

  /** Tiny wooden bead click (108-bead rosary). */
  bead(): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + 0.003;
      const outs = this.out(ctx, 0.35 * rnd(0.85, 1.1), 0.05);
      const f = rnd(1600, 2100);
      this.noise(ctx, outs[0], t, 0.4, 0.001, 0.025, 'bandpass', f * 1.3, 4);
      const o = this.tone(ctx, outs[0], 'sine', f, t, 0.35, 0.001, 0.03, f * 0.9, 0.02);
      this.disposeOuts(o, outs);
    } catch {
      /* ignore */
    }
  }

  /** Soft gentle chord when completing 108 beads. */
  beadRound(): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + 0.02;
      const outs = this.out(ctx, 0.35, 0.45);
      const scale = pentatonicScale(261.63, 'default'); // C D F G A …
      const notes = [scale[0], scale[3], scale[5], scale[8]]; // C G C' G'
      let last: OscillatorNode | null = null;
      notes.forEach((fr, i) => {
        const st = t + i * 0.11;
        this.tone(ctx, outs[0], 'triangle', fr, st, 0.16, 0.04, 3.2);
        last = this.tone(ctx, outs[0], 'sine', fr * 2, st, 0.05, 0.02, 2.2 + i * 0.4);
      });
      if (last) this.disposeOuts(last, outs);
    } catch {
      /* ignore */
    }
  }

  private stickClick(ctx: AudioContext, dest: AudioNode, t: number, peak: number, low = false): OscillatorNode {
    const f = low ? rnd(520, 680) : rnd(900, 1500);
    this.noise(ctx, dest, t, peak * 0.6, 0.001, low ? 0.05 : 0.03, 'bandpass', f * 1.8, 3);
    return this.tone(ctx, dest, 'triangle', f, t, peak * 0.5, 0.001, low ? 0.09 : 0.045, f * 0.94, 0.03);
  }

  /** Bamboo fortune sticks rattle (xin xăm), ~0.6 s. */
  sticksShake(): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + 0.01;
      const outs = this.out(ctx, 0.45, 0.06);
      const n = 16 + Math.floor(Math.random() * 6);
      let last: OscillatorNode | null = null;
      let lastT = 0;
      for (let i = 0; i < n; i++) {
        // clustered around shake strokes
        const stroke = Math.floor(Math.random() * 4);
        const st = t + stroke * 0.15 + Math.random() * 0.11;
        const env = Math.sin(((st - t) / 0.62) * Math.PI) * 0.6 + 0.4;
        const o = this.stickClick(ctx, outs[0], st, 0.35 * env * rnd(0.6, 1));
        if (st > lastT) {
          lastT = st;
          last = o;
        }
      }
      if (last) this.disposeOuts(last, outs);
    } catch {
      /* ignore */
    }
  }

  /** A single fortune stick falling (clack + small bounce). */
  stickDrop(): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + 0.01;
      const outs = this.out(ctx, 0.55, 0.12);
      this.stickClick(ctx, outs[0], t, 0.8, true);
      this.stickClick(ctx, outs[0], t + rnd(0.08, 0.11), 0.35, true);
      const o = this.stickClick(ctx, outs[0], t + rnd(0.15, 0.19), 0.12, true);
      this.disposeOuts(o, outs);
    } catch {
      /* ignore */
    }
  }

  /** Water drop / plop. `size` 0..1 (small droplet … lantern on water). */
  splash(size = 0.5): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const s = clamp01(size);
      const t = ctx.currentTime + 0.005;
      const outs = this.out(ctx, 0.35 + 0.25 * s, 0.15);
      const f = (900 - 450 * s) * rnd(0.9, 1.1);
      // bubble resonance: rising pitch
      const o = this.tone(ctx, outs[0], 'sine', f, t, 0.5, 0.003, 0.09 + 0.08 * s, f * 2.1, 0.07 + 0.05 * s);
      // splash noise
      this.noise(ctx, outs[0], t, 0.12 + 0.3 * s, 0.004, 0.12 + 0.35 * s, 'bandpass', 1800 + 1200 * s, 0.7, this.pink);
      if (s > 0.4) {
        // a couple of trailing droplets
        this.tone(ctx, outs[0], 'sine', f * 1.6, t + rnd(0.12, 0.2), 0.12, 0.002, 0.05, f * 2.8, 0.04);
        this.tone(ctx, outs[0], 'sine', f * 1.9, t + rnd(0.22, 0.32), 0.07, 0.002, 0.04, f * 3, 0.03);
      }
      this.disposeOuts(o, outs);
    } catch {
      /* ignore */
    }
  }

  uiTap(): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + 0.003;
      const outs = this.out(ctx, 0.18);
      const o = this.tone(ctx, outs[0], 'sine', 1046.5 * rnd(0.99, 1.01), t, 0.6, 0.003, 0.07, 980, 0.05);
      this.disposeOuts(o, outs);
    } catch {
      /* ignore */
    }
  }

  uiOpen(): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + 0.005;
      const outs = this.out(ctx, 0.2, 0.15);
      this.tone(ctx, outs[0], 'triangle', 783.99, t, 0.45, 0.01, 0.25);
      const o = this.tone(ctx, outs[0], 'triangle', 1046.5, t + 0.07, 0.4, 0.01, 0.35);
      this.disposeOuts(o, outs);
    } catch {
      /* ignore */
    }
  }

  /** Soft pentatonic sparkle ("An lạc +1", Hạt sen). */
  reward(): void {
    const ctx = this.live();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + 0.01;
      const outs = this.out(ctx, 0.22, 0.35);
      const scale = pentatonicScale(523.25, 'default');
      const seq = [scale[0], scale[2], scale[3], scale[5], scale[7]];
      let last: OscillatorNode | null = null;
      seq.forEach((fr, i) => {
        const st = t + i * 0.075;
        this.tone(ctx, outs[0], 'sine', fr, st, 0.35, 0.005, 0.6 + i * 0.1);
        last = this.tone(ctx, outs[0], 'sine', fr * 2.01, st, 0.08, 0.003, 0.35);
      });
      if (last) this.disposeOuts(last, outs);
    } catch {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------- ambience

  setMusicTheme(theme: MusicTheme): void {
    if (!(theme in SCALE_INTERVALS)) return;
    this.theme = theme;
    this.noteIdx = 4;
    if (this.amb && this.mix) this.applyMix(this.mix);
  }

  getMusicTheme(): MusicTheme {
    return this.theme;
  }

  /** Crossfade (2 s) the continuous ambience to the given area / night amount. */
  setAmbient(area: string, night: number): void {
    this.ambArea = String(area);
    this.ambNight = clamp01(night);
    const ctx = this.live();
    if (!ctx) return;
    try {
      if (this.stopTimer) {
        clearTimeout(this.stopTimer);
        this.stopTimer = null;
      }
      if (!this.amb) this.amb = this.buildAmbience(ctx);
      this.mix = ambientMix(this.ambArea, this.ambNight);
      this.applyMix(this.mix);
      if (!this.tickTimer) this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    } catch {
      /* ignore */
    }
  }

  stopAmbient(): void {
    this.ambArea = null;
    this.mix = null;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    const amb = this.amb;
    if (!amb || !this.ctx) return;
    try {
      for (const g of [amb.wind, amb.water, amb.insects, amb.birds, amb.frogs, amb.music]) {
        this.glide(g.gain, 0, CROSSFADE);
      }
      if (this.stopTimer) clearTimeout(this.stopTimer);
      this.stopTimer = setTimeout(() => {
        this.stopTimer = null;
        if (this.amb !== amb) return;
        this.amb = null;
        for (const s of amb.sources) {
          try {
            s.stop();
          } catch {
            /* ignore */
          }
        }
        for (const n of [...amb.sources, ...amb.nodes]) {
          try {
            n.disconnect();
          } catch {
            /* ignore */
          }
        }
      }, CROSSFADE * 1000 + 600);
    } catch {
      /* ignore */
    }
  }

  private applyMix(m: AmbientMix): void {
    const a = this.amb;
    if (!a) return;
    const musicOn = this.theme !== 'tinh-lang';
    this.glide(a.wind.gain, m.wind * 0.5, CROSSFADE);
    this.glide(a.water.gain, m.water * 0.45, CROSSFADE);
    this.glide(a.insects.gain, m.insects * 0.035, CROSSFADE);
    this.glide(a.birds.gain, m.birds * 0.9, CROSSFADE);
    this.glide(a.frogs.gain, m.frogs * 0.7, CROSSFADE);
    this.glide(a.music.gain, m.drone, CROSSFADE);
    this.glide(a.drone.gain, musicOn ? 0.05 : 0, CROSSFADE * 1.5);
    this.glide(a.reverbSend.gain, m.reverb * 0.5, CROSSFADE);
  }

  private loopSrc(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start(ctx.currentTime, Math.random() * buf.duration);
    return s;
  }

  private lfo(ctx: AudioContext, freq: number, depth: number, target: AudioParam, type: OscillatorType = 'sine'): [OscillatorNode, GainNode] {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g);
    g.connect(target);
    o.start();
    return [o, g];
  }

  /**
   * Continuous layers. Live oscillator budget: wind 2 LFO, water 2 LFO,
   * crickets 2×(carrier + pulse + burst) = 6, drone 2 → 12.
   */
  private buildAmbience(ctx: AudioContext): AmbientGraph {
    const sources: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [];
    const amb = this.ambBus!;
    const layer = (dest: AudioNode = amb): GainNode => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(dest);
      nodes.push(g);
      return g;
    };
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0;
    amb.connect(reverbSend);
    if (this.reverbIn) reverbSend.connect(this.reverbIn);
    nodes.push(reverbSend);

    // Wind: brown noise → swaying lowpass → slow gain swell.
    const wind = layer();
    {
      const src = this.loopSrc(ctx, this.brown!);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      lp.Q.value = 0.8;
      const mod = ctx.createGain();
      mod.gain.value = 0.7;
      src.connect(lp);
      lp.connect(mod);
      mod.connect(wind);
      const [o1, g1] = this.lfo(ctx, 0.061, 260, lp.frequency);
      const [o2, g2] = this.lfo(ctx, 0.113, 0.3, mod.gain);
      sources.push(src, o1, o2);
      nodes.push(lp, mod, g1, g2);
    }

    // Water: pink noise, band-limited, gentle lapping / babbling.
    const water = layer();
    {
      const src = this.loopSrc(ctx, this.pink!);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 280;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1100;
      bp.Q.value = 0.6;
      const mod = ctx.createGain();
      mod.gain.value = 0.75;
      src.connect(hp);
      hp.connect(bp);
      bp.connect(mod);
      mod.connect(water);
      const [o1, g1] = this.lfo(ctx, 0.27, 0.22, mod.gain);
      const [o2, g2] = this.lfo(ctx, 1.7, 380, bp.frequency, 'triangle');
      sources.push(src, o1, o2);
      nodes.push(hp, bp, mod, g1, g2);
    }

    // Crickets: AM high sines (côn trùng đêm).
    const insects = layer();
    for (const [fc, pulse, burst, pan] of [
      [4500, 31, 0.7, -0.4],
      [4120, 26, 0.43, 0.45],
    ] as const) {
      const car = ctx.createOscillator();
      car.frequency.value = fc;
      const pg = ctx.createGain();
      pg.gain.value = 0.5;
      const bg = ctx.createGain();
      bg.gain.value = 0.5;
      car.connect(pg);
      pg.connect(bg);
      let tail: AudioNode = bg;
      if (typeof ctx.createStereoPanner === 'function') {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        bg.connect(p);
        tail = p;
        nodes.push(p);
      }
      tail.connect(insects);
      car.start();
      const [o1, g1] = this.lfo(ctx, pulse, 0.5, pg.gain);
      const [o2, g2] = this.lfo(ctx, burst, 0.5, bg.gain);
      sources.push(car, o1, o2);
      nodes.push(pg, bg, g1, g2);
    }

    // Event layers (birds/frogs scheduled in tick()).
    const birds = layer();
    const frogs = layer();

    // Music layer (on music bus) + very soft root/fifth drone.
    const music = layer(this.musicBus!);
    const drone = layer(music);
    {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      lp.connect(drone);
      nodes.push(lp);
      for (const [fr, g] of [
        [130.81, 1],
        [196.0, 0.45],
      ] as const) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = fr;
        o.detune.value = rnd(-3, 3);
        const og = ctx.createGain();
        og.gain.value = g;
        o.connect(og);
        og.connect(lp);
        o.start();
        sources.push(o);
        nodes.push(og);
      }
    }

    return { sources, nodes, wind, water, insects, birds, frogs, music, drone, reverbSend };
  }

  private tick(): void {
    const ctx = this.ctx;
    const a = this.amb;
    const m = this.mix;
    if (!ctx || !a || !m || ctx.state !== 'running' || this.isHidden()) return;
    try {
      const dt = TICK_MS / 1000;
      const t = ctx.currentTime + Math.random() * dt;
      if (m.birds > 0.01 && Math.random() < m.birds * 0.45 * dt) this.chirp(ctx, a.birds, t);
      if (m.frogs > 0.01 && Math.random() < m.frogs * 0.18 * dt) this.croak(ctx, a.frogs, t);
      if (this.theme !== 'tinh-lang' && m.drone > 0.01 && Math.random() < dt / 6.5) {
        this.note(ctx, a.music, t);
      }
    } catch {
      /* ignore */
    }
  }

  private panned(ctx: AudioContext, dest: AudioNode, pan: number): AudioNode[] {
    if (typeof ctx.createStereoPanner !== 'function') return [];
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(dest);
    return [p];
  }

  /** Procedural bird call (sweeping sine phrases). */
  private chirp(ctx: AudioContext, dest: AudioNode, t: number): void {
    const pn = this.panned(ctx, dest, rnd(-0.8, 0.8));
    const out = pn[0] ?? dest;
    const base = rnd(2200, 4200);
    const kind = Math.random();
    const n = kind < 0.3 ? 2 : 2 + Math.floor(Math.random() * 4);
    let st = t;
    let last: OscillatorNode | null = null;
    for (let i = 0; i < n; i++) {
      const dur = kind < 0.3 ? rnd(0.18, 0.3) : rnd(0.05, 0.11);
      const from = base * rnd(0.9, 1.1);
      const to = kind < 0.3 ? from * (i === 0 ? 1.25 : 0.8) : from * (Math.random() < 0.5 ? 1.35 : 0.72);
      last = this.tone(ctx, out, 'sine', from, st, rnd(0.03, 0.06), 0.012, dur, to, dur);
      st += dur + rnd(0.04, 0.12);
    }
    if (last && pn.length) this.disposeOuts(last, pn);
  }

  /** Low frog croak (near water, night). */
  private croak(ctx: AudioContext, dest: AudioNode, t: number): void {
    const pn = this.panned(ctx, dest, rnd(-0.7, 0.7));
    const out = pn[0] ?? dest;
    const f = rnd(110, 190);
    const pulses = 3 + Math.floor(Math.random() * 4);
    const gap = rnd(0.045, 0.065);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    const peak = rnd(0.08, 0.14);
    for (let i = 0; i < pulses; i++) {
      const p = t + i * gap;
      g.gain.setValueAtTime(0, p);
      g.gain.linearRampToValueAtTime(peak, p + 0.008);
      g.gain.linearRampToValueAtTime(0, p + gap * 0.8);
    }
    o.connect(lp);
    lp.connect(g);
    g.connect(out);
    const end = t + pulses * gap + 0.05;
    o.start(t);
    o.stop(end);
    this.disposeAfter(o, [lp, g, ...pn]);
  }

  /** Slow pentatonic note for the music pad, voiced per theme. */
  private note(ctx: AudioContext, dest: AudioNode, t: number): void {
    const scale = pentatonicScale(261.63, this.theme);
    if (!scale.length) return;
    const step = [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
    this.noteIdx = Math.min(scale.length - 1, Math.max(0, this.noteIdx + step));
    const fr = scale[this.noteIdx];
    const pn = this.panned(ctx, dest, rnd(-0.3, 0.3));
    const out = pn[0] ?? dest;

    if (this.theme === 'dan-bau') {
      // Monochord: plucked sine with slow expressive pitch bends.
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fr;
      const bend = (Math.random() < 0.5 ? -1 : 1) * rnd(60, 180);
      o.detune.setValueAtTime(0, t);
      o.detune.setValueAtTime(0, t + 0.6);
      o.detune.linearRampToValueAtTime(bend, t + 1.6);
      o.detune.linearRampToValueAtTime(bend * 0.2, t + 3);
      const g = ctx.createGain();
      this.perc(g.gain, t, 0.09, 0.04, 4.5);
      const h = ctx.createGain();
      h.gain.value = 0.25;
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = fr * 2;
      o.connect(g);
      o2.connect(h);
      h.connect(g);
      g.connect(out);
      o.start(t);
      o2.start(t);
      o.stop(t + 4.7);
      o2.stop(t + 4.7);
      this.disposeAfter(o2, [h]);
      this.disposeAfter(o, [g, ...pn]);
      return;
    }

    if (this.theme === 'sao-truc') {
      // Bamboo flute: sine + breath noise, gentle vibrato.
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fr * 2;
      const vib = ctx.createOscillator();
      vib.frequency.value = rnd(4.5, 5.5);
      const vg = ctx.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(fr * 0.012, t + 1.5);
      vib.connect(vg);
      vg.connect(o.frequency);
      const g = ctx.createGain();
      const dur = rnd(2.2, 3.4);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.5);
      g.gain.setValueAtTime(0.06, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + 1.4);
      o.connect(g);
      g.connect(out);
      o.start(t);
      vib.start(t);
      o.stop(t + dur + 1.5);
      vib.stop(t + dur + 1.5);
      this.disposeAfter(vib, [vg]);
      this.disposeAfter(o, [g, ...pn]);
      if (this.white) {
        const s = ctx.createBufferSource();
        s.buffer = this.white;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = fr * 2;
        bp.Q.value = 6;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0, t);
        ng.gain.linearRampToValueAtTime(0.05, t + 0.25);
        ng.gain.linearRampToValueAtTime(0.015, t + 0.9);
        ng.gain.setValueAtTime(0.015, t + dur);
        ng.gain.linearRampToValueAtTime(0, t + dur + 1.2);
        s.connect(bp);
        bp.connect(ng);
        ng.connect(out);
        s.loop = true;
        s.start(t, Math.random());
        s.stop(t + dur + 1.3);
        this.disposeAfter(s, [bp, ng]);
      }
      return;
    }

    // default: soft pad — triangle + sub sine, long attack & release.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1300;
    const g = ctx.createGain();
    const dur = rnd(2.5, 4);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 2.2);
    g.gain.setValueAtTime(0.07, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 4);
    lp.connect(g);
    g.connect(out);
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = fr;
    o1.detune.value = rnd(-4, 4);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = fr / 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.5;
    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    const end = t + dur + 4.1;
    o1.start(t);
    o2.start(t);
    o1.stop(end);
    o2.stop(end);
    this.disposeAfter(o2, [g2]);
    this.disposeAfter(o1, [lp, g, ...pn]);
  }
}

export const audio = new AudioEngine();
