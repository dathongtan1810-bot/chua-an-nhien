/**
 * Dev-only preview: /art-preview.html?area=san&night=0.7&scroll=0&debug=1
 * (or &hour=21 instead of night). Drag to pan. Not part of the game bundle.
 */
import Phaser from 'phaser';
import { isAreaId, type AreaId } from '../core/areas';
import { GAME_H, GAME_W, type ArtLayers } from './types';
import { AREA_ART, worldWidthOf } from './registry';
import { drawSky, nightFactor } from './sky';
import { makeBeamTexture, makeBellTexture, makeStickCupTexture } from './areas-buildings';

const params = new URLSearchParams(location.search);
const rawArea = params.get('area');
const area: AreaId = isAreaId(rawArea) ? rawArea : 'san';
const hourParam = params.get('hour');
const nightParam = params.get('night');
const night = nightParam !== null ? Number(nightParam) : hourParam !== null ? nightFactor(Number(hourParam)) : 0;
const hour = hourParam !== null ? Number(hourParam) : night > 0.5 ? 21 : 10;
const reducedMotion = params.get('rm') === '1';
const debug = params.get('debug') === '1';
const scrollParam = params.get('scroll');

class PreviewScene extends Phaser.Scene {
  private updaters: ((t: number, d: number) => void)[] = [];

  constructor() {
    super('preview');
  }

  create(): void {
    const worldWidth = worldWidthOf(area);
    const mk = (sf: number): Phaser.GameObjects.Container => this.add.container(0, 0).setScrollFactor(sf);
    const layers: ArtLayers = { sky: mk(0), far: mk(0.3), mid: mk(0.6), main: mk(1), near: mk(1.25), fx: mk(0) };
    const sky = drawSky(this, layers.sky, { night, hour, worldWidth, reducedMotion });
    this.updaters.push((t, d) => sky.update(t, d));
    const fn = AREA_ART[area];
    if (!fn) return;
    const res = fn({ scene: this, layers, worldWidth, night, reducedMotion });
    if (res.update) this.updaters.push(res.update);
    const hs = res.hotspots;
    const tint = Phaser.Display.Color.GetColor(255 - night * 120, 255 - night * 110, 255 - night * 70);
    if (area === 'lau-chuong') {
      layers.main.add(this.add.image(hs.beam.x, hs.beam.y, makeBeamTexture(this)).setTint(tint));
      layers.main.add(this.add.image(hs.bell.x, hs.bell.y, makeBellTexture(this)).setTint(tint));
    }
    if (area === 'am-xam') layers.main.add(this.add.image(hs.sticks.x, hs.sticks.y, makeStickCupTexture(this)));
    if (debug) {
      const g = this.add.graphics();
      layers.main.add(g);
      for (const [name, h] of Object.entries(hs)) {
        g.lineStyle(2, 0x00ffff, 0.9).strokeCircle(h.x, h.y, h.r);
        layers.main.add(this.add.text(h.x, h.y, name, { fontSize: '12px', color: '#0ff' }).setOrigin(0.5));
      }
    }
    this.children.bringToTop(layers.near);
    this.children.bringToTop(layers.fx);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldWidth, GAME_H);
    const max = worldWidth - GAME_W;
    cam.scrollX = scrollParam === 'max' ? max : scrollParam !== null ? Number(scrollParam) : max / 2;
    let lastX = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (lastX = p.x));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      cam.scrollX -= p.x - lastX;
      lastX = p.x;
    });
    this.time.delayedCall(300, () => ((window as unknown as { __ready: boolean }).__ready = true));
  }

  override update(t: number, d: number): void {
    for (const u of this.updaters) u(t, d);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#1a1410',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [PreviewScene],
});
