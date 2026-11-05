/**
 * Time-of-day sky: gradient, sun / moon, stars, drifting clouds.
 * Pure helpers (`nightFactor`, `skyColors`, `celestialPosition`) are unit-tested.
 */
import type Phaser from 'phaser';
import { GAME_W } from './types';
import { bakeCanvas, mixColor, mulberry, rgba, softDot } from './sprites';

// ------------------------------------------------------------------ pure

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Normalise any hour to [0,24). */
export function normHour(hour: number): number {
  const h = hour % 24;
  return h < 0 ? h + 24 : h;
}

/** 0 = full day … 1 = full night, smooth transitions 5–7h (dawn) and 17–19.5h (dusk). */
export function nightFactor(hour: number): number {
  const h = normHour(hour);
  if (h < 5) return 1;
  if (h < 7) return 1 - smoothstep(5, 7, h);
  if (h < 17) return 0;
  if (h < 19.5) return smoothstep(17, 19.5, h);
  return 1;
}

export interface SkyColors {
  /** Zenith colour 0xRRGGBB. */
  top: number;
  /** Mid-sky colour. */
  mid: number;
  /** Horizon colour. */
  bottom: number;
}

/** Keyframes: [hour, top, mid, horizon]. */
const SKY_KEYS: [number, number, number, number][] = [
  [0, 0x0b0f2e, 0x1a1f4e, 0x2f3468],
  [4.6, 0x0e1236, 0x1f2557, 0x3a3a70],
  [5.5, 0x23306a, 0x5d5390, 0xc98ea4],
  [6.3, 0x5b7fbd, 0xe2a8b0, 0xffcf9c],
  [7.5, 0x79acdc, 0xb9d6ec, 0xf5e6cf],
  [10, 0x78b0e0, 0xb2d5ef, 0xe8f0ec],
  [16, 0x7eaedb, 0xbad5e8, 0xf3e7cf],
  [17.3, 0x7a9ccc, 0xe6c19c, 0xffd394],
  [18.2, 0x56649f, 0xe39a8f, 0xffb16e],
  [19, 0x2b336e, 0x76598e, 0xd88a84],
  [19.8, 0x12183f, 0x262c5f, 0x46407a],
  [24, 0x0b0f2e, 0x1a1f4e, 0x2f3468],
];

/** Sky gradient colours for an hour (local time). */
export function skyColors(hour: number): SkyColors {
  const h = normHour(hour);
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const a = SKY_KEYS[i];
    const b = SKY_KEYS[i + 1];
    if (h >= a[0] && h <= b[0]) {
      const t = smoothstep(0, 1, (h - a[0]) / (b[0] - a[0]));
      return { top: mixColor(a[1], b[1], t), mid: mixColor(a[2], b[2], t), bottom: mixColor(a[3], b[3], t) };
    }
  }
  const k = SKY_KEYS[0];
  return { top: k[1], mid: k[2], bottom: k[3] };
}

/** Horizon line (screen y) used for celestial placement. */
export const SKY_HORIZON_Y = 380;

export interface Celestial {
  kind: 'sun' | 'moon';
  x: number;
  y: number;
  /** 0..1 how visible (fades near horizon). */
  vis: number;
}

/** Sun (5.5h→18.8h) or moon (18.3h→6.7h) screen position for an hour. */
export function celestialPosition(hour: number): Celestial {
  const h = normHour(hour);
  const sunT = (h - 5.5) / 13.3;
  if (sunT >= 0 && sunT <= 1 && h >= 5.5 && h <= 18.3) {
    return {
      kind: 'sun',
      x: 60 + sunT * (GAME_W - 120),
      y: SKY_HORIZON_Y - 20 - Math.sin(Math.PI * sunT) * 290,
      vis: Math.min(1, Math.sin(Math.PI * sunT) * 4),
    };
  }
  const moonT = normHour(h - 18.3) / 12.4;
  const t = Math.min(1, moonT);
  return {
    kind: 'moon',
    x: 70 + t * (GAME_W - 140),
    y: SKY_HORIZON_Y - 30 - Math.sin(Math.PI * t) * 270,
    vis: Math.min(1, Math.sin(Math.PI * t) * 4),
  };
}

// ------------------------------------------------------------------ drawing

export interface SkyOptions {
  night: number;
  /** 0..24 local VN time. */
  hour: number;
  worldWidth: number;
  reducedMotion: boolean;
  fullMoon?: boolean;
}

export interface SkyHandle {
  update(time: number, delta: number): void;
  destroy(): void;
}

/** Registry key where the sky publishes the sun/moon screen position (for water reflections). */
export const SKY_CELESTIAL_REGISTRY = 'sky.celestial';

function bakeGradient(scene: Phaser.Scene, hour: number): string {
  const q = Math.round(normHour(hour) * 8) / 8;
  const key = `sky-grad-${q.toFixed(3)}`;
  const c = skyColors(q);
  const cel = celestialPosition(q);
  const nf = nightFactor(q);
  return bakeCanvas(scene, key, GAME_W, 960, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(c.top));
    g.addColorStop(0.22, rgba(c.mid));
    g.addColorStop(SKY_HORIZON_Y / h, rgba(c.bottom));
    g.addColorStop(1, rgba(c.bottom));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // warm atmospheric haze around the sun near horizon (dawn / sunset)
    if (cel.kind === 'sun') {
      const low = 1 - Math.min(1, (SKY_HORIZON_Y - cel.y) / 260);
      const warm = mixColor(0xfff2d0, 0xffa860, low);
      softDot(ctx, cel.x, cel.y, 160 + low * 200, warm, 0.25 + low * 0.35);
    } else {
      softDot(ctx, cel.x, cel.y, 170, 0x8090c8, 0.12 * nf);
    }
    // faint horizontal painterly bands
    const r = mulberry(Math.round(q * 8) + 3);
    for (let i = 0; i < 14; i++) {
      const y = 30 + r() * (SKY_HORIZON_Y - 40);
      ctx.fillStyle = rgba(i % 2 ? 0xffffff : c.top, 0.035);
      ctx.beginPath();
      ctx.ellipse(r() * w, y, 120 + r() * 220, 5 + r() * 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function bakeCloud(scene: Phaser.Scene, i: number): string {
  const w = 220 + i * 40;
  const h = 80 + i * 6;
  return bakeCanvas(scene, `sky-cloud-${i}`, w, h, (ctx) => {
    const r = mulberry(41 + i * 17);
    const base = h * 0.72;
    // underside shade then puffs
    for (let k = 0; k < 16; k++) {
      const x = w * 0.15 + r() * w * 0.7;
      const rad = 18 + r() * (h * 0.36);
      const y = base - rad * (0.3 + r() * 0.5);
      softDot(ctx, x, y + 6, rad, 0xc9d2e2, 0.55, 0.5);
    }
    for (let k = 0; k < 18; k++) {
      const x = w * 0.15 + r() * w * 0.7;
      const rad = 14 + r() * (h * 0.32);
      const y = base - rad * (0.45 + r() * 0.6);
      softDot(ctx, x, y, rad, 0xffffff, 0.7, 0.55);
    }
    // flatten the bottom softly
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createLinearGradient(0, base - 4, 0, base + 14);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, base - 4, w, h);
  });
}

function bakeSun(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'sky-sun', 160, 160, (ctx) => {
    softDot(ctx, 80, 80, 80, 0xfff1c8, 0.3);
    softDot(ctx, 80, 80, 40, 0xfff6dc, 0.45);
    const g = ctx.createRadialGradient(80, 80, 0, 80, 80, 24);
    g.addColorStop(0, 'rgba(255,255,245,1)');
    g.addColorStop(0.85, 'rgba(255,240,200,1)');
    g.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(80, 80, 24, 0, Math.PI * 2);
    ctx.fill();
  });
}

function bakeMoon(scene: Phaser.Scene, full: boolean): string {
  return bakeCanvas(scene, full ? 'sky-moon-full' : 'sky-moon-crescent', 72, 72, (ctx) => {
    const g = ctx.createRadialGradient(30, 30, 2, 36, 36, 26);
    g.addColorStop(0, '#fffbea');
    g.addColorStop(1, '#efe3bd');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(36, 36, 25, 0, Math.PI * 2);
    ctx.fill();
    // soft maria
    const r = mulberry(5);
    for (let i = 0; i < 7; i++) {
      softDot(ctx, 24 + r() * 26, 24 + r() * 26, 4 + r() * 6, 0xc9bf9e, 0.35);
    }
    if (!full) {
      ctx.globalCompositeOperation = 'destination-out';
      softDot(ctx, 48, 30, 26, 0x000000, 1, 0.85);
    }
  });
}

function bakeStar(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'sky-star', 8, 8, (ctx) => {
    softDot(ctx, 4, 4, 4, 0xfff8e0, 1, 0.25);
  });
}

function bakeHalo(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'sky-moon-halo', 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,248,220,0.55)');
    g.addColorStop(0.3, 'rgba(220,225,255,0.18)');
    g.addColorStop(1, 'rgba(200,210,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

/** Draw the sky into a scrollFactor-0 layer. */
export function drawSky(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, opts: SkyOptions): SkyHandle {
  const objs: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  const nf = Math.max(0, Math.min(1, opts.night));
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    layer.add(o);
    objs.push(o);
    return o;
  };

  add(scene.add.image(0, 0, bakeGradient(scene, opts.hour)).setOrigin(0, 0));

  // stars
  const stars: Phaser.GameObjects.Image[] = [];
  const starA = Math.max(0, (nf - 0.3) / 0.7);
  if (starA > 0.02) {
    const sk = bakeStar(scene);
    const r = mulberry(1234);
    const n = 46;
    for (let i = 0; i < n; i++) {
      const y = 10 + Math.pow(r(), 1.4) * (SKY_HORIZON_Y - 60);
      const s = add(scene.add.image(r() * GAME_W, y, sk));
      const base = (0.35 + r() * 0.65) * starA * (1 - (y / SKY_HORIZON_Y) * 0.5);
      s.setScale(0.35 + r() * 0.55).setAlpha(base).setBlendMode('ADD');
      stars.push(s);
      if (!opts.reducedMotion && r() < 0.6) {
        tweens.push(
          scene.tweens.add({
            targets: s,
            alpha: base * 0.25,
            duration: 900 + r() * 2200,
            delay: r() * 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          }),
        );
      }
    }
  }

  // sun / moon
  const cel = celestialPosition(opts.hour);
  if (cel.kind === 'sun') {
    const sun = add(scene.add.image(cel.x, cel.y, bakeSun(scene)));
    sun.setAlpha(cel.vis).setBlendMode('ADD');
    const low = 1 - Math.min(1, (SKY_HORIZON_Y - cel.y) / 260);
    sun.setTint(mixColor(0xffffff, 0xffb070, low));
  } else {
    const halo = add(scene.add.image(cel.x, cel.y, bakeHalo(scene)));
    halo.setAlpha(cel.vis * nf * (opts.fullMoon ? 1 : 0.6)).setBlendMode('ADD');
    const moon = add(scene.add.image(cel.x, cel.y, bakeMoon(scene, !!opts.fullMoon)));
    moon.setAlpha(cel.vis * Math.max(0.35, nf)).setRotation(opts.fullMoon ? 0 : -0.5);
  }
  scene.registry.set(SKY_CELESTIAL_REGISTRY, { ...cel, full: !!opts.fullMoon, night: nf });

  // clouds
  const clouds: { img: Phaser.GameObjects.Image; speed: number }[] = [];
  const r = mulberry(77);
  const cloudCount = 4;
  const sunset = Math.max(0, 1 - Math.abs(normHour(opts.hour) - 18) / 1.4, 1 - Math.abs(normHour(opts.hour) - 6.2) / 1.2);
  const tint = mixColor(mixColor(0xffffff, 0xffc0a0, sunset), 0x5a6090, nf);
  for (let i = 0; i < cloudCount; i++) {
    const key = bakeCloud(scene, i % 3);
    const img = add(scene.add.image(r() * (GAME_W + 200) - 100, 70 + i * 62 + r() * 30, key));
    img.setAlpha((0.85 - i * 0.08) * (1 - nf * 0.6)).setTint(tint).setScale(0.8 + r() * 0.5, 0.7 + r() * 0.4);
    clouds.push({ img, speed: (4 + r() * 6) * (1 - i * 0.12) });
  }

  return {
    update(_time: number, delta: number): void {
      if (opts.reducedMotion) return;
      const dt = delta / 1000;
      for (const c of clouds) {
        c.img.x += c.speed * dt;
        const hw = c.img.displayWidth / 2;
        if (c.img.x - hw > GAME_W + 20) c.img.x = -hw - 20;
      }
    },
    destroy(): void {
      for (const t of tweens) t.remove();
      for (const o of objs) o.destroy();
      objs.length = 0;
    },
  };
}
