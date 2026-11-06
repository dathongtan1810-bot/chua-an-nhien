import Phaser from 'phaser';
import './ui/styles.css';
import { GAME_H, GAME_W } from './art/types';
import { audio } from './audio/engine';
import { AREA_INFO, isAreaId, type AreaId } from './core/areas';
import { bus, game, requestGoTo } from './core/bus';
import { setLang, t } from './core/i18n';
import { store } from './core/store';
import { setForcedDate, todayInfo } from './core/today';
import { loadLangContent } from './data/content';
import { net } from './net/service';
import { AreaScene } from './scenes/AreaScene';
import { closeSheet, h, toast, uiRoot } from './ui/dom';
import { Hud } from './ui/hud';
import { applySettings } from './ui/panels';
import { installShare } from './share/share';
import { registerSW } from './pwa';

const params = new URLSearchParams(location.search);
if (import.meta.env.DEV && params.get('date')) setForcedDate(params.get('date'));
const st = store.state;
setLang(st.lang);
store.dispatch({ type: 'rollDay', dateKey: todayInfo().dateKey });
if (matchMedia?.('(prefers-reduced-motion: reduce)').matches && !st.onboarded) {
  store.dispatch({ type: 'settings', patch: { reducedMotion: true } });
}
applySettings(store.state.settings);

// Link mời "Đi chùa cùng mình" → mở thẳng ra bờ sông
const invite = params.get('invite') !== null || location.hash === '#bo-song';
const areaParam = params.get('area');
const startArea: AreaId = invite ? 'bo-song' : isAreaId(areaParam) ? areaParam : 'cong';
const ritualParam = params.get('ritual') ?? undefined;

const gameInst = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#1a120c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, powerPreference: 'high-performance' },
  fps: { target: 60, smoothStep: true },
  input: { activePointers: 2 },
  banner: false,
  audio: { noAudio: true },
  scene: [],
});
gameInst.scene.add('area', AreaScene, false);

const hud = new Hud();
// nội dung tiếng Anh (quẻ, thông điệp, sự kiện) tải lười; xong thì vẽ lại HUD
void loadLangContent(store.state.lang).then(() => hud.render());

let begun = false;
function begin(): void {
  begun = true;
  audio.unlock();
  const s = store.state;
  net.start({ deviceId: s.deviceId, nickname: s.nickname, lang: s.lang }, s.settings.online, s.blocked);
  net.subscribe((e) => e.type === 'nickname' && store.dispatch({ type: 'nickname', nickname: e.nickname }));
  // ?room=ABC234: vào phòng gia đình khi đã kết nối
  const roomParam = params.get('room');
  if (roomParam) {
    const off = net.subscribe((e) => {
      if (e.type === 'presence') {
        off();
        net.joinRoom(roomParam);
      }
    });
  }
  hud.mount();
  game.api = null; // cảnh sắp khởi động lại: lệnh từ HUD được xếp hàng tới khi sẵn sàng
  gameInst.scene.start('area', { area: startArea, ritual: ritualParam });
  if (!s.onboarded) {
    store.dispatch({ type: 'onboarded' });
    setTimeout(() => toast(t('start.tip'), 6000), 1400);
  }
  bus.on((e) => {
    if (e.type === 'reward' && e.reasons.some((r) => r.startsWith('quest') || r === 'allQuests' || r === 'event')) {
      toast('🪷 ' + t('reward.plus', { n: e.amount }));
    }
  });
}

// Màn chào: cần một chạm để mở khóa âm thanh (iOS)
if (ritualParam || params.get('skip') !== null) {
  begin();
} else {
  const start = h(
    'div',
    { class: 'start' },
    h('h1', {}, t('app.name')),
    h('p', {}, t('app.tagline')),
    h('button', { class: 'btn primary', onclick: () => (start.remove(), begin()) }, t('start.enter')),
    h('p', { class: 'muted' }, t('start.hint')),
  );
  uiRoot().append(start);
  // nền màn chào: hiển thị cổng chùa phía sau
  gameInst.events.once('ready', () => {
    if (!begun) gameInst.scene.start('area', { area: 'cong' });
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) store.saveNow();
});
installShare();
// a11y: lời hướng dẫn nghi thức được đọc bởi trình đọc màn hình
new MutationObserver((muts) => {
  for (const m of muts)
    m.addedNodes.forEach((n) => {
      if (n instanceof HTMLElement)
        n.querySelectorAll?.('.ritual-hint').forEach((el) => el.setAttribute('aria-live', 'polite'));
    });
}).observe(uiRoot(), { childList: true, subtree: true });
registerSW();
void import('./native').then((m) => m.initNative()).catch(() => undefined);
// Nút Back Android: đóng bảng / nghi thức trước, rồi lùi về khu trước
window.addEventListener('can:back', () => {
  if (closeSheet()) return;
  if (game.api?.ritual) return game.api.exitRitual();
  // lùi về khu trước (theo bản đồ); ở cổng chùa thì thoát app
  const area = store.state.area;
  if (area !== 'cong') return requestGoTo(AREA_INFO[area].links[0]);
  void import('./native').then((m) => m.exitApp?.());
});
(window as unknown as { __game?: Phaser.Game }).__game = gameInst;
(window as unknown as { __app?: unknown; __net?: unknown }).__app = game;
(window as unknown as { __net?: unknown }).__net = net;
if (import.meta.env.DEV) (window as unknown as { __audio?: unknown }).__audio = audio;
