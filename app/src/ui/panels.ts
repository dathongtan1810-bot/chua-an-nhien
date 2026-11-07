import { audio } from '../audio/engine';
import { setHapticsEnabled } from '../audio/haptics';
import { AREA_INFO, type AreaId } from '../core/areas';
import { game, requestGoTo } from '../core/bus';
import { getLang, setContentStrings, setLang, t, tOr } from '../core/i18n';
import { SHOP_ITEMS, type ShopCategory } from '../core/shop';
import { DAILY_QUESTS, SEASON_QUEST_REWARD, type Settings } from '../core/state';
import { store } from '../core/store';
import { todayInfo } from '../core/today';
import { contentSource, loadLangContent, uiStringsEn } from '../data/content';
import { currentStreak } from '../logic/streak';
import { randomNickname, randomNicknameEn } from '../logic/nickname';
import { topicLabel } from '../logic/fortune';
import { formatLunar, yearCanChi } from '../lunar/lunar';
import { net } from '../net/service';
import { clearJournal, listEntries, type JournalEntry } from '../storage/journal';
import { h, openSheet, toast } from './dom';
import { mapSvg } from './minimap';
import { markSeasonQuestDone, seasonQuestsToday } from '../core/seasonQuests';
import { applyReminders } from '../core/reminders';
import { openWishes } from './wishes';

export function openMap(): void {
  const s = openSheet(t('map.title'));
  const svg = mapSvg(store.state.area, net.areas, {
    large: true,
    family: net.room?.members.filter((m) => m.userId !== net.userId) ?? [],
    onPick: (a: AreaId) => {
      s.close();
      requestGoTo(a);
    },
  });
  svg.style.width = '100%';
  svg.style.maxHeight = '62vh';
  s.body.append(svg);
  const list = h('div', { class: 'row', style: { marginTop: '10px' } });
  for (const a of Object.keys(AREA_INFO) as AreaId[]) {
    list.append(
      h(
        'button',
        { class: 'chip' + (a === store.state.area ? ' active' : ''), onclick: () => (s.close(), requestGoTo(a)) },
        t(AREA_INFO[a].nameKey),
      ),
    );
  }
  s.body.append(list);
}

export function openToday(): void {
  const info = todayInfo();
  const st = store.state;
  const s = openSheet(t('today.title'));
  const lang = getLang();
  const [y, m, d] = info.dateKey.split('-');
  s.body.append(
    h(
      'section',
      {},
      h('div', { class: 'big-date' }, formatLunar(info.lunar, lang)),
      h('div', { class: 'muted' }, `${d}/${m}/${y} • ${lang === 'vi' ? 'Năm' : 'Year'} ${yearCanChi(info.lunar.year)}`),
    ),
    h(
      'section',
      {},
      h('div', { class: 'message' }, info.message),
      'speechSynthesis' in window
        ? h(
            'button',
            {
              class: 'btn',
              style: { marginTop: '8px' },
              'aria-label': lang === 'vi' ? 'Đọc to thông điệp' : 'Read the message aloud',
              onclick: () => {
                const u = new SpeechSynthesisUtterance(info.message);
                u.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
                u.rate = 0.9;
                speechSynthesis.cancel();
                speechSynthesis.speak(u);
              },
            },
            '🔊 ' + (lang === 'vi' ? 'Đọc to' : 'Read aloud'),
          )
        : null,
    ),
  );
  if (info.events.length) {
    const ev = h('section', {}, h('h3', {}, '🏮 ' + t('today.event')));
    for (const e of info.events) {
      ev.append(
        h('p', {}, h('strong', {}, e.ten), ' — ', e.moTa),
        h('p', { class: st.daily.eventDone ? 'quest done' : 'quest' }, '✦ ' + e.nhiemVu + (st.daily.eventDone ? ' ✓' : '')),
      );
      break;
    }
    s.body.append(ev);
  }
  const ul = h('ul', { class: 'list' });
  for (const q of DAILY_QUESTS) {
    const done = st.daily.dateKey === info.dateKey && st.daily.quests[q];
    ul.append(h('li', { class: done ? 'quest done' : 'quest' }, h('span', {}, (done ? '✅ ' : '◯ ') + t('quest.' + q)), h('span', { class: 'muted' }, '+3 🪷')));
  }
  s.body.append(h('section', {}, h('h3', {}, t('today.quests')), ul));
  const seasonal = seasonQuestsToday();
  if (seasonal) {
    const sul = h('ul', { class: 'list' });
    for (const q of seasonal.quests) {
      let right: HTMLElement;
      if (q.done) right = h('span', { class: 'chip active', style: { cursor: 'default' } }, '✓');
      else if (q.kind.ritual) right = h('span', { class: 'muted' }, t('season.inApp'));
      else
        right = h(
          'button',
          {
            class: 'chip',
            onclick: () => {
              const n = markSeasonQuestDone(q.key);
              if (n > 0) toast('🪷 ' + t('reward.plus', { n }));
              s.close();
              openToday();
            },
          },
          t('season.markDone'),
        );
      sul.append(
        h('li', { class: q.done ? 'quest done' : 'quest', style: { alignItems: 'flex-start' } }, h('div', {}, h('strong', {}, q.quest.ten), h('div', { class: 'muted' }, q.quest.moTa)), right),
      );
    }
    s.body.append(h('section', {}, h('h3', {}, '🌸 ' + t('season.quests', { name: seasonal.seasonName })), h('p', { class: 'muted' }, t('season.hint', { n: SEASON_QUEST_REWARD })), sul));
  }
  const streak = currentStreak(st.streak, info.dateKey);
  s.body.append(
    h(
      'section',
      {},
      h('div', { class: 'row between' }, h('strong', {}, '🔥 ' + t('today.streak', { n: streak })), h('span', {}, `🪷 ${st.hatSen}`)),
      h('div', { class: 'muted' }, t('today.streakHint')),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'btn', onclick: () => window.dispatchEvent(new CustomEvent('can:share', { detail: { kind: 'streak', streak } })) }, '📤 ' + t('common.share')),
      ),
    ),
  );
}

const KIND_ICON: Record<string, string> = {
  incense: '🪔', meditation: '🧘', fortune: '🎋', lantern: '🏮', bell: '🔔', beads: '📿', bow: '🙏', fish: '🐟', mo: '🪵',
};

function describe(e: JournalEntry): string {
  const d = e.detail;
  const vi = getLang() === 'vi';
  switch (e.kind) {
    case 'incense':
      return vi ? `Thắp ${d.count ?? 1} nén hương` : `Lit ${d.count ?? 1} incense`;
    case 'meditation':
      return vi ? `Thiền ${d.minutes ?? ''} phút` : `Meditated ${d.minutes ?? ''} min`;
    case 'fortune':
      return (
        (vi ? 'Xin xăm: ' : 'Fortune: ') +
        (d.tieuDe ?? (vi ? 'Quẻ số ' : 'Stick ') + (d.id ?? '')) +
        (d.topic ? ` · ${tOr(`xin-que.chu-de.${d.topic}`, topicLabel(String(d.topic), vi ? 'vi' : 'en'))}` : '')
      );
    case 'lantern':
      return (vi ? 'Thả đèn: “' : 'Lantern: “') + (d.text ?? '') + '”';
    case 'bell':
      return vi ? 'Thỉnh chuông' : 'Rang the bell';
    case 'beads':
      return vi ? `Tròn chuỗi 108 hạt` : 'Completed 108 beads';
    case 'bow':
      return vi ? 'Vái lạy' : 'Bowed';
    case 'fish':
      return vi ? 'Cho cá ăn' : 'Fed the fish';
    case 'mo':
      return vi ? `Gõ mõ ${d.count ?? ''} tiếng` : `Wooden fish ×${d.count ?? ''}`;
  }
}

export function openJournal(): void {
  const s = openSheet(t('journal.title'));
  const st = store.state;
  const tot = st.totals;
  s.body.append(
    h(
      'section',
      {},
      h('h3', {}, t('journal.totals')),
      h(
        'div',
        { class: 'row' },
        ...[
          ['🪔', tot.incense],
          ['🧘', tot.meditation + "'"],
          ['🏮', tot.lantern],
          ['🔔', tot.bell],
          ['📿', tot.beadRound],
          ['🪵', tot.mo],
          ['🎋', tot.fortune],
        ].map(([i, n]) => h('span', { class: 'chip', style: { cursor: 'default' } }, `${i} ${n}`)),
      ),
    ),
  );
  s.body.append(h('section', {}, h('button', { class: 'btn primary', onclick: () => openWishes() }, '🏮 ' + t('wishes.open'))));
  const ul = h('ul', { class: 'list' }, h('li', {}, '…'));
  s.body.append(h('section', {}, ul));
  void listEntries(150).then((list) => {
    ul.replaceChildren();
    if (!list.length) ul.append(h('li', { class: 'muted' }, t('journal.empty')));
    for (const e of list) {
      const when = new Date(e.at).toLocaleString(getLang() === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
      ul.append(h('li', {}, h('span', {}, (KIND_ICON[e.kind] ?? '•') + ' ' + describe(e)), h('span', { class: 'muted' }, when)));
    }
  });
}

export function openShop(): void {
  const s = openSheet(t('shop.title'));
  const render = () => {
    s.body.replaceChildren();
    const st = store.state;
    s.body.append(h('p', { class: 'muted' }, t('shop.hint')), h('p', {}, h('strong', {}, `🪷 ${st.hatSen} ${t('hud.hatSen')}`)));
    const cats: ShopCategory[] = ['incense', 'lantern', 'music', 'theme'];
    for (const c of cats) {
      const ul = h('ul', { class: 'list' });
      for (const it of SHOP_ITEMS.filter((i) => i.category === c)) {
        const owned = st.owned.includes(it.id);
        const equipped = st.equipped[c] === it.id;
        let btn: HTMLElement;
        if (equipped) btn = h('span', { class: 'chip active' }, t('shop.equipped'));
        else if (owned) btn = h('button', { class: 'chip', onclick: () => (store.dispatch({ type: 'equip', itemId: it.id }), applyEquip(c), render()) }, t('shop.equip'));
        else
          btn = h(
            'button',
            {
              class: 'btn primary',
              disabled: st.hatSen < it.price,
              onclick: () => {
                store.dispatch({ type: 'buy', itemId: it.id });
                audio.reward();
                applyEquip(c);
                render();
              },
            },
            t('shop.buy', { p: it.price + ' 🪷' }),
          );
        const swatch = c === 'incense' ? h('span', { style: { display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', background: it.value, border: '1px solid #aaa', marginRight: '8px', verticalAlign: 'middle' } }) : null;
        ul.append(h('li', {}, h('span', {}, swatch, t(it.nameKey)), btn));
      }
      s.body.append(h('section', {}, h('h3', {}, t('shop.cat.' + c)), ul));
    }
  };
  render();
}

function restartArea(): void {
  const a = store.state.area;
  game.api?.exitRitual();
  (game.api as unknown as { scene?: { restart(d: unknown): void } })?.scene?.restart({ area: a });
}

function applyEquip(c: ShopCategory): void {
  if (c === 'music') {
    const it = SHOP_ITEMS.find((i) => i.id === store.state.equipped.music);
    if (it) audio.setMusicTheme(it.value as 'default');
  } else if (c === 'theme' || c === 'incense') {
    // áp dụng khi vào khu kế tiếp; khởi động lại khu hiện tại cho thấy ngay
    const a = store.state.area;
    game.api?.exitRitual();
    (game.api as unknown as { scene?: { restart(d: unknown): void } })?.scene?.restart({ area: a });
  }
}

export function applySettings(s: Settings): void {
  audio.setVolumes({ master: s.master, sfx: s.sfx, ambient: s.ambient, music: s.music });
  audio.setMuted(s.muted);
  setHapticsEnabled(s.haptics);
  const root = document.documentElement;
  root.classList.toggle('large-text', s.largeText);
  root.classList.toggle('high-contrast', s.highContrast);
  root.classList.toggle('reduce-motion', s.reducedMotion);
}

function reminderToggle(): HTMLElement {
  const native = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  const input = h('input', {
    type: 'checkbox',
    checked: store.state.settings.reminders,
    disabled: !native,
    onchange: async (e: Event) => {
      const on = (e.target as HTMLInputElement).checked;
      const ok = await applyReminders(on);
      if (on && !ok) {
        (e.target as HTMLInputElement).checked = false;
        toast(t('settings.remindersDenied'));
        return;
      }
      store.dispatch({ type: 'settings', patch: { reminders: on } });
      if (on) toast(t('settings.remindersOn'));
    },
  });
  return h(
    'label',
    { class: 'toggle' },
    h('span', {}, t('settings.reminders'), native ? null : h('div', { class: 'muted' }, t('settings.remindersWeb'))),
    input,
  );
}

export function openSettings(onLangChange: () => void): void {
  const s = openSheet(t('settings.title'));
  const st = store.state.settings;
  const patch = (p: Partial<Settings>) => {
    store.dispatch({ type: 'settings', patch: p });
    applySettings(store.state.settings);
  };
  const slider = (k: 'master' | 'sfx' | 'ambient' | 'music') =>
    h(
      'label',
      { class: 'toggle' },
      t('settings.' + k),
      h('input', { type: 'range', min: 0, max: 100, value: Math.round(st[k] * 100), 'aria-label': t('settings.' + k), oninput: (e: Event) => patch({ [k]: Number((e.target as HTMLInputElement).value) / 100 }) }),
    );
  const check = (k: 'muted' | 'haptics' | 'reducedMotion' | 'largeText' | 'highContrast' | 'online', after?: () => void) =>
    h(
      'label',
      { class: 'toggle' },
      t('settings.' + k),
      h('input', {
        type: 'checkbox',
        checked: st[k],
        onchange: (e: Event) => {
          patch({ [k]: (e.target as HTMLInputElement).checked });
          after?.();
        },
      }),
    );
  const nickEl = h('strong', {}, store.state.nickname);
  s.body.append(
    h('section', {}, slider('master'), slider('sfx'), slider('ambient'), slider('music'), check('muted')),
    h('section', {}, check('haptics'), check('reducedMotion'), check('largeText'), check('highContrast')),
    h(
      'section',
      {},
      reminderToggle(),
      check('online', () => {
        const ss = store.state;
        net.start({ deviceId: ss.deviceId, nickname: ss.nickname, lang: ss.lang }, ss.settings.online, ss.blocked);
        restartArea();
      }),
      h('div', { class: 'toggle' }, t('settings.nickname'), nickEl),
      h(
        'button',
        {
          class: 'btn',
          onclick: () => {
            store.dispatch({ type: 'nickname', nickname: getLang() === 'vi' ? randomNickname() : randomNicknameEn() });
            nickEl.textContent = store.state.nickname;
            const ss = store.state;
            net.start({ deviceId: ss.deviceId, nickname: ss.nickname, lang: ss.lang }, ss.settings.online, ss.blocked);
          },
        },
        '🎲 ' + t('settings.newNickname'),
      ),
    ),
    h(
      'section',
      {},
      h('h3', {}, t('settings.lang')),
      h(
        'div',
        { class: 'row' },
        ...(['vi', 'en'] as const).map((l) =>
          h(
            'button',
            {
              class: 'chip' + (getLang() === l ? ' active' : ''),
              onclick: () => {
                store.dispatch({ type: 'lang', lang: l });
                setLang(l);
                s.close();
                void loadLangContent(l).then(() => {
                  setContentStrings('en', uiStringsEn());
                  onLangChange();
                });
              },
            },
            l === 'vi' ? 'Tiếng Việt' : 'English',
          ),
        ),
      ),
    ),
    h(
      'section',
      {},
      h(
        'button',
        {
          class: 'btn',
          style: { background: '#7a1d14' },
          onclick: async () => {
            if (!confirm(t('settings.deleteConfirm'))) return;
            const ok = await net.deleteMyData(store.state.deviceId);
            if (!ok) {
              toast(t('settings.deleteFailed'));
              return;
            }
            await clearJournal();
            store.reset();
            toast(t('settings.deleted'));
            setTimeout(() => location.reload(), 800);
          },
        },
        '🗑 ' + t('settings.delete'),
      ),
      ' ',
      h('a', { class: 'btn', href: './privacy.html', target: '_blank', rel: 'noopener', style: { textDecoration: 'none', display: 'inline-flex', alignItems: 'center' } }, t('settings.privacy')),
    ),
    h('p', { class: 'muted' }, t('settings.about')),
    h('p', { class: 'muted' }, t('settings.content') + ': ' + Object.entries(contentSource()).map(([k, v]) => `${k}=${v}`).join(', ')),
  );
}
