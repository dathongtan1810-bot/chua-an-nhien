/**
 * Server giả lập chạy trong trình duyệt — để chơi offline/dev mà vẫn thấy chùa "có người".
 * Hành xử giống server thật: echo hành động của người chơi, rate limit, lọc lời nguyện,
 * báo cáo/chặn người dùng, lưu đèn 24h trong bộ nhớ.
 *
 * Ghi chú: giao thức không có sự kiện "lantern_liked" riêng — khi có lượt thích,
 * server (và mock) phát lại `lantern_released` cùng id với `likes` mới; client upsert theo id.
 */
import type { NetClient, NetStatus } from './client';
import {
  isLanternColor,
  LANTERN_COLORS,
  LANTERN_MAX_LEN,
  type AreaCounts,
  type C2SEvents,
  type HelloPayload,
  type IncenseLitPayload,
  type LanternPayload,
  type S2CEvents,
} from './protocol';
import { AREAS, AREA_INFO, isAreaId, type AreaId } from '../core/areas';
import { RateLimiter, DEFAULT_RATE_RULES, type RateRule } from '../logic/ratelimit';
import { checkText } from '../logic/filter';
import { randomNickname } from '../logic/nickname';

export const MOCK_WISHES: readonly string[] = [
  'Cầu cho mẹ luôn mạnh khỏe, bình an.',
  'Mong cha sớm khỏi bệnh, cả nhà sum vầy.',
  'Nguyện cho gia đình con an lành, hạnh phúc.',
  'Cầu cho con thi đỗ đại học như ý.',
  'Mong mọi người đều được bình an, vô sự.',
  'Xin cho bà ngoại sống lâu trăm tuổi.',
  'Nguyện cầu siêu cho ông nội được an nghỉ.',
  'Mong năm nay công việc thuận lợi, tâm luôn an.',
  'Cầu cho người con thương luôn mỉm cười.',
  'Mong em bé sắp chào đời khỏe mạnh, ngoan ngoãn.',
  'Xin cho lòng con nhẹ nhàng, biết buông bỏ.',
  'Nguyện cho chúng sinh bớt khổ đau.',
  'Cầu quốc thái dân an, mưa thuận gió hòa.',
  'Mong bạn bè con ai cũng tìm được bình yên.',
  'Xin cho con đủ kiên nhẫn để thương mình hơn.',
  'Cầu cho anh chị em hòa thuận, yêu thương nhau.',
  'Mong vợ chồng con luôn thấu hiểu, đồng lòng.',
  'Nguyện cho những người xa quê sớm được đoàn viên.',
  'Cầu cho mùa màng bội thu, quê nhà ấm no.',
  'Mong con sớm tìm được công việc phù hợp.',
  'Xin cho người bệnh được nhẹ đau, an giấc.',
  'Cầu cho con mèo nhỏ của con luôn khỏe mạnh.',
  'Mong mỗi ngày đều là một ngày bình yên.',
  'Nguyện hồi hướng công đức cho ông bà tổ tiên.',
  'Cầu cho thầy cô luôn mạnh khỏe, an vui.',
  'Mong con biết sống chậm lại và biết ơn nhiều hơn.',
  'Xin cho trái tim con bớt giận hờn.',
  'Cầu cho những ai đang buồn sớm tìm thấy niềm vui.',
  'Mong cả nhà một năm mới an khang, thịnh vượng.',
  'Nguyện cho thế giới không còn chiến tranh.',
  'Cầu cho ba mẹ tuổi già an nhàn, thanh thản.',
  'Mong con giữ được tâm trong sáng như hoa sen.',
];

/** Trọng số phân bố người theo khu (sân & chính điện đông nhất). */
const AREA_WEIGHTS: Record<AreaId, number> = {
  cong: 0.1,
  san: 0.26,
  'chinh-dien': 0.22,
  'lau-chuong': 0.08,
  'ho-sen': 0.12,
  'bo-song': 0.07,
  'am-xam': 0.07,
  'thien-duong': 0.08,
};

/** Hệ số đông/vắng theo giờ địa phương (0..1). Sáng sớm & tối đông, khuya vắng. */
const HOUR_FACTOR = [
  0.12, 0.08, 0.06, 0.06, 0.18, 0.5, 0.75, 0.7, 0.55, 0.5, 0.45, 0.45, 0.4, 0.35, 0.35, 0.4, 0.5, 0.65, 0.85, 1,
  0.95, 0.8, 0.5, 0.25,
];

const DAY_MS = 24 * 60 * 60 * 1000;
const INCENSE_BURN_MS = 15 * 60 * 1000;

export interface MockServerOptions {
  /** Nguồn ngẫu nhiên (mặc định Math.random) */
  random?: () => number;
  /** Hệ số tốc độ: 2 = mọi bộ đếm thời gian nhanh gấp đôi */
  speed?: number;
  /** Số đèn hoa đăng có sẵn lúc khởi tạo (mặc định 12) */
  initialLanterns?: number;
  /** Đồng hồ (mặc định Date.now) */
  now?: () => number;
  /** Độ trễ mạng giả lập (ms, mặc định 40) */
  latencyMs?: number;
  minVisitors?: number;
  maxVisitors?: number;
  /** Khoảng thời gian giữa các hoạt động của bot (giây, mặc định 20..90) */
  botIntervalSec?: [number, number];
  /** Chu kỳ cập nhật số người (ms, mặc định 15000) */
  presenceIntervalMs?: number;
  rateRules?: Record<string, RateRule>;
}

interface Bot {
  id: string;
  nickname: string;
  area: AreaId;
}

type AnyCb = (d: unknown) => void;

export class MockServerClient implements NetClient {
  private readonly rand: () => number;
  private readonly speed: number;
  private readonly now: () => number;
  private readonly latency: number;
  private readonly minV: number;
  private readonly maxV: number;
  private readonly botInterval: [number, number];
  private readonly presenceMs: number;
  private readonly limiter: RateLimiter;

  private readonly listeners = new Map<string, Set<AnyCb>>();
  private readonly statusListeners = new Set<(s: NetStatus) => void>();
  private status: NetStatus = 'offline';

  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private interval: ReturnType<typeof setInterval> | null = null;

  private bots: Bot[] = [];
  private lanterns: LanternPayload[] = [];
  private incense: IncenseLitPayload[] = [];
  private readonly hiddenLanterns = new Set<string>();
  private readonly blockedUsers = new Set<string>();
  private seq = 0;
  private counters = { incense: 0, lanterns: 0, bells: 0 };

  private me: { userId: string; nickname: string; deviceId: string; area: AreaId } | null = null;

  constructor(opts: MockServerOptions = {}) {
    this.rand = opts.random ?? Math.random;
    this.speed = Math.max(0.01, opts.speed ?? 1);
    this.now = opts.now ?? (() => Date.now());
    this.latency = Math.max(0, opts.latencyMs ?? 40);
    this.minV = opts.minVisitors ?? 5;
    this.maxV = Math.max(this.minV, opts.maxVisitors ?? 40);
    this.botInterval = opts.botIntervalSec ?? [20, 90];
    this.presenceMs = opts.presenceIntervalMs ?? 15_000;
    this.limiter = new RateLimiter(opts.rateRules ?? DEFAULT_RATE_RULES, this.now);

    // dân số ban đầu theo giờ
    const n = this.targetVisitors();
    for (let i = 0; i < n; i++) this.bots.push(this.newBot());
    // đèn có sẵn trong 24h qua
    const nl = opts.initialLanterns ?? 12;
    const t = this.now();
    for (let i = 0; i < nl; i++) {
      const bot = this.pickBot() ?? this.newBot();
      const l = this.makeLantern(bot, this.pickWish(), this.pickColor(), t - Math.floor(this.rand() * (DAY_MS - 60_000)));
      l.likes = Math.floor(this.rand() * 12);
      this.lanterns.push(l);
    }
    this.lanterns.sort((a, b) => a.at.localeCompare(b.at));
    // vài nén hương đang cháy
    const ni = Math.min(this.bots.length, 2 + Math.floor(this.rand() * 4));
    for (let i = 0; i < ni; i++) {
      const bot = this.bots[i] as Bot;
      this.incense.push({
        userId: bot.id,
        nickname: bot.nickname,
        count: this.rand() < 0.7 ? 3 : 1,
        at: new Date(t - Math.floor(this.rand() * INCENSE_BURN_MS * 0.9)).toISOString(),
      });
    }
  }

  // ---------- NetClient ----------

  get connected(): boolean {
    return this.status === 'online';
  }

  connect(hello: HelloPayload): void {
    if (this.status !== 'offline') {
      this.handleHello(hello);
      return;
    }
    this.setStatus('connecting');
    this.later(() => {
      this.setStatus('online');
      this.handleHello(hello);
      this.startSimulation();
    }, this.latency);
  }

  disconnect(): void {
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts.clear();
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
    this.setStatus('offline');
  }

  emit<K extends keyof C2SEvents>(ev: K, data: C2SEvents[K]): void {
    if (!this.connected) return;
    // giả lập độ trễ mạng: server xử lý sau latency
    this.later(() => this.handle(ev, data), this.latency);
  }

  on<K extends keyof S2CEvents>(ev: K, cb: (d: S2CEvents[K]) => void): () => void {
    let set = this.listeners.get(ev);
    if (!set) {
      set = new Set();
      this.listeners.set(ev, set);
    }
    const fn = cb as AnyCb;
    set.add(fn);
    return () => {
      set?.delete(fn);
    };
  }

  onStatus(cb: (s: NetStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  fetchLanterns(since?: string): Promise<LanternPayload[]> {
    this.prune();
    const s = since ? Date.parse(since) : NaN;
    const list = this.lanterns
      .filter((l) => this.visibleLantern(l))
      .filter((l) => Number.isNaN(s) || Date.parse(l.at) > s)
      .map((l) => ({ ...l }));
    return Promise.resolve(list);
  }

  stats(): Promise<unknown> {
    this.prune();
    return Promise.resolve({
      online: this.onlineCount(),
      areas: this.areaCounts(),
      incenseToday: this.counters.incense,
      lanternsToday: this.lanterns.length,
      bellsToday: this.counters.bells,
    });
  }

  deleteMyData(deviceId: string): Promise<boolean> {
    if (this.me && this.me.deviceId === deviceId) {
      const uid = this.me.userId;
      const mine = this.lanterns.filter((l) => l.userId === uid);
      this.lanterns = this.lanterns.filter((l) => l.userId !== uid);
      this.incense = this.incense.filter((i) => i.userId !== uid);
      for (const l of mine) this.send('lantern_removed', { id: l.id });
    }
    return Promise.resolve(true);
  }

  // ---------- xử lý sự kiện client ----------

  private handle<K extends keyof C2SEvents>(ev: K, data: C2SEvents[K]): void {
    if (!this.connected) return;
    if (ev === 'hello') {
      this.handleHello(data as HelloPayload);
      return;
    }
    if (!this.me) {
      this.send('error', { code: 'bad_request', message: 'hello required' });
      return;
    }
    // lọc nội dung trước khi trừ lượt
    if (ev === 'release_lantern') {
      const d = data as C2SEvents['release_lantern'];
      const r = checkText(typeof d?.text === 'string' ? d.text : '', LANTERN_MAX_LEN);
      if (!r.ok) {
        this.send('error', { code: 'content_rejected', message: r.reason ?? 'rejected' });
        return;
      }
    }
    const rl = this.limiter.tryConsume(ev);
    if (!rl.ok) {
      this.send('rate_limited', { event: ev, retryAfterMs: rl.retryAfterMs });
      return;
    }
    const me = this.me;
    const at = new Date(this.now()).toISOString();
    switch (ev) {
      case 'enter_area': {
        const area = (data as C2SEvents['enter_area']).area;
        if (!isAreaId(area)) {
          this.send('error', { code: 'bad_request', message: 'unknown area' });
          return;
        }
        me.area = area;
        this.sendPresence();
        this.sendRoom();
        return;
      }
      case 'light_incense': {
        const raw = Number((data as C2SEvents['light_incense']).count);
        const count = Math.max(1, Math.min(9, Number.isFinite(raw) ? Math.round(raw) : 1));
        const p: IncenseLitPayload = { userId: me.userId, nickname: me.nickname, count, at };
        this.incense.push(p);
        this.counters.incense += count;
        this.send('incense_lit', p);
        return;
      }
      case 'ring_bell': {
        const raw = Number((data as C2SEvents['ring_bell']).force);
        const force = Math.max(0, Math.min(1, Number.isFinite(raw) ? raw : 0.5));
        this.counters.bells++;
        this.send('bell_rung', { force, at });
        return;
      }
      case 'release_lantern': {
        const d = data as C2SEvents['release_lantern'];
        const color = isLanternColor(d.color) ? d.color : 'vang';
        const l = this.makeLantern({ id: me.userId, nickname: me.nickname, area: me.area }, d.text.trim(), color, this.now());
        this.lanterns.push(l);
        this.counters.lanterns++;
        this.send('lantern_released', { ...l });
        // thỉnh thoảng có người thích đèn của mình
        if (this.rand() < 0.6) this.later(() => this.likeLantern(l.id), this.scaled(5_000 + this.rand() * 40_000));
        return;
      }
      case 'like_lantern': {
        const id = (data as C2SEvents['like_lantern']).id;
        if (!this.likeLantern(id)) this.send('error', { code: 'not_found', message: 'lantern not found' });
        return;
      }
      case 'report': {
        const d = data as C2SEvents['report'];
        if (d.type === 'lantern') {
          this.hiddenLanterns.add(d.id);
          this.send('lantern_removed', { id: d.id });
        } else if (d.type === 'user') {
          this.blockUser(d.id);
        }
        return;
      }
      case 'block_user': {
        this.blockUser((data as C2SEvents['block_user']).userId);
        return;
      }
      case 'room_create':
      case 'room_join': {
        const raw = ev === 'room_join' ? String((data as C2SEvents['room_join']).code ?? '').toUpperCase() : '';
        const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const code = raw || Array.from({ length: 6 }, () => ALPH[Math.floor(this.rand() * ALPH.length)]).join('');
        if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
          this.send('error', { code: 'room_not_found', message: 'Không tìm thấy phòng' });
          return;
        }
        // mô phỏng: 1–2 người thân đã ở trong phòng
        const kin = ev === 'room_join' ? [this.newBot(), this.newBot()] : [];
        this.room = { code, kin };
        this.sendRoom();
        return;
      }
      case 'room_leave': {
        if (this.room) this.send('room_left', { code: this.room.code });
        this.room = null;
        return;
      }
      default:
        return;
    }
  }

  private handleHello(hello: HelloPayload): void {
    const nickname = (hello.nickname || '').trim().slice(0, 40) || randomNickname(this.rand);
    if (!this.me) {
      this.me = {
        userId: `u-${hashStr(hello.deviceId || String(this.rand()))}`,
        nickname,
        deviceId: hello.deviceId,
        area: 'cong',
      };
    } else {
      this.me.nickname = nickname;
      this.me.deviceId = hello.deviceId;
    }
    if (!this.connected) return;
    this.prune();
    this.send('welcome', {
      userId: this.me.userId,
      nickname: this.me.nickname,
      online: this.onlineCount(),
      areas: this.areaCounts(),
      incense: this.incense.filter((i) => !this.blockedUsers.has(i.userId)).map((i) => ({ ...i })),
      serverTime: new Date(this.now()).toISOString(),
    });
  }

  private blockUser(userId: string): void {
    if (!userId || (this.me && userId === this.me.userId)) return;
    this.blockedUsers.add(userId);
    for (const l of this.lanterns) {
      if (l.userId === userId && !this.hiddenLanterns.has(l.id)) this.send('lantern_removed', { id: l.id });
    }
  }

  private likeLantern(id: string): boolean {
    const l = this.lanterns.find((x) => x.id === id);
    if (!l) return false;
    l.likes++;
    if (this.visibleLantern(l)) this.send('lantern_released', { ...l });
    return true;
  }

  // ---------- mô phỏng ----------

  private startSimulation(): void {
    if (this.interval === null) {
      this.interval = setInterval(() => this.drift(), this.scaled(this.presenceMs));
    }
    this.scheduleBot();
  }

  private scheduleBot(): void {
    const [lo, hi] = this.botInterval;
    const delay = (lo + this.rand() * Math.max(0, hi - lo)) * 1000;
    this.later(() => {
      this.botAct();
      this.scheduleBot();
    }, this.scaled(delay));
  }

  private botAct(): void {
    if (!this.connected) return;
    this.prune();
    const bot = this.pickBot();
    if (!bot) return;
    const at = new Date(this.now()).toISOString();
    const r = this.rand();
    if (r < 0.55) {
      const p: IncenseLitPayload = { userId: bot.id, nickname: bot.nickname, count: this.rand() < 0.75 ? 3 : 1, at };
      this.incense.push(p);
      this.counters.incense += p.count;
      if (!this.blockedUsers.has(bot.id)) this.send('incense_lit', { ...p });
    } else if (r < 0.8) {
      const l = this.makeLantern(bot, this.pickWish(), this.pickColor(), this.now());
      this.lanterns.push(l);
      this.counters.lanterns++;
      if (this.visibleLantern(l)) this.send('lantern_released', { ...l });
    } else if (r < 0.96) {
      const pool = this.lanterns.filter((l) => this.visibleLantern(l));
      const target = pool[Math.floor(this.rand() * pool.length)];
      if (target) this.likeLantern(target.id);
    } else {
      this.counters.bells++;
      this.send('bell_rung', { force: Math.round((0.35 + this.rand() * 0.55) * 100) / 100, at });
    }
  }

  /** Số người trôi chậm về mục tiêu theo giờ; vài người đi lại giữa các khu. */
  private drift(): void {
    if (!this.connected) return;
    const target = this.targetVisitors();
    if (this.bots.length < target && this.rand() < 0.7) this.bots.push(this.newBot());
    else if (this.bots.length > target && this.rand() < 0.7) this.bots.splice(Math.floor(this.rand() * this.bots.length), 1);
    else if (this.rand() < 0.3) {
      // dao động nhỏ quanh mục tiêu
      if (this.rand() < 0.5 && this.bots.length < this.maxV) this.bots.push(this.newBot());
      else if (this.bots.length > this.minV) this.bots.splice(Math.floor(this.rand() * this.bots.length), 1);
    }
    const moves = Math.min(this.bots.length, 1 + Math.floor(this.rand() * 3));
    for (let i = 0; i < moves; i++) {
      const b = this.bots[Math.floor(this.rand() * this.bots.length)];
      if (!b) continue;
      const links = AREA_INFO[b.area].links;
      b.area = this.rand() < 0.7 && links.length ? (links[Math.floor(this.rand() * links.length)] as AreaId) : this.pickArea();
    }
    this.prune();
    this.sendPresence();
  }

  private targetVisitors(): number {
    const h = new Date(this.now()).getHours();
    const f = HOUR_FACTOR[h] ?? 0.5;
    const base = this.minV + (this.maxV - this.minV) * f;
    const noisy = base + (this.rand() - 0.5) * 6;
    return Math.max(this.minV, Math.min(this.maxV, Math.round(noisy)));
  }

  private onlineCount(): number {
    return this.bots.length + (this.me && this.connected ? 1 : 0);
  }

  private areaCounts(): AreaCounts {
    const c = Object.fromEntries(AREAS.map((a) => [a, 0])) as AreaCounts;
    for (const b of this.bots) c[b.area]++;
    if (this.me && this.connected) c[this.me.area]++;
    return c;
  }

  private room: { code: string; kin: Bot[] } | null = null;

  private sendRoom(): void {
    if (!this.room || !this.me) return;
    const me = this.me;
    this.send('room_state', {
      code: this.room.code,
      members: [{ userId: me.userId, nickname: me.nickname, area: me.area }, ...this.room.kin.map((b) => ({ userId: b.id, nickname: b.nickname, area: b.area }))],
    });
  }

  private sendPresence(): void {
    this.send('presence', { online: this.onlineCount(), areas: this.areaCounts() });
  }

  private prune(): void {
    const t = this.now();
    this.lanterns = this.lanterns.filter((l) => t - Date.parse(l.at) < DAY_MS);
    this.incense = this.incense.filter((i) => t - Date.parse(i.at) < INCENSE_BURN_MS);
  }

  private visibleLantern(l: LanternPayload): boolean {
    return !this.hiddenLanterns.has(l.id) && !(l.userId && this.blockedUsers.has(l.userId));
  }

  // ---------- tiện ích ----------

  private newBot(): Bot {
    return { id: `v-${(++this.seq).toString(36)}${Math.floor(this.rand() * 1e6).toString(36)}`, nickname: randomNickname(this.rand), area: this.pickArea() };
  }

  private pickBot(): Bot | undefined {
    return this.bots[Math.floor(this.rand() * this.bots.length)];
  }

  private pickArea(): AreaId {
    let r = this.rand();
    for (const a of AREAS) {
      r -= AREA_WEIGHTS[a];
      if (r <= 0) return a;
    }
    return 'san';
  }

  private pickWish(): string {
    return MOCK_WISHES[Math.floor(this.rand() * MOCK_WISHES.length)] ?? (MOCK_WISHES[0] as string);
  }

  private pickColor(): string {
    return LANTERN_COLORS[Math.floor(this.rand() * LANTERN_COLORS.length)] ?? 'vang';
  }

  private makeLantern(bot: Bot, text: string, color: string, atMs: number): LanternPayload {
    return {
      id: `l-${(++this.seq).toString(36)}-${Math.floor(this.rand() * 1e8).toString(36)}`,
      text,
      color,
      nickname: bot.nickname,
      at: new Date(atMs).toISOString(),
      likes: 0,
      userId: bot.id,
    };
  }

  private scaled(ms: number): number {
    return Math.max(1, Math.round(ms / this.speed));
  }

  private later(fn: () => void, ms: number): void {
    const h = setTimeout(() => {
      this.timeouts.delete(h);
      fn();
    }, ms);
    this.timeouts.add(h);
  }

  private setStatus(s: NetStatus): void {
    if (this.status === s) return;
    this.status = s;
    for (const cb of [...this.statusListeners]) cb(s);
  }

  private send<K extends keyof S2CEvents>(ev: K, data: S2CEvents[K]): void {
    if (!this.connected) return;
    const set = this.listeners.get(ev);
    if (!set) return;
    for (const cb of [...set]) {
      try {
        cb(data);
      } catch (err) {
        console.error('[mock-server] listener error', ev, err);
      }
    }
  }
}

function hashStr(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
