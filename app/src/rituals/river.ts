/**
 * The shared river of flower lanterns (đèn hoa đăng) in area 'bo-song'. Always present there
 * (not a ritual). Lanterns drift left→right along lanes in the water band, bob gently, glow
 * softly (stronger at night) and wrap around the world so the river always looks alive.
 *
 * Usage (AreaScene): `this.river = new RiverLanterns(scene, layers.main, {top, bottom}, worldWidth,
 * {reducedMotion, night, onTap: (l, mine) => openLanternDetail(l, mine)})`; forward net events
 * ('lantern' → add(l, mine), 'lanternRemoved' → remove(id)); call update(time, delta) every frame.
 */
import Phaser from 'phaser';
import { makeGlow, makeLantern, type LanternStyle } from '../art/sprites';
import { store } from '../core/store';
import { shopItem } from '../core/shop';
import { net } from '../net/service';
import type { LanternPayload } from '../net/protocol';
import { depthOf, driftSpeed, laneY, lanternScale, visibleIds, wrapX } from './pure-b';

export const RIVER_CAP = 40;
const LANES = 5;
const MIN_HIT = 44;

export interface RiverOptions {
  reducedMotion: boolean;
  /** 0 day … 1 night (glow strength). */
  night?: number;
  onTap: (l: LanternPayload, mine: boolean) => void;
}

interface Entry {
  l: LanternPayload;
  mine: boolean;
  at: number;
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  x: number;
  y: number;
  laneY: number;
  depth: number;
  scale: number;
  phase: number;
  speed: number;
  visible: boolean;
}

export function myLanternStyle(): LanternStyle {
  const v = shopItem(store.state.equipped.lantern)?.value;
  return v === 'vuong' || v === 'tron' ? v : 'sen';
}

export class RiverLanterns {
  private entries = new Map<string, Entry>();
  private group: Phaser.GameObjects.Container;
  private glowTex: string;
  private night: number;
  private destroyed = false;

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    private band: { top: number; bottom: number },
    private worldWidth: number,
    private opts: RiverOptions,
  ) {
    this.night = opts.night ?? 0;
    this.group = scene.add.container(0, 0);
    layer.add(this.group);
    this.glowTex = makeGlow(scene);
    for (const l of net.lanterns.values()) {
      const mine = (!!l.userId && l.userId === net.userId) || (l.nickname === store.state.nickname && net.myLanternTexts.has(l.text));
      this.add(l, mine);
    }
  }

  get count(): number {
    return this.entries.size;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  setNight(n: number): void {
    this.night = Math.max(0, Math.min(1, n));
    for (const e of this.entries.values()) e.glow.setAlpha(this.glowAlpha(e.depth));
  }

  private glowAlpha(depth: number): number {
    return (0.12 + 0.5 * this.night) * (0.7 + 0.3 * depth);
  }

  add(l: LanternPayload, mine: boolean, opts: { fromX?: number; fromY?: number } = {}): void {
    if (this.destroyed || this.entries.has(l.id)) return;
    const { top, bottom } = this.band;
    const lane = Math.floor(Math.random() * LANES);
    const ly = laneY(lane, LANES, top, bottom) + (Math.random() - 0.5) * 8;
    const depth = depthOf(ly, top, bottom);
    const scale = lanternScale(depth) * 0.9;
    const style: LanternStyle = mine ? myLanternStyle() : 'sen';
    const tex = makeLantern(this.scene, String(l.color), style);
    const x = opts.fromX ?? Math.random() * this.worldWidth;
    const y = opts.fromY ?? ly;

    const glow = this.scene.add.image(x, y - 8 * scale, this.glowTex);
    glow.setBlendMode(Phaser.BlendModes.ADD).setScale(scale * 1.1).setAlpha(this.glowAlpha(depth));
    const img = this.scene.add.image(x, y, tex).setOrigin(0.5, 0.8).setScale(scale);
    // Enlarged hit area (≥ 44 screen px) in the image's local (unscaled) space.
    const hw = Math.max(img.width, MIN_HIT / scale);
    const hh = Math.max(img.height, MIN_HIT / scale);
    img.setInteractive({
      hitArea: new Phaser.Geom.Rectangle((img.width - hw) / 2, (img.height - hh) / 2, hw, hh),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    const entry: Entry = {
      l,
      mine,
      at: Date.parse(l.at) || Date.now(),
      img,
      glow,
      x,
      y,
      laneY: ly,
      depth,
      scale,
      phase: Math.random() * Math.PI * 2,
      speed: driftSpeed(depth, this.opts.reducedMotion) * (0.85 + Math.random() * 0.3),
      visible: true,
    };
    img.on('pointerup', (p: Phaser.Input.Pointer) => {
      // ignore drags (camera pan)
      if (Math.hypot(p.upX - p.downX, p.upY - p.downY) > 12) return;
      const cur = this.entries.get(l.id);
      if (cur && cur.visible) this.opts.onTap(cur.l, cur.mine);
    });
    this.entries.set(l.id, entry);
    this.group.add([glow, img]);
    this.sortByDepth();
    this.applyCap();
  }

  remove(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    this.entries.delete(id);
    e.img.destroy();
    e.glow.destroy();
    this.applyCap();
  }

  private sortByDepth(): void {
    const sorted = [...this.entries.values()].sort((a, b) => a.laneY - b.laneY);
    sorted.forEach((e) => {
      this.group.bringToTop(e.glow);
      this.group.bringToTop(e.img);
    });
  }

  private applyCap(): void {
    if (this.entries.size === 0) return;
    const show = visibleIds(
      [...this.entries.values()].map((e) => ({ id: e.l.id, at: e.at, mine: e.mine })),
      RIVER_CAP,
    );
    for (const e of this.entries.values()) {
      const v = show.has(e.l.id);
      if (v === e.visible) continue;
      e.visible = v;
      e.img.setVisible(v);
      e.glow.setVisible(v);
      if (v) e.img.setInteractive();
      else e.img.disableInteractive();
    }
  }

  update(time: number, delta: number): void {
    if (this.destroyed) return;
    const dt = Math.min(0.1, delta / 1000);
    const bob = this.opts.reducedMotion ? 0.8 : 2.2;
    for (const e of this.entries.values()) {
      if (!e.visible) continue;
      e.x = wrapX(e.x + e.speed * dt, this.worldWidth, 50);
      // settle toward the lane (newly released lanterns come from the steps)
      e.y += (e.laneY - e.y) * Math.min(1, dt * 1.5);
      const s = Math.sin(time * 0.0013 + e.phase);
      const y = e.y + s * bob * (0.5 + 0.5 * e.depth);
      e.img.setPosition(e.x, y);
      e.img.rotation = this.opts.reducedMotion ? 0 : Math.sin(time * 0.0009 + e.phase * 1.7) * 0.04;
      e.glow.setPosition(e.x, y - 10 * e.scale);
      if (!this.opts.reducedMotion) e.glow.setAlpha(this.glowAlpha(e.depth) * (0.9 + 0.1 * Math.sin(time * 0.004 + e.phase)));
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const e of this.entries.values()) {
      e.img.destroy();
      e.glow.destroy();
    }
    this.entries.clear();
    this.group.destroy();
  }
}
