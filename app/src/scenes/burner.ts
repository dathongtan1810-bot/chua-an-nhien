import Phaser from 'phaser';
import { makeGlow, makeIncenseEmber, makeIncenseStick, makeSmokeParticle } from '../art/sprites';
import { INCENSE_BURN_MS } from '../net/service';
import { incenseRemaining } from '../rituals/pure';

interface Stick {
  img: Phaser.GameObjects.Image;
  ember: Phaser.GameObjects.Image;
  litAt: number;
  baseY: number;
}

/**
 * Hương đang cháy trong lư (của mình và của người online khác).
 * Hương cháy dần ~3 phút; khói dạng hạt bay theo gió.
 */
export class BurnerDisplay {
  private sticks: Stick[] = [];
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private glow: Phaser.GameObjects.Image;
  private readonly maxSticks = 36;

  constructor(
    private scene: Phaser.Scene,
    private layer: Phaser.GameObjects.Container,
    private x: number,
    private y: number,
    private scale: number,
    smokeTint: number,
    reducedMotion: boolean,
  ) {
    makeIncenseStick(scene);
    makeIncenseEmber(scene);
    makeSmokeParticle(scene);
    makeGlow(scene);
    this.glow = scene.add.image(x, y - 50 * scale, 'spr-glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.glow.setScale(1.6 * scale).setTint(0xffa040);
    this.smoke = scene.add.particles(x, y - 70 * scale, 'spr-smoke', {
      speedY: { min: -42 * scale, max: -22 * scale },
      speedX: { min: -6, max: 10 },
      accelerationX: reducedMotion ? 0 : 7,
      scale: { start: 0.35 * scale, end: 2.2 * scale },
      alpha: { start: 0.5, end: 0 },
      lifespan: reducedMotion ? 2600 : 4600,
      frequency: 400,
      quantity: 1,
      tint: smokeTint,
      emitting: false,
    });
    layer.add([this.glow, this.smoke]);
  }

  setSmokeTint(t: number): void {
    this.smoke.particleTint = t;
  }

  /** Cắm `count` nén hương, châm lúc `litAt` (ms epoch). */
  add(count: number, litAt = Date.now()): void {
    const n = Math.min(count, 5);
    for (let i = 0; i < n; i++) {
      if (this.sticks.length >= this.maxSticks) this.removeStick(0);
      const spread = 64 * this.scale;
      const ox = (Math.random() - 0.5) * spread + (i - (n - 1) / 2) * 6 * this.scale;
      const baseY = this.y - 34 * this.scale + Math.random() * 6;
      const img = this.scene.add
        .image(this.x + ox, baseY, 'spr-incense-stick')
        .setOrigin(0.5, 1)
        .setScale(this.scale * 0.9)
        .setAngle((Math.random() - 0.5) * 8 + ox * 0.08);
      const ember = this.scene.add.image(img.x, baseY, 'spr-incense-ember').setBlendMode(Phaser.BlendModes.ADD);
      ember.setScale(this.scale * 0.9);
      // chèn sau lư (lư hương vẽ ở lớp tĩnh phía dưới) — hương nằm trên lư, đủ trang nghiêm
      this.layer.add([img, ember]);
      this.layer.bringToTop(this.smoke);
      this.sticks.push({ img, ember, litAt, baseY });
    }
    this.refreshSmoke();
  }

  private removeStick(i: number): void {
    const s = this.sticks[i];
    s.img.destroy();
    s.ember.destroy();
    this.sticks.splice(i, 1);
  }

  private refreshSmoke(): void {
    const n = this.sticks.length;
    this.smoke.emitting = n > 0;
    this.smoke.frequency = n > 0 ? Math.max(70, 420 - n * 22) : 400;
    this.glow.setAlpha(n > 0 ? Math.min(0.55, 0.15 + n * 0.03) : 0);
  }

  update(time: number): void {
    const now = Date.now();
    let changed = false;
    for (let i = this.sticks.length - 1; i >= 0; i--) {
      const s = this.sticks[i];
      const rem = incenseRemaining(now - s.litAt, INCENSE_BURN_MS);
      if (rem <= 0) {
        this.removeStick(i);
        changed = true;
        continue;
      }
      const sy = this.scale * 0.9 * (0.3 + 0.7 * rem);
      s.img.scaleY = sy;
      const top = s.img.getTopCenter();
      s.ember.setPosition(top.x ?? s.img.x, top.y ?? s.baseY);
      s.ember.alpha = 0.75 + 0.25 * Math.sin(time / 180 + i);
    }
    if (changed) this.refreshSmoke();
  }

  get count(): number {
    return this.sticks.length;
  }

  destroy(): void {
    this.sticks.forEach((s) => {
      s.img.destroy();
      s.ember.destroy();
    });
    this.sticks = [];
    this.smoke.destroy();
    this.glow.destroy();
  }
}
