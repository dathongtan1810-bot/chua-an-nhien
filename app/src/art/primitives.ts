/**
 * Reusable drawing helpers for the pagoda art (Bắc Bộ style), drawn 100% in code
 * on a Phaser Graphics. Everything here is static geometry meant to be baked once
 * with `bake()` (Graphics → texture) and shown as cheap Images.
 *
 * Note: Graphics.generateTexture renders through the Canvas path, so gradients are
 * done with colour stripes (no fillGradientStyle).
 */
import type Phaser from 'phaser';

type G = Phaser.GameObjects.Graphics;
export interface Pt {
  x: number;
  y: number;
}

// ---------------------------------------------------------------- palette

export const PAL = {
  tile: 0x9b5236,
  tileDark: 0x6c3424,
  tileLight: 0xbb7350,
  ridge: 0x7d4430,
  ridgeLight: 0xa4654a,
  soffit: 0x3a2318,
  lacquer: 0xa8302a,
  lacquerDark: 0x741f1b,
  lacquerLight: 0xc85440,
  gold: 0xd6aa4c,
  goldDark: 0xa27629,
  goldLight: 0xf1d58a,
  wall: 0xe4cc98,
  wallDark: 0xc6a670,
  wallLight: 0xf0e0b8,
  moss: 0x7d8c4a,
  mossDark: 0x55652f,
  stone: 0xa8a191,
  stoneDark: 0x7b7468,
  stoneLight: 0xc9c2b0,
  brick: 0xb0654a,
  brickDark: 0x8c4a36,
  brickLight: 0xc4805f,
  mortar: 0xc9ab88,
  wood: 0x7a4a2c,
  woodDark: 0x4a2b1a,
  woodLight: 0x9e6b42,
  bronze: 0x8c6a38,
  bronzeDark: 0x553e1e,
  bronzeLight: 0xc9a160,
  patina: 0x6f8f72,
  leaf: 0x4f7a3a,
  leafDark: 0x2e5028,
  leafLight: 0x8aab58,
  bamboo: 0x7f9b4c,
  bambooDark: 0x55702f,
  hillFar: 0xbfcac6,
  hillMid: 0x9db1a4,
  hillNear: 0x77937a,
  lotus: 0xf0a2b4,
  lotusDeep: 0xd66d8c,
  lotusWhite: 0xfbe9e4,
  cream: 0xf5ead2,
  ink: 0x2a1f1a,
  glowWarm: 0xffbf66,
  buddha: 0xd8b25e,
  buddhaDark: 0xb38a3c,
  buddhaLight: 0xf0d38c,
  nightTint: 0x58628c,
} as const;

// ---------------------------------------------------------------- math / colour

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerpColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const gg = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const bb = Math.round((a & 255) + ((b & 255) - (a & 255)) * k);
  return (r << 16) | (gg << 8) | bb;
}

/** amt > 0 lightens toward white, < 0 darkens toward black. */
export function shade(c: number, amt: number): number {
  return amt >= 0 ? lerpColor(c, 0xffffff, amt) : lerpColor(c, 0x000000, -amt);
}

export function quadPts(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({ x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 });
  }
  return out;
}

export function cubicPts(
  x0: number, y0: number, c1x: number, c1y: number, c2x: number, c2y: number, x1: number, y1: number, n = 18,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1,
      y: u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1,
    });
  }
  return out;
}

/** Point at fraction f (0..1) of a polyline's length. */
function along(pts: Pt[], f: number): Pt {
  let total = 0;
  const seg: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(d);
    total += d;
  }
  let target = Math.max(0, Math.min(1, f)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const t = seg[i] > 0 ? Math.min(1, target / seg[i]) : 0;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t };
    }
    target -= seg[i];
  }
  return pts[pts.length - 1];
}

function poly(g: G, pts: Pt[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts as Phaser.Types.Math.Vector2Like[], true, true);
}

function strokePoly(g: G, pts: Pt[], width: number, color: number, alpha = 1, close = false): void {
  g.lineStyle(width, color, alpha);
  g.strokePoints(pts as Phaser.Types.Math.Vector2Like[], close, close);
}

/** Vertical colour gradient made of stripes. */
export function vGrad(g: G, x: number, y: number, w: number, h: number, top: number, bottom: number, steps = 16, alpha = 1): void {
  for (let i = 0; i < steps; i++) {
    const y0 = Math.round(y + (i * h) / steps);
    const y1 = Math.round(y + ((i + 1) * h) / steps);
    g.fillStyle(lerpColor(top, bottom, steps === 1 ? 0 : i / (steps - 1)), alpha);
    g.fillRect(x, y0, w, y1 - y0);
  }
}

/** Horizontal colour gradient made of stripes. */
export function hGrad(g: G, x: number, y: number, w: number, h: number, left: number, right: number, steps = 12, alpha = 1): void {
  for (let i = 0; i < steps; i++) {
    const x0 = Math.round(x + (i * w) / steps);
    const x1 = Math.round(x + ((i + 1) * w) / steps);
    g.fillStyle(lerpColor(left, right, steps === 1 ? 0 : i / (steps - 1)), alpha);
    g.fillRect(x0, y, x1 - x0, h);
  }
}

/** Soft blob: concentric circles with low alpha (fake blur). */
export function softBlob(g: G, x: number, y: number, r: number, color: number, alpha = 0.25, rings = 6): void {
  for (let i = 0; i < rings; i++) {
    g.fillStyle(color, alpha / rings * 1.6);
    g.fillCircle(x, y, r * (1 - i / rings));
  }
}

/** Soft elliptical shadow on the ground. */
export function groundShadow(g: G, x: number, y: number, w: number, h: number, alpha = 0.22): void {
  for (let i = 0; i < 5; i++) {
    const k = 1 - i * 0.15;
    g.fillStyle(0x2a1a10, alpha / 4);
    g.fillEllipse(x, y, w * k, h * k);
  }
}

// ---------------------------------------------------------------- roof

export interface RoofOpts {
  tile?: number;
  tileDark?: number;
  ridgeColor?: number;
  /** How much the eave corners lift (px). Default h*0.38 */
  curl?: number;
  /** Ridge length relative to w. Default 0.6 */
  ridgeRatio?: number;
  /** Draw centre ornament (lưỡng long chầu nguyệt, simplified). Default true */
  ornament?: boolean;
  /** Dragon-tail horn size multiplier. Default 1 */
  horn?: number;
  /** Depth of the dark eave/soffit below the tiles. Default h*0.14 */
  soffit?: number;
  /** Cast a soft shadow below the central part of the eave. Default true */
  shadow?: boolean;
}

/**
 * Bắc Bộ curved roof seen from the front. (x, y) = centre of the ridge top; w = eave
 * width (horns stick out a bit further), h = ridge-top → eave-bottom height.
 */
export function drawCurvedRoof(g: G, x: number, y: number, w: number, h: number, opts: RoofOpts = {}): void {
  const tile = opts.tile ?? PAL.tile;
  const tileDark = opts.tileDark ?? PAL.tileDark;
  const ridgeC = opts.ridgeColor ?? PAL.ridge;
  const curl = opts.curl ?? h * 0.38;
  const rw = w * (opts.ridgeRatio ?? 0.6);
  const ridgeH = Math.max(6, h * 0.13);
  const hornK = opts.horn ?? 1;
  const soffitH = opts.soffit ?? Math.max(5, h * 0.14);
  const left = x - w / 2;
  const ridgeY = y + ridgeH;
  const eaveY = y + h - soffitH;

  const eave = (u: number): Pt => ({ x: left + u * w, y: eaveY - curl * Math.pow(Math.abs(2 * u - 1), 4.2) });
  const N = 40;
  const eavePts: Pt[] = [];
  for (let i = 0; i <= N; i++) eavePts.push(eave(i / N));

  const cL = eave(0);
  const cR = eave(1);
  const hipL = quadPts(cL.x, cL.y, x - rw / 2 - (w - rw) * 0.12, ridgeY + (eaveY - ridgeY) * 0.55, x - rw / 2, ridgeY, 12);
  const hipR = quadPts(x + rw / 2, ridgeY, x + rw / 2 + (w - rw) * 0.12, ridgeY + (eaveY - ridgeY) * 0.55, cR.x, cR.y, 12);
  const top: Pt[] = [...hipL, ...hipR];

  // soffit (dark underside / fascia) following eave, slightly below
  const sof: Pt[] = [];
  for (let i = 0; i <= N; i++) sof.push(eave(i / N));
  for (let i = N; i >= 0; i--) {
    const p = eave(i / N);
    const edge = Math.pow(Math.abs(2 * (i / N) - 1), 3);
    sof.push({ x: p.x, y: p.y + soffitH * (1 - edge * 0.6) });
  }
  // shadow cast below the roof
  const sh: Pt[] = [];
  const s0 = Math.round(N * 0.26);
  const s1 = N - s0;
  for (let i = s0; i <= s1; i++) sh.push({ x: eave(i / N).x, y: eave(i / N).y + soffitH });
  for (let i = s1; i >= s0; i--) sh.push({ x: eave(i / N).x, y: eave(i / N).y + soffitH + h * 0.2 });
  if (opts.shadow ?? true) poly(g, sh, 0x2b1a12, 0.16);
  poly(g, sof, PAL.soffit);
  // rafter ends hint
  g.fillStyle(0x5a3826, 1);
  for (let i = 3; i < N - 2; i += 2) {
    const p = eave(i / N);
    g.fillRect(p.x - 1.5, p.y + 2, 3, soffitH * 0.45);
  }

  // roof body
  const body: Pt[] = [...top, ...eavePts.slice().reverse()];
  poly(g, body, tile);

  // tonal bands (lighter toward eave = sky reflection)
  const bands = 6;
  for (let b = 0; b < bands; b++) {
    const v0 = b / bands;
    const v1 = (b + 1) / bands;
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const t = along(top, u);
      const e = eave(u);
      pts.push({ x: t.x + (e.x - t.x) * v0, y: t.y + (e.y - t.y) * v0 });
    }
    for (let i = N; i >= 0; i--) {
      const u = i / N;
      const t = along(top, u);
      const e = eave(u);
      pts.push({ x: t.x + (e.x - t.x) * v1, y: t.y + (e.y - t.y) * v1 });
    }
    const c = b < 2 ? tileDark : 0xffe2c0;
    const a = b < 2 ? 0.22 - b * 0.1 : 0.03 + (b - 2) * 0.025;
    poly(g, pts, c, a);
  }

  // tile rows (vertical channels)
  const cols = Math.max(12, Math.round(w / 9));
  for (let i = 1; i < cols; i++) {
    const u = i / cols;
    const t = along(top, u);
    const e = eave(u);
    g.lineStyle(Math.max(1.4, w / 360), tileDark, 0.55);
    g.lineBetween(t.x, t.y, e.x, e.y);
    g.lineStyle(1, shade(tile, 0.25), 0.35);
    g.lineBetween(t.x + 2, t.y, e.x + 2, e.y);
  }
  // tile courses (horizontal)
  const rows = Math.max(4, Math.round(h / 9));
  for (let k = 1; k < rows; k++) {
    const v = k / rows;
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i += 2) {
      const u = i / N;
      const t = along(top, u);
      const e = eave(u);
      pts.push({ x: t.x + (e.x - t.x) * v, y: t.y + (e.y - t.y) * v });
    }
    strokePoly(g, pts, 1, tileDark, 0.18);
  }
  // mũi hài scallops at the eave
  for (let i = 0; i < cols; i++) {
    const u = (i + 0.5) / cols;
    const e = eave(u);
    const sw = w / cols;
    g.fillStyle(shade(tile, 0.12), 1);
    g.fillEllipse(e.x, e.y - 1, sw * 0.9, sw * 0.7);
    g.fillStyle(tileDark, 0.5);
    g.fillEllipse(e.x, e.y + sw * 0.18, sw * 0.7, sw * 0.25);
  }

  // hip ridges + dragon-tail horns (đao cong)
  const hipW = Math.max(3, ridgeH * 0.55);
  for (const side of [-1, 1]) {
    const hip = side < 0 ? hipL : hipR;
    strokePoly(g, hip, hipW, ridgeC);
    strokePoly(g, hip.map((p) => ({ x: p.x, y: p.y - hipW * 0.35 })), Math.max(1, hipW * 0.3), PAL.ridgeLight, 0.8);
    const c = side < 0 ? cL : cR;
    const k = hornK * h;
    const tipX = c.x + side * k * 0.18;
    const tipY = c.y - k * 0.62;
    const t0 = k * 0.09;
    const outer = quadPts(c.x - side * k * 0.12, c.y + t0, c.x + side * k * 0.24, c.y + t0 * 0.2, tipX, tipY, 12);
    const inner = quadPts(tipX, tipY, c.x + side * k * 0.02, c.y - k * 0.12, c.x - side * k * 0.22, c.y - t0 * 0.2, 12);
    poly(g, [...outer, ...inner], ridgeC);
    strokePoly(g, inner.slice(0, 10), Math.max(1, k * 0.025), PAL.ridgeLight, 0.9);
    // curl at the tip
    g.fillStyle(ridgeC, 1);
    g.fillCircle(tipX - side * k * 0.035, tipY + k * 0.01, k * 0.05);
    g.fillStyle(PAL.ridgeLight, 1);
    g.fillCircle(tipX - side * k * 0.04, tipY + k * 0.005, k * 0.022);
  }

  // main ridge (bờ nóc) with curled ends
  const rL = x - rw / 2 - ridgeH * 0.6;
  const rR = x + rw / 2 + ridgeH * 0.6;
  g.fillStyle(ridgeC, 1);
  g.fillRect(rL, y + ridgeH * 0.1, rR - rL, ridgeH * 1.05);
  g.fillStyle(PAL.ridgeLight, 1);
  g.fillRect(rL, y + ridgeH * 0.1, rR - rL, ridgeH * 0.25);
  g.fillStyle(PAL.soffit, 0.35);
  g.fillRect(rL, y + ridgeH * 0.95, rR - rL, ridgeH * 0.2);
  // decorative blocks on ridge
  const blocks = Math.max(4, Math.round(rw / 34));
  for (let i = 0; i < blocks; i++) {
    const bx = rL + ((i + 0.5) * (rR - rL)) / blocks;
    g.fillStyle(PAL.ridgeLight, 0.55);
    g.fillRect(bx - ridgeH * 0.35, y + ridgeH * 0.45, ridgeH * 0.7, ridgeH * 0.35);
  }
  for (const side of [-1, 1]) {
    const ex = side < 0 ? rL : rR;
    const s = ridgeH;
    const curlPts = [
      ...quadPts(ex, y + s * 1.1, ex + side * s * 1.2, y + s * 0.6, ex + side * s * 0.9, y - s * 1.6, 8),
      ...quadPts(ex + side * s * 0.9, y - s * 1.6, ex + side * s * 0.1, y - s * 0.6, ex - side * s * 0.6, y + s * 0.1, 8),
    ];
    poly(g, curlPts, ridgeC);
    g.fillStyle(PAL.ridgeLight, 1);
    g.fillCircle(ex + side * s * 0.75, y - s * 1.35, s * 0.28);
  }

  if (opts.ornament ?? true) {
    const s = ridgeH;
    // pearl / moon with flames
    const oy = y - s * 1.3;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42;
      const fx = x + Math.cos(a) * s * 1.6;
      const fy = oy + Math.sin(a) * s * 1.6;
      poly(g, [
        { x: x + Math.cos(a - 0.2) * s * 0.9, y: oy + Math.sin(a - 0.2) * s * 0.9 },
        { x: fx, y: fy },
        { x: x + Math.cos(a + 0.2) * s * 0.9, y: oy + Math.sin(a + 0.2) * s * 0.9 },
      ], ridgeC);
    }
    g.fillStyle(ridgeC, 1);
    g.fillRect(x - s * 0.25, oy, s * 0.5, s * 1.4);
    g.fillCircle(x, oy, s * 1.0);
    g.fillStyle(PAL.goldLight, 1);
    g.fillCircle(x, oy, s * 0.7);
    g.fillStyle(PAL.gold, 1);
    g.fillCircle(x + s * 0.12, oy + s * 0.12, s * 0.45);
    // two simplified dragons facing the pearl (S-curved bodies)
    for (const side of [-1, 1]) {
      const bx = x + side * s * 5.2;
      const body = [
        ...quadPts(bx + side * s * 2.6, y + s * 0.2, bx + side * s * 1.5, y - s * 1.9, bx, y - s * 0.7, 10),
        ...quadPts(bx, y - s * 0.7, bx - side * s * 1.1, y + s * 0.2, bx - side * s * 2.4, y - s * 1.2, 10),
      ];
      strokePoly(g, body, Math.max(2, s * 0.55), ridgeC);
      g.fillStyle(ridgeC, 1);
      g.fillCircle(bx - side * s * 2.5, y - s * 1.25, s * 0.5);
      // mane flicks
      for (let k = 0; k < 3; k++) {
        const p = body[4 + k * 4];
        g.fillTriangle(p.x - s * 0.2, p.y, p.x + s * 0.2, p.y, p.x + side * s * 0.15, p.y - s * 0.8);
      }
    }
  }
}

// ---------------------------------------------------------------- structure

/** Red-lacquer pillar on a stone base. (x, y) = top centre, h = down to ground. */
export function drawPillar(g: G, x: number, y: number, w: number, h: number, color: number = PAL.lacquer): void {
  const baseH = w * 0.55;
  const shaftH = h - baseH;
  g.fillStyle(color, 1);
  g.fillRect(x - w / 2, y, w, shaftH);
  g.fillStyle(shade(color, 0.22), 1);
  g.fillRect(x - w / 2 + w * 0.16, y, w * 0.16, shaftH);
  g.fillStyle(shade(color, 0.4), 0.6);
  g.fillRect(x - w / 2 + w * 0.2, y, w * 0.06, shaftH);
  g.fillStyle(shade(color, -0.3), 1);
  g.fillRect(x + w / 2 - w * 0.3, y, w * 0.3, shaftH);
  g.fillStyle(shade(color, -0.45), 1);
  g.fillRect(x + w / 2 - w * 0.1, y, w * 0.1, shaftH);
  // top capital shadow
  g.fillStyle(0x000000, 0.25);
  g.fillRect(x - w / 2, y, w, Math.min(10, shaftH * 0.05));
  // stone base (chân tảng)
  const by = y + shaftH;
  g.fillStyle(PAL.stoneDark, 1);
  g.fillRect(x - w * 0.85, by + baseH * 0.35, w * 1.7, baseH * 0.65);
  g.fillStyle(PAL.stone, 1);
  g.fillEllipse(x, by + baseH * 0.35, w * 1.6, baseH * 0.7);
  g.fillStyle(PAL.stoneLight, 1);
  g.fillEllipse(x - w * 0.15, by + baseH * 0.25, w * 1.1, baseH * 0.35);
  g.fillStyle(shade(color, -0.2), 1);
  g.fillRect(x - w / 2, by - 2, w, baseH * 0.25);
}

export interface WallOpts {
  color?: number;
  seed?: number;
  moss?: boolean;
  stains?: boolean;
}

/** Aged ochre/cream plaster wall with stains and moss at the foot. */
export function drawWall(g: G, x: number, y: number, w: number, h: number, opts: WallOpts = {}): void {
  const c = opts.color ?? PAL.wall;
  const r = rng(opts.seed ?? 11);
  vGrad(g, x, y, w, h, shade(c, 0.12), shade(c, -0.12), Math.max(4, Math.round(h / 18)));
  if (opts.stains ?? true) {
    const n = Math.round((w * h) / 2600);
    for (let i = 0; i < n; i++) {
      const sx = x + r() * w;
      const sy = y + r() * h;
      g.fillStyle(r() < 0.5 ? 0x8a6a3e : 0xffffff, 0.035 + r() * 0.04);
      g.fillEllipse(sx, sy, 10 + r() * 40, 6 + r() * 28);
    }
    // vertical rain streaks
    const streaks = Math.round(w / 30);
    for (let i = 0; i < streaks; i++) {
      const sx = x + r() * w;
      g.fillStyle(0x6e5432, 0.05 + r() * 0.05);
      g.fillRect(sx, y, 2 + r() * 5, h * (0.2 + r() * 0.5));
    }
  }
  if (opts.moss ?? true) {
    const n = Math.round(w / 5);
    for (let i = 0; i < n; i++) {
      const mx = x + r() * w;
      const mh = 4 + r() * Math.min(26, h * 0.25);
      g.fillStyle(r() < 0.5 ? PAL.moss : PAL.mossDark, 0.25 + r() * 0.35);
      g.fillEllipse(mx, y + h - mh * 0.4, 6 + r() * 14, mh);
    }
  }
  // shadow line at top
  g.fillStyle(0x3a2516, 0.18);
  g.fillRect(x, y, w, Math.min(8, h * 0.06));
}

/** Stone steps, top step narrowest. (cx, y) = top centre. */
export function drawSteps(g: G, cx: number, y: number, w: number, n: number, stepH: number, spread = 8): void {
  for (let i = 0; i < n; i++) {
    const sw = w + i * spread * 2;
    const sy = y + i * stepH;
    g.fillStyle(PAL.stoneDark, 1);
    g.fillRect(cx - sw / 2, sy, sw, stepH);
    g.fillStyle(PAL.stoneLight, 1);
    g.fillRect(cx - sw / 2, sy, sw, stepH * 0.36);
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(cx - sw / 2, sy, sw, 1.5);
    g.fillStyle(PAL.stone, 1);
    g.fillRect(cx - sw / 2, sy + stepH * 0.36, sw, stepH * 0.5);
    g.fillStyle(PAL.mossDark, 0.18);
    g.fillRect(cx - sw / 2, sy + stepH * 0.8, sw, stepH * 0.2);
    // end blocks
    g.fillStyle(PAL.stoneDark, 0.6);
    g.fillRect(cx - sw / 2, sy, 3, stepH);
    g.fillRect(cx + sw / 2 - 3, sy, 3, stepH);
  }
}

export interface FloorOpts {
  seed?: number;
  base?: number;
  dark?: number;
  light?: number;
  mortar?: number;
  /** Haze colour mixed into far rows. */
  haze?: number;
  rowStart?: number;
  rowEnd?: number;
  /** Vanishing x for the converging joints (default centre). */
  vanishX?: number;
}

/** Terracotta brick courtyard (gạch bát) with perspective rows. */
export function drawBrickFloor(g: G, x: number, y: number, w: number, h: number, opts: FloorOpts = {}): void {
  const r = rng(opts.seed ?? 3);
  const base = opts.base ?? PAL.brick;
  const dark = opts.dark ?? PAL.brickDark;
  const light = opts.light ?? PAL.brickLight;
  const mortar = opts.mortar ?? PAL.mortar;
  const haze = opts.haze ?? 0xd9c3a8;
  g.fillStyle(mortar, 1);
  g.fillRect(x, y, w, h);
  const r0 = opts.rowStart ?? 7;
  const r1 = opts.rowEnd ?? 30;
  const vx = opts.vanishX ?? x + w / 2;
  const rowH = (yy: number): number => r0 + (r1 - r0) * ((yy - y) / h);
  let yy = y;
  let row = 0;
  while (yy < y + h) {
    const f = (yy - y) / h;
    const rh = rowH(yy);
    const yb = yy + rh;
    const bwT = rh * 1.9;
    const bwB = rowH(yb) * 1.9;
    const off = row % 2 === 0 ? 0 : 0.5;
    const gap = Math.max(1, rh * 0.09);
    const kMin = Math.floor((x - vx) / bwB) - 2;
    const kMax = Math.ceil((x + w - vx) / bwT) + 2;
    for (let k = kMin; k <= kMax; k++) {
      const tl = vx + (k + off) * bwT;
      const bl = vx + (k + off) * bwB;
      if (tl > x + w + bwT && bl > x + w + bwB) continue;
      if (tl + bwT < x - bwT && bl + bwB < x - bwB) continue;
      const tone = r();
      let c = tone < 0.33 ? lerpColor(base, dark, r() * 0.6) : tone < 0.66 ? base : lerpColor(base, light, r() * 0.7);
      c = lerpColor(c, haze, (1 - f) * 0.45);
      const quad = [
        { x: tl + gap, y: yy + gap },
        { x: tl + bwT - gap, y: yy + gap },
        { x: bl + bwB - gap, y: yb - gap },
        { x: bl + gap, y: yb - gap },
      ];
      poly(g, quad, c);
      g.fillStyle(0xffffff, 0.07);
      g.fillRect(Math.min(tl, bl) + gap * 2, yy + gap, bwT - gap * 3, Math.max(1, rh * 0.14));
      if (r() < 0.12) {
        g.fillStyle(PAL.moss, 0.25);
        g.fillRect(bl, yb - gap * 1.5, bwB * r(), gap * 1.5);
      }
    }
    yy = yb;
    row++;
  }
  // gentle darkening toward the viewer
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0x2a160c, 0.025);
    g.fillRect(x, y + h * (0.5 + i * 0.08), w, h * (0.5 - i * 0.08));
  }
}

// ---------------------------------------------------------------- motifs

export function petalPts(bx: number, by: number, ang: number, len: number, wid: number): Pt[] {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  const tx = bx + dx * len;
  const ty = by + dy * len;
  const mx = bx + dx * len * 0.45;
  const my = by + dy * len * 0.45;
  return [
    ...quadPts(bx, by, mx + nx * wid, my + ny * wid, tx, ty, 8),
    ...quadPts(tx, ty, mx - nx * wid, my - ny * wid, bx, by, 8).slice(1),
  ];
}

/** Lotus flower. (x, y) = base of the flower, size ≈ height. */
export function drawLotus(g: G, x: number, y: number, size: number, color: number = PAL.lotus): void {
  const deep = shade(color, -0.18);
  const pale = lerpColor(color, PAL.lotusWhite, 0.65);
  const back = [-90 - 32, -90 + 32, -90 - 62, -90 + 62];
  const front = [-90 - 80, -90 + 80, -90 - 45, -90 + 45, -90];
  for (const a of back) {
    const rad = (a * Math.PI) / 180;
    poly(g, petalPts(x, y, rad, size * 0.95, size * 0.32), deep);
    poly(g, petalPts(x, y, rad, size * 0.6, size * 0.2), pale, 0.7);
  }
  g.fillStyle(PAL.gold, 1);
  g.fillEllipse(x, y - size * 0.35, size * 0.42, size * 0.2);
  for (const a of front) {
    const rad = (a * Math.PI) / 180;
    const len = a === -90 ? size * 0.8 : size * 0.72;
    poly(g, petalPts(x, y, rad, len, size * 0.27), color);
    poly(g, petalPts(x, y, rad, len * 0.55, size * 0.15), pale, 0.75);
    g.lineStyle(1, deep, 0.5);
    g.lineBetween(x, y, x + Math.cos(rad) * len * 0.85, y + Math.sin(rad) * len * 0.85);
  }
}

/** Bodhi (heart-shaped, long drip tip) leaf polygon. */
export function leafPts(cx: number, cy: number, s: number, ang: number): Pt[] {
  const out: Pt[] = [];
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    let lx = 16 * Math.pow(Math.sin(t), 3);
    let ly = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    if (ly > 0) ly *= 1.55; // drip tip (points down at ang=0)
    lx *= s / 16;
    ly *= s / 16;
    out.push({ x: cx + lx * ca - ly * sa, y: cy + lx * sa + ly * ca });
  }
  return out;
}

export function taperBranch(g: G, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w0: number, w1: number, color: number): void {
  const pts = quadPts(x0, y0, cx, cy, x1, y1, 12);
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const wv = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    L.push({ x: pts[i].x - (dy / d) * wv, y: pts[i].y + (dx / d) * wv });
    R.push({ x: pts[i].x + (dy / d) * wv, y: pts[i].y - (dx / d) * wv });
  }
  poly(g, [...L, ...R.reverse()], color);
}

/** Big bodhi tree (cây bồ đề). (x, y) = trunk base on the ground. Canopy ≈ 460*scale wide. */
export function drawBodhiTree(g: G, x: number, y: number, scale = 1, seed = 7): void {
  const s = scale;
  const r = rng(seed);
  const bark = 0x6c5848;
  const barkDark = 0x4a3a2e;
  groundShadow(g, x, y + 4 * s, 260 * s, 34 * s, 0.25);
  // roots & trunk
  const trunk: Pt[] = [
    ...quadPts(x - 70 * s, y + 4 * s, x - 30 * s, y - 10 * s, x - 26 * s, y - 70 * s, 8),
    ...quadPts(x - 26 * s, y - 70 * s, x - 30 * s, y - 150 * s, x - 14 * s, y - 230 * s, 8),
    ...quadPts(x + 14 * s, y - 230 * s, x + 26 * s, y - 150 * s, x + 24 * s, y - 70 * s, 8),
    ...quadPts(x + 24 * s, y - 70 * s, x + 30 * s, y - 10 * s, x + 76 * s, y + 4 * s, 8),
  ];
  poly(g, trunk, bark);
  // bark streaks
  for (let i = 0; i < 9; i++) {
    const bx = x - 18 * s + i * 4.5 * s;
    g.lineStyle(1.5 * s, i % 2 ? barkDark : 0x8d7a66, 0.6);
    g.lineBetween(bx, y - 10 * s, bx + (r() - 0.5) * 8 * s, y - 200 * s);
  }
  // main branches
  taperBranch(g, x - 8 * s, y - 200 * s, x - 70 * s, y - 250 * s, x - 150 * s, y - 300 * s, 26 * s, 6 * s, bark);
  taperBranch(g, x + 6 * s, y - 210 * s, x + 70 * s, y - 250 * s, x + 160 * s, y - 290 * s, 24 * s, 6 * s, bark);
  taperBranch(g, x, y - 225 * s, x - 10 * s, y - 300 * s, x + 10 * s, y - 380 * s, 22 * s, 5 * s, bark);
  taperBranch(g, x - 20 * s, y - 120 * s, x - 70 * s, y - 150 * s, x - 110 * s, y - 210 * s, 16 * s, 4 * s, bark);
  // aerial roots (bồ đề hay có rễ phụ)
  for (let i = 0; i < 4; i++) {
    const rx = x - 40 * s + i * 26 * s;
    g.lineStyle(1.2 * s, barkDark, 0.4);
    g.lineBetween(rx, y - 200 * s - r() * 40 * s, rx + (r() - 0.5) * 10 * s, y - 90 * s - r() * 40 * s);
  }
  // canopy clusters
  const ccx = x;
  const ccy = y - 330 * s;
  const clusters: Pt[] = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    clusters.push({ x: ccx + Math.cos(a) * d * 190 * s, y: ccy + Math.sin(a) * d * 120 * s - 10 * s });
  }
  clusters.sort((a, b) => a.y - b.y);
  // dark under-mass
  for (const c of clusters) {
    g.fillStyle(PAL.leafDark, 1);
    g.fillCircle(c.x + 8 * s, c.y + 14 * s, (52 + r() * 20) * s);
  }
  for (const c of clusters) {
    g.fillStyle(PAL.leaf, 1);
    g.fillCircle(c.x, c.y, (44 + r() * 14) * s);
  }
  for (const c of clusters) {
    g.fillStyle(PAL.leafLight, 0.85);
    g.fillCircle(c.x - 12 * s, c.y - 14 * s, (24 + r() * 10) * s);
  }
  // branches peeking through
  for (let i = 0; i < 5; i++) {
    const bx = ccx + (r() - 0.5) * 260 * s;
    const by = ccy + 40 * s + r() * 60 * s;
    g.lineStyle(3 * s, bark, 0.8);
    g.lineBetween(bx, by, bx + (r() - 0.5) * 60 * s, by - 30 * s);
  }
  // heart-shaped leaves: on top and edges
  const greens = [PAL.leafDark, PAL.leaf, PAL.leafLight, 0x9fbe6a, 0x6b9246];
  for (let i = 0; i < 340; i++) {
    const a = r() * Math.PI * 2;
    const d = 0.55 + r() * 0.55;
    const lx = ccx + Math.cos(a) * d * 215 * s;
    const ly = ccy + Math.sin(a) * d * 145 * s - 10 * s;
    const upper = ly < ccy;
    const col = upper ? greens[1 + Math.floor(r() * 4)] : greens[Math.floor(r() * 3)];
    poly(g, leafPts(lx, ly, (7 + r() * 4) * s, (r() - 0.5) * 1.6), col, 0.95);
  }
  // hanging leaves below canopy
  for (let i = 0; i < 40; i++) {
    const lx = ccx + (r() - 0.5) * 360 * s;
    const ly = ccy + 90 * s + r() * 50 * s;
    poly(g, leafPts(lx, ly, (7 + r() * 3) * s, (r() - 0.5) * 0.8), greens[Math.floor(r() * 3)], 0.95);
  }
}

/**
 * Big bronze incense burner (lư hương) on a stone pedestal.
 * (x, y) = ground centre. Total height ≈ 230*scale, width ≈ 170*scale.
 */
export function drawIncenseBurner(g: G, x: number, y: number, scale = 1): void {
  const s = scale;
  groundShadow(g, x, y + 2 * s, 220 * s, 30 * s, 0.3);
  // pedestal: plinth, block, cap
  g.fillStyle(PAL.stoneDark, 1);
  g.fillRect(x - 90 * s, y - 16 * s, 180 * s, 16 * s);
  g.fillStyle(PAL.stone, 1);
  g.fillRect(x - 90 * s, y - 18 * s, 180 * s, 5 * s);
  vGrad(g, x - 72 * s, y - 80 * s, 144 * s, 64 * s, PAL.stoneLight, PAL.stone, 6);
  g.fillStyle(PAL.stoneDark, 0.5);
  g.fillRect(x - 52 * s, y - 70 * s, 104 * s, 44 * s);
  g.fillStyle(PAL.stone, 1);
  g.fillRect(x - 48 * s, y - 66 * s, 96 * s, 36 * s);
  drawLotus(g, x, y - 36 * s, 24 * s, 0xc9b9a0);
  g.fillStyle(PAL.stoneDark, 0.6);
  g.fillRect(x + 50 * s, y - 80 * s, 22 * s, 64 * s);
  g.fillStyle(PAL.mossDark, 0.3);
  g.fillRect(x - 72 * s, y - 24 * s, 144 * s, 8 * s);
  g.fillStyle(PAL.stoneDark, 1);
  g.fillRect(x - 84 * s, y - 92 * s, 168 * s, 14 * s);
  g.fillStyle(PAL.stoneLight, 1);
  g.fillRect(x - 84 * s, y - 94 * s, 168 * s, 5 * s);

  const top = y - 92 * s;
  // legs (three; middle one foreshortened)
  for (const lx of [-46, 46]) {
    const leg = [
      ...quadPts(x + (lx - 10) * s, top - 34 * s, x + (lx * 1.25 - 6) * s, top - 18 * s, x + (lx * 1.15 - 8) * s, top, 6),
      ...quadPts(x + (lx * 1.15 + 8) * s, top, x + (lx * 1.1 + 6) * s, top - 16 * s, x + (lx + 10) * s, top - 34 * s, 6),
    ];
    poly(g, leg, PAL.bronzeDark);
    g.fillStyle(PAL.bronzeLight, 0.4);
    g.fillRect(x + (lx * 1.15 - 6) * s, top - 4 * s, 12 * s, 3 * s);
  }
  g.fillStyle(PAL.bronzeDark, 1);
  g.fillRect(x - 8 * s, top - 30 * s, 16 * s, 28 * s);

  // belly
  const by = top - 64 * s;
  g.fillStyle(PAL.bronzeDark, 1);
  g.fillEllipse(x, by + 4 * s, 154 * s, 84 * s);
  g.fillStyle(PAL.bronze, 1);
  g.fillEllipse(x - 4 * s, by, 146 * s, 76 * s);
  g.fillStyle(PAL.bronzeLight, 0.55);
  g.fillEllipse(x - 30 * s, by - 10 * s, 62 * s, 30 * s);
  g.fillStyle(0xf6e0a8, 0.35);
  g.fillEllipse(x - 36 * s, by - 14 * s, 26 * s, 10 * s);
  // decorative band + patina
  g.fillStyle(PAL.bronzeDark, 0.55);
  g.fillRect(x - 70 * s, by - 6 * s, 140 * s, 5 * s);
  for (let i = -3; i <= 3; i++) {
    g.fillStyle(PAL.bronzeLight, 0.35);
    g.fillCircle(x + i * 18 * s, by + 12 * s, 4 * s);
  }
  g.fillStyle(PAL.patina, 0.28);
  g.fillEllipse(x + 30 * s, by + 18 * s, 50 * s, 18 * s);
  // rim
  const rimY = by - 34 * s;
  g.fillStyle(PAL.bronzeDark, 1);
  g.fillEllipse(x, rimY, 128 * s, 22 * s);
  g.fillStyle(PAL.bronzeLight, 1);
  g.fillEllipse(x, rimY - 2 * s, 124 * s, 16 * s);
  g.fillStyle(0x3a2a14, 1);
  g.fillEllipse(x, rimY - 1 * s, 108 * s, 10 * s);
  // ears (upright handles)
  for (const side of [-1, 1]) {
    const ex = x + side * 56 * s;
    g.fillStyle(PAL.bronzeDark, 1);
    g.fillRect(ex - 9 * s, rimY - 34 * s, 18 * s, 32 * s);
    g.fillStyle(PAL.bronze, 1);
    g.fillRect(ex - 7 * s, rimY - 34 * s, 14 * s, 6 * s);
    g.fillRect(ex - 7 * s, rimY - 34 * s, 5 * s, 30 * s);
    g.fillRect(ex + 2 * s, rimY - 34 * s, 5 * s, 30 * s);
    g.fillStyle(PAL.bronzeLight, 0.6);
    g.fillRect(ex - 6 * s, rimY - 33 * s, 2 * s, 26 * s);
  }
  // lid
  const lidY = rimY - 10 * s;
  g.fillStyle(PAL.bronzeDark, 1);
  g.fillEllipse(x, lidY + 2 * s, 112 * s, 22 * s);
  g.fillStyle(PAL.bronze, 1);
  g.fillEllipse(x, lidY - 14 * s, 96 * s, 44 * s);
  g.fillRect(x - 48 * s, lidY - 14 * s, 96 * s, 14 * s);
  g.fillStyle(PAL.bronzeLight, 0.5);
  g.fillEllipse(x - 18 * s, lidY - 22 * s, 36 * s, 14 * s);
  // pierced cloud holes
  g.fillStyle(0x2a1d0e, 0.85);
  for (let i = -2; i <= 2; i++) {
    g.fillEllipse(x + i * 17 * s, lidY - 10 * s + Math.abs(i) * 1.5 * s, 8 * s, 5 * s);
  }
  g.fillStyle(PAL.bronzeDark, 1);
  g.fillRect(x - 4 * s, lidY - 44 * s, 8 * s, 10 * s);
  // finial pearl
  g.fillStyle(PAL.bronze, 1);
  g.fillCircle(x, lidY - 48 * s, 10 * s);
  g.fillStyle(PAL.bronzeLight, 0.8);
  g.fillCircle(x - 3 * s, lidY - 51 * s, 4 * s);
}

/** Hanging red lantern (đèn lồng). (x, y) = hook top. Height ≈ 92*scale. */
export function drawLantern(g: G, x: number, y: number, scale = 1, color: number = PAL.lacquer): void {
  const s = scale;
  g.lineStyle(1.5 * s, 0x3a2516, 1);
  g.lineBetween(x, y, x, y + 16 * s);
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(x - 11 * s, y + 14 * s, 22 * s, 7 * s);
  const cy = y + 44 * s;
  g.fillStyle(shade(color, -0.25), 1);
  g.fillEllipse(x, cy, 46 * s, 50 * s);
  g.fillStyle(color, 1);
  g.fillEllipse(x - 2 * s, cy, 40 * s, 48 * s);
  g.fillStyle(shade(color, 0.3), 0.7);
  g.fillEllipse(x - 7 * s, cy - 4 * s, 14 * s, 34 * s);
  g.lineStyle(1 * s, shade(color, -0.35), 0.7);
  for (const k of [-0.6, -0.25, 0.25, 0.6]) g.strokeEllipse(x, cy, 44 * s * Math.abs(k), 48 * s);
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(x - 11 * s, cy + 22 * s, 22 * s, 6 * s);
  g.fillStyle(PAL.gold, 1);
  g.fillRect(x - 11 * s, y + 14 * s, 22 * s, 2 * s);
  g.lineStyle(1.2 * s, PAL.gold, 0.9);
  for (let i = -3; i <= 3; i++) g.lineBetween(x + i * 1.6 * s, cy + 28 * s, x + i * 2.2 * s, cy + 46 * s);
}

/** Gold-on-red horizontal signboard (hoành phi) with scroll ends. (x, y) = centre. */
export function drawHorizontalPlaque(g: G, x: number, y: number, w: number, h: number): void {
  const l = x - w / 2;
  const t = y - h / 2;
  g.fillStyle(0x000000, 0.25);
  g.fillRect(l + 3, t + 4, w, h);
  // scroll ends (cuốn thư)
  for (const side of [-1, 1]) {
    const ex = x + side * w / 2;
    g.fillStyle(PAL.goldDark, 1);
    g.fillCircle(ex, t + h * 0.28, h * 0.3);
    g.fillCircle(ex, t + h * 0.72, h * 0.3);
    g.fillStyle(PAL.gold, 1);
    g.fillCircle(ex, t + h * 0.28, h * 0.2);
    g.fillCircle(ex, t + h * 0.72, h * 0.2);
    g.fillStyle(PAL.goldLight, 1);
    g.fillCircle(ex - side * h * 0.04, t + h * 0.25, h * 0.08);
    g.fillCircle(ex - side * h * 0.04, t + h * 0.69, h * 0.08);
  }
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(l, t, w, h);
  g.fillStyle(PAL.gold, 1);
  g.fillRect(l + 2, t + 2, w - 4, h - 4);
  g.fillStyle(PAL.goldLight, 0.7);
  g.fillRect(l + 2, t + 2, w - 4, 2);
  g.fillStyle(PAL.lacquerDark, 1);
  g.fillRect(l + h * 0.14, t + h * 0.14, w - h * 0.28, h * 0.72);
  g.fillStyle(PAL.lacquer, 1);
  g.fillRect(l + h * 0.16, t + h * 0.16, w - h * 0.32, h * 0.6);
  g.lineStyle(1, PAL.goldLight, 0.6);
  g.strokeRect(l + h * 0.22, t + h * 0.22, w - h * 0.44, h * 0.56);
}

/** Add the plaque text (Vietnamese, serif, gold). Returns the Text object (not added to a layer). */
export function makePlaqueText(scene: Phaser.Scene, x: number, y: number, text: string, size: number): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, {
    fontFamily: 'Georgia, "Times New Roman", "Noto Serif", serif',
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color: '#f6d98c',
    stroke: '#5a1a12',
    strokeThickness: Math.max(1, size * 0.12),
  });
  t.setOrigin(0.5, 0.5);
  t.setShadow(0, 1, 'rgba(40,10,0,0.6)', 2, false, true);
  return t;
}

/** Stone lantern (đèn đá). (x, y) = ground centre. Height ≈ 150*scale. */
export function drawStoneLantern(g: G, x: number, y: number, scale = 1): void {
  const s = scale;
  groundShadow(g, x, y, 70 * s, 12 * s, 0.25);
  g.fillStyle(PAL.stoneDark, 1);
  g.fillRect(x - 26 * s, y - 14 * s, 52 * s, 14 * s);
  g.fillStyle(PAL.stone, 1);
  g.fillRect(x - 26 * s, y - 16 * s, 52 * s, 5 * s);
  vGrad(g, x - 9 * s, y - 80 * s, 18 * s, 66 * s, PAL.stoneLight, PAL.stone, 5);
  g.fillStyle(PAL.stoneDark, 0.6);
  g.fillRect(x + 3 * s, y - 80 * s, 6 * s, 66 * s);
  g.fillStyle(PAL.stoneDark, 1);
  g.fillRect(x - 20 * s, y - 88 * s, 40 * s, 9 * s);
  g.fillStyle(PAL.stone, 1);
  g.fillRect(x - 17 * s, y - 120 * s, 34 * s, 32 * s);
  g.fillStyle(0x2d2118, 1);
  g.fillRect(x - 9 * s, y - 114 * s, 18 * s, 20 * s);
  g.fillStyle(0xe8b860, 0.45);
  g.fillRect(x - 7 * s, y - 112 * s, 14 * s, 16 * s);
  // cap roof with upturned corners
  const cap: Pt[] = [
    { x: x - 12 * s, y: y - 140 * s },
    { x: x + 12 * s, y: y - 140 * s },
    ...quadPts(x + 12 * s, y - 140 * s, x + 22 * s, y - 124 * s, x + 32 * s, y - 128 * s, 6),
    ...quadPts(x + 28 * s, y - 119 * s, x, y - 121 * s, x - 28 * s, y - 119 * s, 6),
    ...quadPts(x - 32 * s, y - 128 * s, x - 22 * s, y - 124 * s, x - 12 * s, y - 140 * s, 6),
  ];
  poly(g, cap.map((p) => ({ x: p.x + 2 * s, y: p.y + 2 * s })), PAL.stoneDark);
  poly(g, cap, PAL.stone);
  g.fillStyle(PAL.stoneLight, 1);
  g.fillRect(x - 12 * s, y - 140 * s, 24 * s, 3 * s);
  g.fillStyle(PAL.stoneDark, 1);
  g.fillCircle(x, y - 144 * s, 5 * s);
  g.fillStyle(PAL.mossDark, 0.35);
  g.fillEllipse(x - 10 * s, y - 16 * s, 20 * s, 8 * s);
}

/** Bamboo clump. (x, y) = ground centre, h = height. */
export function drawBambooClump(g: G, x: number, y: number, h: number, seed = 5, color: number = PAL.bamboo, alpha = 1): void {
  const r = rng(seed);
  const dark = shade(color, -0.3);
  const stalks = 6 + Math.floor(r() * 4);
  const tops: Pt[] = [];
  for (let i = 0; i < stalks; i++) {
    const bx = x + (r() - 0.5) * h * 0.18;
    const lean = (r() - 0.5) * h * 0.5;
    const sh = h * (0.7 + r() * 0.3);
    const w = Math.max(2, h * 0.022 * (0.7 + r() * 0.5));
    const tx = bx + lean;
    const ty = y - sh;
    const segs = Math.max(5, Math.round(sh / (h * 0.09)));
    for (let k = 0; k < segs; k++) {
      const t0 = k / segs;
      const t1 = (k + 1) / segs;
      const xa = bx + (tx - bx) * t0 * t0;
      const ya = y + (ty - y) * t0;
      const xb = bx + (tx - bx) * t1 * t1;
      const yb = y + (ty - y) * t1;
      g.lineStyle(w * (1 - t0 * 0.4), i % 2 ? color : shade(color, 0.12), alpha);
      g.lineBetween(xa, ya, xb, yb);
      g.fillStyle(dark, alpha);
      g.fillRect(xb - w * 0.7, yb - 1, w * 1.4, 2);
    }
    tops.push({ x: tx, y: ty });
  }
  // leaf sprays
  const leafCount = Math.round(h * 0.9);
  for (let i = 0; i < leafCount; i++) {
    const t = tops[Math.floor(r() * tops.length)];
    const f = r();
    const lx = x + (t.x - x) * (0.4 + f * 0.6) + (r() - 0.5) * h * 0.25;
    const ly = y + (t.y - y) * (0.45 + f * 0.6);
    const ang = Math.PI * (0.15 + r() * 0.7) + (r() < 0.5 ? 0 : Math.PI * 0.0);
    const len = h * (0.05 + r() * 0.05);
    const dx = Math.cos(ang) * len * (r() < 0.5 ? -1 : 1);
    const dy = Math.sin(ang) * len * 0.6;
    const nx = -dy * 0.12;
    const ny = dx * 0.12;
    g.fillStyle(r() < 0.4 ? dark : r() < 0.5 ? color : shade(color, 0.2), alpha);
    g.fillTriangle(lx + nx, ly + ny, lx - nx, ly - ny, lx + dx, ly + dy);
  }
}

/** Misty hills silhouette filled down to `bottom`. */
export function drawHills(g: G, x0: number, x1: number, baseY: number, amp: number, color: number, seed = 1, bottom = baseY + 400): void {
  const r = rng(seed);
  const f1 = 0.004 + r() * 0.004;
  const f2 = 0.011 + r() * 0.008;
  const f3 = 0.025 + r() * 0.01;
  const p1 = r() * 10;
  const p2 = r() * 10;
  const p3 = r() * 10;
  const pts: Pt[] = [];
  for (let x = x0; x <= x1 + 8; x += 8) {
    const yy = baseY - amp * (0.55 * Math.sin(x * f1 + p1) + 0.3 * Math.sin(x * f2 + p2) + 0.15 * Math.sin(x * f3 + p3) + 0.6);
    pts.push({ x, y: yy });
  }
  pts.push({ x: x1 + 8, y: bottom }, { x: x0, y: bottom });
  poly(g, pts, color);
  // soft mist band at the base
  vGrad(g, x0, baseY - amp * 0.1, x1 - x0 + 8, amp * 0.6, color, 0xe9ece4, 6, 0.25);
}

/** Row of rounded tree crowns (distant foliage). */
export function drawTreeLine(g: G, x0: number, x1: number, baseY: number, h: number, color: number, seed = 2, bottom = baseY + 200): void {
  const r = rng(seed);
  g.fillStyle(color, 1);
  g.fillRect(x0, baseY - h * 0.3, x1 - x0, bottom - baseY + h * 0.3);
  for (let x = x0; x <= x1; x += h * (0.25 + r() * 0.25)) {
    const rh = h * (0.45 + r() * 0.55);
    g.fillStyle(color, 1);
    g.fillCircle(x, baseY - rh * 0.6, rh * 0.5);
    g.fillStyle(shade(color, 0.08), 1);
    g.fillCircle(x - rh * 0.12, baseY - rh * 0.72, rh * 0.28);
  }
}

/** Round shrub / bush. */
export function drawBush(g: G, x: number, y: number, w: number, h: number, color: number = PAL.leaf, seed = 9): void {
  const r = rng(seed);
  groundShadow(g, x, y, w * 1.1, h * 0.2, 0.2);
  for (let i = 0; i < 9; i++) {
    const bx = x + (r() - 0.5) * w * 0.7;
    const by = y - h * 0.35 - r() * h * 0.35;
    g.fillStyle(shade(color, -0.25), 1);
    g.fillCircle(bx + 3, by + 4, h * (0.25 + r() * 0.15));
  }
  for (let i = 0; i < 9; i++) {
    const bx = x + (r() - 0.5) * w * 0.7;
    const by = y - h * 0.4 - r() * h * 0.35;
    g.fillStyle(color, 1);
    g.fillCircle(bx, by, h * (0.2 + r() * 0.12));
    g.fillStyle(shade(color, 0.25), 0.8);
    g.fillCircle(bx - h * 0.06, by - h * 0.07, h * 0.08);
  }
}

/** Glazed pot with a small trimmed bonsai/shrub. (x, y) = ground centre. */
export function drawPottedPlant(g: G, x: number, y: number, scale = 1, seed = 4): void {
  const s = scale;
  groundShadow(g, x, y, 70 * s, 10 * s, 0.25);
  g.fillStyle(0x3f5f73, 1);
  g.fillRect(x - 26 * s, y - 34 * s, 52 * s, 30 * s);
  g.fillStyle(0x2c4656, 1);
  g.fillRect(x + 8 * s, y - 34 * s, 18 * s, 30 * s);
  g.fillStyle(0x6f93a3, 1);
  g.fillRect(x - 30 * s, y - 40 * s, 60 * s, 7 * s);
  g.fillStyle(0xd8e4e0, 0.4);
  g.fillRect(x - 18 * s, y - 28 * s, 22 * s, 3 * s);
  g.fillStyle(0x2c2018, 1);
  g.fillRect(x - 22 * s, y - 4 * s, 10 * s, 4 * s);
  g.fillRect(x + 12 * s, y - 4 * s, 10 * s, 4 * s);
  taperBranch(g, x, y - 40 * s, x - 18 * s, y - 60 * s, x + 4 * s, y - 84 * s, 9 * s, 3 * s, 0x5b4636);
  const r = rng(seed);
  for (const [px, py, pr] of [[-22, -70, 16], [14, -88, 18], [-4, -104, 13], [24, -66, 12]] as const) {
    g.fillStyle(PAL.leafDark, 1);
    g.fillEllipse(x + (px + 2) * s, y + (py + 3) * s, pr * 2.4 * s, pr * 1.3 * s);
    g.fillStyle(PAL.leaf, 1);
    g.fillEllipse(x + px * s, y + py * s, pr * 2.1 * s, pr * 1.05 * s);
    g.fillStyle(PAL.leafLight, 0.8);
    g.fillEllipse(x + (px - 3 + r() * 2) * s, y + (py - 4) * s, pr * 1.1 * s, pr * 0.45 * s);
  }
}

/** Wooden signpost with a small board and a direction arrow. (x, y) = ground. dir -1 left, 1 right, 0 up. */
export function drawSignpost(g: G, x: number, y: number, dir: -1 | 0 | 1, scale = 1): void {
  const s = scale;
  groundShadow(g, x, y, 40 * s, 8 * s, 0.25);
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(x - 4 * s, y - 86 * s, 8 * s, 86 * s);
  g.fillStyle(PAL.woodLight, 0.6);
  g.fillRect(x - 3 * s, y - 86 * s, 2 * s, 86 * s);
  const bw = 66 * s;
  const bh = 24 * s;
  const by = y - 84 * s;
  const bx = x - bw / 2 + dir * 10 * s;
  const tipX = dir === 0 ? 0 : dir > 0 ? bx + bw + 10 * s : bx - 10 * s;
  const pts: Pt[] =
    dir === 0
      ? [{ x: bx, y: by }, { x: bx + bw, y: by }, { x: bx + bw, y: by + bh }, { x: bx, y: by + bh }]
      : dir > 0
        ? [{ x: bx, y: by }, { x: bx + bw, y: by }, { x: tipX, y: by + bh / 2 }, { x: bx + bw, y: by + bh }, { x: bx, y: by + bh }]
        : [{ x: bx, y: by }, { x: bx + bw, y: by }, { x: bx + bw, y: by + bh }, { x: bx, y: by + bh }, { x: tipX, y: by + bh / 2 }];
  poly(g, pts.map((p) => ({ x: p.x + 2 * s, y: p.y + 3 * s })), 0x000000, 0.25);
  poly(g, pts, PAL.wood);
  poly(g, pts.map((p) => ({ x: p.x, y: Math.min(p.y, by + bh * 0.3) })), PAL.woodLight, 0.35);
  g.lineStyle(1.2 * s, PAL.goldLight, 0.7);
  g.strokeRect(bx + 4 * s, by + 4 * s, bw - 8 * s, bh - 8 * s);
  // tiny roof cap
  g.fillStyle(PAL.tileDark, 1);
  g.fillTriangle(bx - 6 * s, by, bx + bw + 6 * s, by, x + dir * 10 * s, by - 10 * s);
  g.fillStyle(PAL.tile, 1);
  g.fillRect(bx - 6 * s, by - 2 * s, bw + 12 * s, 3 * s);
  drawLotus(g, x + dir * 10 * s, by + bh * 0.82, 12 * s, PAL.goldLight);
}

/** Wooden lattice door panel (cửa bức bàn). */
export function drawLatticeDoor(g: G, x: number, y: number, w: number, h: number, open = false): void {
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(x, y, w, h);
  if (open) {
    vGrad(g, x + 4, y + 4, w - 8, h - 8, 0x2a1810, 0x5a3820, 8);
    return;
  }
  g.fillStyle(PAL.wood, 1);
  g.fillRect(x + 3, y + 3, w - 6, h - 6);
  // upper lattice
  const lh = h * 0.45;
  g.fillStyle(0x3a2214, 1);
  g.fillRect(x + 7, y + 8, w - 14, lh);
  g.lineStyle(2, PAL.woodLight, 0.9);
  for (let lx = x + 11; lx < x + w - 9; lx += 7) g.lineBetween(lx, y + 8, lx, y + 8 + lh);
  for (let ly = y + 14; ly < y + 8 + lh; ly += 16) g.lineBetween(x + 7, ly, x + w - 7, ly);
  // lower panel
  g.fillStyle(PAL.woodDark, 0.6);
  g.fillRect(x + 8, y + lh + 18, w - 16, h - lh - 28);
  g.fillStyle(PAL.woodLight, 0.25);
  g.fillRect(x + 10, y + lh + 20, w - 20, 3);
}
