/**
 * Xin xăm (fortune sticks) — area 'am-xam', hotspot 'sticks'.
 * Step 1: pick a topic (one draw per topic per day). Step 2: shake the bamboo cup (DeviceMotion or
 * hold/tap the button) until one stick falls. Step 3: a paper card with the stick's poem, meaning
 * and advice — always with the "for reflection only" disclaimer.
 */
import type Phaser from 'phaser';
import { audio } from '../audio/engine';
import { vibrate } from '../audio/haptics';
import { getLang, t } from '../core/i18n';
import { store } from '../core/store';
import { getQueXam, type QueXam } from '../data/content';
import { vnDateKey } from '../logic/dates';
import { TOPICS, pickFortune } from '../logic/fortune';
import { h } from '../ui/dom';
import { highPass, shakeDetector, type Vec3 } from './pure-b';
import type { Ritual, RitualFactory, RitualHost } from './types';

const L = {
  vi: { close: 'Đóng', share: 'Chia sẻ', stick: 'Quẻ số {n}', topic: 'Chủ đề: {t}', hold: 'Giữ nút để lắc', poem: 'Thơ' },
  en: { close: 'Close', share: 'Share', stick: 'Stick no. {n}', topic: 'Topic: {t}', hold: 'Hold the button to shake', poem: 'Poem' },
};
const loc = (k: keyof typeof L.vi, vars: Record<string, string | number> = {}): string => {
  let s = (getLang() === 'en' ? L.en : L.vi)[k];
  for (const [kk, v] of Object.entries(vars)) s = s.split(`{${kk}}`).join(String(v));
  return s;
};

const CUP_X = 270;
const CUP_Y = 560;
const FLOOR_Y = 800;

/** Draws a bamboo stick cup (ống xăm) with sticks poking out; returns parts for animation. */
function buildCup(scene: Phaser.Scene): { cup: Phaser.GameObjects.Container; sticks: Phaser.GameObjects.Graphics } {
  const cup = scene.add.container(CUP_X, CUP_Y);
  // shadow
  const shadow = scene.add.ellipse(0, 112, 150, 26, 0x000000, 0.25);
  // sticks (behind the cup front)
  const sticks = scene.add.graphics();
  const tops = [-34, -24, -14, -4, 6, 16, 26, 34];
  tops.forEach((x, i) => {
    const hgt = 70 + ((i * 37) % 30);
    sticks.fillStyle(0xd8b46c, 1);
    sticks.fillRoundedRect(x - 3, -60 - hgt, 7, hgt + 20, 2);
    sticks.fillStyle(0xb5332a, 1);
    sticks.fillRect(x - 3, -60 - hgt, 7, 12);
    sticks.lineStyle(1, 0x8a6a3a, 0.5);
    sticks.strokeRoundedRect(x - 3, -60 - hgt, 7, hgt + 20, 2);
  });
  // cup body
  const body = scene.add.graphics();
  body.fillStyle(0x7a4f2a, 1);
  body.fillRoundedRect(-56, -70, 112, 180, 14);
  body.fillStyle(0x93653a, 1);
  body.fillRoundedRect(-48, -70, 40, 180, 12);
  body.fillStyle(0x5e3a1e, 1);
  body.fillEllipse(0, -70, 112, 26);
  body.fillStyle(0x2c1a0e, 1);
  body.fillEllipse(0, -70, 96, 18);
  // bamboo nodes / bands
  body.lineStyle(4, 0x4e2f17, 0.9);
  body.lineBetween(-56, -30, 56, -30);
  body.lineBetween(-56, 70, 56, 70);
  body.fillStyle(0xc0392b, 0.95);
  body.fillRect(-56, 10, 112, 22);
  body.fillStyle(0xf3d27a, 1);
  body.fillCircle(0, 21, 8);
  cup.add([shadow, sticks, body]);
  return { cup, sticks };
}

export const fortuneRitual: RitualFactory = (host: RitualHost): Ritual => {
  const scene = host.scene;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const timers: Phaser.Time.TimerEvent[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  let destroyed = false;
  let step: 'topic' | 'shake' | 'drop' | 'card' = 'topic';
  let topic = '';
  let cup: Phaser.GameObjects.Container | null = null;
  const detector = shakeDetector(11);
  const hp = highPass(0.8);
  let holding = false;
  let burstUntil = 0;
  let lastRattle = 0;
  let shakeAmp = 0;
  let motionOn = false;
  let progressBar: HTMLElement | null = null;

  const root = h('div', {
    class: 'ritual-fortune',
    style: { position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', pointerEvents: 'none' },
  });
  host.panel.append(root);

  const closeBtn = h(
    'button',
    {
      class: 'btn ritual-close',
      'aria-label': loc('close'),
      style: { zIndex: '2' },
      onclick: () => host.exit(),
    },
    '✕ ' + loc('close'),
  );
  host.panel.append(closeBtn);

  // ---------------------------------------------------------------- step 1: topic
  function showTopics(): void {
    root.innerHTML = '';
    const used = store.state.daily.fortuneTopics ?? [];
    const lang = getLang() === 'en' ? 'en' : 'vi';
    let anyUsed = false;
    const chips = TOPICS.map((tp) => {
      const isUsed = used.includes(tp.id);
      if (isUsed) anyUsed = true;
      return h(
        'button',
        {
          class: 'chip',
          disabled: isUsed,
          'aria-disabled': isUsed ? 'true' : undefined,
          style: { minHeight: '48px', minWidth: '44px', fontSize: '18px', pointerEvents: 'auto', opacity: isUsed ? '0.45' : '1' },
          onclick: () => {
            if (isUsed) return;
            audio.uiTap();
            topic = tp.id;
            startShake();
          },
        },
        tp[lang],
      );
    });
    const card = h(
      'div',
      {
        class: 'card',
        style: { margin: 'auto 16px 24px', padding: '18px', pointerEvents: 'auto', textAlign: 'center' },
      },
      h('h2', { style: { fontSize: '22px', margin: '0 0 12px' } }, t('fortune.topic')),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' } }, ...chips),
      anyUsed ? h('p', { role: 'note', style: { margin: '12px 0 0', fontSize: '15px', opacity: '0.85' } }, t('fortune.used')) : null,
    );
    root.append(card);
  }

  // ---------------------------------------------------------------- step 2: shake
  function onMotion(e: DeviceMotionEvent): void {
    if (step !== 'shake') return;
    let a: Vec3 | null = null;
    if (e.acceleration && e.acceleration.x !== null) {
      a = { x: e.acceleration.x ?? 0, y: e.acceleration.y ?? 0, z: e.acceleration.z ?? 0 };
    } else if (e.accelerationIncludingGravity) {
      const g = e.accelerationIncludingGravity;
      a = hp({ x: g.x ?? 0, y: g.y ?? 0, z: g.z ?? 0 });
    }
    if (!a) return;
    const mag = Math.hypot(a.x, a.y, a.z);
    if (mag > 11) shakeAmp = Math.min(1, shakeAmp + 0.25);
    if (detector(a, performance.now())) dropStick();
  }

  function enableMotion(): void {
    if (motionOn || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
    motionOn = true;
    window.addEventListener('devicemotion', onMotion);
  }

  function requestMotion(): void {
    const DME = (window as any).DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      try {
        DME.requestPermission()
          .then((r: string) => {
            if (r === 'granted') enableMotion();
          })
          .catch(() => undefined);
      } catch {
        /* ignore */
      }
    } else {
      enableMotion();
    }
  }

  function startShake(): void {
    step = 'shake';
    root.innerHTML = '';
    const built = buildCup(scene);
    cup = built.cup;
    cup.setAlpha(0);
    host.layers.fx.add(cup);
    objs.push(cup);
    tweens.push(scene.tweens.add({ targets: cup, alpha: 1, duration: 400 }));

    // Android etc.: motion works without permission. iOS needs a gesture → in button handler.
    const DME = (window as any).DeviceMotionEvent;
    if (DME && typeof DME.requestPermission !== 'function') enableMotion();

    progressBar = h('div', {
      style: { height: '100%', width: '0%', background: '#e3b860', borderRadius: '4px', transition: 'width 0.1s linear' },
    });
    const btn = h(
      'button',
      {
        class: 'btn primary',
        style: { minHeight: '56px', minWidth: '200px', fontSize: '20px', pointerEvents: 'auto', touchAction: 'none', userSelect: 'none' },
        onpointerdown: (e: PointerEvent) => {
          e.preventDefault();
          requestMotion();
          holding = true;
          burstUntil = performance.now() + 350;
        },
        onpointerup: () => (holding = false),
        onpointerleave: () => (holding = false),
        onpointercancel: () => (holding = false),
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            burstUntil = performance.now() + 400;
          }
        },
      },
      t('fortune.shakeBtn'),
    );
    const lang = getLang() === 'en' ? 'en' : 'vi';
    const tp = TOPICS.find((x) => x.id === topic);
    root.append(
      h(
        'div',
        { style: { marginTop: 'auto', padding: '16px 16px 24px', textAlign: 'center', pointerEvents: 'none' } },
        h(
          'p',
          {
            style: {
              display: 'inline-block',
              fontSize: '17px',
              margin: '0 0 12px',
              padding: '8px 16px',
              borderRadius: '14px',
              background: 'rgba(30,20,14,0.6)',
              color: '#fff6e6',
              lineHeight: '1.45',
            },
          },
          loc('topic', { t: tp ? tp[lang] : topic }),
          h('br'),
          t('fortune.shake'),
        ),
        h(
          'div',
          { style: { height: '8px', background: 'rgba(255,255,255,0.18)', borderRadius: '4px', margin: '0 auto 14px', maxWidth: '260px' } },
          progressBar,
        ),
        btn,
      ),
    );
  }

  function updateShake(time: number, delta: number): void {
    if (!cup) return;
    const now = performance.now();
    const manual = holding || now < burstUntil;
    if (step === 'shake' && manual) {
      // synthetic strong samples while the button is held / tapped
      const v = Math.sin(now / 40) >= 0 ? 16 : -16;
      if (detector({ x: v, y: 0, z: 0 }, now)) {
        dropStick();
      }
      shakeAmp = Math.min(1, shakeAmp + delta / 150);
    } else if (step === 'shake') {
      detector({ x: 0, y: 0, z: 0 }, now);
    }
    shakeAmp = Math.max(0, shakeAmp - delta / 400);
    if (shakeAmp > 0.15 && now - lastRattle > 520) {
      lastRattle = now;
      audio.sticksShake();
    }
    const amp = host.reducedMotion ? 0.03 : 0.12;
    cup.rotation = Math.sin(time / 45) * amp * shakeAmp;
    cup.x = CUP_X + Math.sin(time / 33) * (host.reducedMotion ? 2 : 8) * shakeAmp;
    cup.y = CUP_Y + Math.abs(Math.cos(time / 40)) * (host.reducedMotion ? 1 : -6) * shakeAmp;
    if (progressBar) progressBar.style.width = `${Math.round(detector.progress() * 100)}%`;
  }

  // ---------------------------------------------------------------- drop
  function dropStick(): void {
    if (step !== 'shake' || destroyed) return;
    step = 'drop';
    holding = false;
    root.innerHTML = '';
    const que = pickFortune(getQueXam(), { deviceId: store.state.deviceId, topic, dateKey: vnDateKey() });

    const stick = scene.add.container(CUP_X + 10, CUP_Y - 120);
    const g = scene.add.graphics();
    g.fillStyle(0xdcb872, 1);
    g.fillRoundedRect(-4, -70, 9, 140, 3);
    g.fillStyle(0xb5332a, 1);
    g.fillRect(-4, -70, 9, 16);
    g.lineStyle(1, 0x8a6a3a, 0.6);
    g.strokeRoundedRect(-4, -70, 9, 140, 3);
    const num = scene.add
      .text(0, 10, String(que.id), { fontFamily: 'serif', fontSize: '13px', color: '#5a2a14' })
      .setOrigin(0.5)
      .setAngle(90);
    stick.add([g, num]);
    host.layers.fx.add(stick);
    objs.push(stick);
    if (cup) host.layers.fx.bringToTop(cup);
    // Put the stick in front once it's out of the cup.
    const slide = scene.tweens.add({
      targets: stick,
      y: CUP_Y - 200,
      duration: host.reducedMotion ? 200 : 450,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (destroyed) return;
        host.layers.fx.bringToTop(stick);
        tweens.push(
          scene.tweens.add({
            targets: stick,
            x: CUP_X + 120,
            y: FLOOR_Y,
            angle: 82,
            duration: host.reducedMotion ? 300 : 650,
            ease: 'Quad.easeIn',
            onComplete: () => {
              if (destroyed) return;
              audio.stickDrop();
              vibrate(40);
              if (!host.reducedMotion) {
                tweens.push(scene.tweens.add({ targets: stick, y: FLOOR_Y - 10, duration: 90, yoyo: true, ease: 'Sine.easeOut' }));
              }
              timers.push(scene.time.delayedCall(650, () => showCard(que)));
            },
          }),
        );
      },
    });
    tweens.push(slide);
  }

  // ---------------------------------------------------------------- card
  let completed = false;
  function showCard(que: QueXam): void {
    if (destroyed) return;
    step = 'card';
    if (!completed) {
      completed = true;
      host.complete('fortune', 1, { id: que.id, topic }, 'fortune');
      audio.reward();
    }
    const lang = getLang() === 'en' ? 'en' : 'vi';
    const tp = TOPICS.find((x) => x.id === topic);
    const meaning = que.loiGiaiTheoChuDe[topic] ?? que.loiGiai;
    const sec = (title: string, text: string) =>
      h(
        'section',
        { style: { marginTop: '14px' } },
        h('h3', { style: { fontSize: '17px', margin: '0 0 4px', color: '#8a3a1e' } }, title),
        h('p', { style: { margin: '0', fontSize: '17px', lineHeight: '1.55' } }, text),
      );
    const card = h(
      'article',
      {
        class: 'card fortune-card',
        role: 'dialog',
        'aria-label': que.tieuDe,
        style: {
          margin: '64px 14px 16px',
          padding: '20px 18px',
          pointerEvents: 'auto',
          overflowY: 'auto',
          maxHeight: 'calc(100% - 96px)',
          WebkitOverflowScrolling: 'touch',
        },
      },
      h('p', { style: { margin: '0', fontSize: '15px', opacity: '0.75', textAlign: 'center' } }, `${loc('stick', { n: que.id })} · ${tp ? tp[lang] : topic}`),
      h('h2', { style: { margin: '6px 0 12px', fontSize: '24px', textAlign: 'center', fontFamily: 'serif' } }, que.tieuDe),
      h(
        'p',
        {
          'aria-label': loc('poem'),
          style: {
            whiteSpace: 'pre-line',
            fontFamily: "'Noto Serif', Georgia, 'Times New Roman', serif",
            fontStyle: 'italic',
            fontSize: '18px',
            lineHeight: '1.7',
            textAlign: 'center',
            margin: '0',
          },
        },
        que.tho,
      ),
      sec(t('fortune.meaning'), meaning),
      sec(t('fortune.advice'), que.loiKhuyen),
      h(
        'p',
        {
          class: 'fortune-disclaimer',
          role: 'note',
          style: {
            margin: '16px 0 0',
            padding: '10px 12px',
            fontSize: '15px',
            lineHeight: '1.45',
            borderRadius: '8px',
            background: 'rgba(138,58,30,0.1)',
            border: '1px solid rgba(138,58,30,0.35)',
            fontWeight: '600',
          },
        },
        t('fortune.disclaimer'),
      ),
      h(
        'div',
        { style: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' } },
        h(
          'button',
          {
            class: 'btn',
            style: { minHeight: '48px', minWidth: '120px', fontSize: '17px' },
            onclick: () => {
              audio.uiTap();
              window.dispatchEvent(new CustomEvent('can:share', { detail: { kind: 'fortune', que, topic } }));
            },
          },
          loc('share'),
        ),
        h(
          'button',
          { class: 'btn primary', style: { minHeight: '48px', minWidth: '120px', fontSize: '17px' }, onclick: () => host.exit() },
          loc('close'),
        ),
      ),
    );
    root.innerHTML = '';
    root.append(card);
    if (cup) tweens.push(scene.tweens.add({ targets: cup, alpha: 0.25, duration: 400 }));
  }

  showTopics();

  return {
    update(time: number, delta: number): void {
      if (destroyed) return;
      if (step === 'shake' || step === 'drop') updateShake(time, delta);
    },
    destroy(): void {
      destroyed = true;
      if (motionOn) window.removeEventListener('devicemotion', onMotion);
      timers.forEach((tm) => tm.remove(false));
      tweens.forEach((tw) => tw.remove());
      objs.forEach((o) => o.destroy());
      root.remove();
      closeBtn.remove();
    },
  };
};
