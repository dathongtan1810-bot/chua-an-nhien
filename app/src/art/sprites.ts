/**
 * Baked sprite textures for rituals & decorations, drawn 100% in code on canvases.
 * Every `makeXxx(scene)` is idempotent and returns the texture key.
 * Only type imports from Phaser so pure helpers stay usable in node tests.
 */
import type Phaser from 'phaser';

export type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------- helpers

/** Deterministic PRNG (mulberry32). */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parse '#rrggbb' / 'rrggbb' / number into number. */
export function hexToNum(c: string | number): number {
  if (typeof c === 'number') return c;
  return parseInt(c.replace('#', ''), 16) || 0;
}

/** Linear mix of two 0xRRGGBB colours. */
export function mixColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const r = Math.round(((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * k));
  const g = Math.round(((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * k));
  const bl = Math.round((a & 255) + (((b & 255) - (a & 255)) * k));
  return (r << 16) | (g << 8) | bl;
}

/** CSS rgba() string from 0xRRGGBB. */
export function rgba(c: number, a = 1): string {
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
}

/**
 * Bake a canvas texture once (idempotent). `draw` receives a 2D context.
 * Returns the key.
 */
export function bakeCanvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx, w: number, h: number) => void,
): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.save();
  draw(ctx, w, h);
  ctx.restore();
  tex.refresh();
  return key;
}

/** Soft radial blob. */
export function softDot(ctx: Ctx, x: number, y: number, r: number, color: number, alpha = 1, hard = 0): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(Math.max(0, Math.min(0.99, hard)), rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Subtle painterly grain: tiny translucent light/dark speckles clipped to current alpha. */
export function grain(ctx: Ctx, w: number, h: number, count: number, strength: number, seed = 7): void {
  const r = mulberry(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < count; i++) {
    const light = r() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,240,${strength * r()})` : `rgba(30,20,40,${strength * r()})`;
    const s = 0.6 + r() * 1.8;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  ctx.restore();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

// ---------------------------------------------------------------- incense

export function makeIncenseStick(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-incense-stick', 6, 110, (ctx) => {
    // red bamboo stick (bottom)
    const sg = ctx.createLinearGradient(2, 0, 4, 0);
    sg.addColorStop(0, '#8e1d18');
    sg.addColorStop(0.5, '#d8423a');
    sg.addColorStop(1, '#8e1d18');
    ctx.fillStyle = sg;
    ctx.fillRect(2, 70, 2, 40);
    // brown incense coating (top ~ 65%)
    const bg = ctx.createLinearGradient(0, 0, 6, 0);
    bg.addColorStop(0, '#4a2a18');
    bg.addColorStop(0.45, '#8a5634');
    bg.addColorStop(1, '#3f2414');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(1.2, 2);
    ctx.quadraticCurveTo(3, 0, 4.8, 2);
    ctx.lineTo(4.6, 72);
    ctx.lineTo(1.4, 72);
    ctx.closePath();
    ctx.fill();
    grain(ctx, 6, 72, 80, 0.35, 3);
  });
}

export function makeIncenseEmber(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-incense-ember', 16, 16, (ctx) => {
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,250,210,1)');
    g.addColorStop(0.25, 'rgba(255,190,90,1)');
    g.addColorStop(0.55, 'rgba(240,90,30,0.65)');
    g.addColorStop(1, 'rgba(200,40,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
  });
}

export function makeSmokeParticle(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-smoke', 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(240,238,235,0.55)');
    g.addColorStop(0.4, 'rgba(225,222,220,0.3)');
    g.addColorStop(1, 'rgba(210,208,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });
}

export function makeGlow(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-glow', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,236,190,1)');
    g.addColorStop(0.15, 'rgba(255,214,150,0.75)');
    g.addColorStop(0.4, 'rgba(255,180,100,0.28)');
    g.addColorStop(0.7, 'rgba(255,150,80,0.08)');
    g.addColorStop(1, 'rgba(255,140,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

export function makeSparkle(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-sparkle', 32, 32, (ctx) => {
    softDot(ctx, 16, 16, 10, 0xfff3c8, 0.6);
    ctx.fillStyle = 'rgba(255,252,235,0.95)';
    ctx.beginPath();
    ctx.moveTo(16, 1);
    ctx.quadraticCurveTo(17.2, 14.8, 31, 16);
    ctx.quadraticCurveTo(17.2, 17.2, 16, 31);
    ctx.quadraticCurveTo(14.8, 17.2, 1, 16);
    ctx.quadraticCurveTo(14.8, 14.8, 16, 1);
    ctx.fill();
    softDot(ctx, 16, 16, 3, 0xffffff, 1);
  });
}

// ---------------------------------------------------------------- fish & food

export type FishColor = 'cam' | 'trang' | 'do' | 'vang';

const FISH_PAL: Record<FishColor, { base: number; spot: number; belly: number; fin: number }> = {
  cam: { base: 0xf08a3a, spot: 0xfff4e6, belly: 0xffc27a, fin: 0xffd9b0 },
  trang: { base: 0xfaf4ea, spot: 0xe0462e, belly: 0xffffff, fin: 0xf3e9dc },
  do: { base: 0xd8392b, spot: 0x2a1a1a, belly: 0xf07a5a, fin: 0xf5a891 },
  vang: { base: 0xf2c24a, spot: 0xfff1b8, belly: 0xffe08a, fin: 0xfbe3a0 },
};

/** Koi, top-down, facing right (+x), 48×20. */
export function makeFish(scene: Phaser.Scene, color: FishColor): string {
  const p = FISH_PAL[color] ?? FISH_PAL.cam;
  return bakeCanvas(scene, `spr-fish-${color}`, 48, 20, (ctx) => {
    const cy = 10;
    // tail fin (left)
    ctx.fillStyle = rgba(p.fin, 0.75);
    ctx.beginPath();
    ctx.moveTo(13, cy);
    ctx.quadraticCurveTo(5, cy - 9, 1, cy - 8);
    ctx.quadraticCurveTo(5, cy, 1, cy + 8);
    ctx.quadraticCurveTo(5, cy + 9, 13, cy);
    ctx.fill();
    // pectoral fins
    ctx.fillStyle = rgba(p.fin, 0.7);
    ellipse(ctx, 31, cy - 6, 5, 2.4, -0.7);
    ctx.fill();
    ellipse(ctx, 31, cy + 6, 5, 2.4, 0.7);
    ctx.fill();
    // body
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(11, cy);
    ctx.bezierCurveTo(18, cy - 6.5, 34, cy - 6.5, 44, cy - 2);
    ctx.quadraticCurveTo(47.5, cy, 44, cy + 2);
    ctx.bezierCurveTo(34, cy + 6.5, 18, cy + 6.5, 11, cy);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, cy - 6, 0, cy + 6);
    bg.addColorStop(0, rgba(mixColor(p.base, 0x000000, 0.12)));
    bg.addColorStop(0.5, rgba(p.belly));
    bg.addColorStop(1, rgba(mixColor(p.base, 0x000000, 0.12)));
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.clip();
    // patterns
    ctx.fillStyle = rgba(p.base, 0.85);
    ellipse(ctx, 26, cy, 16, 3.2);
    ctx.fill();
    const r = mulberry(color.length * 31 + 5);
    ctx.fillStyle = rgba(p.spot, 0.9);
    for (let i = 0; i < 3; i++) {
      ellipse(ctx, 18 + r() * 20, cy - 3 + r() * 6, 2.5 + r() * 3.5, 1.8 + r() * 2.2, r() * 3);
      ctx.fill();
    }
    ctx.restore();
    // dorsal line highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(17, cy - 0.5);
    ctx.lineTo(40, cy - 0.5);
    ctx.stroke();
    // eyes
    ctx.fillStyle = 'rgba(25,20,20,0.85)';
    ctx.beginPath();
    ctx.arc(41, cy - 2.6, 0.9, 0, Math.PI * 2);
    ctx.arc(41, cy + 2.6, 0.9, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function makeFoodPellet(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-food', 8, 8, (ctx) => {
    const g = ctx.createRadialGradient(3, 3, 0.5, 4, 4, 4);
    g.addColorStop(0, '#f3d49a');
    g.addColorStop(0.6, '#b07a3c');
    g.addColorStop(1, 'rgba(110,70,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 8);
  });
}

// ---------------------------------------------------------------- flower lanterns

export type LanternStyle = 'sen' | 'vuong' | 'tron';

export const LANTERN_COLORS: Record<string, number> = {
  hong: 0xf49ab4,
  vang: 0xf6cf5e,
  trang: 0xf7f1e4,
  xanh: 0x8fd0c4,
  tim: 0xbf9be0,
  do: 0xe0514a,
};

function lanternColor(color: string): number {
  const c = LANTERN_COLORS[color];
  if (c !== undefined) return c;
  return hexToNum(color);
}

function lotusPetal(ctx: Ctx, bx: number, by: number, len: number, wid: number, ang: number, fill: string | CanvasGradient): void {
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-wid, -len * 0.35, -wid * 0.55, -len * 0.85, 0, -len);
  ctx.bezierCurveTo(wid * 0.55, -len * 0.85, wid, -len * 0.35, 0, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

/**
 * Floating flower lantern (đèn hoa đăng), ~64×56, lit by a candle.
 * Origin suggestion: (0.5, 0.8) — the water line is near y≈46.
 */
export function makeLantern(scene: Phaser.Scene, color: string, style: LanternStyle): string {
  const base = lanternColor(color);
  const key = `spr-lantern-${style}-${typeof color === 'string' ? color.replace('#', '') : color}`;
  return bakeCanvas(scene, key, 64, 56, (ctx) => {
    const light = mixColor(base, 0xfffbe8, 0.55);
    const dark = mixColor(base, 0x40203a, 0.35);
    // inner glow halo
    softDot(ctx, 32, 32, 26, 0xffd690, 0.45);
    // base float leaf / raft
    ctx.fillStyle = 'rgba(70,110,70,0.95)';
    ellipse(ctx, 32, 47, 25, 5.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,160,100,0.9)';
    ellipse(ctx, 32, 45.5, 22, 4);
    ctx.fill();

    if (style === 'sen') {
      // back petals
      const back = ctx.createLinearGradient(0, 14, 0, 46);
      back.addColorStop(0, rgba(light));
      back.addColorStop(1, rgba(dark));
      for (const a of [-1.15, -0.6, 0, 0.6, 1.15]) lotusPetal(ctx, 32, 45, 26, 9, a, back);
      // candle light
      softDot(ctx, 32, 30, 12, 0xfff2c0, 0.95);
      ctx.fillStyle = '#fff8e0';
      ellipse(ctx, 32, 29, 2.2, 4.5);
      ctx.fill();
      softDot(ctx, 32, 28, 4, 0xffffff, 1);
      // front petals, lit from inside (lighter at base)
      const front = ctx.createLinearGradient(0, 18, 0, 46);
      front.addColorStop(0, rgba(base));
      front.addColorStop(0.6, rgba(light));
      front.addColorStop(1, rgba(mixColor(light, 0xffffff, 0.4)));
      for (const a of [-0.95, -0.32, 0.32, 0.95]) lotusPetal(ctx, 32, 46, 21, 8, a, front);
      // petal edge lines
      ctx.strokeStyle = rgba(dark, 0.35);
      ctx.lineWidth = 0.8;
      for (const a of [-0.32, 0.32]) {
        ctx.save();
        ctx.translate(32, 46);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(0, -16);
        ctx.stroke();
        ctx.restore();
      }
    } else if (style === 'vuong') {
      // square paper box lantern with frame
      const g = ctx.createLinearGradient(0, 16, 0, 46);
      g.addColorStop(0, rgba(base));
      g.addColorStop(0.5, rgba(light));
      g.addColorStop(1, rgba(mixColor(light, 0xffffff, 0.5)));
      ctx.fillStyle = g;
      ctx.fillRect(18, 18, 28, 27);
      softDot(ctx, 32, 33, 13, 0xfff4cc, 0.9);
      // top side (perspective)
      ctx.fillStyle = rgba(mixColor(base, 0xffffff, 0.2), 0.95);
      ctx.beginPath();
      ctx.moveTo(18, 18);
      ctx.lineTo(24, 13);
      ctx.lineTo(50, 13);
      ctx.lineTo(46, 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(dark, 0.9);
      ctx.beginPath();
      ctx.moveTo(46, 18);
      ctx.lineTo(50, 13);
      ctx.lineTo(50, 40);
      ctx.lineTo(46, 45);
      ctx.closePath();
      ctx.fill();
      // wooden frame
      ctx.strokeStyle = 'rgba(110,60,35,0.9)';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(18, 18, 28, 27);
      ctx.beginPath();
      ctx.moveTo(32, 18);
      ctx.lineTo(32, 45);
      ctx.moveTo(18, 18);
      ctx.lineTo(24, 13);
      ctx.lineTo(50, 13);
      ctx.lineTo(50, 40);
      ctx.lineTo(46, 45);
      ctx.moveTo(46, 18);
      ctx.lineTo(50, 13);
      ctx.stroke();
      // tiny lotus motif
      ctx.fillStyle = rgba(dark, 0.55);
      lotusPetal(ctx, 25, 38, 7, 3, -0.4, rgba(dark, 0.5));
      lotusPetal(ctx, 25, 38, 8, 3, 0, rgba(dark, 0.55));
      lotusPetal(ctx, 25, 38, 7, 3, 0.4, rgba(dark, 0.5));
    } else {
      // round paper ball lantern
      const g = ctx.createRadialGradient(30, 26, 2, 32, 30, 17);
      g.addColorStop(0, 'rgba(255,250,225,1)');
      g.addColorStop(0.35, rgba(light));
      g.addColorStop(1, rgba(base));
      ctx.fillStyle = g;
      ellipse(ctx, 32, 30, 16, 15);
      ctx.fill();
      ctx.strokeStyle = rgba(dark, 0.45);
      ctx.lineWidth = 0.9;
      for (const k of [-10, -5, 0, 5, 10]) {
        ctx.beginPath();
        ctx.ellipse(32, 30, Math.abs(Math.cos((k / 16) * 1.4)) * 16 * (1 - Math.abs(k) / 22), 15, 0, -Math.PI / 2, Math.PI / 2, k < 0);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(120,60,35,0.95)';
      ctx.fillRect(26, 13.5, 12, 3);
      ctx.fillRect(26, 43.5, 12, 3);
    }
    grain(ctx, 64, 56, 120, 0.12, 11);
  });
}

// ---------------------------------------------------------------- rosary beads

export type BeadWood = 'nau' | 'do' | 'den';

const BEAD_PAL: Record<BeadWood, [number, number, number]> = {
  nau: [0xd59a5e, 0x8a5130, 0x3c2012],
  do: [0xe0685a, 0x9c2a22, 0x3e0d0b],
  den: [0x7a6a62, 0x2e2622, 0x0c0908],
};

export function makeBead(scene: Phaser.Scene, wood: BeadWood): string {
  const [hi, mid, lo] = BEAD_PAL[wood] ?? BEAD_PAL.nau;
  return bakeCanvas(scene, `spr-bead-${wood}`, 28, 28, (ctx) => {
    const g = ctx.createRadialGradient(10, 9, 1, 14, 14, 13);
    g.addColorStop(0, rgba(hi));
    g.addColorStop(0.55, rgba(mid));
    g.addColorStop(1, rgba(lo));
    ctx.fillStyle = g;
    ellipse(ctx, 14, 14, 12.5, 12.5);
    ctx.fill();
    // wood grain rings
    ctx.save();
    ellipse(ctx, 14, 14, 12.5, 12.5);
    ctx.clip();
    ctx.strokeStyle = rgba(lo, 0.25);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(14, 14 + (i - 2) * 4.5, 14, 3 + i * 0.4, 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    softDot(ctx, 9.5, 8.5, 5, 0xffffff, 0.55);
    softDot(ctx, 18, 21, 6, mixColor(hi, 0xffcc88, 0.5), 0.18);
  });
}

// ---------------------------------------------------------------- decorations

export function makeRipple(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-ripple', 96, 48, (ctx) => {
    // flattened ring (perspective on water), white; tint as needed
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ellipse(ctx, 48, 24, 44, 20);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.2;
    ellipse(ctx, 48, 24, 34, 15);
    ctx.stroke();
  });
}

export function makePetal(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-petal', 16, 12, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 16, 12);
    g.addColorStop(0, '#fff0f3');
    g.addColorStop(0.6, '#f6a9bd');
    g.addColorStop(1, '#e27d9a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(1, 6);
    ctx.bezierCurveTo(4, 0, 12, 0, 15, 5);
    ctx.bezierCurveTo(12, 11, 4, 12, 1, 6);
    ctx.fill();
  });
}

export function makeLeaf(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-bodhi-leaf', 28, 38, (ctx) => {
    // bodhi (heart-shaped with long drip tip), pointing down
    const g = ctx.createLinearGradient(0, 0, 28, 38);
    g.addColorStop(0, '#9cc56a');
    g.addColorStop(1, '#4f8a3a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(14, 4);
    ctx.bezierCurveTo(6, -1, -1, 8, 3, 16);
    ctx.bezierCurveTo(6, 22, 11, 26, 14, 37);
    ctx.bezierCurveTo(17, 26, 22, 22, 25, 16);
    ctx.bezierCurveTo(29, 8, 22, -1, 14, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,245,200,0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(14, 3);
    ctx.lineTo(14, 34);
    for (let i = 0; i < 4; i++) {
      const y = 8 + i * 5;
      ctx.moveTo(14, y + 3);
      ctx.quadraticCurveTo(9, y + 1, 5, y);
      ctx.moveTo(14, y + 3);
      ctx.quadraticCurveTo(19, y + 1, 23, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(13.3, 0, 1.4, 5);
  });
}

export function makeRose(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-rose', 24, 24, (ctx) => {
    softDot(ctx, 12, 12, 11, 0xd63c55, 0.95, 0.75);
    const r = mulberry(19);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      const d = 8 - i * 0.8;
      ctx.fillStyle = rgba(mixColor(0xb5243e, 0xf47a8f, i / 9), 0.9);
      ellipse(ctx, 12 + Math.cos(a) * d * 0.5, 12 + Math.sin(a) * d * 0.5, d * 0.75 + 1, d * 0.5 + 1, a + r());
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(110,15,35,0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(12, 12, 3, 0, 4.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(12, 12, 6, 1, 5.8);
    ctx.stroke();
  });
}

export function makeRedLantern(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-red-lantern', 40, 64, (ctx) => {
    // string
    ctx.strokeStyle = '#5a3a1e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(20, 8);
    ctx.stroke();
    // caps
    ctx.fillStyle = '#d7a83c';
    ctx.fillRect(13, 7, 14, 4);
    ctx.fillRect(13, 43, 14, 4);
    // body
    const g = ctx.createRadialGradient(17, 22, 2, 20, 27, 19);
    g.addColorStop(0, '#ffcf7a');
    g.addColorStop(0.35, '#f2513a');
    g.addColorStop(1, '#9c1a17');
    ctx.fillStyle = g;
    ellipse(ctx, 20, 27, 18, 16.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,20,15,0.55)';
    ctx.lineWidth = 0.9;
    for (const rx of [6, 12]) {
      ellipse(ctx, 20, 27, rx, 16.5);
      ctx.stroke();
    }
    // tassel
    ctx.strokeStyle = '#e0b04a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 47);
    ctx.lineTo(20, 51);
    ctx.stroke();
    ctx.fillStyle = '#e04030';
    ctx.beginPath();
    ctx.moveTo(17, 51);
    ctx.lineTo(23, 51);
    ctx.lineTo(24, 63);
    ctx.lineTo(16, 63);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,20,20,0.6)';
    for (let x = 17; x <= 23; x += 2) {
      ctx.beginPath();
      ctx.moveTo(x, 53);
      ctx.lineTo(x + (x - 20) * 0.2, 63);
      ctx.stroke();
    }
  });
}

export function makeFirefly(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-firefly', 16, 16, (ctx) => {
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(250,255,210,1)');
    g.addColorStop(0.25, 'rgba(220,250,140,0.85)');
    g.addColorStop(0.6, 'rgba(170,230,90,0.25)');
    g.addColorStop(1, 'rgba(150,220,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
  });
}

/** Thin horizontal water glint (for shimmer). 48×6. */
export function makeGlint(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'spr-glint', 48, 6, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 48, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ellipse(ctx, 24, 3, 24, 1.6);
    ctx.fill();
  });
}
