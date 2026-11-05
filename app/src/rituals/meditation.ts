/**
 * Ngồi thiền (Thiền đường): chọn thời gian, rồi theo vòng thở 4-4-6 trong không gian tối, tĩnh lặng.
 */
import type Phaser from 'phaser';
import { audio } from '../audio/engine';
import { makeGlow } from '../art/sprites';
import { GAME_H, GAME_W } from '../art/types';
import { getLang, t } from '../core/i18n';
import { h } from '../ui/dom';
import { breathPhase, formatMmSs, wholeMinutes } from './pure-a';
import type { Ritual, RitualFactory } from './types';

export { breathPhase } from './pure-a';

const ADD = 1; // Phaser.BlendModes.ADD
const DURATIONS = [1, 3, 5, 10];
const CX = GAME_W / 2;
const CY = GAME_H * 0.46;
const RADIUS = 150;

const L: Record<string, Record<string, string>> = {
  vi: { start: 'Bắt đầu' },
  en: { start: 'Begin' },
};
const tr = (k: string): string => (L[getLang()] ?? L.vi)[k] ?? L.vi[k];

interface WakeSentinel {
  release(): Promise<void>;
}

export const meditationRitual: RitualFactory = (host) => {
  const { scene, layers, reducedMotion } = host;
  const fx = layers.fx;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    fx.add(o);
    objs.push(o);
    return o;
  };
  const tweens: Phaser.Tweens.Tween[] = [];

  let minutes = 5;
  let running = false;
  let finished = false;
  let elapsed = 0;
  let durationMs = 0;
  let lastPhase = '';
  let wake: WakeSentinel | null = null;
  let keepAwakeOn = false;
  let destroyed = false;

  // ---------------------------------------------------------------- keep awake
  const keepAwake = (): void => {
    try {
      const wl = (navigator as any).wakeLock;
      if (wl?.request) {
        Promise.resolve(wl.request('screen'))
          .then((s: WakeSentinel) => {
            if (destroyed) s.release().catch(() => undefined);
            else wake = s;
          })
          .catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
    try {
      const ka = (window as any).Capacitor?.Plugins?.KeepAwake;
      if (ka?.keepAwake) {
        Promise.resolve(ka.keepAwake()).catch(() => undefined);
        keepAwakeOn = true;
      }
    } catch {
      /* ignore */
    }
  };
  const allowSleep = (): void => {
    try {
      wake?.release().catch(() => undefined);
    } catch {
      /* ignore */
    }
    wake = null;
    if (keepAwakeOn) {
      keepAwakeOn = false;
      try {
        const ka = (window as any).Capacitor?.Plugins?.KeepAwake;
        if (ka?.allowSleep) Promise.resolve(ka.allowSleep()).catch(() => undefined);
      } catch {
        /* ignore */
      }
    }
  };

  // ---------------------------------------------------------------- Phaser visuals (created on start)
  let overlay: Phaser.GameObjects.Rectangle | null = null;
  let glow: Phaser.GameObjects.Image | null = null;
  let ring: Phaser.GameObjects.Graphics | null = null;
  /** Fade level of the breathing circle (tweened). */
  const vis = { a: 0 };

  const buildScene = (): void => {
    overlay = add(scene.add.rectangle(CX, GAME_H / 2, GAME_W + 4, GAME_H + 4, 0x07050a, 1));
    overlay.setAlpha(0);
    tweens.push(scene.tweens.add({ targets: overlay, alpha: 0.85, duration: 1600, ease: 'Sine.easeInOut' }));

    glow = add(scene.add.image(CX, CY, makeGlow(scene)));
    glow.setBlendMode(ADD).setTint(0xffd9a0).setAlpha(0);
    ring = add(scene.add.graphics({ x: CX, y: CY }));
    ring.lineStyle(3, 0xf2dcb0, 0.55);
    ring.strokeCircle(0, 0, RADIUS);
    ring.lineStyle(10, 0xf2cd6b, 0.08);
    ring.strokeCircle(0, 0, RADIUS + 6);
    ring.setAlpha(0);
    tweens.push(scene.tweens.add({ targets: vis, a: 1, duration: 1800, delay: 400 }));
  };

  // ---------------------------------------------------------------- HTML
  const wrap = h('div', { style: { position: 'absolute', inset: '0' } });
  host.panel.append(wrap);
  const clearWrap = (): void => {
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  };
  const button = (label: string, cls: string, onClick: () => void): HTMLButtonElement => {
    const b = h('button', { class: cls, type: 'button', onclick: onClick }, label);
    b.style.pointerEvents = 'auto';
    return b;
  };

  let caption: HTMLElement | null = null;
  let remain: HTMLElement | null = null;

  const showChooser = (): void => {
    clearWrap();
    const chips = DURATIONS.map((n) => {
      const c = button(t('meditate.min', { n }), n === minutes ? 'chip active' : 'chip', () => {
        minutes = n;
        for (const [i, el] of chips.entries()) el.className = DURATIONS[i] === minutes ? 'chip active' : 'chip';
        audio.uiTap();
      });
      c.setAttribute('aria-pressed', String(n === minutes));
      c.style.fontSize = '1.1em';
      c.style.minWidth = '76px';
      return c;
    });
    const box = h(
      'div',
      {
        class: 'ritual-hint',
        style: { top: '34%', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', padding: '18px 20px' },
      },
      h('div', { style: { fontSize: '1.2em', fontWeight: '700', color: 'var(--gold-2)' } }, t('meditate.choose')),
      h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' } }, ...chips),
    );
    const bottom = h(
      'div',
      { class: 'ritual-bottom' },
      button(tr('start'), 'btn primary', start),
      button(t('common.close'), 'btn', () => host.exit()),
    );
    wrap.append(box, bottom);
  };

  const start = (): void => {
    audio.unlock();
    durationMs = minutes * 60000;
    elapsed = 0;
    running = true;
    lastPhase = '';
    keepAwake();
    audio.bowl();
    buildScene();
    clearWrap();
    caption = h('div', {
      'aria-live': 'polite',
      style: {
        position: 'absolute', left: '0', right: '0', top: '68%', textAlign: 'center', fontSize: '1.5em',
        letterSpacing: '0.06em', color: '#f3e3c0', textShadow: '0 1px 6px #000', transition: 'opacity 0.8s',
      },
    });
    remain = h('div', {
      style: {
        position: 'absolute', left: '0', right: '0', bottom: 'calc(84px + var(--safe-bottom, 0px))', textAlign: 'center',
        fontSize: '0.95em', opacity: '0.6', fontVariantNumeric: 'tabular-nums',
      },
    });
    const bottom = h('div', { class: 'ritual-bottom' }, button(t('meditate.end'), 'btn', endEarly));
    wrap.append(caption, remain, bottom);
    remain.textContent = formatMmSs(durationMs);
  };

  const finish = (completedMs: number): void => {
    running = false;
    finished = true;
    allowSleep();
    audio.bowl();
    const n = wholeMinutes(completedMs);
    if (n >= 1) host.complete('meditation', n, { minutes: n }, 'meditation');
    clearWrap();
    tweens.push(scene.tweens.add({ targets: vis, a: 0.35, duration: 1500 }));
    const msg = h(
      'div',
      { class: 'ritual-hint', 'aria-live': 'polite', style: { top: '64%', fontSize: '1.15em', padding: '12px 20px' } },
      t('meditate.done', { n }),
    );
    wrap.append(msg, h('div', { class: 'ritual-bottom' }, button(t('common.done'), 'btn primary', () => host.exit())));
  };

  const endEarly = (): void => {
    if (!running) return;
    if (wholeMinutes(elapsed) >= 1) finish(elapsed);
    else host.exit();
  };

  showChooser();

  const ritual: Ritual = {
    update(_time: number, delta: number) {
      if (finished) {
        ring?.setAlpha(vis.a);
        glow?.setAlpha(vis.a * 0.6);
        return;
      }
      if (!running) return;
      // clamp big gaps (tab switch) so a frozen frame doesn't skip the session
      elapsed += Math.min(delta, 250);
      const b = breathPhase(elapsed);
      const s = reducedMotion ? 0.85 + (b.scale - 0.6) * 0.375 : b.scale;
      ring?.setScale(s).setAlpha(vis.a);
      // reduced motion: smaller size change, breathing is shown mostly by brightness
      glow?.setScale((s * RADIUS * 2.1) / 128).setAlpha(vis.a * (reducedMotion ? 0.3 + (b.scale - 0.6) * 1.6 : 0.85));
      if (b.phase !== lastPhase && caption) {
        lastPhase = b.phase;
        caption.textContent = t(`meditate.${b.phase}`);
      }
      if (remain) remain.textContent = formatMmSs(durationMs - elapsed);
      if (elapsed >= durationMs) finish(durationMs);
    },
    destroy() {
      destroyed = true;
      running = false;
      allowSleep();
      for (const tw of tweens) tw.remove();
      for (const o of objs) o.destroy();
      wrap.remove();
    },
  };
  return ritual;
};
