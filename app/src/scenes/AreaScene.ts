import Phaser from 'phaser';
import { AREA_ART, worldWidthOf } from '../art/registry';
import { makeBeamTexture, makeBellTexture, makeStickCupTexture } from '../art/areas-buildings';
import { drawSky, nightFactor, type SkyHandle } from '../art/sky';
import { makeFirefly, makeLeaf, makePetal, makeRedLantern, makeRose, makeSparkle } from '../art/sprites';
import { GAME_H, GAME_W, type ArtLayers, type AreaArtResult, type Hotspot } from '../art/types';
import { audio, type MusicTheme } from '../audio/engine';
import { AREA_INFO, type AreaId } from '../core/areas';
import { bus, game, type GameApi } from '../core/bus';
import { t } from '../core/i18n';
import { shopItem } from '../core/shop';
import { store } from '../core/store';
import { todayInfo, type TodayInfo } from '../core/today';
import { net, type NetEvent } from '../net/service';
import type { LanternPayload } from '../net/protocol';
import { RITUALS, ritualForHotspot, isRitualId, type RitualId } from '../rituals';
import { RiverLanterns } from '../rituals/river';
import { createAmbientFish } from '../rituals/fish';
import { openLanternDetail } from '../rituals/lantern';
import type { Ritual, RitualHost } from '../rituals/types';
import { addEntry } from '../storage/journal';
import { h, toast, uiRoot } from '../ui/dom';
import { BurnerDisplay } from './burner';
import { VisitorOrbs } from './visitors';

const NAV_LABEL_OFFSET = 70;

export class AreaScene extends Phaser.Scene implements GameApi {
  area: AreaId = 'cong';
  layers!: ArtLayers;
  hotspots: Record<string, Hotspot> = {};
  burner: BurnerDisplay | null = null;
  river: RiverLanterns | null = null;
  private art: AreaArtResult | null = null;
  private sky: SkyHandle | null = null;
  private worldWidth = GAME_W;
  private night = 0;
  private info!: TodayInfo;
  private active: { id: RitualId; ritual: Ritual; panel: HTMLElement } | null = null;
  private dragging = false;
  private dragStartX = 0;
  private dragScroll = 0;
  private unsubs: (() => void)[] = [];
  private updaters: ((time: number, delta: number) => void)[] = [];
  private pendingRitual: string | null = null;
  private transitioning = false;
  private markers: Phaser.GameObjects.GameObject[] = [];
  /** Ẩn khi nghi thức chạy (nghi thức vẽ bản động riêng). */
  private ritualHidden: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('area');
  }

  get ritual(): string | null {
    return this.active?.id ?? null;
  }

  init(data: { area?: AreaId; ritual?: string }): void {
    this.area = data.area ?? store.state.area ?? 'cong';
    this.pendingRitual = data.ritual ?? null;
    this.hotspots = {};
    this.updaters = [];
    this.unsubs = [];
    this.active = null;
    this.transitioning = false;
    this.burner = null;
    this.river = null;
    this.markers = [];
    this.ritualHidden = [];
  }

  create(): void {
    const s = store.state.settings;
    const reducedMotion = s.reducedMotion;
    this.info = todayInfo();
    // ?hour=21 — xem trước ngày/đêm (dev, ảnh chụp màn hình)
    const hourParam = Number(new URLSearchParams(location.search).get('hour'));
    if (location.search.includes('hour=') && hourParam >= 0 && hourParam < 24) this.info = { ...this.info, hour: hourParam };
    this.night = nightFactor(this.info.hour);
    this.worldWidth = worldWidthOf(this.area);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldWidth, GAME_H);
    cam.setBackgroundColor('#1a120c');

    const mk = (sf: number, depth: number) => this.add.container(0, 0).setScrollFactor(sf).setDepth(depth);
    this.layers = { sky: mk(0, 0), far: mk(0.3, 10), mid: mk(0.6, 20), main: mk(1, 30), near: mk(1.25, 40), fx: mk(0, 60) };

    this.sky = drawSky(this, this.layers.sky, {
      night: this.night,
      hour: this.info.hour,
      worldWidth: this.worldWidth,
      reducedMotion,
      fullMoon: this.info.fullMoon || this.info.decorations.includes('trang-ram'),
    });
    const artFn = AREA_ART[this.area];
    if (artFn) {
      const res = artFn({ scene: this, layers: this.layers, worldWidth: this.worldWidth, night: this.night, reducedMotion });
      this.art = res;
      this.hotspots = res.hotspots;
    }
    // lớp phủ đêm nhẹ cho toàn cảnh (art đã tự tô đèn sáng)
    if (this.night > 0.05) {
      const ov = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0b1030, this.night * 0.22);
      ov.setScrollFactor(0).setDepth(50).setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    this.setupAreaFeatures();
    this.setupDecorations();
    this.setupHotspotMarkers();
    this.setupInput();
    this.setupNet();

    // camera bắt đầu ở giữa khu
    cam.scrollX = (this.worldWidth - GAME_W) / 2;
    cam.fadeIn(reducedMotion ? 150 : 450, 20, 12, 6);
    audio.setAmbient(this.area, this.night);
    const music = shopItem(store.state.equipped.music)?.value as MusicTheme | undefined;
    if (music) audio.setMusicTheme(music);
    store.dispatch({ type: 'area', area: this.area });
    net.enterArea(this.area);
    game.api = this;
    bus.emit({ type: 'areaChanged', area: this.area });

    this.showAreaTitle(reducedMotion);
    this.events.once('shutdown', () => this.cleanup());
    if (this.pendingRitual && isRitualId(this.pendingRitual)) {
      const id = this.pendingRitual;
      this.time.delayedCall(250, () => this.startRitual(id));
    }
  }

  // ---------------------------------------------------------------- khu đặc thù
  private setupAreaFeatures(): void {
    const s = store.state;
    const rm = s.settings.reducedMotion;
    const b = this.hotspots.burner;
    if (b && (this.area === 'san' || this.area === 'chinh-dien')) {
      const scale = this.area === 'san' ? 1 : 0.7;
      const tint = Phaser.Display.Color.HexStringToColor(shopItem(s.equipped.incense)?.value ?? '#e8e2d6').color;
      this.burner = new BurnerDisplay(this, this.layers.main, b.x, b.y, scale, tint, rm);
      // hương đang cháy của mọi người
      for (const i of net.burningIncense()) this.burner.add(Math.min(i.count, 3), Date.parse(i.at));
      this.updaters.push((time) => this.burner?.update(time));
    }
    // Chuông, chày gỗ, ống xăm: sprite riêng (nghi thức vẽ bản động của nó trong lớp fx)
    const nightTint = Phaser.Display.Color.GetColor(255 - this.night * 120, 255 - this.night * 110, 255 - this.night * 70);
    const statics: [string, string][] = [];
    if (this.area === 'lau-chuong') statics.push(['bell', makeBellTexture(this)], ['beam', makeBeamTexture(this)]);
    if (this.area === 'am-xam') statics.push(['sticks', makeStickCupTexture(this)]);
    for (const [hs, key] of statics) {
      const p = this.hotspots[hs];
      if (!p) continue;
      const img = this.add.image(p.x, p.y, key).setTint(nightTint);
      this.layers.main.add(img);
      this.ritualHidden.push(img);
    }
    // người viếng khác trong khu (đốm sáng); dải mặt đất tùy khu
    if (store.state.settings.online) {
      const band = this.area === 'bo-song' ? { top: 760, bottom: 820 } : this.area === 'ho-sen' ? { top: 860, bottom: 900 } : { top: 690, bottom: 840 };
      const orbs = new VisitorOrbs(this, this.layers.main, this.worldWidth, band, rm);
      orbs.setCount((net.areas[this.area] ?? 0) - 1);
      this.updaters.push((t, d) => orbs.update(t, d));
      this.unsubs.push(net.subscribe((e) => e.type === 'presence' && orbs.setCount((e.areas[this.area] ?? 0) - 1)));
      this.unsubs.push(() => orbs.destroy());
    }
    if (this.area === 'bo-song' && this.hotspots.river) {
      const r = this.hotspots.river;
      this.river = new RiverLanterns(this, this.layers.main, { top: r.y - r.r, bottom: r.y + r.r }, this.worldWidth, {
        reducedMotion: rm,
        night: this.night,
        onTap: (l: LanternPayload, mine: boolean) => {
          if (!this.active) openLanternDetail(l, mine);
        },
      });
      this.updaters.push((time, d) => this.river?.update(time, d));
    }
    if (this.area === 'ho-sen' && this.hotspots.pond) {
      const fish = createAmbientFish(this, this.layers.main, this.hotspots.pond, 9, rm);
      (this as unknown as { ambientFish: unknown }).ambientFish = fish;
      this.updaters.push((time, d) => {
        if (!this.active || this.active.id !== 'fish') fish.update(time, d);
      });
      this.unsubs.push(() => fish.destroy());
    }
    if (this.area === 'san' && this.hotspots.bodhi && !rm) {
      // lá bồ đề thỉnh thoảng rơi
      makeLeaf(this);
      const bo = this.hotspots.bodhi;
      const ev = this.time.addEvent({
        delay: 3800,
        loop: true,
        callback: () => {
          const leaf = this.add.image(bo.x + (Math.random() - 0.5) * bo.r * 1.6, bo.y - bo.r * 0.6, 'spr-leaf').setScale(0.7);
          this.layers.main.add(leaf);
          this.tweens.add({
            targets: leaf,
            y: leaf.y + 260 + Math.random() * 120,
            x: leaf.x + 60 + Math.random() * 60,
            angle: 220,
            alpha: { from: 1, to: 0 },
            duration: 6500,
            ease: 'Sine.easeInOut',
            onComplete: () => leaf.destroy(),
          });
        },
      });
      this.unsubs.push(() => ev.remove());
    }
  }

  /** Trang trí theo sự kiện âm lịch + giao diện mùa (cửa hàng). */
  private setupDecorations(): void {
    const decos = new Set(this.info.decorations);
    const rm = store.state.settings.reducedMotion;
    const theme = shopItem(store.state.equipped.theme)?.value ?? 'none';
    if (decos.has('den-long') && this.area !== 'thien-duong') {
      const key = makeRedLantern(this);
      const n = Math.ceil(this.worldWidth / 180);
      for (let i = 0; i < n; i++) {
        const img = this.add.image(90 + i * 180, 70 + (i % 2) * 18, key).setScale(0.8);
        this.layers.near.add(img);
        if (!rm) this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 2200 + i * 130, ease: 'Sine.easeInOut' });
      }
    }
    const fall = (key: string, every: number, tint?: number) => {
      if (rm) return;
      const ev = this.time.addEvent({
        delay: every,
        loop: true,
        callback: () => {
          const p = this.add.image(Math.random() * GAME_W, -20, key).setScale(0.5 + Math.random() * 0.5);
          if (tint) p.setTint(tint);
          this.layers.fx.add(p);
          this.layers.fx.sendToBack(p);
          this.tweens.add({
            targets: p,
            y: GAME_H + 30,
            x: p.x + 80 + Math.random() * 80,
            angle: 360,
            duration: 9000 + Math.random() * 4000,
            onComplete: () => p.destroy(),
          });
        },
      });
      this.unsubs.push(() => ev.remove());
    };
    if (decos.has('hoa-dao-mai') || theme === 'petals') fall(makePetal(this), 900);
    if (decos.has('hoa-hong')) fall(makeRose(this), 1500);
    if (theme === 'leaves') fall(makeLeaf(this), 1400);
    if ((theme === 'fireflies' && this.night > 0.3) || decos.has('phao-hoa-nhe')) {
      const key = theme === 'fireflies' ? makeFirefly(this) : makeSparkle(this);
      for (let i = 0; i < 14; i++) {
        const f = this.add.image(Math.random() * GAME_W, 200 + Math.random() * 500, key).setBlendMode(Phaser.BlendModes.ADD);
        f.setAlpha(0);
        this.layers.fx.add(f);
        if (!rm)
          this.tweens.add({
            targets: f,
            alpha: { from: 0, to: 0.9 },
            x: f.x + (Math.random() - 0.5) * 80,
            y: f.y - 40 - Math.random() * 60,
            yoyo: true,
            repeat: -1,
            delay: Math.random() * 3000,
            duration: 2200 + Math.random() * 1800,
          });
      }
    }
  }

  /** Vòng sáng nhẹ + nhãn cho các điểm có thể chạm. */
  private setupHotspotMarkers(): void {
    const rm = store.state.settings.reducedMotion;
    for (const [name, hs] of Object.entries(this.hotspots)) {
      const ritual = ritualForHotspot(this.area, name);
      const navTarget = this.navTargetFor(name);
      if (!ritual && !navTarget) continue;
      if (name === 'beam' || name === 'table' || name === 'steps') continue;
      const label = ritual ? t(RITUALS[ritual].labelKey) : '➜ ' + t(AREA_INFO[navTarget as AreaId].nameKey);
      const ring = this.add.circle(hs.x, hs.y, Math.min(hs.r, 60), 0xffe2a0, 0).setStrokeStyle(2, 0xffe2a0, 0.55);
      const txt = this.add
        .text(hs.x, hs.y - Math.min(hs.r, 60) - (ritual ? 18 : NAV_LABEL_OFFSET - 50), label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          color: '#fff4dc',
          backgroundColor: 'rgba(30,20,14,0.55)',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5, 1);
      this.layers.main.add([ring, txt]);
      this.markers.push(ring, txt);
      if (!rm) this.tweens.add({ targets: ring, scale: 1.18, alpha: 0.6, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });
    }
  }

  /** Tên khu hiện mờ giữa màn hình khi vừa bước vào. */
  private showAreaTitle(rm: boolean): void {
    if (this.pendingRitual) return;
    const ev = this.info.events[0];
    const title = this.add
      .text(GAME_W / 2, 300, t(AREA_INFO[this.area].nameKey), {
        fontFamily: 'Georgia, "Noto Serif", serif',
        fontSize: '40px',
        color: '#fff4dc',
        stroke: '#2b1d14',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const objs: Phaser.GameObjects.Text[] = [title];
    if (ev && this.area === 'cong') {
      objs.push(
        this.add
          .text(GAME_W / 2, 350, t('event.today', { name: ev.ten }), { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#f2cd6b', stroke: '#2b1d14', strokeThickness: 4 })
          .setOrigin(0.5)
          .setAlpha(0),
      );
    }
    this.layers.fx.add(objs);
    this.tweens.add({
      targets: objs,
      alpha: 1,
      y: rm ? '+=0' : '-=12',
      duration: 700,
      delay: 250,
      hold: 1300,
      yoyo: true,
      onComplete: () => objs.forEach((o) => o.destroy()),
    });
  }

  private navTargetFor(name: string): AreaId | null {
    if (name === 'gate') return 'san';
    if (name.startsWith('path-')) {
      const a = name.slice(5) as AreaId;
      return a in AREA_INFO ? a : null;
    }
    return null;
  }

  // ---------------------------------------------------------------- input
  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = false;
      this.dragStartX = p.x;
      this.dragScroll = this.cameras.main.scrollX;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || this.active) return;
      const dx = p.x - this.dragStartX;
      if (Math.abs(dx) > 10) this.dragging = true;
      if (this.dragging) this.cameras.main.scrollX = this.dragScroll - dx;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.active || this.dragging || this.transitioning) return;
      const wx = p.x + this.cameras.main.scrollX;
      const wy = p.y;
      let best: [string, number] | null = null;
      for (const [name, hs] of Object.entries(this.hotspots)) {
        const d = Math.hypot(wx - hs.x, wy - hs.y);
        if (d <= Math.max(hs.r, 32) && (!best || d < best[1])) best = [name, d];
      }
      if (!best) return;
      const [name] = best;
      const ritual = ritualForHotspot(this.area, name);
      if (ritual) return this.startRitual(ritual);
      const nav = this.navTargetFor(name);
      if (nav) return this.goTo(nav);
      if (name === 'bodhi') {
        audio.uiTap();
        toast('🍃 ' + this.info.message, 5000);
      }
    });
    // phím mũi tên để ngắm cảnh (a11y bàn phím)
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.active) return;
      if (e.key === 'ArrowLeft') this.cameras.main.scrollX -= 60;
      if (e.key === 'ArrowRight') this.cameras.main.scrollX += 60;
    });
  }

  // ---------------------------------------------------------------- online
  private setupNet(): void {
    const onNet = (e: NetEvent) => {
      if (e.type === 'incense') {
        if (this.burner && !e.mine) this.burner.add(Math.min(e.entry.count, 3), Date.parse(e.entry.at));
        if (!e.mine && (this.area === 'san' || this.area === 'chinh-dien') && !this.active)
          toast('🪔 ' + t('incense.others', { name: e.entry.nickname, n: e.entry.count }));
      } else if (e.type === 'bell') {
        if (this.active?.id !== 'bell') {
          audio.bell(e.force * 0.5, { distant: true });
          if (this.active?.id !== 'meditation') toast('🔔 ' + t('bell.others'));
        }
      } else if (e.type === 'lantern') {
        const drop = (this as unknown as { lastLanternDrop?: { x: number; y: number; at: number } }).lastLanternDrop;
        if (e.mine && drop && Date.now() - drop.at < 10000) this.river?.add(e.lantern, true, { fromX: drop.x, fromY: drop.y });
        else this.river?.add(e.lantern, e.mine);
      } else if (e.type === 'lanternRemoved') {
        this.river?.remove(e.id);
      } else if (e.type === 'error' && ['content_rejected', 'banned', 'feature_disabled'].includes(e.code)) {
        toast(e.code === 'content_rejected' ? t('lantern.rejected') : e.message || e.code);
      } else if (e.type === 'rateLimited' && e.event === 'release_lantern') {
        toast(t('lantern.tooFast', { s: Math.ceil(e.retryAfterMs / 1000) }));
      }
    };
    this.unsubs.push(net.subscribe(onNet));
  }

  // ---------------------------------------------------------------- API cho HUD
  goTo(area: AreaId): void {
    if (this.transitioning || area === this.area) return;
    this.exitRitual();
    this.transitioning = true;
    audio.uiOpen();
    const rm = store.state.settings.reducedMotion;
    const cam = this.cameras.main;
    // trượt nhẹ theo hướng đi + mờ dần
    const dir = (AREA_INFO[area].map.x - AREA_INFO[this.area].map.x) >= 0 ? 1 : -1;
    if (!rm) this.tweens.add({ targets: cam, scrollX: cam.scrollX + dir * 80, duration: 420, ease: 'Sine.easeIn' });
    cam.fadeOut(rm ? 150 : 420, 20, 12, 6);
    cam.once('camerafadeoutcomplete', () => this.scene.restart({ area }));
  }

  startRitual(id: string): void {
    if (!isRitualId(id) || this.transitioning) return;
    if (this.active) this.exitRitual();
    const def = RITUALS[id];
    audio.unlock();
    audio.uiOpen();
    const panel = h('div', { class: 'ritual-panel', 'data-ritual': id });
    uiRoot().append(panel);
    const host: RitualHost = {
      scene: this,
      layers: this.layers,
      area: this.area,
      hotspots: this.hotspots,
      night: this.night,
      reducedMotion: store.state.settings.reducedMotion,
      panel,
      complete: (kind, amount, detail, journal) => {
        const reward = store.dispatch({
          type: 'ritual',
          kind,
          amount,
          dateKey: todayInfo().dateKey,
          eventRitual: this.info.eventRitual,
          topic: typeof detail?.topic === 'string' ? detail.topic : undefined,
        });
        if (journal) void addEntry({ at: new Date().toISOString(), kind: journal, detail: detail ?? {} });
        if (reward.amount > 0) {
          bus.emit({ type: 'reward', amount: reward.amount, reasons: reward.reasons });
          this.floatText(t('reward.plus', { n: reward.amount }), GAME_W / 2, 380, '#f2cd6b');
        }
      },
      floatText: (text, x, y, color = '#fff4dc') => this.floatText(text, x, y, color),
      exit: (next) => {
        this.exitRitual();
        if (next) this.time.delayedCall(200, () => this.startRitual(next));
      },
    };
    // canh camera vào điểm nóng của nghi thức
    const focus = this.focusHotspot(id);
    if (focus) this.cameras.main.scrollX = Phaser.Math.Clamp(focus.x - GAME_W / 2, 0, this.worldWidth - GAME_W);
    const ritual = def.factory(host);
    this.active = { id, ritual, panel };
    this.setMarkersVisible(false);
    bus.emit({ type: 'ritualStarted', id, zen: !!def.zen });
  }

  private focusHotspot(id: RitualId): Hotspot | undefined {
    const map: Partial<Record<RitualId, string>> = {
      incense: 'burner',
      mo: 'mo',
      bell: 'bell',
      fortune: 'sticks',
      fish: 'pond',
      lantern: 'steps',
      meditation: 'cushion',
      bow: this.area === 'san' ? 'burner' : 'cushion',
    };
    const k = map[id];
    return k ? this.hotspots[k] : undefined;
  }

  exitRitual(): void {
    if (!this.active) return;
    const { id, ritual, panel } = this.active;
    this.active = null;
    try {
      ritual.destroy();
    } catch (err) {
      console.warn('ritual destroy', err);
    }
    panel.remove();
    this.setMarkersVisible(true);
    bus.emit({ type: 'ritualEnded', id });
  }

  private setMarkersVisible(v: boolean): void {
    for (const m of this.markers) (m as Phaser.GameObjects.Text).setVisible(v);
    for (const m of this.ritualHidden) m.setVisible(v);
  }

  floatText(text: string, x: number, y: number, color: string): void {
    const tx = this.add
      .text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color, stroke: '#2b1d14', strokeThickness: 4 })
      .setOrigin(0.5);
    this.layers.fx.add(tx);
    this.tweens.add({ targets: tx, y: y - 70, alpha: 0, duration: 1300, ease: 'Sine.easeOut', onComplete: () => tx.destroy() });
  }

  override update(time: number, delta: number): void {
    this.sky?.update(time, delta);
    this.art?.update?.(time, delta);
    for (const u of this.updaters) u(time, delta);
    this.active?.ritual.update?.(time, delta);
  }

  private cleanup(): void {
    this.exitRitual();
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.burner?.destroy();
    this.river?.destroy();
    this.sky?.destroy();
    this.burner = null;
    this.river = null;
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    if (game.api === this) game.api = null;
  }
}
