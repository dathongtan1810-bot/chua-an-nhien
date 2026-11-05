import Phaser from 'phaser';
import { audio } from '../audio/engine';
import { vibrate } from '../audio/haptics';
import { t } from '../core/i18n';
import { store } from '../core/store';
import { h } from '../ui/dom';
import { isSteady } from './pure';
import type { RitualFactory } from './types';

const MO_TEX = 'rit-mo';
const DUI_TEX = 'rit-mo-dui';

function makeMo(scene: Phaser.Scene): void {
  if (scene.textures.exists(MO_TEX)) return;
  const g = scene.add.graphics();
  // thân mõ: khối gỗ tròn dẹt hình cá, màu gỗ son nâu
  g.fillStyle(0x000000, 0.25).fillEllipse(170, 238, 300, 40);
  g.fillStyle(0x5b2a16).fillEllipse(170, 140, 300, 220);
  g.fillStyle(0x7a3a1e).fillEllipse(170, 132, 284, 200);
  g.fillStyle(0x9a4d26).fillEllipse(150, 110, 200, 120);
  g.fillStyle(0xb8653a, 0.6).fillEllipse(130, 88, 110, 50);
  // khe miệng mõ
  g.fillStyle(0x2a1009).fillRoundedRect(40, 168, 260, 16, 8);
  g.fillStyle(0x3d180c).fillRoundedRect(46, 166, 248, 8, 4);
  // vảy cá & mắt chạm khắc
  g.lineStyle(3, 0xd9a441, 0.7);
  for (let i = 0; i < 4; i++) g.strokeCircle(220 + i * 0, 0, 0);
  g.beginPath();
  g.arc(250, 120, 22, 0, Math.PI * 2);
  g.strokePath();
  g.fillStyle(0xd9a441, 0.9).fillCircle(250, 120, 7);
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.arc(110 + k * 36, 128, 22, Math.PI * 1.1, Math.PI * 1.9);
    g.strokePath();
  }
  // đệm đỏ
  g.fillStyle(0x9e2a1f).fillRoundedRect(20, 222, 300, 34, 14);
  g.fillStyle(0xd9a441).fillRect(20, 236, 300, 4);
  g.generateTexture(MO_TEX, 340, 262);
  g.clear();
  // dùi mõ
  g.fillStyle(0x6b3a1f).fillRoundedRect(0, 10, 150, 12, 6);
  g.fillStyle(0x8c4a26).fillCircle(150, 16, 16);
  g.fillStyle(0xb8653a, 0.6).fillCircle(146, 11, 6);
  g.generateTexture(DUI_TEX, 170, 34);
  g.destroy();
}

/** Gõ mõ: chạm theo nhịp, hiện "An lạc +1", thưởng khi giữ nhịp đều. */
export const moRitual: RitualFactory = (host) => {
  const { scene, layers, panel } = host;
  makeMo(scene);
  const mo = scene.add.image(270, 690, MO_TEX).setOrigin(0.5, 0.9);
  const dui = scene.add.image(400, 520, DUI_TEX).setOrigin(0.05, 0.5).setAngle(-35);
  const shade = scene.add.rectangle(270, 480, 540, 960, 0x140a04, 0.35);
  layers.fx.add([shade, mo, dui]);
  let count = 0;
  let last = 0;
  const intervals: number[] = [];
  let steadyRewards = 0;
  let pendingTotals = 0;

  const hint = h('div', { class: 'ritual-hint' }, t('mo.hint'));
  const counter = h('div', { class: 'ritual-hint', style: { top: 'auto', bottom: '120px' } }, t('mo.count', { n: 0 }));
  const bottom = h(
    'div',
    { class: 'ritual-bottom' },
    h('button', { class: 'btn primary', onclick: () => strike() }, '🪵 ' + t('act.mo')),
    h('button', { class: 'btn', onclick: () => host.exit() }, t('common.done')),
  );
  panel.append(hint, counter, bottom);

  const flush = () => {
    if (pendingTotals > 0) host.complete('mo', pendingTotals, { count: pendingTotals }, 'mo');
    pendingTotals = 0;
  };

  const strike = () => {
    const now = scene.time.now;
    if (now - last < 120) return;
    if (last > 0 && now - last < 3000) intervals.push(now - last);
    if (intervals.length > 16) intervals.shift();
    last = now;
    count++;
    pendingTotals++;
    audio.mo(count % 4 === 1);
    vibrate(12);
    scene.tweens.killTweensOf([mo, dui]);
    mo.setScale(1.04, 0.95);
    scene.tweens.add({ targets: mo, scaleX: 1, scaleY: 1, duration: 160, ease: 'Back.easeOut' });
    dui.setAngle(-35);
    scene.tweens.add({ targets: dui, angle: -8, duration: 70, yoyo: true, ease: 'Quad.easeIn' });
    host.floatText(t('mo.plus'), 270 + (Math.random() - 0.5) * 120, 520, '#ffe6a8');
    counter.textContent = t('mo.count', { n: count });
    if (isSteady(intervals)) {
      intervals.length = 0;
      hint.textContent = t('mo.steady');
      if (steadyRewards < 3) {
        steadyRewards++;
        store.dispatch({ type: 'reward', amount: 1 });
        audio.reward();
        host.floatText(t('reward.plus', { n: 1 }), 270, 440, '#f2cd6b');
      }
    }
    if (pendingTotals >= 10) flush();
  };

  const onDown = (p: Phaser.Input.Pointer) => {
    if (p.y > 380 && p.y < 820) strike();
  };
  scene.input.on('pointerdown', onDown);

  return {
    destroy() {
      flush();
      scene.input.off('pointerdown', onDown);
      scene.tweens.killTweensOf([mo, dui]);
      [shade, mo, dui].forEach((o) => o.destroy());
    },
  };
};
