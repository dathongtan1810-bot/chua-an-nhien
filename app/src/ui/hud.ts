import { ADS_ENABLED } from '../config';
import { AREA_INFO, type AreaId } from '../core/areas';
import { bus, game, requestGoTo, requestRitual } from '../core/bus';
import { getLang, t } from '../core/i18n';
import { store } from '../core/store';
import { todayInfo } from '../core/today';
import { formatLunar } from '../lunar/lunar';
import { net } from '../net/service';
import { AREA_RITUALS, RITUALS } from '../rituals';
import { h, uiRoot } from './dom';
import { mapSvg } from './minimap';
import { openJournal, openMap, openSettings, openShop, openToday } from './panels';
import { openRoom } from './room';

/** HUD HTML: tên khu, âm lịch, người online, Hạt sen, mini-map, nút nghi thức và đường đi. */
export class Hud {
  private root = h('div', { class: 'hud' });
  private title = h('div', { class: 'hud-title' });
  private sub = h('div', { class: 'hud-sub' });
  private online = h('div', { class: 'hud-online off' });
  private seeds = h('div', { class: 'hud-pill hatsen', 'aria-live': 'polite' });
  private mini = h('button', { class: 'hud-pill minimap', 'aria-label': t('hud.map'), onclick: () => openMap() });
  private bottom = h('nav', { class: 'hud-bottom', 'aria-label': t('hud.actions') });
  private side = h('div', { class: 'hud-side' });

  mount(): void {
    const r = this.root;
    r.append(
      h(
        'div',
        { class: 'hud-top' },
        h('div', { class: 'hud-pill' }, this.title, this.sub, this.online),
        h('div', { class: 'hud-right' }, this.seeds, this.mini),
      ),
      this.side,
      this.bottom,
    );
    uiRoot().append(r);
    this.renderSide();
    bus.on((e) => {
      if (e.type === 'areaChanged') this.render();
      if (e.type === 'ritualStarted') {
        r.classList.add('hidden-for-ritual');
        r.classList.toggle('zen', e.zen);
      }
      if (e.type === 'ritualEnded') r.classList.remove('hidden-for-ritual', 'zen');
    });
    store.subscribe(() => this.renderSeeds());
    net.subscribe((e) => {
      if (e.type === 'presence' || e.type === 'status') this.renderOnline();
    });
    this.render();
  }

  private renderSide(): void {
    const btn = (icon: string, key: string, fn: () => void) =>
      h('button', { class: 'btn icon', 'aria-label': t(key), title: t(key), onclick: fn }, icon);
    this.side.replaceChildren(
      btn('📅', 'hud.today', openToday),
      btn('📖', 'hud.journal', openJournal),
      btn('🪷', 'hud.shop', openShop),
      btn('👨‍👩‍👧', 'room.title', openRoom),
      btn('⚙️', 'hud.settings', () => openSettings(() => this.relabel())),
    );
  }

  /** Đổi ngôn ngữ: vẽ lại HUD và khu hiện tại. */
  relabel(): void {
    this.renderSide();
    this.mini.setAttribute('aria-label', t('hud.map'));
    this.render();
    const api = game.api as unknown as { scene?: { restart(d: unknown): void } } | null;
    api?.scene?.restart({ area: store.state.area });
  }

  render(): void {
    const area = store.state.area;
    this.title.textContent = t(AREA_INFO[area].nameKey);
    const info = todayInfo();
    this.sub.textContent = formatLunar(info.lunar, getLang()) + (info.events[0] ? ' • ' + info.events[0].ten : '');
    this.renderOnline();
    this.renderSeeds();
    this.renderActions(area);
  }

  private renderSeeds(): void {
    this.seeds.textContent = `🪷 ${store.state.hatSen}`;
    this.seeds.setAttribute('aria-label', `${store.state.hatSen} ${t('hud.hatSen')}`);
  }

  private renderOnline(): void {
    const on = net.status === 'online' && store.state.settings.online;
    this.online.className = 'hud-online' + (on ? '' : ' off');
    const area = store.state.area;
    this.online.replaceChildren(
      h('span', { class: 'dot' }),
      on ? t('hud.online', { n: net.online }) + ' • ' + t('hud.here', { n: net.areas[area] ?? 0 }) : t('hud.offline'),
    );
    this.mini.replaceChildren(mapSvg(area, net.areas));
  }

  private renderActions(area: AreaId): void {
    this.bottom.replaceChildren();
    for (const id of AREA_RITUALS[area]) {
      const def = RITUALS[id];
      this.bottom.append(
        h('button', { class: 'act', onclick: () => requestRitual(id) }, h('span', { class: 'ic', 'aria-hidden': 'true' }, def.icon), t(def.labelKey)),
      );
    }
    for (const to of AREA_INFO[area].links) {
      this.bottom.append(
        h('button', { class: 'act nav', onclick: () => requestGoTo(to), 'aria-label': t('go.to', { name: t(AREA_INFO[to].nameKey) }) }, '➜ ' + t(AREA_INFO[to].nameKey)),
      );
    }
    if (area === 'bo-song') {
      this.bottom.append(
        h('button', { class: 'act nav', onclick: () => window.dispatchEvent(new CustomEvent('can:share', { detail: { kind: 'invite' } })) }, '💌 ' + t('share.invite')),
      );
    }
    // Khung quảng cáo thưởng: TẮT mặc định; không bao giờ ở chính điện / thiền đường.
    if (ADS_ENABLED && !AREA_INFO[area].solemn) {
      this.bottom.append(h('button', { class: 'act nav', 'data-ad': 'rewarded' }, '🎁'));
    }
  }
}
