/**
 * Water areas: Hồ Sen (lotus pond) and Bờ Sông (riverbank for flower lanterns).
 * All art is painted on canvases once (baked, keyed by quantised night) and
 * animated with a handful of cheap sprites.
 */
import type Phaser from 'phaser';
import type { AreaArtFn, AreaArtResult, ArtContext } from './types';
import { GAME_H, GAME_W } from './types';
import { bakeCanvas, makeFirefly, makeGlint, makeGlow, makeRipple, mixColor, mulberry, rgba, softDot, type Ctx } from './sprites';
import { SKY_CELESTIAL_REGISTRY } from './sky';

export const WORLD_WIDTH_WATER = { 'ho-sen': 900, 'bo-song': 1200 } as const;

/** River band on bo-song (world y): lanterns float between these lines, left → right. */
export const RIVER_BAND = { top: 540, bottom: 730 } as const;

/** Bo-song: y where the far bank meets the water. */
const RIVER_HORIZON = 452;
/** Ho-sen: y where the far bank meets the pond. */
const POND_HORIZON = 462;

// ------------------------------------------------------------------ palette

interface Pal {
  n: number;
  dusk: number;
  sky: number;
  hillFar: number;
  hillMid: number;
  hillNear: number;
  mist: number;
  tree: number;
  treeDark: number;
  treeLight: number;
  waterTop: number;
  waterBot: number;
  waterHi: number;
  leaf: number;
  leafDark: number;
  leafLight: number;
  grass: number;
  grassDark: number;
  earth: number;
  stone: number;
  stoneDark: number;
  stoneLight: number;
  wood: number;
  roof: number;
  lotus: number;
  lotusLight: number;
}

function makePal(night: number): Pal {
  const n = Math.max(0, Math.min(1, night));
  const dusk = Math.max(0, 1 - Math.abs(n - 0.3) / 0.3);
  const NIGHT = 0x121838;
  const f = (c: number, k = 1): number => {
    const warm = mixColor(c, 0xeea08e, Math.min(0.55, dusk * 0.3 * k));
    return mixColor(warm, NIGHT, n * 0.68 * k);
  };
  return {
    n,
    dusk,
    sky: f(0xe9eee6),
    hillFar: f(0xa9bccb, 0.95),
    hillMid: f(0x8fa9b0, 0.95),
    hillNear: f(0x6f8f86),
    mist: f(0xf2f1ea, 0.85 + dusk * 0.5),
    tree: f(0x557e4f),
    treeDark: f(0x2f5238),
    treeLight: f(0x8db36a),
    waterTop: f(0xb7d3cf, 0.9 + dusk * 0.6),
    waterBot: f(0x4f8687),
    waterHi: f(0xf3f6ec, 0.6),
    leaf: f(0x5b9a4c),
    leafDark: f(0x2f6b3b),
    leafLight: f(0x9cc970),
    grass: f(0x86a65a),
    grassDark: f(0x4f7340),
    earth: f(0xa88c68),
    stone: f(0xb9b2a2),
    stoneDark: f(0x7d776d),
    stoneLight: f(0xe2dccb),
    wood: f(0x7a3f2a),
    roof: f(0x6e5048),
    lotus: f(0xf08fb0, 0.75),
    lotusLight: f(0xfde7ee, 0.7),
  };
}

const nq = (night: number): number => Math.round(Math.max(0, Math.min(1, night)) * 4);

// ------------------------------------------------------------------ painting primitives

function ridge(ctx: Ctx, w: number, baseY: number, amp: number, seed: number, color: number, bottom: number, freq = 1, fade = -1): void {
  const r = mulberry(seed);
  const ph = [r() * 6, r() * 6, r() * 6];
  if (fade >= 0) {
    const g = ctx.createLinearGradient(0, baseY - amp, 0, baseY + 30);
    g.addColorStop(0, rgba(mixColor(color, 0x000000, 0.04)));
    g.addColorStop(1, rgba(mixColor(color, fade, 0.45)));
    ctx.fillStyle = g;
  } else ctx.fillStyle = rgba(color);
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  for (let x = 0; x <= w; x += 6) {
    const t = x / w;
    const y =
      baseY -
      amp *
        (0.55 * Math.max(0, Math.sin(t * Math.PI * 2.2 * freq + ph[0])) ** 1.3 +
          0.3 * Math.sin(t * Math.PI * 5.3 * freq + ph[1]) * 0.5 +
          0.15 * Math.sin(t * Math.PI * 13 * freq + ph[2]) * 0.5 +
          0.25);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, bottom);
  ctx.closePath();
  ctx.fill();
}

function mistBand(ctx: Ctx, w: number, y: number, h: number, color: number, a: number): void {
  const g = ctx.createLinearGradient(0, y - h, 0, y + h);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.5, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y - h, w, h * 2);
}

/** Round deciduous tree canopy clump made of dabs. */
function treeClump(ctx: Ctx, x: number, y: number, s: number, p: Pal, r: () => number): void {
  ctx.fillStyle = rgba(p.treeDark);
  ctx.fillRect(x - 1.5 * s, y - 8 * s, 3 * s, 10 * s);
  const dabs = 14;
  for (let i = 0; i < dabs; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 13 * s;
    const cx = x + Math.cos(a) * d * 1.1;
    const cy = y - 20 * s + Math.sin(a) * d * 0.8;
    const rad = (7 + r() * 6) * s;
    const t = (cy - (y - 34 * s)) / (28 * s);
    ctx.fillStyle = rgba(mixColor(p.treeLight, p.treeDark, Math.max(0, Math.min(1, t * 0.9 + r() * 0.2))), 0.95);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Bamboo clump (lũy tre): leaning culms with feathery leaf sprays. */
function bamboo(ctx: Ctx, x: number, y: number, h: number, p: Pal, r: () => number, culms = 7): void {
  for (let i = 0; i < culms; i++) {
    const lean = (r() - 0.5) * 0.7 + (i - culms / 2) * 0.06;
    const hh = h * (0.7 + r() * 0.35);
    const x0 = x + (r() - 0.5) * 14;
    const x1 = x0 + Math.sin(lean) * hh;
    const y1 = y - Math.cos(lean) * hh;
    ctx.strokeStyle = rgba(mixColor(p.tree, p.treeDark, 0.4));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.3, y - hh * 0.6, x1, y1);
    ctx.stroke();
    // leaf sprays along the upper culm
    for (let k = 0; k < 9; k++) {
      const t = 0.35 + (k / 9) * 0.65;
      const lx = x0 + (x1 - x0) * t * t;
      const ly = y - hh * t;
      const col = mixColor(p.treeLight, p.treeDark, 0.2 + r() * 0.7);
      ctx.fillStyle = rgba(col, 0.92);
      const side = r() < 0.5 ? -1 : 1;
      for (let j = 0; j < 5; j++) {
        // narrow tapered leaves drooping outward
        const a = Math.PI / 2 + side * (0.5 + r() * 0.9) + (r() - 0.5) * 0.4;
        const len = 7 + r() * 7;
        const mx = lx + Math.cos(a) * len * 0.5;
        const my = ly + Math.sin(a) * len * 0.5;
        ctx.beginPath();
        ctx.ellipse(mx, my, len * 0.5, 1.3, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.lineCap = 'butt';
}

/** Lotus leaf seen in perspective (flattened disc with notch, veins, rim). */
function lotusLeaf(ctx: Ctx, x: number, y: number, rx: number, squash: number, rot: number, p: Pal, r: () => number, shadow = true): void {
  const ry = rx * squash;
  if (shadow) {
    ctx.fillStyle = rgba(p.waterBot, 0.45);
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.08, y + ry * 0.35, rx * 1.02, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const notch = 0.22;
  const base = mixColor(p.leaf, p.leafDark, r() * 0.35);
  const g = ctx.createRadialGradient(x - rx * 0.2, y - ry * 0.3, rx * 0.1, x, y, rx);
  g.addColorStop(0, rgba(mixColor(base, p.leafLight, 0.45)));
  g.addColorStop(0.7, rgba(base));
  g.addColorStop(1, rgba(mixColor(base, p.leafDark, 0.5)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.ellipse(x, y, rx, ry, 0, rot + notch, rot + Math.PI * 2 - notch);
  ctx.closePath();
  ctx.fill();
  // rim light (upturned edge)
  ctx.strokeStyle = rgba(p.leafLight, 0.55);
  ctx.lineWidth = Math.max(1, rx * 0.05);
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.97, ry * 0.95, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  // veins
  ctx.strokeStyle = rgba(p.leafLight, 0.32);
  ctx.lineWidth = 0.8;
  const veins = 9;
  for (let i = 0; i < veins; i++) {
    const a = rot + notch + ((Math.PI * 2 - notch * 2) * (i + 0.5)) / veins;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * rx * 0.88, y + Math.sin(a) * ry * 0.88);
    ctx.stroke();
  }
  softDot(ctx, x, y, rx * 0.12, p.leafLight, 0.5);
}

/** Side-view lotus flower on a stem; (x,y) = stem base on the water. */
function lotusFlower(ctx: Ctx, x: number, y: number, s: number, white: boolean, p: Pal, stem: number, open = 1): void {
  const tip = white ? p.lotusLight : p.lotus;
  const baseC = white ? mixColor(p.lotusLight, 0xfff8e8, 0.3) : mixColor(p.lotusLight, p.lotus, 0.35);
  const fy = y - stem;
  ctx.strokeStyle = rgba(p.leafDark);
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 3 * s, y - stem * 0.5, x, fy);
  ctx.stroke();
  const petal = (a: number, len: number, wid: number, alpha: number): void => {
    ctx.save();
    ctx.translate(x, fy);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, rgba(baseC, alpha));
    g.addColorStop(1, rgba(tip, alpha));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-wid, -len * 0.3, -wid * 0.6, -len * 0.85, 0, -len);
    ctx.bezierCurveTo(wid * 0.6, -len * 0.85, wid, -len * 0.3, 0, 0);
    ctx.fill();
    ctx.restore();
  };
  if (open > 0.5) {
    for (const a of [-1.2, 1.2]) petal(a, 13 * s, 5 * s, 0.95);
    for (const a of [-0.75, 0.75]) petal(a, 15 * s, 6 * s, 0.95);
    softDot(ctx, x, fy - 6 * s, 5 * s, 0xf8d860, 0.9);
    for (const a of [-0.3, 0.3]) petal(a, 16 * s, 6.5 * s, 1);
    petal(0, 14 * s, 5.5 * s, 1);
  } else {
    // bud
    ctx.save();
    ctx.translate(x, fy);
    const g = ctx.createLinearGradient(0, 0, 0, -18 * s);
    g.addColorStop(0, rgba(baseC));
    g.addColorStop(1, rgba(tip));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 2 * s);
    ctx.bezierCurveTo(-8 * s, -4 * s, -4 * s, -14 * s, 0, -19 * s);
    ctx.bezierCurveTo(4 * s, -14 * s, 8 * s, -4 * s, 0, 2 * s);
    ctx.fill();
    ctx.strokeStyle = rgba(tip, 0.6);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-3 * s, -9 * s, 0, -18 * s);
    ctx.stroke();
    ctx.restore();
  }
}

/** Stone lantern (đèn đá), (x,y) = bottom centre. ~ 34×86 at s=1. */
function stoneLantern(ctx: Ctx, x: number, y: number, s: number, p: Pal, lit: number): void {
  const st = (c: number) => rgba(c);
  ctx.fillStyle = rgba(0x000000, 0.18);
  ctx.beginPath();
  ctx.ellipse(x + 4 * s, y, 20 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const box = (cx: number, top: number, w: number, h: number): void => {
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, st(p.stoneLight));
    g.addColorStop(0.55, st(p.stone));
    g.addColorStop(1, st(p.stoneDark));
    ctx.fillStyle = g;
    ctx.fillRect(cx - w / 2, top, w, h);
  };
  box(x, y - 8 * s, 30 * s, 8 * s);
  box(x, y - 38 * s, 10 * s, 30 * s);
  box(x, y - 46 * s, 26 * s, 8 * s);
  box(x, y - 64 * s, 20 * s, 18 * s);
  // window light
  const wl = mixColor(0x3a3530, 0xffd27a, lit);
  ctx.fillStyle = rgba(wl);
  ctx.fillRect(x - 5 * s, y - 60 * s, 10 * s, 10 * s);
  // roof
  ctx.fillStyle = st(p.stoneDark);
  ctx.beginPath();
  ctx.moveTo(x - 20 * s, y - 64 * s);
  ctx.quadraticCurveTo(x - 10 * s, y - 68 * s, x - 4 * s, y - 78 * s);
  ctx.lineTo(x + 4 * s, y - 78 * s);
  ctx.quadraticCurveTo(x + 10 * s, y - 68 * s, x + 20 * s, y - 64 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = st(p.stone);
  ctx.beginPath();
  ctx.arc(x, y - 81 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Northern-style pavilion with upturned roof corners; (x,y) = water line centre. */
function pavilion(ctx: Ctx, x: number, y: number, s: number, p: Pal, lit: number): void {
  const w = 70 * s;
  // stilts
  ctx.fillStyle = rgba(p.stoneDark);
  for (const dx of [-28, -10, 10, 28]) ctx.fillRect(x + dx * s - 2 * s, y - 14 * s, 4 * s, 14 * s);
  // floor
  ctx.fillStyle = rgba(p.stone);
  ctx.fillRect(x - w / 2 - 4 * s, y - 18 * s, w + 8 * s, 5 * s);
  // interior glow
  const inside = mixColor(mixColor(p.wood, 0x000000, 0.35), 0xffc870, lit * 0.9);
  ctx.fillStyle = rgba(inside);
  ctx.fillRect(x - w / 2 + 3 * s, y - 44 * s, w - 6 * s, 26 * s);
  // pillars
  ctx.fillStyle = rgba(p.wood);
  for (const dx of [-32, -11, 11, 32]) ctx.fillRect(x + dx * s - 2 * s, y - 46 * s, 4 * s, 28 * s);
  // railing
  ctx.strokeStyle = rgba(p.wood);
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 26 * s);
  ctx.lineTo(x + w / 2, y - 26 * s);
  ctx.stroke();
  // roof: two-tier with upturned corners (đao)
  const roofTier = (ry: number, rw: number, rh: number): void => {
    ctx.fillStyle = rgba(p.roof);
    ctx.beginPath();
    ctx.moveTo(x - rw / 2 - 10 * s, ry - 8 * s);
    ctx.quadraticCurveTo(x - rw / 2, ry + 2 * s, x - rw / 2 + 8 * s, ry);
    ctx.lineTo(x + rw / 2 - 8 * s, ry);
    ctx.quadraticCurveTo(x + rw / 2, ry + 2 * s, x + rw / 2 + 10 * s, ry - 8 * s);
    ctx.quadraticCurveTo(x + rw / 2 - 6 * s, ry - rh * 0.5, x + rw / 4, ry - rh);
    ctx.lineTo(x - rw / 4, ry - rh);
    ctx.quadraticCurveTo(x - rw / 2 + 6 * s, ry - rh * 0.5, x - rw / 2 - 10 * s, ry - 8 * s);
    ctx.fill();
    ctx.strokeStyle = rgba(mixColor(p.roof, 0xffffff, 0.25));
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(x - rw / 4, ry - rh);
    ctx.lineTo(x + rw / 4, ry - rh);
    ctx.stroke();
  };
  roofTier(y - 44 * s, w + 16 * s, 18 * s);
  roofTier(y - 64 * s, w * 0.6, 14 * s);
  ctx.fillStyle = rgba(p.roof);
  ctx.beginPath();
  ctx.arc(x, y - 80 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Stone arch bridge (side view). Water line at y = h. */
function archBridge(ctx: Ctx, w: number, h: number, p: Pal): void {
  const deckTop = (x: number): number => {
    const t = x / w;
    return h * 0.08 + (1 - Math.sin(Math.PI * t)) * h * 0.55 * (0.4 + 0.6 * Math.abs(t - 0.5) * 2);
  };
  const archR = w * 0.24;
  const cx = w / 2;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, deckTop(x) + 14);
    ctx.lineTo(w, h);
    ctx.lineTo(cx + archR, h);
    ctx.ellipse(cx, h, archR, h * 0.66, 0, 0, Math.PI, true);
    ctx.closePath();
  };
  // body
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgba(p.stoneLight));
  g.addColorStop(1, rgba(mixColor(p.stone, p.stoneDark, 0.4)));
  ctx.fillStyle = g;
  path();
  ctx.fill();
  // stone block pattern
  ctx.save();
  path();
  ctx.clip();
  const r = mulberry(99);
  ctx.strokeStyle = rgba(p.stoneDark, 0.35);
  ctx.lineWidth = 1;
  for (let y = 10; y < h; y += 11) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    for (let x = (y / 11) % 2 ? 0 : 12; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 11);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 70; i++) softDot(ctx, r() * w, r() * h, 4 + r() * 10, r() > 0.5 ? p.stoneLight : p.stoneDark, 0.18);
  // moss
  for (let i = 0; i < 26; i++) softDot(ctx, r() * w, h - r() * 30, 3 + r() * 8, p.grassDark, 0.3);
  ctx.restore();
  // arch voussoirs
  ctx.strokeStyle = rgba(p.stoneDark, 0.65);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, h, archR + 2, h * 0.66 + 2, 0, Math.PI, 0);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let k = 1; k < 14; k++) {
    const a = Math.PI + (Math.PI * k) / 14;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * archR, h + Math.sin(a) * h * 0.66);
    ctx.lineTo(cx + Math.cos(a) * (archR + 10), h + Math.sin(a) * (h * 0.66 + 10));
    ctx.stroke();
  }
  // inner arch shadow
  ctx.fillStyle = rgba(p.stoneDark, 0.25);
  ctx.beginPath();
  ctx.ellipse(cx, h, archR, h * 0.66, 0, Math.PI, 0);
  ctx.ellipse(cx + 6, h, archR - 6, h * 0.6, 0, 0, Math.PI, true);
  ctx.fill();
  // railing
  ctx.fillStyle = rgba(p.stoneLight);
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) ctx.lineTo(x, deckTop(x));
  for (let x = w; x >= 0; x -= 4) ctx.lineTo(x, deckTop(x) + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(p.stone);
  for (let x = 6; x < w; x += 22) {
    const y = deckTop(x);
    ctx.fillRect(x - 2, y - 4, 5, 18);
  }
  ctx.fillStyle = rgba(mixColor(p.stone, p.stoneDark, 0.3));
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) ctx.lineTo(x, deckTop(x) + 12);
  for (let x = w; x >= 0; x -= 4) ctx.lineTo(x, deckTop(x) + 16);
  ctx.closePath();
  ctx.fill();
}

/** Hanging willow strand made of tiny leaf dabs. */
function willowStrand(ctx: Ctx, sx: number, sy: number, len: number, sway: number, s: number, col: number, r: () => number): void {
  const steps = Math.max(6, Math.floor(len / (4 * s)));
  for (let k = 0; k < steps; k++) {
    const t = k / steps;
    const x = sx + sway * Math.sin(t * Math.PI * 0.5) + Math.sin(t * 6 + sx) * 1.5 * s;
    const y = sy + len * t;
    ctx.fillStyle = rgba(mixColor(col, 0xffffff, (r() - 0.5) * 0.15), 0.85 - t * 0.25);
    ctx.beginPath();
    ctx.ellipse(x + (r() - 0.5) * 3 * s, y, 1.3 * s, 3.4 * s, (r() - 0.5) * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Weeping willow (liễu): trunk, arching branches, curtains of strands. (x,y) = trunk base. */
function willow(ctx: Ctx, x: number, y: number, s: number, p: Pal, r: () => number, trunk = true): void {
  const bark = mixColor(p.treeDark, 0x3a2a20, 0.5);
  const topX = x + 6 * s;
  const topY = y - 160 * s;
  const branches: { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number }[] = [];
  const nb = 6;
  for (let i = 0; i < nb; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    const spread = (40 + r() * 90) * s;
    branches.push({
      x0: topX + (r() - 0.5) * 10 * s,
      y0: topY + r() * 40 * s,
      cx: topX + dir * spread * 0.4,
      cy: topY - (40 + r() * 40) * s,
      x1: topX + dir * spread,
      y1: topY - (10 + r() * 30) * s,
    });
  }
  if (trunk) {
    ctx.fillStyle = rgba(bark);
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, y);
    ctx.bezierCurveTo(x - 4 * s, y - 60 * s, x - 16 * s, y - 110 * s, topX - 4 * s, topY);
    ctx.lineTo(topX + 6 * s, topY);
    ctx.bezierCurveTo(x, y - 110 * s, x + 12 * s, y - 60 * s, x + 10 * s, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(bark);
    ctx.lineCap = 'round';
    for (const b of branches) {
      ctx.lineWidth = 3.2 * s;
      ctx.beginPath();
      ctx.moveTo(b.x0, b.y0);
      ctx.quadraticCurveTo(b.cx, b.cy, b.x1, b.y1);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // soft crown mass
  for (let i = 0; i < 9; i++) {
    softDot(ctx, topX + (r() - 0.5) * 150 * s, topY - (10 + r() * 30) * s, (26 + r() * 22) * s, mixColor(p.tree, p.treeDark, 0.3 + r() * 0.4), 0.45, 0.35);
  }
  // strands: dark ones behind, lighter in front
  const strands = 110;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < strands / 2; i++) {
      const b = branches[Math.floor(r() * branches.length)];
      const t = 0.2 + r() * 0.8;
      const u = 1 - t;
      const sx = u * u * b.x0 + 2 * u * t * b.cx + t * t * b.x1;
      const sy = u * u * b.y0 + 2 * u * t * b.cy + t * t * b.y1;
      const len = (90 + r() * 110) * s * (0.6 + t * 0.5);
      const col = pass === 0 ? mixColor(p.tree, p.treeDark, 0.3 + r() * 0.4) : mixColor(p.treeLight, p.tree, r() * 0.6);
      willowStrand(ctx, sx, sy, len, (b.x1 > topX ? 1 : -1) * (4 + r() * 10) * s, s, col, r);
    }
  }
}

/** Willow curtain hanging from above the frame (foreground). */
function willowCurtain(ctx: Ctx, w: number, h: number, p: Pal, r: () => number): void {
  const branch = (t: number): { x: number; y: number } => ({ x: -20 + t * w * 0.95, y: -10 + Math.sin(t * Math.PI) * 30 + t * 20 });
  ctx.strokeStyle = rgba(mixColor(p.treeDark, 0x2a2018, 0.5));
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let t = 0; t <= 1; t += 0.05) {
    const b = branch(t);
    if (t === 0) ctx.moveTo(b.x, b.y);
    else ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 70; i++) {
      const t = Math.pow(r(), 0.8);
      const b = branch(t);
      const len = (h - 40) * (1 - t * 0.75) * (0.55 + r() * 0.45);
      const col = pass === 0 ? mixColor(p.tree, p.treeDark, 0.35 + r() * 0.4) : mixColor(p.treeLight, p.tree, r() * 0.7);
      willowStrand(ctx, b.x + (r() - 0.5) * 8, b.y, len, 6 + r() * 12, 1.4, col, r);
    }
  }
}

/** Sampan (thuyền nan / đò) side view, (x,y) = waterline centre. */
function sampan(ctx: Ctx, x: number, y: number, s: number, p: Pal, lit: number): void {
  const hull = mixColor(0x3c2a20, p.treeDark, 0.3);
  ctx.fillStyle = rgba(mixColor(hull, 0x121838, p.n * 0.5));
  ctx.beginPath();
  ctx.moveTo(x - 46 * s, y - 9 * s);
  ctx.quadraticCurveTo(x, y + 7 * s, x + 46 * s, y - 9 * s);
  ctx.quadraticCurveTo(x, y - 2 * s, x - 46 * s, y - 9 * s);
  ctx.fill();
  // canopy (mui)
  ctx.fillStyle = rgba(mixColor(0x6b5a3a, 0x121838, p.n * 0.6));
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y - 4 * s);
  ctx.quadraticCurveTo(x, y - 24 * s, x + 16 * s, y - 4 * s);
  ctx.closePath();
  ctx.fill();
  if (lit > 0.05) softDot(ctx, x + 2 * s, y - 8 * s, 6 * s, 0xffd27a, lit);
  // boatman with conical hat + pole
  ctx.fillStyle = rgba(mixColor(0x2a2a30, 0x121838, p.n * 0.4));
  ctx.fillRect(x + 26 * s, y - 20 * s, 4 * s, 13 * s);
  ctx.beginPath();
  ctx.moveTo(x + 22 * s, y - 20 * s);
  ctx.lineTo(x + 28 * s, y - 27 * s);
  ctx.lineTo(x + 34 * s, y - 20 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(x + 18 * s, y - 34 * s);
  ctx.lineTo(x + 40 * s, y + 4 * s);
  ctx.stroke();
}

/** Water surface: vertical gradient + soft horizontal painterly strokes. */
function waterFill(ctx: Ctx, w: number, y0: number, y1: number, p: Pal, seed: number, fadeTop: number): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(p.waterTop));
  g.addColorStop(0.35, rgba(mixColor(p.waterTop, p.waterBot, 0.55)));
  g.addColorStop(1, rgba(p.waterBot));
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, y1 - y0);
  const r = mulberry(seed);
  for (let i = 0; i < Math.floor(w / 3); i++) {
    const y = y0 + Math.pow(r(), 1.2) * (y1 - y0);
    const t = (y - y0) / (y1 - y0);
    const len = 20 + r() * 90 * (0.4 + t);
    const light = r() < 0.55;
    ctx.fillStyle = light ? rgba(p.waterHi, 0.08 + (1 - t) * 0.1) : rgba(p.waterBot, 0.12 + t * 0.08);
    ctx.beginPath();
    ctx.ellipse(r() * w, y, len, 0.8 + t * 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (fadeTop > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const fg = ctx.createLinearGradient(0, y0, 0, y0 + fadeTop);
    fg.addColorStop(0, 'rgba(0,0,0,1)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, y0, w, fadeTop);
    ctx.restore();
  }
}

/** Grassy bank with irregular top edge from y0 down to bottom. */
function bank(ctx: Ctx, w: number, topAt: (x: number) => number, bottom: number, p: Pal, seed: number): void {
  const r = mulberry(seed);
  // wet edge shadow on water
  ctx.fillStyle = rgba(p.waterBot, 0.5);
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, topAt(x) - 6);
  ctx.lineTo(w, bottom);
  ctx.fill();
  const g = ctx.createLinearGradient(0, Math.min(topAt(0), topAt(w / 2)) - 20, 0, bottom);
  g.addColorStop(0, rgba(mixColor(p.grass, p.earth, 0.3)));
  g.addColorStop(0.15, rgba(p.grass));
  g.addColorStop(1, rgba(p.grassDark));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, topAt(x));
  ctx.lineTo(w, bottom);
  ctx.closePath();
  ctx.fill();
  // stone edging along the waterline
  for (let x = 0; x < w; x += 14 + r() * 12) {
    const y = topAt(x);
    const rw = 8 + r() * 10;
    ctx.fillStyle = rgba(mixColor(p.stone, p.stoneDark, r() * 0.6));
    ctx.beginPath();
    ctx.ellipse(x, y + 2, rw, 4 + r() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(p.stoneLight, 0.4);
    ctx.beginPath();
    ctx.ellipse(x - 2, y, rw * 0.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // wildflowers & pebbles
  for (let i = 0; i < w / 14; i++) {
    const x = r() * w;
    const y = topAt(x) + 20 + r() * (bottom - topAt(x) - 20);
    const k = r();
    if (k < 0.5) softDot(ctx, x, y, 1.6 + r(), k < 0.25 ? 0xfff6e0 : 0xf6d36a, 0.55 * (1 - p.n * 0.6), 0.5);
    else if (k < 0.7) {
      ctx.fillStyle = rgba(mixColor(p.stone, p.stoneDark, r()), 0.7);
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + r() * 4, 1.5 + r() * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else softDot(ctx, x, y, 14 + r() * 18, mixColor(p.grassDark, p.leafDark, 0.5), 0.25);
  }
  // grass tufts
  ctx.lineCap = 'round';
  for (let i = 0; i < w / 4; i++) {
    const x = r() * w;
    const y = topAt(x) + 8 + r() * (bottom - topAt(x) - 8);
    ctx.strokeStyle = rgba(mixColor(p.leafLight, p.grassDark, r()), 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 6, y - 4 - r() * 8);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function reeds(ctx: Ctx, x: number, y: number, h: number, n: number, p: Pal, r: () => number): void {
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const bx = x + (r() - 0.5) * 40;
    const hh = h * (0.5 + r() * 0.6);
    const lean = (r() - 0.5) * 0.5;
    ctx.strokeStyle = rgba(mixColor(p.leaf, p.leafDark, r()), 0.95);
    ctx.lineWidth = 2 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.quadraticCurveTo(bx + lean * hh * 0.3, y - hh * 0.6, bx + lean * hh, y - hh);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// ------------------------------------------------------------------ object helpers

type Img = Phaser.GameObjects.Image;

function put(ctx: ArtContext, layer: keyof ArtContext['layers'], x: number, y: number, key: string, ox = 0, oy = 0): Img {
  const im = ctx.scene.add.image(x, y, key).setOrigin(ox, oy);
  ctx.layers[layer].add(im);
  return im;
}

/** Width a parallax layer must cover. */
function layerW(worldWidth: number, s: number): number {
  return Math.ceil(GAME_W + (worldWidth - GAME_W) * s + 40);
}

interface Shimmer {
  img: Img;
  x0: number;
  speed: number;
  phase: number;
  range: number;
  baseA: number;
}

function makeShimmers(
  ctx: ArtContext,
  n: number,
  area: { x: number; y: number; w: number; h: number },
  seed: number,
  avoid?: (x: number, y: number) => boolean,
): Shimmer[] {
  const key = makeGlint(ctx.scene);
  const r = mulberry(seed);
  const out: Shimmer[] = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 20) {
    const x = area.x + r() * area.w;
    const y = area.y + r() * area.h;
    if (avoid && avoid(x, y)) continue;
    const t = (y - area.y) / area.h;
    const img = put(ctx, 'main', x, y, key, 0.5, 0.5);
    const baseA = (0.22 + r() * 0.3) * (1 - ctx.night * 0.55);
    img.setScale(0.5 + t * 0.9 + r() * 0.4, 0.6 + t * 0.6).setAlpha(baseA).setBlendMode('ADD');
    img.setTint(ctx.night > 0.5 ? 0xb8c4ff : 0xffffff);
    out.push({ img, x0: x, speed: 0.0004 + r() * 0.0006, phase: r() * 10, range: 10 + r() * 16, baseA });
  }
  return out;
}

function updateShimmers(list: Shimmer[], time: number): void {
  for (const s of list) {
    const ph = time * s.speed + s.phase;
    s.img.x = s.x0 + Math.sin(ph) * s.range;
    s.img.alpha = s.baseA * (0.35 + 0.65 * Math.abs(Math.sin(ph * 1.7)));
  }
}

interface Ripple {
  img: Img;
  t: number;
  life: number;
  active: boolean;
}

function makeRipples(ctx: ArtContext, n: number): Ripple[] {
  const key = makeRipple(ctx.scene);
  const out: Ripple[] = [];
  for (let i = 0; i < n; i++) {
    const img = put(ctx, 'main', -999, -999, key, 0.5, 0.5).setVisible(false);
    out.push({ img, t: 0, life: 2600, active: false });
  }
  return out;
}

function updateRipples(list: Ripple[], delta: number, maxScale: number): void {
  for (const rp of list) {
    if (!rp.active) continue;
    rp.t += delta;
    const k = rp.t / rp.life;
    if (k >= 1) {
      rp.active = false;
      rp.img.setVisible(false);
      continue;
    }
    rp.img.setScale(0.15 + k * maxScale);
    rp.img.setAlpha((1 - k) * 0.55);
  }
}

function spawnRipple(list: Ripple[], x: number, y: number, depthScale: number): void {
  const rp = list.find((q) => !q.active);
  if (!rp) return;
  rp.active = true;
  rp.t = 0;
  rp.life = 2200 + Math.random() * 1200;
  rp.img.setPosition(x, y).setVisible(true).setAlpha(0.55).setScale(0.15 * depthScale);
}


/**
 * Reflection column of the sun/moon on water. The sky is screen-locked, so the
 * reflection keeps a fixed screen x: call `follow()` every frame.
 */
function celestialReflection(ctx: ArtContext, y: number, strength: number): { follow: (time: number) => void } {
  const { scene } = ctx;
  const night = ctx.night;
  const key = bakeCanvas(scene, 'water-celestial-refl', 140, 300, (c, w, h) => {
    const r = mulberry(3);
    for (let i = 0; i < 46; i++) {
      const t = r();
      const yy = t * h;
      const spread = 10 + t * 50;
      const len = 8 + r() * (20 + t * 30);
      c.fillStyle = `rgba(255,248,220,${0.75 - t * 0.45})`;
      c.beginPath();
      c.ellipse(w / 2 + (r() - 0.5) * spread * 2, yy, len, 1 + t * 1.6, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  const cel = scene.registry.get(SKY_CELESTIAL_REGISTRY) as { x: number; kind: string; vis: number; full?: boolean } | undefined;
  const celX = cel ? cel.x : GAME_W * 0.68;
  const isMoon = cel ? cel.kind === 'moon' : night > 0.5;
  const vis = cel ? cel.vis : 1;
  const a = strength * vis * (isMoon ? night * (cel?.full ? 0.9 : 0.6) : 0.45 * (1 - night));
  const img = put(ctx, 'main', celX, y, key, 0.5, 0).setBlendMode('ADD').setAlpha(a);
  img.setTint(isMoon ? 0xfff6dc : 0xffd9a0).setVisible(a > 0.02);
  const cam = scene.cameras.main;
  return {
    follow(time: number): void {
      img.x = cam.scrollX + celX;
      if (!ctx.reducedMotion) img.alpha = a * (0.85 + Math.sin(time * 0.002) * 0.15);
    },
  };
}

// ================================================================== HỒ SEN

const POND_CENTER = { x: 300, y: 742 };
const BRIDGE = { x: 470, w: 330, waterY: 642, h: 128 };

function inOpenWater(x: number, y: number): boolean {
  return ((x - POND_CENTER.x) / 175) ** 2 + ((y - POND_CENTER.y) / 82) ** 2 < 1;
}

function pondShore(x: number): number {
  // near-bank waterline (y) across the pond
  return 868 + Math.sin(x * 0.011) * 10 + Math.sin(x * 0.031 + 1) * 5 - (x < 90 ? (90 - x) * 0.6 : 0) - (x > 820 ? (x - 820) * 0.7 : 0);
}

export const drawHoSen: AreaArtFn = (ctx: ArtContext): AreaArtResult => {
  const { scene } = ctx;
  const W = ctx.worldWidth;
  const night = Math.max(0, Math.min(1, ctx.night));
  const q = nq(night);
  const p = makePal(q / 4);
  const lit = Math.max(0, (q / 4 - 0.35) / 0.65);

  // ---------- far: misty hills
  const farW = layerW(W, 0.3);
  const farKey = bakeCanvas(scene, `hs-far-${q}-${farW}`, farW, 520, (c, w) => {
    ridge(c, w, 330, 110, 3, p.hillFar, 520, 0.9, p.mist);
    mistBand(c, w, 360, 50, p.mist, 0.55);
    ridge(c, w, 400, 70, 8, p.hillMid, 520, 1.4, p.mist);
    mistBand(c, w, 420, 40, p.mist, 0.6);
    ridge(c, w, 445, 34, 12, mixColor(p.hillMid, p.hillNear, 0.5), 520, 2.2);
    mistBand(c, w, 455, 26, p.mist, 0.5);
  });
  put(ctx, 'far', -20, 0, farKey);

  // ---------- mid: far bank with trees, pavilion, reflection water
  const midW = layerW(W, 0.6);
  const midKey = bakeCanvas(scene, `hs-mid-${q}-${midW}`, midW, 600, (c, w) => {
    const H = POND_HORIZON;
    const drawBank = (): void => {
      const r = mulberry(21);
      // tree line
      for (let x = -10; x < w + 20; x += 18 + r() * 22) {
        if (x > 470 && x < 600) continue; // opening for the pavilion
        treeClump(c, x, H - 4, 0.8 + r() * 0.7, p, r);
      }
      bamboo(c, 140, H - 2, 110, p, r, 8);
      bamboo(c, 690, H - 2, 120, p, r, 8);
      willow(c, 420, H, 0.55, p, r);
      // low bank
      c.fillStyle = rgba(p.grassDark);
      c.beginPath();
      c.moveTo(0, H + 4);
      for (let x = 0; x <= w; x += 10) c.lineTo(x, H - 4 - Math.sin(x * 0.02) * 3);
      c.lineTo(w, H + 4);
      c.fill();
      pavilion(c, 535, H + 6, 1.05, p, lit);
    };
    // water band for reflections
    waterFill(c, w, H, 600, p, 33, 0);
    // reflection: redraw bank flipped & faded
    c.save();
    c.translate(0, H * 2 + 4);
    c.scale(1, -1);
    c.globalAlpha = 0.35;
    drawBank();
    c.restore();
    c.globalAlpha = 1;
    // blur the reflection with horizontal streaks of water colour
    const rr = mulberry(5);
    for (let i = 0; i < 160; i++) {
      c.fillStyle = rgba(rr() < 0.5 ? p.waterTop : p.waterHi, 0.12);
      c.fillRect(rr() * w, H + 2 + rr() * 140, 30 + rr() * 80, 1.2);
    }
    if (lit > 0) softDot(c, 535, H + 30, 34, 0xffc870, lit * 0.35);
    drawBank();
    mistBand(c, w, H - 70, 50, p.mist, 0.18);
  });
  put(ctx, 'mid', -20, 0, midKey);

  // ---------- main: pond water, reflections, lotus beds
  const pondTop = POND_HORIZON + 20;
  const pondKey = bakeCanvas(scene, `hs-pond-${q}-${W}`, W, GAME_H - pondTop, (c, w, h) => {
    c.translate(0, -pondTop);
    waterFill(c, w, pondTop, pondTop + h, p, 44, 90);
    // bridge reflection (drawn flipped below the water line)
    c.save();
    c.translate(BRIDGE.x, BRIDGE.waterY);
    c.scale(1, -0.9);
    c.translate(0, -BRIDGE.h);
    c.globalAlpha = 0.34;
    archBridge(c, BRIDGE.w, BRIDGE.h, p);
    c.restore();
    // a ripple-broken streaking over the reflection
    const r = mulberry(55);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = rgba(p.waterTop, 0.14);
      c.fillRect(BRIDGE.x + r() * BRIDGE.w, BRIDGE.waterY + 4 + r() * 100, 20 + r() * 60, 1.4);
    }
    // back lotus beds (behind the bridge line): small flattened leaves
    for (let i = 0; i < 70; i++) {
      const x = r() * w;
      const y = pondTop + 22 + r() * (BRIDGE.waterY - pondTop - 10);
      if (x > BRIDGE.x + 40 && x < BRIDGE.x + BRIDGE.w - 40 && y > BRIDGE.waterY - 60) continue;
      const depth = (y - pondTop) / (GAME_H - pondTop);
      lotusLeaf(c, x, y, 8 + depth * 30 + r() * 6, 0.3 + depth * 0.18, r() * 6, p, r);
    }
  });
  put(ctx, 'main', 0, pondTop, pondKey);
  const refl = celestialReflection(ctx, pondTop + 30, 0.8);

  const bridgeKey = bakeCanvas(scene, `hs-bridge-${q}`, BRIDGE.w, BRIDGE.h, (c, w, h) => archBridge(c, w, h, p));
  put(ctx, 'main', BRIDGE.x, BRIDGE.waterY - BRIDGE.h, bridgeKey);

  // front lotus beds (static), avoiding open water for fish
  const frontTop = BRIDGE.waterY - 6;
  const frontKey = bakeCanvas(scene, `hs-lotus-front-${q}-${W}`, W, GAME_H - frontTop, (c, w) => {
    c.translate(0, -frontTop);
    const r = mulberry(77);
    const items: { x: number; y: number }[] = [];
    for (let i = 0; i < 420 && items.length < 95; i++) {
      const x = r() * w;
      const y = frontTop + 10 + r() * (pondShore(x) - frontTop - 10);
      if (inOpenWater(x, y)) continue;
      if (x > BRIDGE.x + 20 && x < BRIDGE.x + BRIDGE.w - 20 && y < BRIDGE.waterY + 40) continue;
      items.push({ x, y });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      const depth = (it.y - pondTop) / (GAME_H - pondTop);
      lotusLeaf(c, it.x, it.y, 14 + depth * 34 + r() * 8, 0.32 + depth * 0.16, r() * 6, p, r);
      if (r() < 0.16) lotusFlower(c, it.x + (r() - 0.5) * 20, it.y - 2, 0.7 + depth * 0.6, r() < 0.3, p, 16 + depth * 30, r() < 0.65 ? 1 : 0);
    }
    reeds(c, 40, pondShore(40) + 4, 70, 12, p, r);
    reeds(c, 860, pondShore(860) + 4, 60, 10, p, r);
  });
  put(ctx, 'main', 0, frontTop, frontKey);

  // animated leaves & flowers (individual sprites)
  const leafKeys = [0, 1, 2].map((i) =>
    bakeCanvas(scene, `hs-leaf-${i}-${q}`, 96, 44, (c) => {
      const r = mulberry(300 + i);
      lotusLeaf(c, 48, 20, 40 - i * 4, 0.42, 0.5 + i * 1.7, p, r);
    }),
  );
  const flowerKeys = (['pink', 'white', 'bud'] as const).map((kind) =>
    bakeCanvas(scene, `hs-flower-${kind}-${q}`, 48, 72, (c) => {
      lotusFlower(c, 24, 70, 1.25, kind === 'white', p, 34, kind === 'bud' ? 0 : 1);
    }),
  );
  const r = mulberry(909);
  const bobbers: { img: Img; y0: number; ph: number; amp: number; rot: number }[] = [];
  const swayers: { img: Img; ph: number }[] = [];
  let placed = 0;
  for (let i = 0; i < 200 && placed < 16; i++) {
    const x = 20 + r() * (W - 40);
    const y = 690 + r() * 160;
    if (inOpenWater(x, y) || y > pondShore(x) - 12) continue;
    const depth = (y - pondTop) / (GAME_H - pondTop);
    const img = put(ctx, 'main', x, y, leafKeys[placed % 3], 0.5, 0.45).setScale(0.55 + depth * 0.7);
    bobbers.push({ img, y0: y, ph: r() * 6, amp: 0.8 + r() * 1.2, rot: (r() - 0.5) * 0.04 });
    placed++;
  }
  placed = 0;
  for (let i = 0; i < 200 && placed < 11; i++) {
    const x = 30 + r() * (W - 60);
    const y = 660 + r() * 190;
    if (inOpenWater(x, y) || y > pondShore(x) - 8) continue;
    const depth = (y - pondTop) / (GAME_H - pondTop);
    const img = put(ctx, 'main', x, y, flowerKeys[placed % 3], 0.5, 0.97).setScale(0.55 + depth * 0.55);
    swayers.push({ img, ph: r() * 6 });
    placed++;
  }
  bobbers.sort((a, b) => a.y0 - b.y0);

  // near bank & path (main)
  const bankTop = 840;
  const bankKey = bakeCanvas(scene, `hs-bank-${q}-${W}`, W, GAME_H - bankTop, (c, w) => {
    c.translate(0, -bankTop);
    bank(c, w, (x) => pondShore(x), GAME_H, p, 66);
    // stone path tiles at both ends
    const rr = mulberry(12);
    const tiles = (x0: number, dir: number): void => {
      for (let k = 0; k < 6; k++) {
        const x = x0 + dir * k * 10 + (rr() - 0.5) * 8;
        const y = 948 - k * 16;
        c.fillStyle = rgba(mixColor(p.stone, p.stoneDark, rr() * 0.4));
        c.beginPath();
        c.ellipse(x, y, 26 - k * 2, 7 - k * 0.5, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = rgba(p.stoneLight, 0.45);
        c.beginPath();
        c.ellipse(x - 3, y - 2, 14 - k, 2.4, 0, 0, Math.PI * 2);
        c.fill();
      }
    };
    tiles(50, 1);
    tiles(W - 50, -1);
  });
  put(ctx, 'main', 0, bankTop, bankKey);

  // stone lanterns + glows
  const slKey = bakeCanvas(scene, `hs-stone-lantern-${q}`, 48, 92, (c) => stoneLantern(c, 24, 90, 1, p, lit));
  const glowKey = makeGlow(scene);
  const lanternPos = [
    { x: 150, y: 912, s: 0.95 },
    { x: 690, y: 916, s: 0.95 },
    { x: BRIDGE.x - 8, y: BRIDGE.waterY - 6, s: 0.55 },
    { x: BRIDGE.x + BRIDGE.w + 8, y: BRIDGE.waterY - 6, s: 0.55 },
  ];
  const glows: Img[] = [];
  for (const lp of lanternPos) {
    put(ctx, 'main', lp.x, lp.y, slKey, 0.5, 1).setScale(lp.s);
    if (night > 0.3) {
      const g = put(ctx, 'main', lp.x, lp.y - 58 * lp.s, glowKey, 0.5, 0.5);
      g.setBlendMode('ADD').setScale(1.2 * lp.s).setAlpha(lit * 0.85);
      glows.push(g);
    }
  }

  // ---------- near: willow fronds top-left, foreground leaves bottom-right
  const nearWillowKey = bakeCanvas(scene, `hs-near-willow-${q}`, 300, 440, (c, w, h) => {
    willowCurtain(c, w, h, p, mulberry(4));
  });
  const willowImg = put(ctx, 'near', -40, -10, nearWillowKey, 0, 0);
  const nearW = layerW(W, 1.25);
  const nearLeafKey = bakeCanvas(scene, `hs-near-leaves-${q}`, 300, 200, (c) => {
    const rr = mulberry(8);
    const pp = { ...p, waterBot: mixColor(p.waterBot, 0x000000, 0.2) };
    reeds(c, 230, 200, 160, 12, pp, rr);
    lotusLeaf(c, 150, 150, 90, 0.42, 4.2, pp, rr);
    lotusLeaf(c, 250, 185, 70, 0.45, 2.1, pp, rr);
    lotusFlower(c, 110, 140, 2.2, false, pp, 70, 0);
  });
  put(ctx, 'near', nearW - 300 - 20, GAME_H - 200 + 30, nearLeafKey, 0, 0);

  // ---------- animation: shimmer + ripples
  const shimmers = makeShimmers(ctx, 14, { x: 30, y: pondTop + 40, w: W - 60, h: 340 }, 17, (x, y) => !inOpenWater(x, y) && y > 660);
  const ripples = makeRipples(ctx, 4);
  let nextRipple = 1500;
  const rnd = mulberry(4242);

  const update = (time: number, delta: number): void => {
    refl.follow(time);
    if (ctx.reducedMotion) return;
    updateShimmers(shimmers, time);
    for (const b of bobbers) {
      const ph = time * 0.0011 + b.ph;
      b.img.y = b.y0 + Math.sin(ph) * b.amp;
      b.img.rotation = Math.sin(ph * 0.7) * b.rot;
    }
    for (const s of swayers) s.img.rotation = Math.sin(time * 0.0009 + s.ph) * 0.05;
    willowImg.rotation = Math.sin(time * 0.0005) * 0.012;
    for (const g of glows) g.alpha = lit * (0.78 + Math.sin(time * 0.003 + g.x) * 0.07);
    nextRipple -= delta;
    if (nextRipple <= 0) {
      nextRipple = 1800 + rnd() * 2800;
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd());
      spawnRipple(ripples, POND_CENTER.x + Math.cos(a) * d * 150, POND_CENTER.y + Math.sin(a) * d * 60, 1);
    }
    updateRipples(ripples, delta, 1.1);
  };

  return {
    hotspots: {
      pond: { x: POND_CENTER.x, y: POND_CENTER.y, r: 160 },
      bridge: { x: BRIDGE.x + BRIDGE.w / 2, y: BRIDGE.waterY - BRIDGE.h * 0.6, r: 90 },
      'path-san': { x: 50, y: 915, r: 60 },
      'path-bo-song': { x: W - 50, y: 915, r: 60 },
    },
    update,
  };
};

// ================================================================== BỜ SÔNG

function nearBankTop(x: number, W: number): number {
  const cx = W / 2;
  const d = Math.abs(x - cx);
  // bank dips toward the steps in the centre
  const dip = d < 160 ? (1 - d / 160) ** 2 * 22 : 0;
  return 764 + Math.sin(x * 0.009) * 9 + Math.sin(x * 0.027 + 2) * 4 + dip;
}

export const drawBoSong: AreaArtFn = (ctx: ArtContext): AreaArtResult => {
  const { scene } = ctx;
  const W = ctx.worldWidth;
  const night = Math.max(0, Math.min(1, ctx.night));
  const q = nq(night);
  const p = makePal(q / 4);
  const lit = Math.max(0, (q / 4 - 0.35) / 0.65);
  const H = RIVER_HORIZON;

  // ---------- far: layered misty mountains with a tiny tower
  const farW = layerW(W, 0.3);
  const farKey = bakeCanvas(scene, `bs-far-${q}-${farW}`, farW, 520, (c, w) => {
    ridge(c, w, 300, 150, 41, p.hillFar, 520, 0.8, p.mist);
    mistBand(c, w, 330, 60, p.mist, 0.5);
    ridge(c, w, 370, 100, 47, p.hillMid, 520, 1.2, p.mist);
    // small tower on a ridge
    const tx = w * 0.62;
    c.fillStyle = rgba(mixColor(p.hillMid, p.hillNear, 0.6));
    for (let k = 0; k < 5; k++) c.fillRect(tx - 7 + k, 300 - k * 9, 14 - k * 2, 8);
    mistBand(c, w, 395, 46, p.mist, 0.6);
    ridge(c, w, 425, 50, 53, mixColor(p.hillMid, p.hillNear, 0.55), 520, 2);
    mistBand(c, w, 440, 30, p.mist, 0.55);
  });
  put(ctx, 'far', -20, 0, farKey);

  // ---------- mid: far bank (bamboo, trees, village roofs) + its reflection + sampan
  const midW = layerW(W, 0.6);
  const midKey = bakeCanvas(scene, `bs-mid-${q}-${midW}`, midW, 640, (c, w) => {
    const drawBank = (): void => {
      const r = mulberry(61);
      for (let x = -10; x < w + 20; x += 26 + r() * 30) {
        if (r() < 0.55) bamboo(c, x, H - 2, 70 + r() * 50, p, r, 5 + Math.floor(r() * 4));
        else treeClump(c, x, H - 3, 0.7 + r() * 0.6, p, r);
      }
      // village roofs peeking out
      for (const vx of [w * 0.28, w * 0.31, w * 0.7]) {
        c.fillStyle = rgba(mixColor(p.roof, p.hillNear, 0.3));
        c.beginPath();
        c.moveTo(vx - 18, H - 10);
        c.lineTo(vx - 10, H - 22);
        c.lineTo(vx + 12, H - 22);
        c.lineTo(vx + 20, H - 10);
        c.closePath();
        c.fill();
        c.fillStyle = rgba(mixColor(mixColor(p.earth, p.hillNear, 0.4), 0xffc070, lit * 0.6));
        c.fillRect(vx - 12, H - 10, 24, 8);
      }
      c.fillStyle = rgba(p.grassDark);
      c.beginPath();
      c.moveTo(0, H + 3);
      for (let x = 0; x <= w; x += 10) c.lineTo(x, H - 3 - Math.sin(x * 0.015) * 2);
      c.lineTo(w, H + 3);
      c.fill();
    };
    waterFill(c, w, H, 640, p, 71, 0);
    c.save();
    c.translate(0, H * 2 + 2);
    c.scale(1, -1);
    c.globalAlpha = 0.32;
    drawBank();
    c.restore();
    c.globalAlpha = 1;
    const rr = mulberry(9);
    for (let i = 0; i < 260; i++) {
      c.fillStyle = rgba(rr() < 0.5 ? p.waterTop : p.waterHi, 0.13);
      c.fillRect(rr() * w, H + 2 + rr() * 120, 40 + rr() * 100, 1.2);
    }
    if (lit > 0) {
      for (const vx of [w * 0.28, w * 0.31, w * 0.7]) softDot(c, vx, H + 18, 22, 0xffc070, lit * 0.25);
    }
    drawBank();
    mistBand(c, w, H - 40, 34, p.mist, 0.25);
    mistBand(c, w, H + 6, 14, p.mist, 0.3);
  });
  put(ctx, 'mid', -20, 0, midKey);

  const boatKey = bakeCanvas(scene, `bs-sampan-${q}`, 110, 60, (c) => sampan(c, 55, 46, 1, p, lit));
  const boat = put(ctx, 'mid', midW * 0.68, H + 30, boatKey, 0.5, 0.77).setScale(1.05);
  const boatX0 = boat.x;
  const boatRefl = put(ctx, 'mid', boat.x, boat.y + 2, boatKey, 0.5, 0.77).setScale(1.05, -0.75).setAlpha(0.22);
  let boatGlow: Img | null = null;
  const glowKey = makeGlow(scene);
  if (night > 0.3) {
    boatGlow = put(ctx, 'mid', boat.x + 2, boat.y - 9, glowKey, 0.5, 0.5).setScale(0.5).setBlendMode('ADD').setAlpha(lit * 0.8);
  }

  // ---------- main: river surface
  const riverTop = H + 10;
  const riverKey = bakeCanvas(scene, `bs-river-${q}-${W}`, W, 820 - riverTop, (c, w, h) => {
    c.translate(0, -riverTop);
    waterFill(c, w, riverTop, riverTop + h, p, 81, 110);
    // gentle current lines
    const r = mulberry(17);
    c.strokeStyle = rgba(p.waterHi, 0.1);
    c.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {
      const y = riverTop + 110 + r() * (h - 120);
      const x = r() * w;
      const len = 60 + r() * 140;
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(x + len * 0.3, y - 2, x + len * 0.6, y + 2, x + len, y);
      c.stroke();
    }
  });
  put(ctx, 'main', 0, riverTop, riverKey);

  const refl = celestialReflection(ctx, riverTop + 4, 1);

  // near bank with stone steps (bến)
  const bankTop = 720;
  const cx = W / 2;
  const bankKey = bakeCanvas(scene, `bs-bank-${q}-${W}`, W, GAME_H - bankTop, (c, w) => {
    c.translate(0, -bankTop);
    bank(c, w, (x) => nearBankTop(x, W), GAME_H, p, 91);
    // stone steps descending into the water
    const steps = 6;
    for (let k = steps - 1; k >= 0; k--) {
      const y = 790 + k * 26; // k=0 nearest the water
      const half = 74 + k * 12;
      const g = c.createLinearGradient(0, y - 10, 0, y + 14);
      g.addColorStop(0, rgba(p.stoneLight));
      g.addColorStop(0.45, rgba(p.stone));
      g.addColorStop(1, rgba(p.stoneDark));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(cx - half, y - 10);
      c.lineTo(cx + half, y - 10);
      c.lineTo(cx + half + 4, y + 14);
      c.lineTo(cx - half - 4, y + 14);
      c.closePath();
      c.fill();
      c.strokeStyle = rgba(p.stoneDark, 0.45);
      c.lineWidth = 1;
      for (let x = cx - half + 30; x < cx + half; x += 34 + (k % 2) * 6) {
        c.beginPath();
        c.moveTo(x, y - 9);
        c.lineTo(x + 1, y + 13);
        c.stroke();
      }
    }
    // lowest wet step half in water
    c.fillStyle = rgba(p.stoneDark);
    c.beginPath();
    c.moveTo(cx - 66, 768);
    c.lineTo(cx + 66, 768);
    c.lineTo(cx + 70, 782);
    c.lineTo(cx - 70, 782);
    c.closePath();
    c.fill();
    c.fillStyle = rgba(p.waterTop, 0.35);
    c.fillRect(cx - 70, 776, 140, 4);
    // side cheek walls
    for (const s of [-1, 1]) {
      c.fillStyle = rgba(mixColor(p.stone, p.stoneDark, 0.5));
      c.beginPath();
      c.moveTo(cx + s * 70, 770);
      c.lineTo(cx + s * 84, 770);
      c.lineTo(cx + s * 152, GAME_H);
      c.lineTo(cx + s * 136, GAME_H);
      c.closePath();
      c.fill();
    }
    // reeds along the bank (not on the steps)
    const r = mulberry(5);
    for (let i = 0; i < 9; i++) {
      let x = r() * w;
      if (Math.abs(x - cx) < 200) x += 400 * (x < cx ? -1 : 1);
      reeds(c, x, nearBankTop(x, W) + 6, 50 + r() * 40, 8, p, r);
    }
    // path stones on the left toward ho-sen
    for (let k = 0; k < 5; k++) {
      const x = 60 + k * 14;
      const y = 944 - k * 18;
      c.fillStyle = rgba(mixColor(p.stone, p.stoneDark, 0.25));
      c.beginPath();
      c.ellipse(x, y, 26 - k * 2, 7, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  put(ctx, 'main', 0, bankTop, bankKey);

  // stone lanterns flanking the steps
  const slKey = bakeCanvas(scene, `hs-stone-lantern-${q}`, 48, 92, (c) => stoneLantern(c, 24, 90, 1, p, lit));
  const glows: Img[] = [];
  for (const s of [-1, 1]) {
    const x = cx + s * 175;
    put(ctx, 'main', x, 836, slKey, 0.5, 1).setScale(0.9);
    if (night > 0.3) {
      const g = put(ctx, 'main', x, 836 - 54, glowKey, 0.5, 0.5).setBlendMode('ADD').setScale(1.1).setAlpha(lit * 0.85);
      glows.push(g);
      // warm reflection on wet ground/water edge
      const g2 = put(ctx, 'main', x, nearBankTop(x, W) - 4, glowKey, 0.5, 0.5).setBlendMode('ADD').setScale(1.2, 0.3).setAlpha(lit * 0.35);
      glows.push(g2);
    }
  }

  // ---------- near: foreground reeds at edges
  const nearW = layerW(W, 1.25);
  const nearKey = bakeCanvas(scene, `bs-near-reeds-${q}`, 220, 260, (c) => {
    const r = mulberry(14);
    const pp = { ...p, leaf: mixColor(p.leaf, 0x000000, 0.25), leafDark: mixColor(p.leafDark, 0x000000, 0.3) };
    reeds(c, 110, 262, 230, 22, pp, r);
  });
  put(ctx, 'near', -70, GAME_H - 230, nearKey, 0, 0);
  put(ctx, 'near', nearW - 170, GAME_H - 220, nearKey, 0, 0).setFlipX(true);
  put(ctx, 'near', nearW * 0.55, GAME_H - 160, nearKey, 0, 0).setScale(0.7);

  // ---------- animation: glints, fireflies
  const shimmers = makeShimmers(ctx, 16, { x: 0, y: riverTop + 70, w: W, h: 280 }, 23);
  const fireflies: { img: Img; x0: number; y0: number; ph: number; sp: number }[] = [];
  if (night > 0.5) {
    const fk = makeFirefly(scene);
    const r = mulberry(31);
    for (let i = 0; i < 12; i++) {
      const x0 = r() * W;
      const y0 = 680 + r() * 180;
      const img = put(ctx, 'main', x0, y0, fk, 0.5, 0.5).setBlendMode('ADD').setScale(0.6 + r() * 0.5).setAlpha(night * 0.8);
      fireflies.push({ img, x0, y0, ph: r() * 10, sp: 0.4 + r() * 0.6 });
    }
  }
  const ripples = makeRipples(ctx, 3);
  let nextRipple = 2500;
  const rnd = mulberry(77);

  const update = (time: number, delta: number): void => {
    refl.follow(time);
    if (ctx.reducedMotion) return;
    updateShimmers(shimmers, time);
    const bob = Math.sin(time * 0.0012) * 1.2;
    boat.y = H + 30 + bob;
    boat.x = boatX0 + Math.sin(time * 0.00005) * 30;
    boatRefl.x = boat.x;
    boatRefl.y = boat.y + 2;
    if (boatGlow) {
      boatGlow.x = boat.x + 2;
      boatGlow.y = boat.y - 9;
    }
    for (const g of glows) g.alpha = lit * (0.7 + Math.sin(time * 0.003 + g.x) * 0.08) * (g.scaleY < 0.5 ? 0.4 : 1);
    for (const f of fireflies) {
      const t = time * 0.0004 * f.sp + f.ph;
      f.img.x = f.x0 + Math.sin(t) * 40 + Math.sin(t * 2.3) * 12;
      f.img.y = f.y0 + Math.cos(t * 1.3) * 20;
      f.img.alpha = night * (0.3 + 0.7 * Math.max(0, Math.sin(t * 5)));
    }
    nextRipple -= delta;
    if (nextRipple <= 0) {
      nextRipple = 2500 + rnd() * 3000;
      spawnRipple(ripples, rnd() * W, RIVER_BAND.top + rnd() * (RIVER_BAND.bottom - RIVER_BAND.top), 1);
    }
    updateRipples(ripples, delta, 0.9);
  };

  const mid = (RIVER_BAND.top + RIVER_BAND.bottom) / 2;
  return {
    hotspots: {
      river: { x: W / 2, y: mid, r: (RIVER_BAND.bottom - RIVER_BAND.top) / 2 },
      steps: { x: cx, y: 786, r: 60 },
      'path-ho-sen': { x: 70, y: 905, r: 60 },
    },
    update,
  };
};

