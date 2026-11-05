/**
 * Thỉnh chuông (Lầu chuông): kéo chày gỗ treo trên hai sợi dây lùi lại rồi thả,
 * chày lao vào đại hồng chung, chuông ngân và sóng âm lan tỏa khắp màn hình.
 */
import type Phaser from 'phaser';
import { audio } from '../audio/engine';
import { vibrate } from '../audio/haptics';
import { makeBeamTexture, makeBellTexture } from '../art/areas-buildings';
import { bakeCanvas } from '../art/sprites';
import { getLang, t } from '../core/i18n';
import { net } from '../net/service';
import { h } from '../ui/dom';
import { bellForce } from './pure-a';
import type { Ritual, RitualFactory } from './types';

export { bellForce } from './pure-a';

const MAX_PULL = 160;
const COOLDOWN_MS = 2500;
const REST_GAP = 18;
/** Where the bell sits on screen while ringing (leaves room for the log on the left). */
const BELL_SCREEN_X = 360;
const ADD = 1; // Phaser.BlendModes.ADD

const STRIKES: Record<string, string> = { vi: 'Đã thỉnh {n} tiếng chuông', en: 'Bell rung {n} times' };

// ---------------------------------------------------------------- textures

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
  const cam = scene.cameras.main;
  // everything lives in a root container laid out for the target camera scroll;
  // root.x compensates while the camera glides there.
  const root = scene.add.container(0, 0);
  layers.fx.add(root);
  const objs: Phaser.GameObjects.GameObject[] = [root];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    root.add(o);
    return o;
  };
  const tweens: Phaser.Tweens.Tween[] = [];

  const hsBell = host.hotspots.bell ?? { x: cam.scrollX + 330, y: 470, r: 90 };
  const hsBeam = host.hotspots.beam;
  // glide the camera so the bell sits right of centre and the log has room to be pulled back
  const maxScroll = Math.max(0, (cam.getBounds().width || cam.scrollX + 540) - 540);
  const targetScroll = Math.max(0, Math.min(maxScroll, hsBell.x - BELL_SCREEN_X));
  const startScroll = cam.scrollX;
  if (Math.abs(targetScroll - startScroll) > 1) {
    if (reducedMotion) cam.scrollX = targetScroll;
    else tweens.push(scene.tweens.add({ targets: cam, scrollX: targetScroll, duration: 700, ease: 'Sine.easeInOut' }));
  }
  const sx = (wx: number): number => wx - targetScroll;
  const bx = sx(hsBell.x);
  const by = hsBell.y - cam.scrollY;

  const bellKey = makeBellTexture(scene);
  const logKey = makeBeamTexture(scene);
  const ringKey = makeSoundRing(scene);

  // the bell hangs from its loop: origin near the top so it can sway; visual centre stays at the hotspot
  const bell = add(scene.add.image(bx, by, bellKey));
  const bellH = bell.displayHeight;
  const bellW = bell.displayWidth;
  bell.setOrigin(0.5, 0.06);
  bell.y = by - bellH * 0.44;
  if (host.night > 0.05) bell.setTint(0xffffff - Math.round(host.night * 0x30) * 0x010101);

  const log = scene.add.image(0, 0, logKey);
  const logW = log.displayWidth;
  const logH = log.displayHeight;
  const bodyLeft = bx - bellW * 0.32;
  const fallbackX = bodyLeft - logW / 2 - REST_GAP;
  const restX = hsBeam && hsBeam.x < hsBell.x ? Math.min(sx(hsBeam.x), fallbackX) : fallbackX;
  const restY = hsBeam ? hsBeam.y - cam.scrollY : by;
  const contact = Math.max(6, bodyLeft - (restX + logW / 2));
  const anchorY = Math.min(restY - 80, by - bellH * 0.57);
  const ROPE_LEN = restY - anchorY;
  const ropeDx = 60;

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

  const place = (): void => {
    const dx = Math.max(-ROPE_LEN * 0.9, Math.min(ROPE_LEN * 0.9, offset));
    const lift = ROPE_LEN - Math.sqrt(ROPE_LEN * ROPE_LEN - dx * dx);
    const lx = restX + dx;
    const ly = restY - lift;
    log.setPosition(lx, ly);
    log.setRotation(Math.atan2(-lift, ROPE_LEN) * 0.15 * Math.sign(dx));
    ropes.clear();
    ropes.lineStyle(3, 0xb89a6c, 1);
    for (const s of [-1, 1]) {
      ropes.beginPath();
      ropes.moveTo(restX + s * ropeDx, anchorY);
      ropes.lineTo(lx + s * ropeDx, ly - logH * 0.4);
      ropes.strokePath();
    }
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
        v: contact,
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
      root.x = targetScroll - cam.scrollX;
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
