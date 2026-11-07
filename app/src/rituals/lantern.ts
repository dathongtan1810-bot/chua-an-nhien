/**
 * Thả đèn hoa đăng — area 'bo-song'. HTML card to write a wish (≤ 120 chars) and pick a color,
 * then the lantern glides from the steps onto the water and joins the shared river.
 *
 * Online: net.releaseLantern() sends it; the server echo ('lantern_released') makes the scene add it
 * to the river. Offline: we add it to the river ourselves (id 'local-…').
 * After a drop we also set `(scene as any).lastLanternDrop = {x, y, at}` (world coords) so the scene
 * may pass it as `{fromX, fromY}` when the server echo of my lantern arrives within a few seconds.
 *
 * Also exports openLanternDetail() — the sheet shown when tapping a lantern on the river.
 */
import type Phaser from 'phaser';
import { makeLantern, makeRipple, LANTERN_COLORS as LANTERN_RGB } from '../art/sprites';
import { audio } from '../audio/engine';
import { vibrate } from '../audio/haptics';
import { getLang, t, tOr } from '../core/i18n';
import { store } from '../core/store';
import { getLoiNguyenMau } from '../data/content';
import { todayInfo } from '../core/today';
import { checkText } from '../logic/filter';
import { LANTERN_COLORS, LANTERN_MAX_LEN, type LanternPayload } from '../net/protocol';
import { net } from '../net/service';
import { h, openSheet, toast } from '../ui/dom';
import { charCount, clampChars } from './pure-b';
import { myLanternStyle, type RiverLanterns } from './river';
import type { Ritual, RitualFactory, RitualHost } from './types';

const L = {
  vi: {
    title: 'Thả đèn hoa đăng',
    close: 'Đóng',
    share: 'Chia sẻ',
    released: 'Đèn của bạn đã xuôi dòng. Nguyện điều lành đến với bạn.',
    hong: 'Hồng',
    vang: 'Vàng',
    trang: 'Trắng',
    xanh: 'Xanh',
    tim: 'Tím',
    by: '— {n}',
    reason: 'Lý do báo cáo',
    rBad: 'Nội dung xấu',
    rSpam: 'Spam',
    rOther: 'Khác',
    blockAsk: 'Chặn người này? Bạn sẽ không thấy đèn và hương của họ nữa.',
    cancel: 'Hủy',
    liked: 'Đã tùy hỷ',
  },
  en: {
    title: 'Release a flower lantern',
    close: 'Close',
    share: 'Share',
    released: 'Your lantern is drifting away. May good things come to you.',
    hong: 'Pink',
    vang: 'Yellow',
    trang: 'White',
    xanh: 'Teal',
    tim: 'Purple',
    by: '— {n}',
    reason: 'Reason',
    rBad: 'Offensive',
    rSpam: 'Spam',
    rOther: 'Other',
    blockAsk: "Block this person? You won't see their lanterns or incense anymore.",
    cancel: 'Cancel',
    liked: 'Rejoiced',
  },
};
type LKey = keyof typeof L.vi;
const loc = (k: LKey, vars: Record<string, string | number> = {}): string => {
  let s = (getLang() === 'en' ? L.en : L.vi)[k];
  for (const [kk, v] of Object.entries(vars)) s = s.split(`{${kk}}`).join(String(v));
  return s;
};

function swatchCss(color: string): string {
  const n = LANTERN_RGB[color];
  return n === undefined ? color : '#' + n.toString(16).padStart(6, '0');
}

function randomTemplate(): string {
  try {
    const season = todayInfo().season;
    // trong mùa (Tết, Vu Lan…): 2/3 gợi ý lấy từ lời nguyện của mùa
    const list = season?.loiNguyen.length && Math.random() < 0.67 ? season.loiNguyen : getLoiNguyenMau();
    if (!list.length) return '';
    return list[Math.floor(Math.random() * list.length)].noiDung;
  } catch {
    return '';
  }
}

function reasonText(reason: string, retryAfterMs?: number): string {
  if (reason === 'rate') return t('lantern.tooFast', { s: Math.max(1, Math.ceil((retryAfterMs ?? 1000) / 1000)) });
  return t('lantern.rejected');
}

export const lanternRitual: RitualFactory = (host: RitualHost): Ritual => {
  const scene = host.scene;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  let exitTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let color: string = LANTERN_COLORS[0];
  let busy = false;

  const root = h('div', {
    class: 'ritual-lantern',
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

  // ---------------------------------------------------------------- form
  const ta = h('textarea', {
    class: 'textarea',
    maxlength: String(LANTERN_MAX_LEN),
    rows: '3',
    placeholder: randomTemplate() || t('lantern.write'),
    'aria-label': t('lantern.write'),
    style: { width: '100%', boxSizing: 'border-box', fontSize: '18px', minHeight: '96px', resize: 'none' },
  });
  const counter = h('span', { 'aria-live': 'polite', style: { fontSize: '14px', opacity: '0.75' } }, `0/${LANTERN_MAX_LEN}`);
  const err = h('p', { role: 'alert', style: { color: '#b3261e', fontSize: '15px', margin: '6px 0 0', minHeight: '1em' } });
  const updateCount = () => {
    const n = charCount(ta.value);
    if (n > LANTERN_MAX_LEN) ta.value = clampChars(ta.value, LANTERN_MAX_LEN);
    counter.textContent = `${Math.min(n, LANTERN_MAX_LEN)}/${LANTERN_MAX_LEN}`;
    err.textContent = '';
  };
  ta.addEventListener('input', updateCount);

  const suggest = h(
    'button',
    {
      class: 'chip',
      style: { minHeight: '44px', fontSize: '16px' },
      onclick: () => {
        audio.uiTap();
        const tpl = randomTemplate();
        if (tpl) {
          ta.value = clampChars(tpl, LANTERN_MAX_LEN);
          updateCount();
        }
      },
    },
    '✨ ' + t('lantern.suggest'),
  );

  const colorChips: HTMLButtonElement[] = LANTERN_COLORS.map((c) =>
    h(
      'button',
      {
        class: 'chip' + (c === color ? ' active' : ''),
        'aria-pressed': c === color ? 'true' : 'false',
        'data-color': c,
        style: { minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '15px' },
        onclick: () => {
          audio.uiTap();
          color = c;
          colorChips.forEach((b) => {
            const on = b.dataset.color === c;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
        },
      },
      h('span', {
        'aria-hidden': 'true',
        style: {
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: swatchCss(c),
          border: '2px solid rgba(0,0,0,0.25)',
          boxShadow: `0 0 8px ${swatchCss(c)}`,
        },
      }),
      loc(c as LKey),
    ),
  );

  const releaseBtn = h(
    'button',
    { class: 'btn primary', style: { minHeight: '52px', width: '100%', fontSize: '19px', marginTop: '12px' }, onclick: () => release() },
    '🪷 ' + t('lantern.release'),
  );

  const form = h(
    'div',
    {
      class: 'card',
      style: { margin: 'auto 12px 16px', padding: '16px', pointerEvents: 'auto', maxHeight: 'calc(100% - 90px)', overflowY: 'auto' },
    },
    h('h2', { style: { fontSize: '21px', margin: '0 0 10px' } }, loc('title')),
    ta,
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' } }, suggest, counter),
    err,
    h('p', { style: { margin: '8px 0 6px', fontSize: '16px' } }, t('lantern.color')),
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } }, ...colorChips),
    releaseBtn,
  );
  root.append(form);

  // ---------------------------------------------------------------- release
  function release(): void {
    if (busy || destroyed) return;
    const text = ta.value.trim();
    const check = checkText(text);
    if (!check.ok) {
      err.textContent = t('lantern.rejected');
      return;
    }
    const res = net.releaseLantern(text, color);
    if (!res.ok) {
      err.textContent = reasonText(res.reason, res.retryAfterMs);
      return;
    }
    busy = true;
    audio.uiTap();
    form.style.display = 'none';
    host.complete('lantern', 1, { text, color }, 'lantern');
    animateDrop(text, color);
  }

  function animateDrop(text: string, col: string): void {
    const cam = scene.cameras.main;
    const steps = host.hotspots.steps ?? host.hotspots.river ?? { x: cam.scrollX + 270, y: 640, r: 40 };
    const river = host.hotspots.river;
    const targetY = river ? river.y : steps.y + 140;
    const targetX = Math.max(cam.scrollX + 60, Math.min(cam.scrollX + 480, steps.x + 30));
    const style = myLanternStyle();
    const img = scene.add.image(steps.x, steps.y, makeLantern(scene, col, style)).setOrigin(0.5, 0.8).setScale(1.2).setAlpha(0);
    host.layers.main.add(img);
    objs.push(img);
    const dur = host.reducedMotion ? 500 : 1400;
    tweens.push(
      scene.tweens.add({
        targets: img,
        alpha: 1,
        x: targetX,
        y: targetY,
        scale: 0.9,
        duration: dur,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (destroyed) return;
          audio.splash(0.4);
          vibrate(20);
          const rip = scene.add.image(targetX, targetY, makeRipple(scene)).setScale(0.3).setAlpha(0.8);
          host.layers.main.add(rip);
          objs.push(rip);
          tweens.push(scene.tweens.add({ targets: rip, scale: 1.3, alpha: 0, duration: 1100, ease: 'Sine.easeOut' }));
          const sceneExt = scene as unknown as SceneExt;
          sceneExt.lastLanternDrop = { x: targetX, y: targetY, at: Date.now() };
          const riverObj = sceneExt.river;
          if (!net.enabled && riverObj) {
            riverObj.add(
              { id: 'local-' + Date.now(), text, color: col, nickname: store.state.nickname, at: new Date().toISOString(), likes: 0 },
              true,
              { fromX: targetX, fromY: targetY },
            );
          }
          // hand over to the river: fade out our copy
          tweens.push(scene.tweens.add({ targets: img, alpha: 0, duration: riverObj ? 250 : 2500, delay: riverObj ? 0 : 400 }));
          showDone(text, col);
        },
      }),
    );
  }

  function showDone(text: string, col: string): void {
    const done = h(
      'div',
      { class: 'card', style: { margin: 'auto 16px 24px', padding: '16px', pointerEvents: 'auto', textAlign: 'center' } },
      h('p', { style: { fontSize: '18px', margin: '0 0 12px', lineHeight: '1.5' } }, loc('released')),
      h(
        'div',
        { style: { display: 'flex', gap: '10px', justifyContent: 'center' } },
        h(
          'button',
          {
            class: 'btn',
            style: { minHeight: '48px', minWidth: '110px', fontSize: '17px' },
            onclick: () => {
              audio.uiTap();
              if (exitTimer) {
                clearTimeout(exitTimer);
                exitTimer = setTimeout(() => host.exit(), 12000);
              }
              window.dispatchEvent(new CustomEvent('can:share', { detail: { kind: 'lantern', text, color: col } }));
            },
          },
          loc('share'),
        ),
        h(
          'button',
          { class: 'btn primary', style: { minHeight: '48px', minWidth: '110px', fontSize: '17px' }, onclick: () => host.exit() },
          loc('close'),
        ),
      ),
    );
    root.append(done);
    exitTimer = setTimeout(() => host.exit(), 6000);
  }

  return {
    destroy(): void {
      destroyed = true;
      if (exitTimer) clearTimeout(exitTimer);
      tweens.forEach((tw) => tw.remove());
      objs.forEach((o) => o.destroy());
      root.remove();
      closeBtn.remove();
    },
  };
};

// ------------------------------------------------------------------ detail sheet

const likedIds = new Set<string>();

function heartBurst(anchor: HTMLElement): void {
  if (store.state.settings.reducedMotion) return;
  const rect = anchor.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    const el = h(
      'span',
      {
        'aria-hidden': 'true',
        style: {
          position: 'fixed',
          left: `${rect.left + rect.width / 2}px`,
          top: `${rect.top + rect.height / 2}px`,
          color: '#e5577a',
          fontSize: '18px',
          pointerEvents: 'none',
          zIndex: '1000',
        },
      },
      '♥',
    );
    document.body.append(el);
    const a = -Math.PI / 2 + (i - 2.5) * 0.35;
    const dx = Math.cos(a) * 50;
    const dy = Math.sin(a) * 60;
    try {
      const anim = el.animate(
        [
          { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1)`, opacity: 0 },
        ],
        { duration: 800, easing: 'ease-out' },
      );
      anim.onfinish = () => el.remove();
    } catch {
      el.remove();
    }
    setTimeout(() => el.remove(), 1000);
  }
}

export function openLanternDetail(l: LanternPayload, mine: boolean): void {
  audio.uiTap();
  const sheet = openSheet(mine ? t('lantern.mine') : l.nickname || t('lantern.like'), { className: 'lantern-detail' });
  const body = sheet.body;
  const likes = h('span', { 'aria-live': 'polite' }, `♥ ${l.likes}`);
  body.append(
    h(
      'blockquote',
      {
        style: {
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: '20px',
          lineHeight: '1.6',
          margin: '4px 0 8px',
          padding: '12px 14px',
          borderLeft: `4px solid ${swatchCss(String(l.color))}`,
          whiteSpace: 'pre-line',
          wordBreak: 'break-word',
        },
      },
      l.text,
    ),
    h(
      'p',
      { style: { display: 'flex', justifyContent: 'space-between', fontSize: '16px', opacity: '0.85', margin: '0 0 12px' } },
      h('span', {}, loc('by', { n: l.nickname || '…' })),
      likes,
    ),
  );
  const row = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px' } });
  body.append(row);
  const btn = (label: string, cls: string, onclick: (e: Event) => void) =>
    h('button', { class: cls, style: { minHeight: '48px', minWidth: '96px', fontSize: '17px' }, onclick }, label);

  if (mine) {
    body.insertBefore(h('p', { class: 'chip active', style: { display: 'inline-block', margin: '0 0 10px' } }, t('lantern.mine')), body.firstChild);
    row.append(
      btn(loc('share'), 'btn primary', () => {
        window.dispatchEvent(new CustomEvent('can:share', { detail: { kind: 'lantern', text: l.text, color: l.color } }));
      }),
    );
    return;
  }

  const already = likedIds.has(l.id);
  const likeBtn = btn(already ? '♥ ' + loc('liked') : '♥ ' + t('lantern.like'), 'btn primary', () => {
    if (likedIds.has(l.id)) return;
    likedIds.add(l.id);
    const before = l.likes;
    net.likeLantern(l.id);
    if (l.likes === before) l.likes += 1; // not in net map (offline / local)
    likes.textContent = `♥ ${l.likes}`;
    likeBtn.disabled = true;
    likeBtn.textContent = '♥ ' + loc('liked');
    vibrate(15);
    audio.reward();
    heartBurst(likeBtn);
  });
  likeBtn.disabled = already;

  const extra = h('div', { style: { marginTop: '12px' } });
  const reportBtn = btn(t('lantern.report'), 'btn', () => {
    extra.innerHTML = '';
    // Lý do báo cáo: chữ của phiên nội dung (content/giao-dien.json), dự phòng bằng chữ của app
    const reasons: [string, string, string][] = [
      ['bao-cao.ly-do.xuc-pham', loc('rBad'), 'offensive'],
      ['bao-cao.ly-do.quang-cao', loc('rSpam'), 'spam'],
      ['bao-cao.ly-do.thong-tin-ca-nhan', 'Có thông tin cá nhân', 'personal_info'],
      ['bao-cao.ly-do.khong-phu-hop', 'Nội dung không phù hợp', 'inappropriate'],
      ['bao-cao.ly-do.khac', loc('rOther'), 'other'],
    ];
    extra.append(
      h('p', { style: { margin: '0 0 8px', fontSize: '16px' } }, tOr('bao-cao.chon-ly-do', loc('reason'))),
      h(
        'div',
        { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
        ...reasons.map(([key, fallback, code]) =>
          h(
            'button',
            {
              class: 'chip',
              style: { minHeight: '44px', fontSize: '16px' },
              onclick: () => {
                net.reportLantern(l.id, code);
                const river = findRiver();
                river?.remove(l.id);
                toast(t('lantern.reported'));
                sheet.close();
              },
            },
            tOr(key, fallback),
          ),
        ),
      ),
    );
  });
  row.append(likeBtn, reportBtn);

  if (l.userId) {
    const userId = l.userId;
    row.append(
      btn(t('lantern.block'), 'btn', () => {
        extra.innerHTML = '';
        extra.append(
          h('p', { style: { margin: '0 0 8px', fontSize: '16px' } }, loc('blockAsk')),
          h(
            'div',
            { style: { display: 'flex', gap: '8px' } },
            btn(t('lantern.block'), 'btn primary', () => {
              net.blockUser(userId);
              store.dispatch({ type: 'block', userId });
              toast(t('lantern.blocked'));
              sheet.close();
            }),
            btn(loc('cancel'), 'btn', () => (extra.innerHTML = '')),
          ),
        );
      }),
    );
  }
  body.append(extra);
}

/** Trường AreaScene gắn thêm mà nghi thức cần đọc/ghi. */
interface SceneExt {
  river?: RiverLanterns;
  lastLanternDrop?: { x: number; y: number; at: number };
}

/** The active scene's river, if any (report hides immediately even when offline). */
function findRiver(): RiverLanterns | undefined {
  try {
    const w = window as unknown as { __game?: Phaser.Game; game?: Phaser.Game };
    const game = w.__game ?? w.game;
    const scenes: Phaser.Scene[] = game?.scene?.getScenes?.(true) ?? [];
    for (const s of scenes) {
      const r = (s as unknown as SceneExt).river;
      if (r) return r;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
