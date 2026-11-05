/**
 * Thỉnh chuông (Lầu chuông): kéo chày gỗ treo trên hai sợi dây lùi lại rồi thả,
 * chày lao vào đại hồng chung, chuông ngân và sóng âm lan tỏa khắp màn hình.
 */
import type Phaser from 'phaser';
import { audio } from '../audio/engine';
import { vibrate } from '../audio/haptics';
import { bakeCanvas, softDot } from '../art/sprites';
import { getLang, t } from '../core/i18n';
import { net } from '../net/service';
import { h } from '../ui/dom';
import { bellForce } from './pure-a';
import type { Ritual, RitualFactory } from './types';

export { bellForce } from './pure-a';

const MAX_PULL = 160;
const COOLDOWN_MS = 2500;
const ROPE_LEN = 190;
const REST_GAP = 16;
const ADD = 1; // Phaser.BlendModes.ADD

const STRIKES: Record<string, string> = { vi: 'Đã thỉnh {n} tiếng chuông', en: 'Bell rung {n} times' };

// ---------------------------------------------------------------- textures (local fallbacks)

function makeBellTex(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'rit-bell', 150, 200, (ctx) => {
    // loop on top
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(75, 20, 13, Math.PI, 0);
    ctx.stroke();
    // body
    const g = ctx.createLinearGradient(8, 0, 142, 0);
    g.addColorStop(0, '#4a2f14');
    g.addColorStop(0.3, '#a8793a');
    g.addColorStop(0.45, '#d9ad62');
    g.addColorStop(0.7, '#8a5e2a');
    g.addColorStop(1, '#3a240f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(40, 26);
    ctx.quadraticCurveTo(75, 14, 110, 26);
    ctx.quadraticCurveTo(122, 40, 124, 150);
    ctx.quadraticCurveTo(128, 178, 142, 190);
    ctx.lineTo(8, 190);
    ctx.quadraticCurveTo(22, 178, 26, 150);
    ctx.quadraticCurveTo(28, 40, 40, 26);
    ctx.closePath();
    ctx.fill();
    // bands
    ctx.strokeStyle = 'rgba(60,35,12,0.7)';
    ctx.lineWidth = 3;
    for (const y of [60, 120, 168]) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(126, y);
      ctx.stroke();
    }
    // strike lotus medallion
    ctx.fillStyle = 'rgba(70,40,14,0.5)';
    ctx.beginPath();
    ctx.arc(36, 144, 9, 0, Math.PI * 2);
    ctx.fill();
    // panels (dots)
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) softDot(ctx, 44 + i * 20, 76 + j * 14, 2.4, 0xe8c17a, 0.7);
    softDot(ctx, 62, 100, 26, 0xffe2a8, 0.18);
  });
}

function makeLogTex(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'rit-bell-log', 180, 40, (ctx) => {
    const g = ctx.createLinearGradient(0, 2, 0, 38);
    g.addColorStop(0, '#9a6a3e');
    g.addColorStop(0.45, '#6e4422');
    g.addColorStop(1, '#3a2210');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(8, 4);
    ctx.lineTo(170, 4);
    ctx.quadraticCurveTo(180, 20, 170, 36);
    ctx.lineTo(8, 36);
    ctx.quadraticCurveTo(0, 20, 8, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,8,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(14, 10 + i * 6);
      ctx.lineTo(166, 11 + i * 6);
      ctx.stroke();
    }
    ctx.fillStyle = '#c8935a';
    ctx.beginPath();
    ctx.ellipse(172, 20, 4, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function makeSoundRing(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'rit-sound-ring', 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 96, 128, 128, 126);
    g.addColorStop(0, 'rgba(255,230,180,0)');
    g.addColorStop(0.55, 'rgba(255,230,180,0.55)');
    g.addColorStop(0.7, 'rgba(255,245,220,0.9)');
    g.addColorStop(0.85, 'rgba(255,230,180,0.35)');
    g.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

// ---------------------------------------------------------------- ritual

export const bellRitual: RitualFactory = (host) => {
  const { scene, layers, reducedMotion } = host;
  const fx = layers.fx;
  const cam = scene.cameras.main;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    fx.add(o);
    objs.push(o);
    return o;
  };

  // bell position on screen
  const hs = host.hotspots.bell ?? { x: cam.scrollX + 330, y: 420, r: 80 };
  const bx = Math.max(250, Math.min(470, hs.x - cam.scrollX));
  const by = hs.y - cam.scrollY;

  const bellKey = makeBellTex(scene);
  const logKey = makeLogTex(scene);
  const ringKey = makeSoundRing(scene);

  // the bell hangs from its top: origin near the top so it can sway
  const bell = add(scene.add.image(bx, by, bellKey));
  const bellH = bell.displayHeight;
  const bellW = bell.displayWidth;
  bell.setOrigin(0.5, 0.06);
  bell.y = by - bellH * 0.44;

  const log = scene.add.image(0, 0, logKey);
  const logW = log.displayWidth;
  const logH = log.displayHeight;
  const restX = bx - bellW * 0.42 - logW / 2 - REST_GAP;
  const restY = by + bellH * 0.18;
  const anchorY = restY - ROPE_LEN;
  const ropeDx = logW * 0.3;

  const ropes = add(scene.add.graphics());
  add(log);
  log.setPosition(restX, restY);

  // pull state: offset < 0 means pulled back (left), > 0 forward
  let offset = 0;
  let dragging = false;
  let dragStartX = 0;
  let swinging = false;
  let cooldownUntil = 0;
  let strikes = 0;
  let clock = 0;
  const tweens: Phaser.Tweens.Tween[] = [];

  const place = (): void => {
    const dx = Math.max(-ROPE_LEN * 0.9, Math.min(ROPE_LEN * 0.9, offset));
    const lift = ROPE_LEN - Math.sqrt(ROPE_LEN * ROPE_LEN - dx * dx);
    const lx = restX + dx;
    const ly = restY - lift;
    log.setPosition(lx, ly);
    log.setRotation(Math.atan2(-lift, ROPE_LEN) * 0.15 * Math.sign(dx));
    ropes.clear();
    ropes.lineStyle(3, 0x4a3018, 0.95);
    for (const s of [-1, 1]) {
      ropes.beginPath();
      ropes.moveTo(restX + s * ropeDx, anchorY);
      ropes.lineTo(lx + s * ropeDx, ly - logH * 0.4);
      ropes.strokePath();
    }
    // bell chain
    ropes.lineStyle(4, 0x3a2410, 0.9);
    ropes.beginPath();
    ropes.moveTo(bx, Math.min(anchorY, bell.y - 40));
    ropes.lineTo(bx, bell.y + 4);
    ropes.strokePath();
  };
  place();

  // ---------------------------------------------------------------- HTML
  const hint = h('div', { class: 'ritual-hint' }, t('bell.hint'));
  const counter = h('div', {
    class: 'ritual-hint',
    style: { top: 'auto', bottom: 'calc(84px + var(--safe-bottom, 0px))', fontSize: '0.95em' },
    'aria-live': 'polite',
  });
  counter.style.display = 'none';
  const close = h('button', { class: 'btn primary', type: 'button', onclick: () => host.exit() }, t('common.done'));
  close.style.pointerEvents = 'auto';
  const bottom = h('div', { class: 'ritual-bottom' }, close);
  host.panel.append(hint, counter, bottom);

  // ---------------------------------------------------------------- effects
  const soundWaves = (force: number): void => {
    const count = reducedMotion ? 2 : 4 + Math.round(force * 3);
    for (let i = 0; i < count; i++) {
      const ring = add(scene.add.image(bx, by, ringKey));
      ring.setBlendMode(ADD);
      ring.setTint(0xffe2a6);
      ring.setAlpha(0);
      ring.setScale(0.35);
      const delay = i * (reducedMotion ? 600 : 380);
      tweens.push(
        scene.tweens.add({
          targets: ring,
          scale: reducedMotion ? 1.6 : 4.4 + force * 1.2,
          alpha: { from: 0.55 + 0.35 * force, to: 0 },
          delay,
          duration: 3000 - Math.min(1200, delay * 0.5),
          ease: 'Sine.easeOut',
          onComplete: () => ring.destroy(),
        }),
      );
    }
    // warm flash on the bell
    const glow = add(scene.add.image(bx, by, ringKey));
    glow.setBlendMode(ADD).setTint(0xffc070).setScale(0.6).setAlpha(0.6 * force + 0.2);
    tweens.push(
      scene.tweens.add({
        targets: glow,
        alpha: 0,
        scale: 0.9,
        duration: 900,
        ease: 'Quad.easeOut',
        onComplete: () => glow.destroy(),
      }),
    );
  };

  const swayBell = (force: number): void => {
    const amp = (reducedMotion ? 0.6 : 2 + 3 * force) * (Math.PI / 180);
    tweens.push(
      scene.tweens.add({
        targets: bell,
        rotation: { from: -amp, to: amp * 0.6 },
        duration: 520,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: reducedMotion ? 0 : 2,
        onComplete: () => {
          tweens.push(scene.tweens.add({ targets: bell, rotation: 0, duration: 700, ease: 'Sine.easeOut' }));
        },
      }),
    );
  };

  const impact = (force: number): void => {
    audio.bell(force);
    net.ringBell(force);
    const k = 0.4 + 0.6 * force;
    vibrate([30 * k, 40, 60 * k]);
    swayBell(force);
    soundWaves(force);
    strikes += 1;
    counter.style.display = '';
    counter.textContent = (STRIKES[getLang()] ?? STRIKES.vi).replace('{n}', String(strikes));
    host.complete('bell', 1, { force: Math.round(force * 100) / 100 }, 'bell');
  };

  const strike = (pull: number): void => {
    const force = bellForce(pull, MAX_PULL);
    swinging = true;
    const state = { v: offset };
    tweens.push(
      scene.tweens.add({
        targets: state,
        v: REST_GAP,
        duration: 160 + (1 - force) * 220,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          offset = state.v;
          place();
        },
        onComplete: () => {
          impact(force);
          cooldownUntil = clock + COOLDOWN_MS;
          hint.style.opacity = '0.45';
          tweens.push(
            scene.tweens.add({
              targets: state,
              v: 0,
              duration: 900,
              ease: 'Back.easeOut',
              onUpdate: () => {
                offset = state.v;
                place();
              },
              onComplete: () => {
                swinging = false;
              },
            }),
          );
        },
      }),
    );
  };

  const relax = (): void => {
    const state = { v: offset };
    swinging = true;
    tweens.push(
      scene.tweens.add({
        targets: state,
        v: 0,
        duration: 300,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          offset = state.v;
          place();
        },
        onComplete: () => {
          swinging = false;
        },
      }),
    );
  };

  // ---------------------------------------------------------------- input
  const onDown = (p: Phaser.Input.Pointer): void => {
    if (swinging || clock < cooldownUntil) return;
    // forgiving: anywhere in the lower 3/4 of the screen around the log
    if (p.y < anchorY - 40) return;
    dragging = true;
    dragStartX = p.x;
    audio.unlock();
  };
  const onMove = (p: Phaser.Input.Pointer): void => {
    if (!dragging) return;
    const pull = Math.max(0, Math.min(MAX_PULL, dragStartX - p.x));
    offset = -pull;
    place();
  };
  const onUp = (): void => {
    if (!dragging) return;
    dragging = false;
    const pull = -offset;
    if (pull < 14) relax();
    else strike(pull);
  };
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('pointerupoutside', onUp);

  const ritual: Ritual = {
    update(_time: number, delta: number) {
      clock += delta;
      if (cooldownUntil && clock >= cooldownUntil) {
        cooldownUntil = 0;
        hint.style.opacity = '';
      }
    },
    destroy() {
      scene.input.off('pointerdown', onDown);
      scene.input.off('pointermove', onMove);
      scene.input.off('pointerup', onUp);
      scene.input.off('pointerupoutside', onUp);
      for (const tw of tweens) tw.remove();
      for (const o of objs) o.destroy();
      hint.remove();
      counter.remove();
      bottom.remove();
    },
  };
  return ritual;
};
