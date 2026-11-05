/**
 * Cho cá ăn — area 'ho-sen', hotspot 'pond' {x,y,r} (world coords).
 * Koi swim in a flattened ellipse inside the pond (stepBoids). Tapping the water scatters food
 * pellets; fish seek and eat them. Every 5 pellets eaten → host.complete('fish') (max 3 per session).
 *
 * Ambient fish: `createAmbientFish(scene, layers.main, pond, count)` returns {update, destroy, setVisible}.
 * If the scene stores it as `(scene as any).ambientFish`, the ritual hides it while active (it shows its
 * own school, so ambient/feeding fish never overlap) and shows it again on destroy.
 */
import type Phaser from 'phaser';
import { makeFish, makeFoodPellet, makeRipple, type FishColor } from '../art/sprites';
import type { Hotspot } from '../art/types';
import { audio } from '../audio/engine';
import { vibrate } from '../audio/haptics';
import { getLang, t } from '../core/i18n';
import { h } from '../ui/dom';
import { eatFood, stepBoids, type Boid, type BoidOptions, type Point } from './boids';
import { feedCounter, insideEllipse, pondEllipse, scatterPellets, type Ellipse } from './pure-b';
import type { Ritual, RitualFactory, RitualHost } from './types';

const COLORS: FishColor[] = ['cam', 'trang', 'do', 'vang', 'cam', 'trang'];
const MAX_PELLETS = 24;
const PELLET_LIFE_MS = 14000;
const FEED_PER = 5;
const FEED_MAX = 3;

interface Fish extends Boid {
  img: Phaser.GameObjects.Image;
  size: number;
  phase: number;
}

function pondShape(pond: Hotspot): Ellipse {
  const e = pondEllipse(pond, 0.55);
  return { ...e, rx: e.rx * 0.9, ry: e.ry * 0.9 };
}

class School {
  fish: Fish[] = [];
  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    readonly bounds: Ellipse,
    count: number,
    private reducedMotion: boolean,
  ) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.7;
      const x = bounds.cx + Math.cos(a) * r * bounds.rx;
      const y = bounds.cy + Math.sin(a) * r * bounds.ry;
      const h0 = Math.random() * Math.PI * 2;
      const size = 0.75 + Math.random() * 0.5;
      const img = scene.add
        .image(x, y, makeFish(scene, COLORS[i % COLORS.length]))
        .setAlpha(0.78)
        .setScale(size, size * 0.9);
      layer.add(img);
      this.fish.push({ x, y, vx: Math.cos(h0) * 20, vy: Math.sin(h0) * 20, img, size, phase: Math.random() * 10 });
    }
  }

  step(time: number, delta: number, targets: Point[], feeding: boolean): void {
    const dt = Math.min(0.1, delta / 1000);
    const opts: BoidOptions = {
      bounds: this.bounds,
      targets,
      maxSpeed: (feeding && targets.length ? 70 : 34) * (this.reducedMotion ? 0.6 : 1),
      separation: 1.3,
      cohesion: 0.25,
      alignment: 0.35,
      seek: 1.8,
      wander: 0.35,
      separationRadius: 22,
    };
    stepBoids(this.fish, dt, opts);
    for (const f of this.fish) {
      f.img.setPosition(f.x, f.y);
      // smooth heading
      const target = Math.atan2(f.vy, f.vx);
      let d = target - f.img.rotation;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      f.img.rotation += d * Math.min(1, dt * 6);
      if (!this.reducedMotion) {
        const sp = Math.hypot(f.vx, f.vy);
        f.img.scaleY = f.size * (0.9 + 0.06 * Math.sin(time * 0.012 * (0.5 + sp / 60) + f.phase));
      }
    }
  }

  setVisible(v: boolean): void {
    this.fish.forEach((f) => f.img.setVisible(v));
  }

  destroy(): void {
    this.fish.forEach((f) => f.img.destroy());
    this.fish = [];
  }
}

export interface AmbientFish {
  update(time: number, delta: number): void;
  setVisible(v: boolean): void;
  destroy(): void;
}

/** Idle koi for area 'ho-sen' (no food, slow cruise). */
export function createAmbientFish(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  pond: Hotspot,
  count = 8,
  reducedMotion = false,
): AmbientFish {
  const school = new School(scene, layer, pondShape(pond), count, reducedMotion);
  let visible = true;
  return {
    update(time, delta) {
      if (visible) school.step(time, delta, [], false);
    },
    setVisible(v) {
      visible = v;
      school.setVisible(v);
    },
    destroy() {
      school.destroy();
    },
  };
}

interface Pellet extends Point {
  img: Phaser.GameObjects.Image;
  born: number;
}

export const fishRitual: RitualFactory = (host: RitualHost): Ritual => {
  const scene = host.scene;
  const pond: Hotspot = host.hotspots.pond ?? { x: scene.cameras.main.scrollX + 270, y: 620, r: 200 };
  const bounds = pondShape(pond);
  // taps are accepted on a slightly larger area than the swim ellipse; pellets get clamped inside it
  const tapArea: Ellipse = { cx: pond.x, cy: pond.y, rx: pond.r * 1.1, ry: pond.r * 0.75 };
  const layer = host.layers.main;
  const ambient = (scene as any).ambientFish as AmbientFish | undefined;
  ambient?.setVisible(false);

  const school = new School(scene, layer, bounds, 10 + Math.floor(Math.random() * 5), host.reducedMotion);
  const pellets: Pellet[] = [];
  const fx: Phaser.GameObjects.GameObject[] = [];
  const counter = feedCounter(FEED_PER, FEED_MAX);
  const pelletTex = makeFoodPellet(scene);
  const rippleTex = makeRipple(scene);
  let destroyed = false;

  const ripple = (x: number, y: number, size: number, alpha = 0.7): void => {
    const r = scene.add.image(x, y, rippleTex).setScale(size * 0.25).setAlpha(alpha);
    layer.add(r);
    fx.push(r);
    scene.tweens.add({
      targets: r,
      scale: size,
      alpha: 0,
      duration: host.reducedMotion ? 600 : 1100,
      ease: 'Sine.easeOut',
      onComplete: () => {
        const i = fx.indexOf(r);
        if (i >= 0) fx.splice(i, 1);
        r.destroy();
      },
    });
  };

  const onDown = (p: Phaser.Input.Pointer): void => {
    if (destroyed) return;
    const x = p.worldX;
    const y = p.worldY;
    if (!insideEllipse(tapArea, x, y)) return;
    const n = 5 + Math.floor(Math.random() * 4);
    const room = Math.max(0, MAX_PELLETS - pellets.length);
    const pts = scatterPellets(bounds, x, y, Math.min(n, room), 34);
    if (!pts.length) return;
    audio.splash(0.2);
    vibrate(10);
    ripple(x, y, 0.9);
    const now = scene.time.now;
    for (const pt of pts) {
      const img = scene.add.image(pt.x, pt.y - 14, pelletTex).setScale(1.5).setAlpha(0);
      layer.add(img);
      scene.tweens.add({ targets: img, y: pt.y, alpha: 1, duration: 260 + Math.random() * 200, ease: 'Quad.easeIn' });
      pellets.push({ x: pt.x, y: pt.y, img, born: now });
    }
  };
  scene.input.on('pointerdown', onDown);

  const closeText = getLang() === 'en' ? 'Close' : 'Đóng';
  const hint = h('p', { class: 'ritual-hint' }, t('fish.hint'));
  const closeBtn = h('button', { class: 'btn ritual-close', 'aria-label': closeText, onclick: () => host.exit() }, '✕ ' + closeText);
  host.panel.append(hint, closeBtn);

  const removePellet = (i: number, eaten: boolean): void => {
    const p = pellets[i];
    pellets.splice(i, 1);
    if (eaten) ripple(p.x, p.y, 0.35, 0.5);
    scene.tweens.killTweensOf(p.img);
    p.img.destroy();
  };

  return {
    update(time: number, delta: number): void {
      if (destroyed) return;
      school.step(time, delta, pellets, true);
      if (pellets.length) {
        const eaten = eatFood(school.fish, pellets, 11);
        for (let k = eaten.length - 1; k >= 0; k--) removePellet(eaten[k], true);
        if (eaten.length) {
          const fresh = counter.eat(eaten.length);
          for (let i = 0; i < fresh; i++) host.complete('fish', 1, {}, 'fish');
        }
        // uneaten pellets dissolve after a while
        const now = scene.time.now;
        for (let i = pellets.length - 1; i >= 0; i--) {
          const age = now - pellets[i].born;
          if (age > PELLET_LIFE_MS) removePellet(i, false);
          else if (age > PELLET_LIFE_MS - 2000) pellets[i].img.setAlpha((PELLET_LIFE_MS - age) / 2000);
        }
      }
    },
    destroy(): void {
      destroyed = true;
      scene.input.off('pointerdown', onDown);
      pellets.forEach((p) => {
        scene.tweens.killTweensOf(p.img);
        p.img.destroy();
      });
      pellets.length = 0;
      fx.forEach((o) => {
        scene.tweens.killTweensOf(o);
        o.destroy();
      });
      school.destroy();
      hint.remove();
      closeBtn.remove();
      ambient?.setVisible(true);
    },
  };
};
