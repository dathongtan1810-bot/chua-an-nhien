/**
 * Dev-only preview for water areas: /art-water-preview.html?area=ho-sen|bo-song&hour=21&full=1&scroll=0
 * Drag to pan. Not part of the game bundle.
 */
import Phaser from 'phaser';
import { GAME_H, GAME_W, type ArtLayers } from './types';
import { drawSky, nightFactor } from './sky';
import { drawBoSong, drawHoSen, RIVER_BAND, WORLD_WIDTH_WATER } from './areas-water';
import {
  makeBead,
  makeFirefly,
  makeFish,
  makeFoodPellet,
  makeGlow,
  makeIncenseEmber,
  makeIncenseStick,
  makeLantern,
  makeLeaf,
  makePetal,
  makeRedLantern,
  makeRipple,
  makeRose,
  makeSmokeParticle,
  makeSparkle,
  type FishColor,
  type LanternStyle,
} from './sprites';
import { seededRand, stepBoids, type Boid } from '../rituals/boids';

const params = new URLSearchParams(location.search);
const area = (params.get('area') === 'bo-song' ? 'bo-song' : 'ho-sen') as 'ho-sen' | 'bo-song';
const hour = Number(params.get('hour') ?? '21');
const fullMoon = params.get('full') === '1';
const reducedMotion = params.get('rm') === '1';
const initialScroll = Number(params.get('scroll') ?? '0');

class PreviewScene extends Phaser.Scene {
  private updaters: ((t: number, d: number) => void)[] = [];

  constructor() {
    super('preview');
  }

  create(): void {
    const worldWidth = WORLD_WIDTH_WATER[area];
    const mk = (sf: number): Phaser.GameObjects.Container => this.add.container(0, 0).setScrollFactor(sf);
    const layers: ArtLayers = { sky: mk(0), far: mk(0.3), mid: mk(0.6), main: mk(1), near: mk(1.25), fx: mk(0) };
    this.children.bringToTop(layers.fx);
    const night = nightFactor(hour);
    const sky = drawSky(this, layers.sky, { night, hour, worldWidth, reducedMotion, fullMoon });
    this.updaters.push((t, d) => sky.update(t, d));
    const ctx = { scene: this, layers, worldWidth, night, reducedMotion };
    const res = area === 'ho-sen' ? drawHoSen(ctx) : drawBoSong(ctx);
    if (res.update) this.updaters.push(res.update);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldWidth, GAME_H);
    cam.scrollX = initialScroll;

    if (area === 'ho-sen') {
      const pond = res.hotspots.pond;
      const rand = seededRand(5);
      const colors: FishColor[] = ['cam', 'trang', 'do', 'vang', 'cam', 'trang', 'vang'];
      const boids: Boid[] = colors.map(() => ({ x: pond.x + (rand() - 0.5) * 120, y: pond.y + (rand() - 0.5) * 50, vx: rand() * 40 - 20, vy: rand() * 20 - 10 }));
      const fish = colors.map((c) => {
        const im = this.add.image(0, 0, makeFish(this, c)).setAlpha(0.92);
        layers.main.add(im);
        return im;
      });
      const pellet = this.add.image(pond.x + 40, pond.y - 10, makeFoodPellet(this));
      layers.main.add(pellet);
      const targets = [{ x: pond.x + 40, y: pond.y - 10 }];
      this.updaters.push((_t, d) => {
        stepBoids(boids, d / 1000, {
          bounds: { cx: pond.x, cy: pond.y, rx: pond.r, ry: pond.r * 0.45 },
          targets,
          maxSpeed: 45,
          separation: 1.2,
          cohesion: 0.3,
          alignment: 0.4,
          seek: 0.6,
          wander: 0.4,
          rand,
        });
        boids.forEach((b, i) => {
          fish[i].setPosition(b.x, b.y).setRotation(Math.atan2(b.vy, b.vx));
          const depth = 0.75 + ((b.y - pond.y) / pond.r) * 0.3;
          fish[i].setScale(depth, depth * 0.85);
        });
      });
    } else {
      const colors = ['hong', 'vang', 'trang', 'xanh', 'tim', 'hong', 'vang'];
      const styles: LanternStyle[] = ['sen', 'vuong', 'tron', 'sen', 'sen', 'tron', 'vuong'];
      const glowKey = makeGlow(this);
      const lanterns = colors.map((c, i) => {
        const y = RIVER_BAND.top + 20 + ((i * 37) % (RIVER_BAND.bottom - RIVER_BAND.top - 30));
        const s = 0.55 + ((y - RIVER_BAND.top) / (RIVER_BAND.bottom - RIVER_BAND.top)) * 0.5;
        const g = this.add.image(0, y - 18 * s, glowKey).setBlendMode('ADD').setScale(1.3 * s).setAlpha(0.35 + night * 0.5);
        const refl = this.add.image(0, y + 6 * s, glowKey).setBlendMode('ADD').setScale(0.9 * s, 0.35 * s).setAlpha(0.25 + night * 0.4);
        const im = this.add.image(0, y, makeLantern(this, c, styles[i])).setOrigin(0.5, 0.82).setScale(s);
        layers.main.add([refl, g, im]);
        return { im, g, refl, x: 120 + i * 150, y, sp: 6 + (i % 3) * 3, s };
      });
      this.updaters.push((t, d) => {
        for (const l of lanterns) {
          l.x += (l.sp * d) / 1000;
          if (l.x > worldWidth + 40) l.x = -40;
          const bob = Math.sin(t * 0.002 + l.x * 0.05) * 1.2;
          l.im.setPosition(l.x, l.y + bob);
          l.g.setPosition(l.x, l.y - 18 * l.s + bob);
          l.refl.setPosition(l.x, l.y + 8 * l.s);
        }
      });
    }

    // drag to pan
    let dragX = 0;
    let startScroll = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragX = p.x;
      startScroll = cam.scrollX;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) cam.scrollX = startScroll - (p.x - dragX);
    });
    const hud = this.add.text(8, 8, `${area} h=${hour}`, { fontSize: '14px', color: '#ffffff' }).setScrollFactor(0).setAlpha(0.6);
    layers.fx.add(hud);
    if (params.get('sprites') === '1') this.spriteSheet(layers.fx);
    (window as unknown as { __ready: boolean }).__ready = true;
  }

  private spriteSheet(fx: Phaser.GameObjects.Container): void {
    const bg = this.add.rectangle(20, 300, 500, 520, 0x2a2d3a, 0.92).setOrigin(0, 0);
    fx.add(bg);
    const keys: { k: string; s?: number }[] = [
      { k: makeIncenseStick(this) },
      { k: makeIncenseEmber(this), s: 2 },
      { k: makeSmokeParticle(this), s: 2 },
      { k: makeGlow(this), s: 0.6 },
      { k: makeSparkle(this), s: 1.5 },
      { k: makeFish(this, 'cam'), s: 1.5 },
      { k: makeFish(this, 'trang'), s: 1.5 },
      { k: makeFish(this, 'do'), s: 1.5 },
      { k: makeFish(this, 'vang'), s: 1.5 },
      { k: makeFoodPellet(this), s: 3 },
      { k: makeLantern(this, 'hong', 'sen') },
      { k: makeLantern(this, 'vang', 'vuong') },
      { k: makeLantern(this, 'trang', 'tron') },
      { k: makeLantern(this, 'xanh', 'sen') },
      { k: makeLantern(this, '#ff8040', 'tron') },
      { k: makeBead(this, 'nau'), s: 1.5 },
      { k: makeBead(this, 'do'), s: 1.5 },
      { k: makeBead(this, 'den'), s: 1.5 },
      { k: makeRipple(this) },
      { k: makePetal(this), s: 2 },
      { k: makeLeaf(this), s: 1.5 },
      { k: makeRose(this), s: 2 },
      { k: makeRedLantern(this) },
      { k: makeFirefly(this), s: 2 },
    ];
    keys.forEach((e, i) => {
      const im = this.add.image(70 + (i % 5) * 100, 350 + Math.floor(i / 5) * 100, e.k).setScale(e.s ?? 1);
      fx.add(im);
    });
  }

  override update(time: number, delta: number): void {
    for (const u of this.updaters) u(time, delta);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [PreviewScene],
});
