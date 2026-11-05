/**
 * Vái lạy: vòng tròn dẫn nhịp nở ra 2.5 s (giữ tay) rồi thu lại 2.5 s (thả tay). Ba lần vái.
 */
import type Phaser from 'phaser';
import { audio } from '../audio/engine';
import { vibrate } from '../audio/haptics';
import { bakeCanvas, makeGlow } from '../art/sprites';
import { GAME_H, GAME_W } from '../art/types';
import { t } from '../core/i18n';
import { h } from '../ui/dom';
import { judgeHold } from './pure-a';
import type { Ritual, RitualFactory } from './types';

export { judgeHold } from './pure-a';

const ADD = 1; // Phaser.BlendModes.ADD
const GROW_MS = 2500;
const SHRINK_MS = 2500;
const CYCLE_MS = GROW_MS + SHRINK_MS;
const LEAD_MS = 1200;
const BOWS = 3;
const CX = GAME_W / 2;
const CY = GAME_H * 0.5;
const RADIUS = 130;
const MIN_S = 0.45;

function makeVignette(scene: Phaser.Scene): string {
  return bakeCanvas(scene, 'rit-bow-vignette', 270, 480, (ctx, w, hh) => {
    ctx.save();
    ctx.translate(w / 2, hh / 2);
    ctx.scale(1, hh / w);
    const g = ctx.createRadialGradient(0, 0, w * 0.22, 0, 0, w * 0.75);
    g.addColorStop(0, 'rgba(255,190,110,0)');
    g.addColorStop(0.6, 'rgba(200,120,50,0.35)');
    g.addColorStop(1, 'rgba(90,40,10,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(-w, -w, w * 2, w * 2);
    ctx.restore();
  });
}

export const bowRitual: RitualFactory = (host) => {
  const { scene, layers, reducedMotion } = host;
  const fx = layers.fx;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    fx.add(o);
    objs.push(o);
    return o;
  };
  const tweens: Phaser.Tweens.Tween[] = [];
  let exitTimer: Phaser.Time.TimerEvent | null = null;

  const vignette = add(scene.add.image(GAME_W / 2, GAME_H / 2, makeVignette(scene)));
  vignette.setScale(GAME_W / 270 + 0.04, GAME_H / 480 + 0.04).setAlpha(0);

  const glow = add(scene.add.image(CX, CY, makeGlow(scene)));
  glow.setBlendMode(ADD).setAlpha(0.5);
  const ring = add(scene.add.graphics({ x: CX, y: CY }));
  const drawRing = (pressed: boolean): void => {
    ring.clear();
    ring.lineStyle(pressed ? 5 : 3, pressed ? 0xffe0a0 : 0xf2dcb0, pressed ? 0.95 : 0.7);
    ring.strokeCircle(0, 0, RADIUS);
    ring.lineStyle(12, 0xf2cd6b, pressed ? 0.22 : 0.1);
    ring.strokeCircle(0, 0, RADIUS + 7);
  };
  drawRing(false);
  // small fixed target circle (the size to start from)
  const core = add(scene.add.graphics({ x: CX, y: CY }));
  core.lineStyle(2, 0xf2dcb0, 0.3);
  core.strokeCircle(0, 0, RADIUS * MIN_S);

  // ---------------------------------------------------------------- HTML
  const hint = h('div', { class: 'ritual-hint' }, t('bow.hint'));
  const counter = h('div', {
    class: 'ritual-hint',
    'aria-live': 'polite',
    style: { top: 'auto', bottom: 'calc(84px + var(--safe-bottom, 0px))', fontSize: '1.2em', fontWeight: '700', color: 'var(--gold-2)' },
  });
  const close = h('button', { class: 'btn', type: 'button', onclick: () => host.exit() }, t('common.done'));
  close.style.pointerEvents = 'auto';
  const bottom = h('div', { class: 'ritual-bottom' }, close);
  host.panel.append(hint, counter, bottom);

  let done = 0;
  const setCounter = (): void => {
    counter.textContent = t('bow.n', { i: Math.min(BOWS, done + 1) });
  };
  setCounter();

  // ---------------------------------------------------------------- state
  let clock = 0;
  let holdStart: number | null = null;
  let finished = false;
  const usedCycles = new Set<number>();
  const growStartOf = (idx: number): number => LEAD_MS + idx * CYCLE_MS;
  const cycleAt = (ms: number): number => Math.floor((ms - LEAD_MS) / CYCLE_MS);

  const bowFeedback = (): void => {
    vibrate(25);
    audio.uiTap();
    const st = { a: 0 };
    const baseY = GAME_H / 2;
    tweens.push(
      scene.tweens.add({
        targets: st,
        a: 1,
        duration: 800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        hold: 200,
        onUpdate: () => {
          vignette.setAlpha(st.a * 0.55);
          if (!reducedMotion) vignette.y = baseY + st.a * 14;
        },
      }),
    );
  };

  const complete = (): void => {
    finished = true;
    hint.textContent = t('bow.done');
    counter.textContent = t('bow.n', { i: BOWS });
    host.complete('bow', 1, {}, 'bow');
    tweens.push(scene.tweens.add({ targets: [ring, glow, core], alpha: 0, duration: 1200 }));
    exitTimer = scene.time.delayedCall(1500, () => {
      exitTimer = null;
      host.exit();
    });
  };

  /** Try to count the current hold against the given cycles; returns true if a bow was counted. */
  const tryCount = (end: number, cycles: number[]): boolean => {
    if (holdStart === null || finished) return false;
    for (const c of cycles) {
      if (c < 0 || usedCycles.has(c)) continue;
      if (judgeHold(holdStart, end, growStartOf(c), GROW_MS)) {
        usedCycles.add(c);
        holdStart = null;
        done += 1;
        bowFeedback();
        if (done >= BOWS) complete();
        else setCounter();
        return true;
      }
    }
    return false;
  };

  // ---------------------------------------------------------------- input
  let pressed = false;
  const onDown = (): void => {
    if (finished) return;
    audio.unlock();
    pressed = true;
    holdStart = clock;
    drawRing(true);
  };
  const onUp = (): void => {
    if (!pressed) return;
    pressed = false;
    drawRing(false);
    const c = cycleAt(clock);
    tryCount(clock, [c, c - 1]);
    holdStart = null;
  };
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointerup', onUp);
  scene.input.on('pointerupoutside', onUp);

  const ritual: Ritual = {
    update(_time: number, delta: number) {
      if (finished) return;
      const prev = clock;
      clock += Math.min(delta, 100);
      // still holding when a cycle ends: count it, the user must press again for the next bow
      if (pressed && holdStart !== null && cycleAt(prev) !== cycleAt(clock)) tryCount(clock, [cycleAt(prev)]);
      let s = MIN_S;
      if (clock >= LEAD_MS) {
        const tc = (clock - LEAD_MS) % CYCLE_MS;
        const p = tc < GROW_MS ? tc / GROW_MS : 1 - (tc - GROW_MS) / SHRINK_MS;
        s = MIN_S + (1 - MIN_S) * (1 - Math.cos(Math.PI * p)) / 2;
      }
      ring.setScale(s);
      glow.setScale((s * RADIUS * 2.2) / 128).setAlpha(0.25 + 0.45 * s);
    },
    destroy() {
      finished = true;
      scene.input.off('pointerdown', onDown);
      scene.input.off('pointerup', onUp);
      scene.input.off('pointerupoutside', onUp);
      if (exitTimer) exitTimer.remove(false);
      for (const tw of tweens) tw.remove();
      for (const o of objs) o.destroy();
      hint.remove();
      counter.remove();
      bottom.remove();
    },
  };
  return ritual;
};
