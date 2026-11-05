import Phaser from 'phaser';
import { makeGlow, makeIncenseEmber, makeIncenseStick, makeSmokeParticle } from '../art/sprites';
import { audio } from '../audio/engine';
import { vibrate } from '../audio/haptics';
import { t } from '../core/i18n';
import { net } from '../net/service';
import { h } from '../ui/dom';
import { insideBurner } from './pure';
import type { RitualFactory } from './types';

/** Thắp hương: chọn 1/3/5 nén → giữ để châm lửa → kéo cắm vào lư hương. */
export const incenseRitual: RitualFactory = (host) => {
  const { scene, layers, panel } = host;
  const cam = scene.cameras.main;
  const burner = host.hotspots.burner ?? { x: cam.scrollX + 270, y: 600, r: 60 };
  const burnerScreen = () => ({ x: burner.x - cam.scrollX, y: burner.y - 40 });
  makeIncenseStick(scene);
  makeIncenseEmber(scene);
  makeSmokeParticle(scene);
  makeGlow(scene);

  const objs: Phaser.GameObjects.GameObject[] = [];
  let count = 0;
  let phase: 'choose' | 'light' | 'drag' | 'done' = 'choose';
  let holdStart = 0;
  let lit = 0; // 0..1
  const bundle = scene.add.container(270, 760);
  const sticks: Phaser.GameObjects.Image[] = [];
  const embers: Phaser.GameObjects.Image[] = [];
  let smoke: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  // ngọn nến châm hương
  const candleGlow = scene.add.image(400, 800, 'spr-glow').setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setTint(0xffb050);
  const candle = scene.add.graphics();
  candle.fillStyle(0xf3e6c8).fillRoundedRect(388, 812, 24, 70, 4);
  candle.fillStyle(0xffd27a).fillEllipse(400, 800, 12, 26);
  candle.fillStyle(0xfff4c8).fillEllipse(400, 804, 6, 14);
  const ring = scene.add.graphics();
  layers.fx.add([candleGlow, candle, bundle, ring]);
  objs.push(candleGlow, candle, bundle, ring);
  candleGlow.setVisible(false);
  candle.setVisible(false);
  const target = scene.add.image(0, 0, 'spr-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd27a).setAlpha(0);
  layers.fx.add(target);
  objs.push(target);

  const hint = h('div', { class: 'ritual-hint' }, t('incense.choose'));
  const bottom = h('div', { class: 'ritual-bottom' });
  const close = h('button', { class: 'btn ritual-close', onclick: () => host.exit(), 'aria-label': t('common.close') }, '✕');
  panel.append(hint, bottom, close);

  const choose = (n: number) => {
    count = n;
    audio.uiTap();
    bottom.replaceChildren();
    for (let i = 0; i < n; i++) {
      const img = scene.add.image((i - (n - 1) / 2) * 9, 0, 'spr-incense-stick').setOrigin(0.5, 1).setScale(1.5);
      img.setAngle((i - (n - 1) / 2) * 3);
      const em = scene.add.image(img.x, -160, 'spr-incense-ember').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      em.setScale(1.4);
      sticks.push(img);
      embers.push(em);
      bundle.add([img, em]);
    }
    bundle.setPosition(200, 900);
    candle.setVisible(true);
    candleGlow.setVisible(true);
    phase = 'light';
    hint.textContent = t('incense.hold');
    bottom.append(
      h('button', { class: 'btn primary interactive', onpointerdown: () => startHold(), onpointerup: () => endHold(), onpointerleave: () => endHold() }, '🔥 ' + t('incense.hold')),
    );
  };
  [1, 3, 5].forEach((n) => bottom.append(h('button', { class: 'chip', onclick: () => choose(n) }, t('incense.n', { n }))));

  const startHold = () => {
    if (phase !== 'light') return;
    holdStart = scene.time.now;
    scene.tweens.add({ targets: bundle, x: 352, y: 980, angle: 30, duration: 350, ease: 'Sine.easeOut' });
  };
  const endHold = () => {
    if (phase !== 'light' || holdStart === 0) return;
    holdStart = 0;
    if (lit < 1) scene.tweens.add({ targets: bundle, x: 200, y: 900, angle: 0, duration: 300 });
  };

  const onDown = (p: Phaser.Input.Pointer) => {
    if (phase === 'light' && Math.hypot(p.x - bundle.x, p.y - (bundle.y - 80)) < 110) startHold();
  };
  const onMove = (p: Phaser.Input.Pointer) => {
    if (phase === 'drag' && p.isDown) {
      bundle.setPosition(p.x, p.y + 120);
      const b = burnerScreen();
      target.setAlpha(insideBurner(p.x, p.y, b.x, b.y, Math.max(70, burner.r)) ? 0.9 : 0.35);
    }
  };
  const onUp = (p: Phaser.Input.Pointer) => {
    if (phase === 'light') endHold();
    else if (phase === 'drag') {
      const b = burnerScreen();
      if (insideBurner(p.x, p.y, b.x, b.y, Math.max(70, burner.r))) plant();
      else scene.tweens.add({ targets: bundle, x: 270, y: 840, duration: 300, ease: 'Back.easeOut' });
    }
  };
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);

  const becomeLit = () => {
    phase = 'drag';
    audio.strike();
    vibrate(20);
    embers.forEach((e) => e.setAlpha(1));
    smoke = scene.add.particles(0, -160, 'spr-smoke', {
      speedY: { min: -40, max: -20 },
      speedX: { min: -8, max: 8 },
      accelerationX: host.reducedMotion ? 0 : 8,
      scale: { start: 0.25, end: 1.3 },
      alpha: { start: 0.35, end: 0 },
      lifespan: 2600,
      frequency: 160,
    });
    bundle.add(smoke);
    candle.setVisible(false);
    candleGlow.setVisible(false);
    scene.tweens.add({ targets: bundle, x: 270, y: 840, angle: 0, duration: 400, ease: 'Sine.easeOut' });
    const b = burnerScreen();
    target.setPosition(b.x, b.y).setScale(1.2).setAlpha(0.35);
    if (!host.reducedMotion) scene.tweens.add({ targets: target, scale: 1.5, yoyo: true, repeat: -1, duration: 900 });
    hint.textContent = t('incense.drag');
    bottom.replaceChildren(
      h('button', { class: 'btn primary', onclick: () => plant() }, '🙏 ' + t('act.incense')),
    );
  };

  const plant = () => {
    if (phase !== 'drag') return;
    phase = 'done';
    const b = burnerScreen();
    target.setAlpha(0);
    scene.tweens.add({
      targets: bundle,
      x: b.x,
      y: b.y + 10,
      scale: 0.5,
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeIn',
      onComplete: () => {
        const sc = scene as unknown as { burner?: { add(n: number): void } };
        if (!net.enabled) sc.burner?.add(count);
        net.lightIncense(count);
        vibrate(30);
        audio.reward();
        host.complete('incense', count, { count }, 'incense');
        hint.textContent = t('incense.done');
        bottom.replaceChildren(
          h('button', { class: 'btn primary', onclick: () => host.exit('bow') }, '🙏 ' + t('act.bow')),
          h('button', { class: 'btn', onclick: () => host.exit() }, t('common.done')),
        );
      },
    });
  };

  return {
    update(time) {
      if (phase === 'light' && holdStart > 0) {
        lit = Math.min(1, (time - holdStart) / 1300);
        ring.clear();
        ring.lineStyle(6, 0xffd27a, 0.9).beginPath();
        ring.arc(bundle.x - 40, bundle.y - 200, 34, -Math.PI / 2, -Math.PI / 2 + lit * Math.PI * 2);
        ring.strokePath();
        embers.forEach((e) => e.setAlpha(lit * 0.8));
        if (lit >= 1) {
          ring.clear();
          holdStart = 0;
          becomeLit();
        }
      }
      if (phase !== 'light') ring.clear();
    },
    destroy() {
      scene.input.off('pointerdown', onDown);
      scene.input.off('pointermove', onMove);
      scene.input.off('pointerup', onUp);
      scene.tweens.killTweensOf([bundle, target]);
      smoke?.destroy();
      objs.forEach((o) => o.destroy());
    },
  };
};
