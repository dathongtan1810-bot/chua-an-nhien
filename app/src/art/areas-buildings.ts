/**
 * Art for the "building" areas: cổng tam quan, sân chùa, chính điện, lầu chuông,
 * am xin xăm, thiền đường. All drawn in code; static parts baked once into textures.
 *
 * Interactive sprites the SCENE adds on top (not drawn here):
 * - lau-chuong: bell at hotspot 'bell' → makeBellTexture(), log striker at 'beam' → makeBeamTexture().
 * - am-xam: stick cup at hotspot 'sticks' → makeStickCupTexture() (sits on the table, its
 *   bottom ≈ hotspot.y + 45), single stick → makeStickTexture().
 */
import type Phaser from 'phaser';
import type { AreaId } from '../core/areas';
import { GAME_H, GAME_W } from './types';
import type { AreaArtFn, AreaArtResult, ArtContext, Hotspot } from './types';
import {
  PAL,
  drawBambooClump,
  drawBodhiTree,
  drawBrickFloor,
  drawBush,
  drawCurvedRoof,
  drawHills,
  drawHorizontalPlaque,
  drawIncenseBurner,
  drawLantern,
  drawLatticeDoor,
  drawLotus,
  drawPillar,
  drawPottedPlant,
  drawSignpost,
  drawSteps,
  drawStoneLantern,
  drawTreeLine,
  drawWall,
  groundShadow,
  hGrad,
  leafPts,
  lerpColor,
  makePlaqueText,
  petalPts,
  quadPts,
  rng,
  softBlob,
  taperBranch,
  vGrad,
} from './primitives';

type G = Phaser.GameObjects.Graphics;
type Container = Phaser.GameObjects.Container;
type Img = Phaser.GameObjects.Image;

export const WORLD_WIDTH: Partial<Record<AreaId, number>> = {
  cong: 760,
  san: 1000,
  'chinh-dien': 720,
  'lau-chuong': 760,
  'am-xam': 720,
  'thien-duong': 600,
};

// ---------------------------------------------------------------- shared helpers

/** Draw into a temporary Graphics and bake it into a texture (idempotent). */
export function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, Math.ceil(w), Math.ceil(h));
  g.destroy();
  return key;
}

/** Soft white radial glow (128×128) for ADD-blended lights. */
export function ensureGlowTexture(scene: Phaser.Scene): string {
  const key = 'art-glow';
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, 128, 128);
  if (!tex) return key;
  const c = tex.getContext();
  const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.14)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr;
  c.fillRect(0, 0, 128, 128);
  tex.refresh();
  return key;
}

function img(ctx: ArtContext, layer: Container, key: string, x = 0, y = 0): Img {
  const im = ctx.scene.add.image(x, y, key).setOrigin(0, 0);
  layer.add(im);
  return im;
}

function glow(ctx: ArtContext, layer: Container, x: number, y: number, r: number, color: number, alpha: number): Img {
  const im = ctx.scene.add.image(x, y, ensureGlowTexture(ctx.scene));
  im.setBlendMode('ADD').setTint(color).setAlpha(Math.max(0, Math.min(1, alpha))).setScale(r / 64);
  layer.add(im);
  if (alpha <= 0.01) im.setVisible(false);
  return im;
}

function tintFor(night: number, target: number, k = 0.9): number {
  return lerpColor(0xffffff, target, night * k);
}

const farW = (ww: number): number => Math.ceil(GAME_W + (ww - GAME_W) * 0.3) + 24;
const midW = (ww: number): number => Math.ceil(GAME_W + (ww - GAME_W) * 0.6) + 24;
const nearW = (ww: number): number => Math.ceil(GAME_W + (ww - GAME_W) * 1.25) + 24;

const EXT_TINT = 0x5d6690;
const FAR_TINT = 0x3e4872;
const INT_TINT = 0x8c7c8c;

/** Hanging red lantern sprite with gentle sway + night glow. */
function addHangingLantern(ctx: ArtContext, layer: Container, x: number, y: number, scale: number, tint: number, glowA: number): void {
  const key = bake(ctx.scene, 'art-lantern-red', 60, 100, (g) => drawLantern(g, 30, 0, 1));
  const lit = glow(ctx, layer, x, y + 44 * scale, 70 * scale, PAL.glowWarm, glowA);
  const im = ctx.scene.add.image(x, y, key).setOrigin(0.5, 0).setScale(scale).setTint(tint);
  layer.add(im);
  if (!ctx.reducedMotion) {
    const d = 2400 + ((x * 37) % 900);
    ctx.scene.tweens.add({ targets: im, angle: { from: -2.4, to: 2.4 }, duration: d, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  if (ctx.night > 0.05 && !ctx.reducedMotion) {
    ctx.scene.tweens.add({ targets: lit, alpha: lit.alpha * 0.82, duration: 1700 + ((x * 13) % 700), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

function wallCap(g: G, x: number, y: number, w: number): void {
  g.fillStyle(0x000000, 0.15);
  g.fillRect(x, y, w, 8);
  g.fillStyle(PAL.tileDark, 1);
  g.fillRect(x - 4, y - 12, w + 8, 12);
  g.fillStyle(PAL.tile, 1);
  for (let i = x - 2; i < x + w + 2; i += 7) g.fillRect(i, y - 11, 4, 10);
  g.fillStyle(PAL.ridge, 1);
  g.fillRect(x - 4, y - 18, w + 8, 7);
  g.fillStyle(PAL.ridgeLight, 1);
  g.fillRect(x - 4, y - 18, w + 8, 2);
}

/** Arched doorway; inside dark with a sunlit glimpse at the bottom. */
function archOpening(g: G, cx: number, bottom: number, w: number, h: number, glimpse = true): void {
  const r = w / 2;
  const top = bottom - h + r;
  g.fillStyle(PAL.wallDark, 1);
  g.fillCircle(cx, top, r + 7);
  g.fillRect(cx - r - 7, top, w + 14, bottom - top);
  g.fillStyle(PAL.stone, 1);
  g.fillCircle(cx, top, r + 4);
  g.fillRect(cx - r - 4, top, w + 8, bottom - top);
  g.fillStyle(0x24170f, 1);
  g.fillCircle(cx, top, r);
  vGrad(g, cx - r, top, w, bottom - top, 0x24170f, 0x3d2a1c, 6);
  if (glimpse) {
    const gh = Math.min(h * 0.3, 60);
    vGrad(g, cx - r + 6, bottom - gh, w - 12, gh, 0x8b6f55, 0xd2b08c, 5);
    g.fillStyle(0x7f9668, 0.55);
    g.fillRect(cx - r + 6, bottom - gh - 6, w - 12, 8);
  }
}

function leafyBranch(g: G, x0: number, y0: number, dir: 1 | -1, s: number, seed: number): void {
  const r = rng(seed);
  const x1 = x0 + dir * 230 * s;
  const y1 = y0 + 90 * s;
  taperBranch(g, x0, y0, x0 + dir * 120 * s, y0 + 10 * s, x1, y1, 22 * s, 4 * s, 0x5d4a3c);
  taperBranch(g, x0 + dir * 90 * s, y0 + 20 * s, x0 + dir * 120 * s, y0 + 60 * s, x0 + dir * 150 * s, y0 + 150 * s, 9 * s, 3 * s, 0x5d4a3c);
  const greens = [PAL.leafDark, PAL.leaf, PAL.leafLight, 0x6b9246];
  for (let i = 0; i < 120; i++) {
    const t = r();
    const bx = x0 + (x1 - x0) * t + (r() - 0.5) * 70 * s;
    const by = y0 + (y1 - y0) * t + (r() - 0.2) * 70 * s + 10 * s;
    const pts = leafPts(bx, by, (9 + r() * 5) * s, (r() - 0.5) * 1.2);
    g.fillStyle(greens[Math.floor(r() * greens.length)], 1);
    g.fillPoints(pts, true, true);
  }
}

function drawFrangipani(g: G, x: number, y: number, s: number, seed: number): void {
  const r = rng(seed);
  const bark = 0x8b8172;
  groundShadow(g, x, y, 160 * s, 20 * s, 0.22);
  taperBranch(g, x, y, x - 6 * s, y - 70 * s, x + 6 * s, y - 130 * s, 20 * s, 12 * s, bark);
  const tips: { x: number; y: number }[] = [];
  const forks = [[-90, -60], [-40, -110], [30, -120], [90, -70], [0, -150]];
  for (const [dx, dy] of forks) {
    const tx = x + 6 * s + dx * s;
    const ty = y - 130 * s + dy * s;
    taperBranch(g, x + 6 * s, y - 128 * s, x + 6 * s + dx * 0.2 * s, ty + 40 * s, tx, ty, 11 * s, 5 * s, bark);
    tips.push({ x: tx, y: ty });
  }
  for (const t of tips) {
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.38 + (r() - 0.5) * 0.2;
      g.fillStyle(i % 2 ? PAL.leaf : PAL.leafDark, 1);
      g.fillPoints(petalPts(t.x, t.y, a, (36 + r() * 12) * s, 9 * s), true, true);
    }
    for (let i = 0; i < 4; i++) {
      const fx = t.x + (r() - 0.5) * 34 * s;
      const fy = t.y - 10 * s - r() * 20 * s;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + r();
        g.fillStyle(0xfdf6e6, 1);
        g.fillPoints(petalPts(fx, fy, a, 7 * s, 3.4 * s), true, true);
      }
      g.fillStyle(0xf3c64e, 1);
      g.fillCircle(fx, fy, 2.4 * s);
    }
  }
}

/** Far hills + mid tree line shared by outdoor areas. */
function addOutdoorBackdrop(ctx: ArtContext, id: string, seed: number, extraMid?: (g: G, w: number) => void): void {
  const ww = ctx.worldWidth;
  const fw = farW(ww);
  const mw = midW(ww);
  const farKey = bake(ctx.scene, `art-${id}-far-${ww}`, fw, 660, (g) => {
    drawHills(g, 0, fw, 410, 150, PAL.hillFar, seed, 660);
    drawHills(g, 0, fw, 490, 110, PAL.hillMid, seed + 7, 660);
    // tiny distant stupa on a ridge
    const sx = fw * 0.72;
    g.fillStyle(0x8fa298, 1);
    g.fillRect(sx - 5, 382, 10, 40);
    for (let i = 0; i < 5; i++) g.fillRect(sx - 9 + i, 382 + i * 8, 18 - i * 2, 3);
    g.fillTriangle(sx - 4, 382, sx + 4, 382, sx, 366);
  });
  img(ctx, ctx.layers.far, farKey).setTint(tintFor(ctx.night, FAR_TINT));
  const midKey = bake(ctx.scene, `art-${id}-mid-${ww}`, mw, 660, (g) => {
    drawTreeLine(g, -20, mw + 20, 560, 120, 0x7d987a, seed + 3, 660);
    drawTreeLine(g, -20, mw + 20, 600, 90, 0x6a8668, seed + 5, 660);
    const r = rng(seed + 11);
    for (let x = 30; x < mw; x += 140 + r() * 120) drawBambooClump(g, x, 620, 170 + r() * 80, seed + Math.round(x), 0x7c9566);
    extraMid?.(g, mw);
  });
  img(ctx, ctx.layers.mid, midKey).setTint(tintFor(ctx.night, lerpColor(EXT_TINT, FAR_TINT, 0.5)));
}

// ================================================================== CỔNG TAM QUAN

function drawTruBieu(g: G, x: number, gy: number, h: number, seed: number): void {
  const w = 40;
  const top = gy - h;
  groundShadow(g, x, gy, 90, 14, 0.25);
  drawWall(g, x - w / 2, top + 40, w, h - 40, { seed, color: PAL.wall });
  g.fillStyle(PAL.wallDark, 0.55);
  g.fillRect(x - w / 2 + 7, top + 62, w - 14, h - 120);
  g.fillStyle(PAL.wallLight, 0.4);
  g.fillRect(x - w / 2 + 7, top + 62, 3, h - 120);
  g.fillStyle(PAL.stoneDark, 1);
  g.fillRect(x - w / 2 - 9, gy - 26, w + 18, 26);
  g.fillStyle(PAL.stone, 1);
  g.fillRect(x - w / 2 - 9, gy - 28, w + 18, 6);
  g.fillStyle(PAL.wallDark, 1);
  g.fillRect(x - w / 2 - 6, top + 30, w + 12, 14);
  g.fillStyle(PAL.wall, 1);
  g.fillRect(x - w / 2 + 2, top + 2, w - 4, 30);
  g.fillStyle(0x3a2516, 1);
  g.fillRect(x - 8, top + 8, 16, 18);
  drawCurvedRoof(g, x, top - 22, 76, 28, { ornament: false, soffit: 5, horn: 1.1 });
  // lotus bud finial
  g.fillStyle(PAL.wallDark, 1);
  g.fillEllipse(x, top - 30, 14, 20);
  g.fillStyle(PAL.wall, 1);
  g.fillEllipse(x - 2, top - 32, 8, 14);
}

function drawCongMain(g: G, W: number): void {
  const cx = W / 2;
  const gy = 620;
  drawBrickFloor(g, 0, gy - 14, W, GAME_H - gy + 14, { seed: 21 });
  // outer walls
  drawWall(g, 0, 512, 132, gy - 512, { seed: 2 });
  wallCap(g, 0, 512, 132);
  drawWall(g, W - 132, 512, 132, gy - 512, { seed: 3 });
  wallCap(g, W - 132, 512, 132);
  // side bays
  for (const side of [-1, 1]) {
    const bx = cx + side * 162;
    drawWall(g, bx - 68, 440, 136, gy - 440, { seed: 30 + side });
    archOpening(g, bx, gy - 6, 54, 110);
    drawCurvedRoof(g, bx, 360, 206, 84, { ornament: false });
  }
  // central storey
  drawWall(g, cx - 98, 340, 196, gy - 340, { seed: 7 });
  drawWall(g, cx - 66, 168, 132, 140, { seed: 8, moss: false });
  drawCurvedRoof(g, cx, 84, 264, 104, { horn: 1 });
  drawHorizontalPlaque(g, cx, 238, 168, 44);
  drawCurvedRoof(g, cx, 270, 340, 110, { ornament: false });
  // lotus relief above arch
  drawLotus(g, cx, 424, 24, PAL.wallDark);
  archOpening(g, cx, gy - 6, 96, 196);
  // door leaves (open, red lacquer)
  g.fillStyle(PAL.lacquerDark, 1);
  g.fillRect(cx - 48, gy - 150, 10, 144);
  g.fillRect(cx + 38, gy - 150, 10, 144);
  for (const px of [cx - 70, cx + 70]) drawPillar(g, px, 376, 22, gy - 376);
  // couplets (câu đối) on pillars: gold strips
  for (const px of [cx - 70, cx + 70]) {
    g.fillStyle(PAL.goldDark, 1);
    g.fillRect(px - 6, 410, 12, 150);
    g.fillStyle(PAL.gold, 1);
    for (let k = 0; k < 7; k++) g.fillRect(px - 3, 418 + k * 20, 6, 10);
  }
  // base strip + steps
  g.fillStyle(PAL.stoneDark, 1);
  g.fillRect(cx - 240, gy - 10, 480, 12);
  g.fillStyle(PAL.stoneLight, 1);
  g.fillRect(cx - 240, gy - 12, 480, 4);
  drawSteps(g, cx, gy + 2, 200, 3, 13, 10);
  drawTruBieu(g, 112, gy, 300, 41);
  drawTruBieu(g, W - 112, gy, 300, 42);
  drawBush(g, 40, 700, 140, 80, PAL.leaf, 5);
  drawBush(g, W - 40, 706, 140, 84, 0x5d8442, 6);
  drawPottedPlant(g, cx - 150, 668, 0.75, 3);
  drawPottedPlant(g, cx + 150, 668, 0.75, 4);
}

export const drawCong: AreaArtFn = (ctx: ArtContext): AreaArtResult => {
  const { scene, layers, night } = ctx;
  const W = ctx.worldWidth;
  const cx = W / 2;
  addOutdoorBackdrop(ctx, 'cong', 3);
  const key = bake(scene, `art-cong-main-${W}`, W, GAME_H, (g) => drawCongMain(g, W));
  const tint = tintFor(night, EXT_TINT);
  img(ctx, layers.main, key).setTint(tint);
  const txt = makePlaqueText(scene, cx, 238, 'CHÙA AN NHIÊN', 15).setTint(lerpColor(0xffffff, 0xffe0a0, night));
  layers.main.add(txt);
  glow(ctx, layers.main, cx, 238, 90, PAL.glowWarm, night * 0.35);
  glow(ctx, layers.main, cx, 540, 110, PAL.glowWarm, night * 0.75);
  for (const side of [-1, 1]) glow(ctx, layers.main, cx + side * 162, 570, 60, PAL.glowWarm, night * 0.5);
  addHangingLantern(ctx, layers.main, cx - 104, 368, 0.85, tint, 0.1 + night * 0.8);
  addHangingLantern(ctx, layers.main, cx + 104, 368, 0.85, tint, 0.1 + night * 0.8);
  // near: overhanging branches framing the top
  const nKeyL = bake(scene, 'art-near-branch-l', 280, 230, (g) => leafyBranch(g, -10, 10, 1, 1, 77));
  const nKeyR = bake(scene, 'art-near-branch-r', 280, 230, (g) => leafyBranch(g, 290, 0, -1, 1, 78));
  img(ctx, layers.near, nKeyL, 0, -20).setTint(tintFor(night, FAR_TINT));
  img(ctx, layers.near, nKeyR, nearW(W) - 280, -30).setTint(tintFor(night, FAR_TINT));
  const hotspots: Record<string, Hotspot> = {
    gate: { x: cx, y: 530, r: 80 },
    plaque: { x: cx, y: 238, r: 70 },
  };
  return { hotspots };
};

// ================================================================== SÂN CHÙA

function drawHallFacade(g: G, cx: number, gy: number, plaqueY: number): void {
  // platform
  g.fillStyle(PAL.stoneDark, 1);
  g.fillRect(cx - 300, gy - 48, 600, 48);
  g.fillStyle(PAL.stone, 1);
  g.fillRect(cx - 300, gy - 50, 600, 10);
  g.fillStyle(PAL.stoneLight, 1);
  g.fillRect(cx - 300, gy - 50, 600, 3);
  for (let x = cx - 300; x < cx + 300; x += 60) {
    g.fillStyle(PAL.stoneDark, 0.6);
    g.fillRect(x, gy - 40, 2, 40);
  }
  // upper storey
  drawWall(g, cx - 124, 140, 248, 140, { seed: 51, moss: false });
  for (const dx of [-90, 90]) {
    g.fillStyle(PAL.woodDark, 1);
    g.fillCircle(cx + dx, 214, 20);
    g.lineStyle(2, PAL.woodLight, 1);
    g.strokeCircle(cx + dx, 214, 16);
    g.lineBetween(cx + dx - 16, 214, cx + dx + 16, 214);
    g.lineBetween(cx + dx, 198, cx + dx, 230);
  }
  drawCurvedRoof(g, cx, 50, 400, 108);
  drawHorizontalPlaque(g, cx, plaqueY, 140, 40);
  // hall body
  const pTop = 372;
  const pBot = gy - 48;
  drawWall(g, cx - 276, pTop, 552, pBot - pTop, { seed: 41, moss: false, color: 0xdcc292 });
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(cx - 280, pTop, 560, 14);
  // center bay: open door with warm interior and faint altar
  vGrad(g, cx - 40, pTop + 22, 80, pBot - pTop - 22, 0x2a160e, 0x5b3520, 8);
  softBlob(g, cx, pTop + 96, 34, PAL.gold, 0.35, 5);
  g.fillStyle(PAL.lacquerDark, 0.9);
  g.fillRect(cx - 30, pTop + 118, 60, 34);
  g.fillStyle(PAL.goldDark, 0.8);
  g.fillRect(cx - 30, pTop + 116, 60, 3);
  for (const k of [-16, 16]) {
    g.fillStyle(0xffd27a, 0.9);
    g.fillCircle(cx + k, pTop + 108, 2.5);
  }
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(cx - 44, pTop + 18, 6, pBot - pTop - 18);
  g.fillRect(cx + 38, pTop + 18, 6, pBot - pTop - 18);
  for (const dx of [-92, 92]) drawLatticeDoor(g, cx + dx - 38, pTop + 18, 76, pBot - pTop - 18);
  for (const dx of [-184, 184]) {
    g.fillStyle(PAL.woodDark, 1);
    g.fillCircle(cx + dx, pTop + 70, 26);
    g.lineStyle(2, PAL.woodLight, 1);
    for (let k = -2; k <= 2; k++) g.lineBetween(cx + dx + k * 8, pTop + 46, cx + dx + k * 8, pTop + 94);
    g.lineStyle(4, PAL.wallDark, 1);
    g.strokeCircle(cx + dx, pTop + 70, 27);
  }
  for (const dx of [-230, -138, -46, 46, 138, 230]) drawPillar(g, cx + dx, pTop, 20, pBot - pTop + 6);
  drawCurvedRoof(g, cx, 250, 680, 132, { ornament: false });
}

function drawMoonGate(g: G, x: number, cy: number, r: number): void {
  g.fillStyle(PAL.wallDark, 1);
  g.fillCircle(x, cy, r + 8);
  g.fillStyle(PAL.stone, 1);
  g.fillCircle(x, cy, r + 4);
  g.fillStyle(0xa9bd88, 1);
  g.fillCircle(x, cy, r);
  g.fillStyle(0x86a06a, 1);
  g.fillCircle(x - r * 0.3, cy + r * 0.1, r * 0.55);
  g.fillCircle(x + r * 0.45, cy - r * 0.05, r * 0.45);
  g.fillStyle(0x6f8c58, 1);
  g.fillCircle(x + r * 0.1, cy + r * 0.35, r * 0.5);
  g.fillStyle(0xb5cfd0, 1);
  g.fillEllipse(x, cy + r * 0.82, r * 1.6, r * 0.28);
  g.fillStyle(PAL.lotus, 1);
  g.fillCircle(x - r * 0.3, cy + r * 0.72, 3);
  g.fillCircle(x + r * 0.25, cy + r * 0.76, 3);
}

function drawSanMain(g: G, W: number): void {
  const cx = 520;
  const gy = 600;
  drawWall(g, 0, 470, W, gy - 470, { seed: 31 });
  wallCap(g, 0, 470, W);
  drawMoonGate(g, 905, 540, 50);
  drawHallFacade(g, cx, gy, 212);
  drawBrickFloor(g, 0, gy, W, GAME_H - gy, { seed: 32 });
  drawSteps(g, cx, gy, 160, 3, 12, 10);
  drawStoneLantern(g, 322, 668, 0.9);
  drawStoneLantern(g, 718, 668, 0.9);
  drawPottedPlant(g, 410, 630, 0.8, 7);
  drawPottedPlant(g, 630, 630, 0.8, 8);
  drawBush(g, 840, 640, 120, 60, 0x5d8442, 12);
  drawBodhiTree(g, 150, 690, 0.95, 7);
  drawIncenseBurner(g, cx, 770, 0.9);
  drawSignpost(g, 54, 760, -1);
  drawSignpost(g, 300, 800, -1, 0.95);
  drawSignpost(g, 940, 760, 1);
  drawBush(g, 990, 812, 120, 60, PAL.leaf, 13);
}

export const drawSan: AreaArtFn = (ctx: ArtContext): AreaArtResult => {
  const { scene, layers, night } = ctx;
  const W = ctx.worldWidth;
  const cx = 520;
  addOutdoorBackdrop(ctx, 'san', 5);
  const key = bake(scene, `art-san-main-${W}`, W, GAME_H, (g) => drawSanMain(g, W));
  const tint = tintFor(night, EXT_TINT);
  img(ctx, layers.main, key).setTint(tint);
  layers.main.add(makePlaqueText(scene, cx, 212, 'TÂM AN', 19).setTint(lerpColor(0xffffff, 0xffe0a0, night)));
  // night lights
  glow(ctx, layers.main, cx, 470, 120, PAL.glowWarm, night * 0.8);
  for (const dx of [-92, 92]) glow(ctx, layers.main, cx + dx, 470, 80, PAL.glowWarm, night * 0.45);
  for (const lx of [322, 718]) glow(ctx, layers.main, lx, 668 - 104 * 0.9, 34, PAL.glowWarm, night * 0.9);
  glow(ctx, layers.main, cx, 650, 70, 0xff9a4a, 0.08 + night * 0.25);
  addHangingLantern(ctx, layers.main, cx - 184, 384, 0.8, tint, 0.1 + night * 0.8);
  addHangingLantern(ctx, layers.main, cx + 184, 384, 0.8, tint, 0.1 + night * 0.8);
  const nKeyL = bake(scene, 'art-near-branch-l', 280, 230, (g) => leafyBranch(g, -10, 10, 1, 1, 77));
  img(ctx, layers.near, nKeyL, -30, -40).setTint(tintFor(night, FAR_TINT));

  // falling bodhi leaves
  let update: AreaArtResult['update'];
  if (!ctx.reducedMotion) {
    const lk = bake(scene, 'art-bodhi-leaf', 20, 26, (g) => {
      g.fillStyle(PAL.leafLight, 1);
      g.fillPoints(leafPts(10, 10, 8, 0), true, true);
      g.lineStyle(1, PAL.leafDark, 0.6);
      g.lineBetween(10, 4, 10, 22);
    });
    const r = rng(99);
    const leaves = Array.from({ length: 4 }, (_, i) => {
      const im = scene.add.image(40 + r() * 260, 260 + r() * 400, lk).setTint(tint).setAlpha(0.95);
      layers.main.add(im);
      return { im, vy: 18 + r() * 14, ph: i * 1.7, x0: im.x };
    });
    update = (time, delta) => {
      const dt = delta / 1000;
      for (const l of leaves) {
        l.im.y += l.vy * dt;
        l.im.x = l.x0 + Math.sin(time / 900 + l.ph) * 26;
        l.im.rotation = Math.sin(time / 700 + l.ph) * 0.9;
        if (l.im.y > 860) {
          l.im.y = 280 + r() * 80;
          l.x0 = 30 + r() * 300;
        }
      }
    };
  }
  const hotspots: Record<string, Hotspot> = {
    burner: { x: cx, y: 650, r: 75 },
    bodhi: { x: 150, y: 380, r: 130 },
    'path-chinh-dien': { x: cx, y: 470, r: 55 },
    'path-lau-chuong': { x: 54, y: 700, r: 50 },
    'path-am-xam': { x: 300, y: 745, r: 50 },
    'path-ho-sen': { x: 940, y: 700, r: 50 },
  };
  return { hotspots, update };
};

// ================================================================== CHÍNH ĐIỆN (interior)

function drawBuddhaBackdrop(g: G, cx: number, baseY: number): void {
  // halo
  const hy = baseY - 232;
  softBlob(g, cx, hy + 20, 170, PAL.buddhaLight, 0.3, 8);
  g.fillStyle(PAL.buddhaDark, 0.55);
  g.fillCircle(cx, hy, 118);
  g.fillStyle(PAL.buddhaLight, 0.55);
  g.fillCircle(cx, hy, 112);
  g.lineStyle(2, PAL.buddhaDark, 0.5);
  g.strokeCircle(cx, hy, 96);
  g.strokeCircle(cx, hy, 60);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.fillStyle(PAL.buddha, 0.6);
    g.fillCircle(cx + Math.cos(a) * 104, hy + Math.sin(a) * 104, 4);
  }
  // seated figure (simple silhouette, no facial detail)
  const shoulderY = baseY - 178;
  const body = [
    ...quadPts(cx - 24, shoulderY - 14, cx - 62, shoulderY - 8, cx - 72, shoulderY + 30, 8),
    ...quadPts(cx - 72, shoulderY + 30, cx - 84, shoulderY + 90, cx - 70, shoulderY + 118, 8),
    ...quadPts(cx + 70, shoulderY + 118, cx + 84, shoulderY + 90, cx + 72, shoulderY + 30, 8),
    ...quadPts(cx + 72, shoulderY + 30, cx + 62, shoulderY - 8, cx + 24, shoulderY - 14, 8),
  ];
  g.fillStyle(PAL.buddha, 1);
  g.fillPoints(body, true, true);
  // crossed legs
  g.fillStyle(PAL.buddhaDark, 1);
  g.fillEllipse(cx, baseY - 52, 210, 62);
  g.fillStyle(PAL.buddha, 1);
  g.fillEllipse(cx, baseY - 56, 200, 54);
  // robe folds
  g.lineStyle(2, PAL.buddhaDark, 0.7);
  g.strokePoints(quadPts(cx - 50, shoulderY + 6, cx - 10, shoulderY + 60, cx + 46, shoulderY + 104, 10), false);
  g.strokePoints(quadPts(cx - 62, shoulderY + 40, cx - 30, shoulderY + 90, cx - 8, shoulderY + 112, 10), false);
  g.strokePoints(quadPts(cx - 90, baseY - 50, cx, baseY - 30, cx + 90, baseY - 52, 10), false);
  // hands resting in lap
  g.fillStyle(PAL.buddhaLight, 0.9);
  g.fillEllipse(cx, shoulderY + 112, 64, 20);
  // neck and head
  g.fillStyle(PAL.buddha, 1);
  g.fillRect(cx - 12, shoulderY - 26, 24, 18);
  g.fillStyle(PAL.buddhaDark, 0.5);
  g.fillRect(cx - 12, shoulderY - 16, 24, 3);
  g.fillStyle(PAL.buddha, 1);
  g.fillEllipse(cx, shoulderY - 52, 52, 60);
  g.fillStyle(PAL.buddhaLight, 0.5);
  g.fillEllipse(cx - 8, shoulderY - 58, 22, 30);
  // long ear lobes
  g.fillStyle(PAL.buddhaDark, 0.8);
  g.fillEllipse(cx - 26, shoulderY - 44, 8, 24);
  g.fillEllipse(cx + 26, shoulderY - 44, 8, 24);
  // hair & ushnisha
  g.fillStyle(PAL.buddhaDark, 1);
  g.fillEllipse(cx, shoulderY - 74, 52, 22);
  g.fillCircle(cx, shoulderY - 88, 13);
  g.fillStyle(PAL.buddha, 0.5);
  for (let i = -2; i <= 2; i++) g.fillCircle(cx + i * 9, shoulderY - 76, 3);
  // lotus throne
  const ty = baseY - 22;
  for (let i = -5; i <= 5; i++) {
    g.fillStyle(PAL.goldDark, 1);
    g.fillPoints(petalPts(cx + i * 22, ty + 26, -Math.PI / 2, 40, 13), true, true);
  }
  for (let i = -4; i <= 4; i++) {
    g.fillStyle(PAL.gold, 1);
    g.fillPoints(petalPts(cx + i * 24 + 12, ty + 34, -Math.PI / 2, 34, 13), true, true);
    g.fillStyle(PAL.goldLight, 0.6);
    g.fillPoints(petalPts(cx + i * 24 + 12, ty + 34, -Math.PI / 2, 16, 6), true, true);
  }
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(cx - 120, ty + 34, 240, 12);
  g.fillStyle(PAL.gold, 1);
  g.fillRect(cx - 120, ty + 34, 240, 3);
}

function drawChinhDienMain(g: G, W: number): void {
  const cx = W / 2;
  // back wall: deep red-brown
  vGrad(g, 0, 0, W, 720, 0x3b130e, 0x5c2016, 18);
  // wood panel seams
  for (let x = 0; x < W; x += 36) {
    g.fillStyle(0x000000, 0.12);
    g.fillRect(x, 0, 2, 720);
  }
  // horizontal beams
  g.fillStyle(0x2a0d09, 1);
  g.fillRect(0, 0, W, 50);
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(0, 50, W, 8);
  g.fillStyle(PAL.gold, 1);
  g.fillRect(0, 50, W, 2);
  for (let x = 20; x < W; x += 60) {
    g.fillStyle(PAL.goldDark, 0.6);
    g.fillCircle(x, 25, 9);
  }
  // pillars
  for (const px of [36, 120, W - 120, W - 36]) {
    const w = px === 36 || px === W - 36 ? 34 : 40;
    drawPillar(g, px, 58, w, 670);
    g.fillStyle(PAL.goldDark, 1);
    g.fillRect(px - w / 2 + 6, 140, w - 12, 300);
    g.fillStyle(PAL.lacquerDark, 1);
    g.fillRect(px - w / 2 + 8, 142, w - 16, 296);
    g.fillStyle(PAL.gold, 0.9);
    for (let k = 0; k < 9; k++) g.fillRect(px - 5, 152 + k * 31, 10, 18);
  }
  // Buddha backdrop
  drawBuddhaBackdrop(g, cx, 520);
  // cửa võng: carved gold valance arch
  const arch: { x: number; y: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const x = 140 + u * (W - 280);
    const y = 230 - Math.sin(u * Math.PI) * 120;
    arch.push({ x, y });
  }
  g.fillStyle(PAL.goldDark, 1);
  g.fillPoints([{ x: 140, y: 58 }, { x: W - 140, y: 58 }, ...arch.slice().reverse()], true, true);
  g.fillStyle(PAL.gold, 1);
  g.fillPoints([{ x: 140, y: 62 }, { x: W - 140, y: 62 }, ...arch.slice().reverse().map((p) => ({ x: p.x, y: p.y - 8 }))], true, true);
  const r = rng(17);
  for (let i = 0; i < 70; i++) {
    const x = 150 + r() * (W - 300);
    const u = (x - 140) / (W - 280);
    const yMax = 230 - Math.sin(u * Math.PI) * 120 - 14;
    if (yMax < 72) continue;
    const y = 70 + r() * (yMax - 70);
    g.fillStyle(r() < 0.5 ? 0x7a4f17 : PAL.goldLight, 0.55);
    g.fillEllipse(x, y, 8 + r() * 10, 4 + r() * 6);
  }
  for (const p of arch.filter((_, i) => i % 3 === 0)) {
    g.fillStyle(PAL.goldDark, 1);
    g.fillCircle(p.x, p.y, 5);
  }
  drawLotus(g, cx, 98, 30, PAL.goldLight);
  // silk banners (phướn)
  for (const bx of [78, W - 78]) {
    g.fillStyle(0xd9a93f, 1);
    g.fillRect(bx - 18, 70, 36, 360);
    g.fillStyle(PAL.lacquer, 1);
    g.fillRect(bx - 18, 70, 6, 360);
    g.fillRect(bx + 12, 70, 6, 360);
    g.fillTriangle(bx - 18, 430, bx + 18, 430, bx, 456);
    g.fillStyle(0xd9a93f, 1);
    g.fillTriangle(bx - 12, 430, bx + 12, 430, bx, 446);
    drawLotus(g, bx, 180, 18, PAL.lacquer);
    drawLotus(g, bx, 320, 18, PAL.lacquer);
  }
  // back altar tier
  g.fillStyle(0x2a0d09, 1);
  g.fillRect(cx - 200, 520, 400, 112);
  vGrad(g, cx - 196, 524, 392, 104, PAL.lacquerDark, 0x5a1712, 6);
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(cx - 200, 516, 400, 8);
  g.fillStyle(PAL.gold, 1);
  g.fillRect(cx - 200, 516, 400, 2);
  // vases with lotus + fruit plates on the back tier
  for (const vx of [cx - 150, cx + 150]) {
    g.fillStyle(0x3d6f86, 1);
    g.fillEllipse(vx, 498, 26, 34);
    g.fillRect(vx - 6, 474, 12, 14);
    g.fillStyle(0xd8e6e8, 0.5);
    g.fillEllipse(vx - 5, 494, 6, 16);
    g.lineStyle(2, 0x4d7a3a, 1);
    g.lineBetween(vx, 474, vx - 12, 438);
    g.lineBetween(vx, 474, vx + 10, 444);
    g.lineBetween(vx, 474, vx + 2, 430);
    drawLotus(g, vx + 2, 432, 20, PAL.lotus);
    drawLotus(g, vx - 12, 440, 13, PAL.lotusWhite);
    g.fillStyle(0x4d7a3a, 1);
    g.fillEllipse(vx + 12, 446, 18, 7);
  }
  for (const fx of [cx - 82, cx + 82]) {
    g.fillStyle(PAL.goldDark, 1);
    g.fillRect(fx - 6, 500, 12, 16);
    g.fillEllipse(fx, 500, 64, 10);
    const fruits = [0xe2a13a, 0xcf4b2c, 0x9ab84a, 0xe8c64d, 0xd8742e];
    for (let i = 0; i < 7; i++) {
      g.fillStyle(fruits[i % fruits.length], 1);
      g.fillCircle(fx - 20 + (i % 4) * 13 + (i >= 4 ? 6 : 0), 488 - (i >= 4 ? 13 : 0), 8);
    }
  }
  // floor
  vGrad(g, 0, 700, W, GAME_H - 700, 0x4a2a1a, 0x2e1a10, 10);
  for (let y = 700, k = 0; y < GAME_H; k++) {
    const h = 10 + k * 5;
    g.fillStyle(0x000000, 0.22);
    g.fillRect(0, y, W, 2);
    g.fillStyle(0xffffff, 0.03);
    g.fillRect(0, y + 2, W, 2);
    y += h;
  }
  // reflection of altar
  g.fillStyle(PAL.lacquer, 0.12);
  g.fillRect(cx - 220, 724, 440, 70);
  g.fillStyle(PAL.gold, 0.06);
  g.fillRect(cx - 220, 724, 440, 14);
  // front altar table
  g.fillStyle(0x000000, 0.3);
  g.fillRect(cx - 216, 700, 432, 24);
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(cx - 230, 628, 460, 14);
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(cx - 230, 626, 460, 4);
  g.fillStyle(PAL.lacquer, 1);
  g.fillRect(cx - 212, 642, 424, 64);
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(cx - 204, 648, 408, 52);
  g.fillStyle(PAL.lacquerDark, 1);
  g.fillRect(cx - 200, 652, 400, 44);
  for (const px of [-140, 0, 140]) {
    g.fillStyle(PAL.gold, 0.85);
    g.fillEllipse(cx + px, 674, 82, 30);
    g.fillStyle(PAL.lacquerDark, 1);
    g.fillEllipse(cx + px, 674, 70, 22);
  }
  drawLotus(g, cx, 684, 20, PAL.goldLight);
  drawLotus(g, cx - 140, 684, 15, PAL.gold);
  drawLotus(g, cx + 140, 684, 15, PAL.gold);
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(cx - 212, 704, 18, 16);
  g.fillRect(cx + 194, 704, 18, 16);
  // candles in brass holders
  for (const kx of [cx - 120, cx + 120]) {
    g.fillStyle(PAL.goldDark, 1);
    g.fillEllipse(kx, 624, 34, 8);
    g.fillRect(kx - 3, 586, 6, 38);
    g.fillEllipse(kx, 588, 24, 7);
    g.fillStyle(PAL.gold, 0.7);
    g.fillRect(kx - 2, 590, 2, 32);
    g.fillStyle(0xc0281f, 1);
    g.fillRect(kx - 6, 548, 12, 40);
    g.fillStyle(0xe25540, 0.7);
    g.fillRect(kx - 5, 548, 3, 40);
    g.fillStyle(0xffe7a0, 1);
    g.fillEllipse(kx, 540, 7, 14);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(kx, 543, 3, 6);
  }
  // small bronze incense pot on the table
  g.fillStyle(PAL.bronzeDark, 1);
  g.fillEllipse(cx, 610, 70, 40);
  g.fillStyle(PAL.bronze, 1);
  g.fillEllipse(cx - 2, 606, 64, 34);
  g.fillStyle(PAL.bronzeLight, 0.6);
  g.fillEllipse(cx - 14, 600, 22, 10);
  g.fillStyle(PAL.bronzeDark, 1);
  g.fillRect(cx - 24, 618, 8, 10);
  g.fillRect(cx + 16, 618, 8, 10);
  g.fillEllipse(cx, 590, 62, 12);
  g.fillStyle(0x3a2a14, 1);
  g.fillEllipse(cx, 590, 52, 7);
  for (const ex of [-30, 30]) {
    g.fillStyle(PAL.bronzeDark, 1);
    g.fillRect(cx + ex - 4, 578, 8, 12);
  }
  // incense sticks with embers
  for (let i = -2; i <= 2; i++) {
    g.lineStyle(2, 0x8a3a22, 1);
    g.lineBetween(cx + i * 5, 590, cx + i * 7, 540 + Math.abs(i) * 4);
    g.fillStyle(0xff8a3a, 1);
    g.fillCircle(cx + i * 7, 540 + Math.abs(i) * 4, 2);
  }

  // mõ on a red cushion stand (left)
  drawCushionStand(g, 130, 720);
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(130, 702, 96, 14);
  g.fillStyle(0x6d2a17, 1);
  g.fillCircle(130, 666, 38);
  g.fillStyle(0x8e3d22, 1);
  g.fillCircle(126, 662, 34);
  g.fillStyle(0xb35b33, 0.6);
  g.fillEllipse(114, 648, 26, 16);
  // carved fish-scale suggestion + mouth slit
  g.lineStyle(1.5, 0x5a1f10, 0.6);
  for (let i = 0; i < 3; i++) g.strokePoints(quadPts(100 + i * 10, 652, 108 + i * 10, 660, 100 + i * 10, 668, 5), false);
  g.fillStyle(0x2a0d06, 1);
  g.fillEllipse(140, 676, 46, 9);
  g.fillStyle(PAL.goldDark, 0.8);
  g.fillCircle(150, 652, 4);
  g.lineStyle(2, PAL.goldDark, 0.7);
  g.strokeCircle(130, 666, 37);
  // mallet
  g.lineStyle(4, PAL.woodDark, 1);
  g.lineBetween(178, 708, 206, 670);
  g.fillStyle(0x7a5232, 1);
  g.fillCircle(176, 710, 8);

  // khánh/chuông gia trì: bronze bowl on cushion (right)
  drawCushionStand(g, W - 130, 720);
  const kx = W - 130;
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(kx, 702, 90, 12);
  g.fillStyle(PAL.bronzeDark, 1);
  g.fillPoints([...quadPts(kx - 40, 662, kx - 38, 700, kx, 700, 8), ...quadPts(kx, 700, kx + 38, 700, kx + 40, 662, 8)], true, true);
  g.fillStyle(PAL.bronze, 1);
  g.fillPoints([...quadPts(kx - 36, 664, kx - 34, 694, kx, 694, 8), ...quadPts(kx, 694, kx + 30, 694, kx + 32, 664, 8)], true, true);
  g.fillStyle(PAL.bronzeLight, 0.7);
  g.fillEllipse(kx - 20, 676, 10, 20);
  g.fillStyle(PAL.bronzeLight, 1);
  g.fillEllipse(kx, 662, 82, 12);
  g.fillStyle(0x3a2810, 1);
  g.fillEllipse(kx, 663, 70, 8);
  g.lineStyle(3, PAL.woodDark, 1);
  g.lineBetween(kx + 46, 708, kx + 66, 680);
  g.fillStyle(0xcfa77a, 1);
  g.fillCircle(kx + 66, 678, 5);

  // kneeling cushion (center)
  groundShadow(g, cx, 838, 180, 26, 0.35);
  g.fillStyle(0x6e1a14, 1);
  g.fillRoundedRect(cx - 80, 794, 160, 44, 14);
  g.fillStyle(0x9c2a20, 1);
  g.fillRoundedRect(cx - 76, 790, 152, 36, 12);
  g.fillStyle(0xc4483a, 0.6);
  g.fillRoundedRect(cx - 66, 792, 120, 10, 5);
  g.lineStyle(2, PAL.gold, 0.9);
  g.strokeRoundedRect(cx - 70, 794, 140, 28, 9);
}

function drawCushionStand(g: G, x: number, top: number): void {
  groundShadow(g, x, top + 46, 140, 18, 0.35);
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(x - 54, top, 108, 12);
  g.fillRect(x - 50, top + 12, 10, 30);
  g.fillRect(x + 40, top + 12, 10, 30);
  g.fillStyle(PAL.lacquer, 1);
  g.fillRect(x - 54, top, 108, 4);
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(x - 40, top + 14, 80, 4);
  // cushion
  g.fillStyle(0x7a1c16, 1);
  g.fillRoundedRect(x - 50, top - 22, 100, 24, 9);
  g.fillStyle(0xa8302a, 1);
  g.fillRoundedRect(x - 48, top - 24, 96, 18, 8);
  g.fillStyle(PAL.gold, 1);
  g.fillCircle(x - 46, top - 10, 3);
  g.fillCircle(x + 46, top - 10, 3);
}

function drawCarvedFrame(g: G, w: number, side: 'l' | 'r'): void {
  // tall carved wooden door frame for the near layer
  const x = side === 'l' ? 0 : w - 60;
  vGrad(g, x, 0, 60, GAME_H, 0x3a1a10, 0x24100a, 8);
  g.fillStyle(PAL.goldDark, 0.7);
  g.fillRect(side === 'l' ? x + 50 : x + 4, 0, 6, GAME_H);
  g.fillStyle(0x5a2c18, 1);
  for (let y = 120; y < 700; y += 90) {
    g.fillRect(x + 12, y, 36, 70);
    g.fillStyle(0x2a120b, 1);
    g.fillRect(x + 16, y + 4, 28, 62);
    g.lineStyle(1.5, PAL.goldDark, 0.6);
    g.strokeCircle(x + 30, y + 35, 10);
    g.fillStyle(0x5a2c18, 1);
  }
}

export const drawChinhDien: AreaArtFn = (ctx: ArtContext): AreaArtResult => {
  const { scene, layers, night } = ctx;
  const W = ctx.worldWidth;
  const cx = W / 2;
  const key = bake(scene, `art-chinhdien-main-${W}`, W, GAME_H, (g) => drawChinhDienMain(g, W));
  const tint = tintFor(night, INT_TINT, 0.8);
  img(ctx, layers.main, key).setTint(tint);
  // warm altar ambience + candles
  glow(ctx, layers.main, cx, 330, 260, 0xffc26a, 0.14 + night * 0.22);
  glow(ctx, layers.main, cx, 560, 200, 0xff9a4a, 0.1 + night * 0.2);
  for (const kx of [cx - 120, cx + 120]) {
    const c = glow(ctx, layers.main, kx, 540, 46, 0xffc46b, 0.55 + night * 0.45);
    ctx.scene.tweens.add({
      targets: c, alpha: c.alpha * 0.8, scale: c.scale * 0.94, duration: ctx.reducedMotion ? 1600 : 380 + (kx % 7) * 20,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }
  addHangingLantern(ctx, layers.main, 190, 58, 1.0, tint, 0.2 + night * 0.7);
  addHangingLantern(ctx, layers.main, W - 190, 58, 1.0, tint, 0.2 + night * 0.7);
  // near: carved frames & top beam
  const nw = nearW(W);
  const lk = bake(scene, 'art-cd-frame-l', 60, GAME_H, (g) => drawCarvedFrame(g, 60, 'l'));
  const rk = bake(scene, 'art-cd-frame-r', 60, GAME_H, (g) => drawCarvedFrame(g, 60, 'r'));
  img(ctx, layers.near, lk, -12, 0).setTint(tint);
  img(ctx, layers.near, rk, nw - 48, 0).setTint(tint);
  const tk = bake(scene, `art-cd-beam-${nw}`, nw, 44, (g) => {
    vGrad(g, 0, 0, nw, 34, 0x2a0f0a, 0x3d170f, 4);
    g.fillStyle(PAL.goldDark, 1);
    g.fillRect(0, 34, nw, 5);
    for (let x = 10; x < nw; x += 26) {
      g.fillStyle(PAL.goldDark, 0.6);
      g.fillTriangle(x, 39, x + 13, 39, x + 6.5, 44);
    }
  });
  img(ctx, layers.near, tk, 0, 0).setTint(tint);
  return {
    hotspots: {
      altar: { x: cx, y: 300, r: 140 },
      burner: { x: cx, y: 608, r: 45 },
      mo: { x: 130, y: 680, r: 58 },
      khanh: { x: W - 130, y: 680, r: 55 },
      cushion: { x: cx, y: 812, r: 70 },
    },
  };
};

// ================================================================== LẦU CHUÔNG

function drawLauChuongMain(g: G, W: number): void {
  const cx = W / 2;
  const gy = 620;
  drawBrickFloor(g, 0, gy - 20, W, GAME_H - gy + 20, { seed: 61 });
  drawFrangipani(g, 40, 640, 1.1, 5);
  drawBambooClump(g, W - 20, 640, 330, 9);
  // platform
  g.fillStyle(PAL.stoneDark, 1);
  g.fillRect(70, gy - 40, W - 140, 42);
  g.fillStyle(PAL.stone, 1);
  g.fillRect(70, gy - 42, W - 140, 10);
  g.fillStyle(PAL.stoneLight, 1);
  g.fillRect(70, gy - 42, W - 140, 3);
  const floorY = gy - 42;
  // open interior shade
  g.fillStyle(0x2e1f16, 0.32);
  g.fillRect(118, 340, W - 236, floorY - 340);
  // upper storey
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(cx - 140, 112, 280, 140);
  for (let i = 0; i < 4; i++) drawLatticeDoor(g, cx - 136 + i * 68, 120, 64, 120);
  drawCurvedRoof(g, cx, 26, 440, 104);
  drawHorizontalPlaque(g, cx, 172, 136, 36);
  // inner pillars (behind)
  for (const px of [250, W - 250]) drawPillar(g, px, 340, 20, floorY - 340 + 6, PAL.lacquerDark);
  // balustrade
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(120, floorY - 46, W - 240, 8);
  g.fillRect(120, floorY - 10, W - 240, 8);
  for (let x = 128; x < W - 124; x += 15) {
    g.fillStyle(PAL.wood, 1);
    g.fillRect(x, floorY - 38, 5, 28);
    g.fillStyle(PAL.woodLight, 0.4);
    g.fillRect(x, floorY - 38, 1.5, 28);
  }
  g.fillStyle(PAL.woodLight, 0.5);
  g.fillRect(120, floorY - 46, W - 240, 2);
  // outer pillars
  for (const px of [118, W - 118]) drawPillar(g, px, 336, 32, floorY - 336 + 8);
  // crossbeam for bell and ropes for striker
  g.fillStyle(PAL.lacquerDark, 1);
  g.fillRect(96, 336, W - 192, 20);
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(96, 352, W - 192, 3);
  g.fillStyle(PAL.lacquerLight, 0.5);
  g.fillRect(96, 336, W - 192, 3);
  // bell hook (bồ lao, simplified)
  g.fillStyle(PAL.bronzeDark, 1);
  g.fillRect(cx - 7, 354, 14, 18);
  g.lineStyle(5, PAL.bronzeDark, 1);
  g.strokeCircle(cx, 376, 8);
  // ropes for the log striker
  for (const rx of [150, 270]) {
    g.lineStyle(3, 0xb89a6c, 1);
    g.lineBetween(rx, 354, rx, 458);
    g.lineStyle(1, 0x7a6040, 0.8);
    for (let y = 360; y < 456; y += 8) g.lineBetween(rx - 1.5, y, rx + 1.5, y + 4);
  }
  drawCurvedRoof(g, cx, 214, 700, 128, { ornament: false });
  drawSteps(g, cx, gy, 150, 3, 12, 10);
  drawStoneLantern(g, W - 92, 700, 0.85);
  drawBush(g, 160, 700, 110, 50, 0x5d8442, 21);
}

/** Big bronze bell alone (~180×200), centre origin = bell centre. */
export function makeBellTexture(scene: Phaser.Scene): string {
  return bake(scene, 'art-bell', 180, 204, (g) => {
    const cx = 90;
    // hanging loop
    g.lineStyle(7, PAL.bronzeDark, 1);
    g.strokeCircle(cx, 14, 9);
    g.fillStyle(PAL.bronzeDark, 1);
    g.fillRect(cx - 14, 18, 28, 12);
    // body with rounded shoulders and flared lip
    const half = (side: number): { x: number; y: number }[] => [
      ...quadPts(cx, 28, cx + side * 52, 26, cx + side * 58, 62, 10),
      ...quadPts(cx + side * 58, 62, cx + side * 60, 150, cx + side * 78, 184, 10).slice(1),
    ];
    const body = [...half(-1).reverse(), ...half(1)];
    g.fillStyle(PAL.bronzeDark, 1);
    g.fillPoints(body.map((p) => ({ x: p.x + (p.x > cx ? 2 : -2), y: p.y })), true, true);
    g.fillStyle(PAL.bronze, 1);
    g.fillPoints(body, true, true);
    g.fillStyle(PAL.bronzeLight, 0.35);
    g.fillEllipse(cx - 14, 40, 60, 16);
    hGrad(g, cx + 20, 46, 40, 136, PAL.bronze, PAL.bronzeDark, 6, 0.6);
    g.fillStyle(PAL.bronzeLight, 0.55);
    g.fillRect(cx - 40, 48, 14, 132);
    g.fillStyle(0xf3dda5, 0.35);
    g.fillRect(cx - 36, 52, 4, 120);
    // bands: horizontal + vertical (4 panels)
    g.fillStyle(PAL.bronzeDark, 0.7);
    g.fillRect(cx - 58, 72, 116, 6);
    g.fillRect(cx - 62, 132, 124, 6);
    g.fillRect(cx - 3, 46, 6, 130);
    g.fillRect(cx - 34, 46, 4, 86);
    g.fillRect(cx + 30, 46, 4, 86);
    // strike medallions (núm chuông) as lotus
    drawLotus(g, cx - 34, 158, 16, PAL.bronzeLight);
    drawLotus(g, cx + 34, 158, 16, PAL.bronzeLight);
    // patina
    g.fillStyle(PAL.patina, 0.3);
    g.fillEllipse(cx + 30, 110, 30, 40);
    g.fillEllipse(cx - 20, 176, 40, 8);
    // lip
    g.fillStyle(PAL.bronzeDark, 1);
    g.fillEllipse(cx, 186, 164, 22);
    g.fillStyle(PAL.bronzeLight, 1);
    g.fillEllipse(cx, 183, 158, 14);
    g.fillStyle(PAL.bronze, 1);
    g.fillEllipse(cx, 185, 150, 10);
  });
}

/** Horizontal wooden log striker (chày gỗ) alone, ~180×36. */
export function makeBeamTexture(scene: Phaser.Scene): string {
  return bake(scene, 'art-bell-beam', 180, 36, (g) => {
    g.fillStyle(0x5e3d24, 1);
    g.fillRoundedRect(4, 6, 172, 26, 12);
    g.fillStyle(0x7d5534, 1);
    g.fillRoundedRect(6, 7, 168, 16, 8);
    g.fillStyle(0xa77a4c, 0.6);
    g.fillRect(14, 10, 150, 3);
    g.lineStyle(1, 0x3e2716, 0.5);
    for (let x = 20; x < 160; x += 18) g.lineBetween(x, 14, x + 10, 26);
    // cut ends
    for (const ex of [10, 170]) {
      g.fillStyle(0xc49a68, 1);
      g.fillEllipse(ex, 19, 10, 24);
      g.lineStyle(1, 0x8a6440, 1);
      g.strokeEllipse(ex, 19, 6, 14);
    }
    // rope bindings
    for (const rx of [36, 140]) {
      g.fillStyle(0xb89a6c, 1);
      g.fillRect(rx - 5, 4, 10, 30);
      g.lineStyle(1, 0x7a6040, 0.9);
      for (let k = 0; k < 5; k++) g.lineBetween(rx - 5, 7 + k * 6, rx + 5, 10 + k * 6);
    }
  });
}

export const drawLauChuong: AreaArtFn = (ctx: ArtContext): AreaArtResult => {
  const { scene, layers, night } = ctx;
  const W = ctx.worldWidth;
  const cx = W / 2;
  addOutdoorBackdrop(ctx, 'lauchuong', 9);
  const key = bake(scene, `art-lauchuong-main-${W}`, W, GAME_H, (g) => drawLauChuongMain(g, W));
  const tint = tintFor(night, EXT_TINT);
  img(ctx, layers.main, key).setTint(tint);
  layers.main.add(makePlaqueText(scene, cx, 172, 'LẦU CHUÔNG', 14).setTint(lerpColor(0xffffff, 0xffe0a0, night)));
  glow(ctx, layers.main, cx, 470, 150, PAL.glowWarm, night * 0.3);
  glow(ctx, layers.main, W - 92, 700 - 104 * 0.85, 32, PAL.glowWarm, night * 0.9);
  addHangingLantern(ctx, layers.main, 66, 318, 0.8, tint, 0.1 + night * 0.8);
  addHangingLantern(ctx, layers.main, W - 66, 318, 0.8, tint, 0.1 + night * 0.8);
  const nk = bake(scene, 'art-near-branch-r', 280, 230, (g) => leafyBranch(g, 290, 0, -1, 1, 78));
  img(ctx, layers.near, nk, nearW(W) - 260, -50).setTint(tintFor(night, FAR_TINT));
  return {
    hotspots: {
      bell: { x: cx, y: 470, r: 90 },
      beam: { x: 210, y: 470, r: 70 },
    },
  };
};

// ================================================================== AM XIN XĂM

function drawSlipShelf(g: G, x: number, y: number, w: number, h: number, seed: number): void {
  const r = rng(seed);
  g.fillStyle(0x000000, 0.3);
  g.fillRect(x + 6, y + 8, w, h);
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(PAL.wood, 1);
  g.fillRect(x, y, w, 10);
  g.fillStyle(PAL.woodLight, 0.5);
  g.fillRect(x, y, w, 2);
  const cols = 4;
  const rows = 7;
  const cw = (w - 16) / cols;
  const ch = (h - 26) / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const cx0 = x + 8 + i * cw;
      const cy0 = y + 16 + j * ch;
      g.fillStyle(0x2a170d, 1);
      g.fillRect(cx0 + 2, cy0 + 2, cw - 4, ch - 4);
      const n = 2 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const sx = cx0 + 6 + k * ((cw - 14) / n);
        if (r() < 0.4) {
          g.fillStyle(0xefe2c4, 1);
          g.fillCircle(sx + 4, cy0 + ch - 10, 5);
          g.fillStyle(0xb8402e, 1);
          g.fillCircle(sx + 4, cy0 + ch - 10, 2);
        } else {
          g.fillStyle(lerpColor(0xf3e7cc, 0xe0cfa8, r()), 1);
          g.fillRect(sx, cy0 + 6 + r() * 4, (cw - 14) / n - 2, ch - 12);
          g.fillStyle(0xb8402e, 1);
          g.fillRect(sx, cy0 + 6, (cw - 14) / n - 2, 3);
        }
      }
    }
  }
}

function drawAmXamMain(g: G, W: number): void {
  const cx = W / 2;
  // wooden walls
  vGrad(g, 0, 0, W, 720, 0x6e4329, 0x8a5a36, 12);
  for (let x = 0; x < W; x += 30) {
    g.fillStyle(0x000000, 0.1);
    g.fillRect(x, 60, 2, 660);
    g.fillStyle(0xffffff, 0.03);
    g.fillRect(x + 2, 60, 2, 660);
  }
  // ceiling beams
  g.fillStyle(0x3e2416, 1);
  g.fillRect(0, 0, W, 60);
  for (let x = 0; x < W; x += 48) {
    g.fillStyle(0x2c180e, 1);
    g.fillRect(x, 0, 16, 60);
  }
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(0, 60, W, 12);
  // wainscot
  g.fillStyle(0x5a341f, 1);
  g.fillRect(0, 560, W, 160);
  g.fillStyle(PAL.woodLight, 0.3);
  g.fillRect(0, 560, W, 3);
  // shrine niche (khám) with painted lotus
  const nx = cx;
  g.fillStyle(0x000000, 0.3);
  g.fillRect(nx - 96, 168, 200, 270);
  g.fillStyle(PAL.lacquerDark, 1);
  g.fillRect(nx - 100, 160, 200, 270);
  g.fillStyle(PAL.goldDark, 1);
  g.fillRect(nx - 88, 172, 176, 246);
  vGrad(g, nx - 82, 178, 164, 234, 0xf3e5c4, 0xe0c99a, 8);
  softBlob(g, nx, 270, 70, PAL.goldLight, 0.5, 6);
  g.lineStyle(3, 0x5f7f45, 1);
  g.lineBetween(nx, 400, nx, 320);
  g.lineBetween(nx, 380, nx + 36, 352);
  g.fillStyle(0x6c9150, 1);
  g.fillEllipse(nx - 36, 386, 54, 18);
  g.fillEllipse(nx + 44, 352, 40, 14);
  drawLotus(g, nx, 320, 54, PAL.lotus);
  g.fillStyle(PAL.lotus, 1);
  g.fillEllipse(nx + 36, 340, 12, 22);
  drawCurvedRoof(g, nx, 106, 240, 62, { ornament: true, horn: 0.9 });
  drawHorizontalPlaque(g, nx, 470, 150, 34);
  // shelves of slips
  drawSlipShelf(g, 34, 150, 196, 400, 3);
  drawSlipShelf(g, W - 230, 150, 196, 400, 4);
  // floor
  drawBrickFloor(g, 0, 700, W, GAME_H - 700, {
    seed: 71, base: 0x8e4f38, dark: 0x6a3726, light: 0xa66548, mortar: 0x7a5a44, haze: 0x9a6a50, rowStart: 12, rowEnd: 34,
  });
  g.fillStyle(0x000000, 0.25);
  g.fillRect(0, 700, W, 10);
  // table
  groundShadow(g, cx, 772, 420, 40, 0.4);
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(cx - 170, 650, 22, 120);
  g.fillRect(cx + 148, 650, 22, 120);
  g.fillStyle(0x5a341f, 1);
  g.fillRect(cx - 160, 650, 320, 40);
  g.fillStyle(PAL.wood, 1);
  g.fillRect(cx - 190, 632, 380, 20);
  g.fillStyle(PAL.woodLight, 0.6);
  g.fillRect(cx - 190, 632, 380, 4);
  // red runner with gold fringe
  g.fillStyle(PAL.lacquer, 1);
  g.fillRect(cx - 70, 634, 140, 96);
  g.fillStyle(PAL.lacquerLight, 0.4);
  g.fillRect(cx - 70, 634, 140, 6);
  g.fillStyle(PAL.gold, 1);
  g.fillRect(cx - 70, 722, 140, 6);
  for (let x = cx - 68; x < cx + 70; x += 6) g.fillRect(x, 728, 2, 10);
  drawLotus(g, cx, 700, 24, PAL.goldLight);
  // oil lamps
  for (const lx of [cx - 140, cx + 140]) {
    g.fillStyle(PAL.goldDark, 1);
    g.fillEllipse(lx, 630, 34, 8);
    g.fillRect(lx - 3, 596, 6, 34);
    g.fillStyle(PAL.gold, 1);
    g.fillEllipse(lx, 596, 30, 12);
    g.fillStyle(0xfff3d0, 0.35);
    g.fillEllipse(lx, 578, 18, 30);
    g.fillStyle(0xffe08a, 1);
    g.fillEllipse(lx, 580, 6, 12);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(lx, 583, 2.5, 5);
  }
  // little offering: a plate of slips
  g.fillStyle(PAL.goldDark, 1);
  g.fillEllipse(cx + 82, 634, 46, 8);
  g.fillStyle(0xf3e7cc, 1);
  g.fillRect(cx + 66, 624, 30, 8);
  g.fillStyle(0xb8402e, 1);
  g.fillRect(cx + 66, 624, 30, 2);
}

/** Bamboo cylinder holding fortune sticks (~64×100). Origin centre. */
export function makeStickCupTexture(scene: Phaser.Scene): string {
  return bake(scene, 'art-stick-cup', 64, 100, (g) => {
    const r = rng(5);
    for (let i = 0; i < 13; i++) {
      const x = 14 + i * 3 + (r() - 0.5) * 2;
      const lean = (i - 6) * 0.8;
      const top = 4 + r() * 12;
      g.lineStyle(3, 0xd9b77a, 1);
      g.lineBetween(x, 48, x + lean, top);
      g.lineStyle(3, 0xb8402e, 1);
      g.lineBetween(x + lean * 0.95, top + 8, x + lean, top);
    }
    g.fillStyle(0x6f8a3c, 1);
    g.fillRect(12, 42, 40, 56);
    g.fillStyle(0x8fab52, 1);
    g.fillRect(16, 42, 10, 56);
    g.fillStyle(0x4e6626, 1);
    g.fillRect(42, 42, 10, 56);
    g.fillStyle(0x5b7430, 1);
    g.fillRect(10, 70, 44, 5);
    g.fillStyle(0xa7c46a, 0.6);
    g.fillRect(10, 70, 44, 1.5);
    g.fillStyle(0x4e6626, 1);
    g.fillEllipse(32, 42, 42, 10);
    g.fillStyle(0x3a2a14, 1);
    g.fillEllipse(32, 42, 34, 6);
    g.fillStyle(0x4e6626, 1);
    g.fillEllipse(32, 97, 40, 6);
  });
}

/** Single bamboo fortune stick (~10×120) with red tip at the top. */
export function makeStickTexture(scene: Phaser.Scene): string {
  return bake(scene, 'art-stick', 10, 120, (g) => {
    g.fillStyle(0xcfa86a, 1);
    g.fillRoundedRect(2, 2, 6, 116, 2);
    g.fillStyle(0xead09a, 1);
    g.fillRect(3, 4, 2, 112);
    g.fillStyle(0xb8402e, 1);
    g.fillRoundedRect(2, 2, 6, 20, 2);
    g.fillStyle(0x7a2a1e, 1);
    for (let k = 0; k < 4; k++) g.fillRect(4, 40 + k * 10, 2, 5);
  });
}

export const drawAmXam: AreaArtFn = (ctx: ArtContext): AreaArtResult => {
  const { scene, layers, night } = ctx;
  const W = ctx.worldWidth;
  const cx = W / 2;
  const key = bake(scene, `art-amxam-main-${W}`, W, GAME_H, (g) => drawAmXamMain(g, W));
  const tint = tintFor(night, INT_TINT, 0.75);
  img(ctx, layers.main, key).setTint(tint);
  layers.main.add(makePlaqueText(scene, cx, 470, 'TÙY DUYÊN', 15).setTint(lerpColor(0xffffff, 0xffe0a0, night)));
  glow(ctx, layers.main, cx, 600, 260, 0xffb060, 0.12 + night * 0.25);
  glow(ctx, layers.main, cx, 290, 140, 0xffd890, 0.1 + night * 0.2);
  for (const lx of [cx - 140, cx + 140]) {
    const c = glow(ctx, layers.main, lx, 580, 60, 0xffc46b, 0.55 + night * 0.45);
    scene.tweens.add({ targets: c, alpha: c.alpha * 0.82, duration: ctx.reducedMotion ? 1800 : 420 + (lx % 5) * 40, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  addHangingLantern(ctx, layers.main, 100, 72, 0.9, tint, 0.2 + night * 0.7);
  addHangingLantern(ctx, layers.main, W - 100, 72, 0.9, tint, 0.2 + night * 0.7);
  const nw = nearW(W);
  const lk = bake(scene, 'art-cd-frame-l', 60, GAME_H, (g) => drawCarvedFrame(g, 60, 'l'));
  const rk = bake(scene, 'art-cd-frame-r', 60, GAME_H, (g) => drawCarvedFrame(g, 60, 'r'));
  img(ctx, layers.near, lk, -24, 0).setTint(tint);
  img(ctx, layers.near, rk, nw - 36, 0).setTint(tint);
  return {
    hotspots: {
      sticks: { x: cx, y: 590, r: 60 },
    },
  };
};

// ================================================================== THIỀN ĐƯỜNG

/** View through the round window (canvas 2D for a smooth circular clip). */
function bakeWindowView(scene: Phaser.Scene, key: string, r: number, night: boolean): string {
  if (scene.textures.exists(key)) return key;
  const size = r * 2;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return key;
  const c = tex.getContext();
  c.save();
  c.beginPath();
  c.arc(r, r, r, 0, Math.PI * 2);
  c.clip();
  const sky = c.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, night ? '#1b2747' : '#cfe1e6');
  sky.addColorStop(1, night ? '#41507a' : '#f4e7c9');
  c.fillStyle = sky;
  c.fillRect(0, 0, size, size);
  const mx = r * 1.3;
  const my = r * 0.6;
  const halo = c.createRadialGradient(mx, my, 0, mx, my, 70);
  halo.addColorStop(0, night ? 'rgba(240,244,255,0.55)' : 'rgba(255,248,225,0.7)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = halo;
  c.fillRect(0, 0, size, size);
  const rr = rng(night ? 8 : 9);
  if (night) {
    c.fillStyle = '#f6f2e2';
    c.beginPath();
    c.arc(mx, my, 19, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 22; i++) {
      c.fillStyle = `rgba(255,255,255,${0.4 + rr() * 0.6})`;
      c.fillRect(rr() * size, rr() * size * 0.6, 1.5, 1.5);
    }
  }
  // misty hills
  const hill = (base: number, amp: number, col: string, f: number): void => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, size);
    for (let x = 0; x <= size; x += 6) c.lineTo(x, base - Math.sin(x * f + base) * amp - Math.sin(x * f * 2.7) * amp * 0.35);
    c.lineTo(size, size);
    c.fill();
  };
  hill(r * 1.25, 18, night ? '#33415f' : '#b9c8bb', 0.022);
  hill(r * 1.5, 12, night ? '#26324a' : '#9fb39e', 0.03);
  // bamboo
  const stalk = night ? '#141d18' : '#5d7a45';
  const leaf = night ? '#1a281e' : '#6f9150';
  c.shadowColor = 'rgba(0,0,0,0)';
  for (const sx of [0.3, 0.42, 0.5, 1.52, 1.66]) {
    const x = sx * r;
    c.strokeStyle = stalk;
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(x, size);
    c.quadraticCurveTo(x + 4, r, x + (sx < 1 ? 10 : -10), 0);
    c.stroke();
    c.fillStyle = night ? '#0e1511' : '#4a6436';
    for (let y = 20; y < size; y += 28) c.fillRect(x - 3, y, 7, 2);
  }
  c.fillStyle = leaf;
  for (let i = 0; i < 110; i++) {
    const left = rr() < 0.55;
    const lx = (left ? 0.42 : 1.6) * r + (rr() - 0.5) * r * 0.7;
    const ly = rr() * size * 0.85;
    const len = 14 + rr() * 12;
    const dir = rr() < 0.5 ? -1 : 1;
    c.beginPath();
    c.moveTo(lx, ly - 2);
    c.quadraticCurveTo(lx + dir * len * 0.5, ly - 3, lx + dir * len, ly + len * 0.45);
    c.quadraticCurveTo(lx + dir * len * 0.5, ly + 3, lx, ly + 2);
    c.fill();
  }
  c.restore();
  // inner rim shadow
  c.strokeStyle = 'rgba(40,25,15,0.35)';
  c.lineWidth = 6;
  c.beginPath();
  c.arc(r, r, r - 3, 0, Math.PI * 2);
  c.stroke();
  tex.refresh();
  return key;
}

function drawThienDuongMain(g: G, W: number): void {
  const cx = W / 2;
  vGrad(g, 0, 0, W, 660, 0xeee4cf, 0xdccdb0, 14);
  const r = rng(12);
  for (let i = 0; i < 40; i++) {
    g.fillStyle(r() < 0.5 ? 0xb39a72 : 0xffffff, 0.04);
    g.fillEllipse(r() * W, r() * 640, 30 + r() * 80, 20 + r() * 60);
  }
  // top beam
  vGrad(g, 0, 0, W, 40, 0x5a3e2a, 0x6e4e36, 3);
  g.fillStyle(0x3e2a1c, 1);
  g.fillRect(0, 40, W, 6);
  // wainscot
  g.fillStyle(0x8a6a4a, 1);
  g.fillRect(0, 610, W, 50);
  g.fillStyle(0xa8865e, 1);
  g.fillRect(0, 610, W, 4);
  // pillars (plain wood)
  for (const px of [34, W - 34]) {
    hGrad(g, px - 15, 46, 30, 614, 0x7a5a3e, 0x4e3624, 5);
    g.fillStyle(PAL.stone, 1);
    g.fillRect(px - 20, 646, 40, 14);
  }
  // round window frame + shadow (view is a separate texture)
  const wy = 330;
  g.fillStyle(0x000000, 0.08);
  g.fillCircle(cx + 6, wy + 8, 140);
  g.fillStyle(0x5a3e2a, 1);
  g.fillCircle(cx, wy, 136);
  g.fillStyle(0x7a5a3e, 1);
  g.fillCircle(cx, wy, 130);
  g.fillStyle(0x3e2a1c, 1);
  g.fillCircle(cx, wy, 122);
  // hanging scroll (left)
  const sx = 110;
  g.fillStyle(0x3e2a1c, 1);
  g.fillRect(sx - 32, 120, 64, 6);
  g.lineStyle(1, 0x3e2a1c, 1);
  g.lineBetween(sx - 20, 120, sx, 96);
  g.lineBetween(sx + 20, 120, sx, 96);
  g.fillStyle(0xc7b48c, 1);
  g.fillRect(sx - 28, 126, 56, 300);
  g.fillStyle(0xf6efdd, 1);
  g.fillRect(sx - 22, 140, 44, 270);
  g.fillStyle(0x3e2a1c, 1);
  g.fillRect(sx - 34, 426, 68, 8);
  g.fillStyle(0xb8402e, 1);
  g.fillRect(sx - 6, 380, 12, 12);
  // floor
  vGrad(g, 0, 660, W, GAME_H - 660, 0xc7a378, 0xa98258, 8);
  let y = 660;
  for (let k = 0; y < GAME_H; k++) {
    const h = 12 + k * 6;
    g.fillStyle(0x6e4e30, 0.35);
    g.fillRect(0, y, W, 1.5);
    const rr = rng(k + 3);
    for (let x = rr() * 200; x < W; x += 160 + rr() * 140) {
      g.fillStyle(0x6e4e30, 0.25);
      g.fillRect(x, y, 1.5, h);
    }
    y += h;
  }
  g.fillStyle(0x000000, 0.12);
  g.fillRect(0, 660, W, 6);
  // low side table with incense bowl & bud vase
  const tx = W - 120;
  groundShadow(g, tx, 742, 150, 18, 0.25);
  g.fillStyle(0x5a3e2a, 1);
  g.fillRect(tx - 64, 700, 128, 12);
  g.fillRect(tx - 56, 712, 10, 30);
  g.fillRect(tx + 46, 712, 10, 30);
  g.fillStyle(0x8a6a4a, 0.6);
  g.fillRect(tx - 64, 700, 128, 3);
  g.fillStyle(0x6e6a64, 1);
  g.fillEllipse(tx - 20, 694, 34, 16);
  g.fillStyle(0xd9cdb6, 1);
  g.fillEllipse(tx - 20, 689, 28, 6);
  g.lineStyle(1.5, 0x8a3a22, 1);
  g.lineBetween(tx - 20, 689, tx - 22, 640);
  g.fillStyle(0xff8a3a, 1);
  g.fillCircle(tx - 22, 640, 1.8);
  g.fillStyle(0xe6dcc8, 1);
  g.fillEllipse(tx + 28, 688, 18, 26);
  g.fillRect(tx + 25, 668, 6, 10);
  g.lineStyle(2, 0x5d7a45, 1);
  g.lineBetween(tx + 28, 668, tx + 30, 630);
  g.fillStyle(PAL.lotus, 1);
  g.fillEllipse(tx + 30, 624, 10, 18);
  g.fillStyle(PAL.lotusWhite, 0.7);
  g.fillEllipse(tx + 28, 622, 4, 12);
  // meditation mat + round cushion (bồ đoàn)
  const my = 790;
  groundShadow(g, cx, my + 14, 260, 40, 0.3);
  g.fillStyle(0x6e5038, 1);
  g.fillRoundedRect(cx - 120, my - 22, 240, 50, 10);
  g.fillStyle(0x8a6a4c, 1);
  g.fillRoundedRect(cx - 114, my - 20, 228, 42, 8);
  g.lineStyle(1.5, 0xc7a378, 0.5);
  g.strokeRoundedRect(cx - 106, my - 16, 212, 34, 6);
  g.fillStyle(0x7e4e26, 1);
  g.fillEllipse(cx, my - 6, 132, 52);
  g.fillStyle(0xa86a34, 1);
  g.fillEllipse(cx, my - 14, 124, 40);
  g.lineStyle(1.2, 0x7e4e26, 0.6);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    g.lineBetween(cx + Math.cos(a) * 10, my - 14 + Math.sin(a) * 4, cx + Math.cos(a) * 60, my - 14 + Math.sin(a) * 19);
  }
  g.fillStyle(0xc68a4e, 0.6);
  g.fillEllipse(cx - 14, my - 22, 50, 14);
  g.fillStyle(0x7e4e26, 1);
  g.fillCircle(cx, my - 14, 5);
}

export const drawThienDuong: AreaArtFn = (ctx: ArtContext): AreaArtResult => {
  const { scene, layers, night } = ctx;
  const W = ctx.worldWidth;
  const cx = W / 2;
  const wy = 330;
  const key = bake(scene, `art-thienduong-main-${W}`, W, GAME_H, (g) => drawThienDuongMain(g, W));
  const tint = tintFor(night, INT_TINT, 0.85);
  // window view behind the wall: draw the view first, frame texture on top has the hole
  const dayK = bakeWindowView(scene, 'art-td-window-day', 123, false);
  const nightK = bakeWindowView(scene, 'art-td-window-night', 123, true);
  img(ctx, layers.main, key).setTint(tint);
  const wd = ctx.scene.add.image(cx, wy, dayK);
  const wn = ctx.scene.add.image(cx, wy, nightK).setAlpha(night);
  layers.main.add([wd, wn]);
  // scroll calligraphy
  const t = scene.add.text(110, 270, 'T\nĨ\nN\nH', {
    fontFamily: 'Georgia, "Times New Roman", "Noto Serif", serif',
    fontSize: '30px',
    color: '#2a1f1a',
    align: 'center',
    lineSpacing: 6,
  }).setOrigin(0.5, 0.5).setTint(tint);
  layers.main.add(t);
  // light patches on the floor
  const dayLight = glow(ctx, layers.main, cx, 730, 190, 0xfff2d0, (1 - night) * 0.22);
  dayLight.setScale(3.6, 1.1);
  const moonLight = glow(ctx, layers.main, cx, 730, 190, 0x9fb4e6, night * 0.22);
  moonLight.setScale(3.6, 1.1);
  glow(ctx, layers.main, W - 140, 640, 60, 0xffc46b, night * 0.35);
  return {
    hotspots: {
      window: { x: cx, y: wy, r: 120 },
      cushion: { x: cx, y: 776, r: 70 },
    },
  };
};
