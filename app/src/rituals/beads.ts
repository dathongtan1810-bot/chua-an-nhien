/**
 * Niệm chuỗi 108 hạt: vuốt lên (hoặc bấm "Lần hạt") để lần từng hạt trên chuỗi tràng hạt.
 */
import type Phaser from 'phaser';
import { audio } from '../audio/engine';
import { vibrate } from '../audio/haptics';
import { bakeCanvas, makeGlow, makeSparkle, mixColor, rgba, softDot } from '../art/sprites';
import { getLang, t } from '../core/i18n';
import { h } from '../ui/dom';
import { advanceBead, BEADS_PER_ROUND, type BeadState } from './pure-a';
import type { Ritual, RitualFactory } from './types';

export { advanceBead } from './pure-a';

const ADD = 1; // Phaser.BlendModes.ADD
const SPACING = 44;
const HALF = 7; // beads drawn: -HALF..HALF (13 fully visible + 2 fading)
const CX = 392;
const CY = 500;
const BOW = 2.6; // parabola bend in px per index^2
const SWIPE_PX = 46;

const L: Record<string, Record<string, string>> = {
  vi: { button: 'Lần hạt' },
  en: { button: 'Next bead' },
};
const tr = (k: string): string => (L[getLang()] ?? L.vi)[k] ?? L.vi[k];

const BEAD_RES = 2.2;

/**
 * Same look as sprites.makeBead('nau') but baked at 2.2× resolution: the rosary is shown
 * large and the 28 px texture would look blurry when upscaled.
 */
function makeBigBead(scene: Phaser.Scene): string {
  const [hi, mid, lo] = [0xd59a5e, 0x8a5130, 0x3c2012];
  return bakeCanvas(scene, 'rit-bead-nau-lg', 28 * BEAD_RES, 28 * BEAD_RES, (ctx) => {
    ctx.scale(BEAD_RES, BEAD_RES);
    const g = ctx.createRadialGradient(10, 9, 1, 14, 14, 13);
    g.addColorStop(0, rgba(hi));
    g.addColorStop(0.55, rgba(mid));
    g.addColorStop(1, rgba(lo));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(14, 14, 12.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(14, 14, 12.5, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = rgba(lo, 0.25);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(14, 14 + (i - 2) * 4.5, 14, 3 + i * 0.4, 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = rgba(lo, 0.6);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(14, 14, 12.3, 0, Math.PI * 2);
    ctx.stroke();
    softDot(ctx, 9.5, 8.5, 5, 0xffffff, 0.55);
    softDot(ctx, 18, 21, 6, mixColor(hi, 0xffcc88, 0.5), 0.18);
  });
}

/** Position on the vertical arc for a (fractional) bead slot s. */
function slot(s: number): { x: number; y: number; scale: number; alpha: number } {
  const a = Math.abs(s);
  return {
    x: CX + BOW * s * s,
    y: CY + s * SPACING - Math.sign(s) * 0.6 * s * s,
    scale: 2.1 - 0.09 * a,
    alpha: a <= HALF - 1 ? 1 - a * 0.06 : Math.max(0, (HALF - a) * 0.6),
  };
}

export const beadsRitual: RitualFactory = (host) => {
  const { scene, layers, reducedMotion } = host;
  const fx = layers.fx;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    fx.add(o);
    objs.push(o);
    return o;
  };
  const tweens: Phaser.Tweens.Tween[] = [];

  const beadKey = makeBigBead(scene);
  const glowKey = makeGlow(scene);
  const sparkKey = makeSparkle(scene);

  // soft backdrop so the strand reads over any area art
  const back = add(scene.add.image(CX, CY, glowKey));
  back.setScale(4.2, 8.5).setTint(0x1a0e06).setAlpha(0.9);

  // static string along the arc
  const str = add(scene.add.graphics());
  str.lineStyle(2, 0xb8864a, 0.75);
  str.beginPath();
  for (let s = -HALF - 0.5; s <= HALF + 0.5; s += 0.25) {
    const p = slot(s);
    if (s === -HALF - 0.5) str.moveTo(p.x, p.y);
    else str.lineTo(p.x, p.y);
  }
  str.strokePath();

  // focus marker (finger position)
  const focus = add(scene.add.image(slot(0).x, slot(0).y, glowKey));
  focus.setBlendMode(ADD).setScale(0.9).setAlpha(0.45);

  // warm halo behind each bead keeps dark wood readable over dark interiors
  const halos: Phaser.GameObjects.Image[] = [];
  for (let i = -HALF; i <= HALF; i++) halos.push(add(scene.add.image(0, 0, glowKey).setBlendMode(ADD)));
  const beads: Phaser.GameObjects.Image[] = [];
  for (let i = -HALF; i <= HALF; i++) beads.push(add(scene.add.image(0, 0, beadKey)));

  let offset = 0;
  const layout = (): void => {
    for (let k = 0; k < beads.length; k++) {
      const s = k - HALF - offset;
      const p = slot(s);
      beads[k].setPosition(p.x, p.y).setScale(p.scale / BEAD_RES).setAlpha(p.alpha);
      halos[k].setPosition(p.x, p.y).setScale(p.scale * 0.36).setAlpha(p.alpha * 0.4);
    }
  };
  layout();

  let state: BeadState = { n: 0, round: 1 };
  let sinceReport = 0;
  let slide: Phaser.Tweens.Tween | null = null;

  // ---------------------------------------------------------------- HTML
  const hint = h('div', { class: 'ritual-hint' }, t('beads.hint'));
  const counter = h('div', {
    class: 'ritual-hint',
    'aria-live': 'polite',
    style: { top: 'calc(16% + 56px + var(--safe-top, 0px))', fontSize: '1.25em', fontWeight: '700', color: 'var(--gold-2)' },
  });
  const setCounter = (n: number, r: number): void => {
    counter.textContent = t('beads.count', { n, r });
  };
  setCounter(0, 1);
  const nextBtn = h(
    'button',
    {
      class: 'btn primary',
      type: 'button',
      style: { fontSize: '1.15em', padding: '14px 28px' },
      onclick: () => advance(),
    },
    tr('button'),
  );
  const close = h('button', { class: 'btn', type: 'button', onclick: () => host.exit() }, t('common.done'));
  nextBtn.style.pointerEvents = 'auto';
  close.style.pointerEvents = 'auto';
  const bottom = h('div', { class: 'ritual-bottom' }, nextBtn, close);
  host.panel.append(hint, counter, bottom);

  // ---------------------------------------------------------------- logic
  const burst = (): void => {
    const g = add(scene.add.image(slot(0).x, slot(0).y, glowKey));
    g.setBlendMode(ADD).setScale(0.6).setAlpha(1);
    tweens.push(
      scene.tweens.add({
        targets: g,
        scale: reducedMotion ? 2.2 : 5,
        alpha: 0,
        duration: 1400,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      }),
    );
    if (reducedMotion) return;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const sp = add(scene.add.image(slot(0).x, slot(0).y, sparkKey));
      sp.setBlendMode(ADD).setScale(0.6 + Math.random() * 0.6);
      tweens.push(
        scene.tweens.add({
          targets: sp,
          x: sp.x + Math.cos(a) * (90 + Math.random() * 60),
          y: sp.y + Math.sin(a) * (90 + Math.random() * 60),
          alpha: 0,
          duration: 1200,
          ease: 'Cubic.easeOut',
          onComplete: () => sp.destroy(),
        }),
      );
    }
  };

  const advance = (): void => {
    audio.unlock();
    if (slide) {
      slide.complete();
      slide = null;
    }
    const prevRound = state.round;
    const r = advanceBead(state);
    state = { n: r.n, round: r.round };
    sinceReport += 1;
    if (sinceReport >= 10) {
      sinceReport = 0;
      host.complete('beads', 10);
    }
    if (r.completedRound) {
      setCounter(BEADS_PER_ROUND, prevRound);
      audio.beadRound();
      vibrate([60, 60, 120]);
      burst();
      hint.textContent = t('beads.round');
      host.complete('beadRound', 1, { round: prevRound }, 'beads');
    } else {
      setCounter(r.n, r.round);
      audio.bead();
      vibrate(8);
      if (r.n === 1 && prevRound > 1) hint.textContent = t('beads.hint');
    }
    // slide the strand up by one bead
    if (reducedMotion) {
      offset = 0;
      layout();
      return;
    }
    const st = { v: 0 };
    slide = scene.tweens.add({
      targets: st,
      v: 1,
      duration: 260,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        offset = st.v;
        layout();
      },
      onComplete: () => {
        offset = 0;
        layout();
        slide = null;
      },
    });
  };

  // ---------------------------------------------------------------- input (swipe up)
  let downY: number | null = null;
  const onDown = (p: Phaser.Input.Pointer): void => {
    downY = p.y;
  };
  const onMove = (p: Phaser.Input.Pointer): void => {
    if (downY === null || !p.isDown) return;
    if (downY - p.y >= SWIPE_PX) {
      downY = p.y;
      advance();
    }
  };
  const onUp = (): void => {
    downY = null;
  };
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('pointerupoutside', onUp);

  const ritual: Ritual = {
    destroy() {
      if (sinceReport > 0) host.complete('beads', sinceReport);
      scene.input.off('pointerdown', onDown);
      scene.input.off('pointermove', onMove);
      scene.input.off('pointerup', onUp);
      scene.input.off('pointerupoutside', onUp);
      if (slide) slide.remove();
      for (const tw of tweens) tw.remove();
      for (const o of objs) o.destroy();
      hint.remove();
      counter.remove();
      bottom.remove();
    },
  };
  return ritual;
};
