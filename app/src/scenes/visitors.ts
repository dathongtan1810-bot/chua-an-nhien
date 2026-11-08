import Phaser from 'phaser';
import { makeGlow } from '../art/sprites';

/**
 * Người viếng khác trong khu: các đốm sáng ấm, mờ, chậm rãi đi lại trên nền sân.
 * Không có hình người cụ thể — giữ trang nghiêm và riêng tư.
 */
export class VisitorOrbs {
  private orbs: { img: Phaser.GameObjects.Image; core: Phaser.GameObjects.Image; vx: number; phase: number }[] = [];

  constructor(
    private scene: Phaser.Scene,
    private layer: Phaser.GameObjects.Container,
    private worldWidth: number,
    private band: { top: number; bottom: number },
    private reducedMotion: boolean,
  ) {
    makeGlow(scene);
  }

  setCount(n: number): void {
    const target = Math.max(0, Math.min(8, n));
    while (this.orbs.length < target) this.spawn();
    while (this.orbs.length > target) {
      const o = this.orbs.pop()!;
      this.scene.tweens.add({ targets: [o.img, o.core], alpha: 0, duration: 1200, onComplete: () => (o.img.destroy(), o.core.destroy()) });
    }
  }

  private spawn(): void {
    const x = 40 + Math.random() * (this.worldWidth - 80);
    const y = this.band.top + Math.random() * (this.band.bottom - this.band.top);
    const depth = (y - this.band.top) / Math.max(1, this.band.bottom - this.band.top);
    const s = 0.35 + depth * 0.25;
    const img = this.scene.add.image(x, y, 'spr-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd9a0).setScale(s).setAlpha(0);
    const core = this.scene.add.image(x, y, 'spr-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff4dc).setScale(s * 0.25).setAlpha(0);
    this.layer.add([img, core]);
    this.scene.tweens.add({ targets: img, alpha: 0.55, duration: 1500 });
    this.scene.tweens.add({ targets: core, alpha: 0.9, duration: 1500 });
    this.orbs.push({ img, core, vx: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 10), phase: Math.random() * 10 });
  }

  update(time: number, delta: number): void {
    if (this.reducedMotion) return;
    const dt = delta / 1000;
    for (const o of this.orbs) {
      o.img.x += o.vx * dt;
      if (o.img.x < 30 || o.img.x > this.worldWidth - 30) o.vx = -o.vx;
      const bob = Math.sin(time / 900 + o.phase) * 3;
      o.core.setPosition(o.img.x, o.img.y + bob);
      o.img.y += 0;
      o.core.alpha = 0.75 + 0.2 * Math.sin(time / 500 + o.phase);
    }
  }

  destroy(): void {
    this.orbs.forEach((o) => (o.img.destroy(), o.core.destroy()));
    this.orbs = [];
  }
}
