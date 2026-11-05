import { ONLINE_FEATURES, SERVER_URL, USE_MOCK_SERVER } from '../config';
import type { AreaId } from '../core/areas';
import { AREAS } from '../core/areas';
import { checkText } from '../logic/filter';
import { RateLimiter, DEFAULT_RATE_RULES } from '../logic/ratelimit';
import { createNetClient, type NetClient, type NetStatus } from './client';
import { ROOM_CODE_RE, type AreaCounts, type IncenseLitPayload, type LanternPayload, type RoomStatePayload, type S2CEvents } from './protocol';

/** Thời gian một nén hương cháy (ms) — ~3 phút. */
export const INCENSE_BURN_MS = 3 * 60 * 1000;

export type NetEvent =
  | { type: 'status'; status: NetStatus }
  | { type: 'presence'; online: number; areas: AreaCounts }
  | { type: 'incense'; entry: IncenseLitPayload; mine: boolean }
  | { type: 'bell'; force: number }
  | { type: 'lantern'; lantern: LanternPayload; mine: boolean }
  | { type: 'lanternRemoved'; id: string }
  | { type: 'rateLimited'; event: string; retryAfterMs: number }
  | { type: 'error'; code: string; message: string }
  | { type: 'nickname'; nickname: string }
  | { type: 'room'; room: RoomStatePayload | null };

type Listener = (e: NetEvent) => void;

export type SendResult = { ok: true } | { ok: false; reason: string; retryAfterMs?: number };

const emptyAreas = (): AreaCounts => Object.fromEntries(AREAS.map((a) => [a, 0])) as AreaCounts;

/** Lớp dịch vụ online cho game: giữ trạng thái chung (presence, hương đang cháy, đèn trên sông). */
export class NetService {
  private client: NetClient | null = null;
  private listeners = new Set<Listener>();
  private unsubs: (() => void)[] = [];
  private limiter = new RateLimiter(DEFAULT_RATE_RULES);
  status: NetStatus = 'offline';
  userId = '';
  online = 0;
  areas: AreaCounts = emptyAreas();
  incense: IncenseLitPayload[] = [];
  lanterns = new Map<string, LanternPayload>();
  /** id đèn do chính mình thả (để đánh dấu "Đèn của bạn"). */
  myLanternTexts = new Set<string>();
  blocked = new Set<string>();
  hidden = new Set<string>();
  private area: AreaId = 'cong';
  room: RoomStatePayload | null = null;
  private roomCode: string | null = (() => {
    try {
      return localStorage.getItem('chua-an-nhien:room');
    } catch {
      return null;
    }
  })();
  private hello: { deviceId: string; nickname: string; lang: string } | null = null;

  get enabled(): boolean {
    return ONLINE_FEATURES && this.client !== null;
  }

  start(hello: { deviceId: string; nickname: string; lang: string }, enabled: boolean, blocked: string[]): void {
    this.stop();
    this.hello = hello;
    blocked.forEach((b) => this.blocked.add(b));
    if (!ONLINE_FEATURES || !enabled) {
      this.setStatus('offline');
      return;
    }
    const c = createNetClient({ online: true, serverUrl: SERVER_URL, useMock: USE_MOCK_SERVER });
    this.client = c;
    const on = <K extends keyof S2CEvents>(ev: K, cb: (d: S2CEvents[K]) => void) => this.unsubs.push(c.on(ev, cb));
    this.unsubs.push(c.onStatus((s) => this.setStatus(s)));
    on('welcome', (w) => {
      this.userId = w.userId;
      if (w.nickname && w.nickname !== hello.nickname) this.emit({ type: 'nickname', nickname: w.nickname });
      this.online = w.online;
      this.areas = { ...emptyAreas(), ...w.areas };
      this.incense = w.incense.filter((i) => !this.blocked.has(i.userId));
      this.emit({ type: 'presence', online: this.online, areas: this.areas });
      c.emit('enter_area', { area: this.area });
      if (this.roomCode) c.emit('room_join', { code: this.roomCode });
      void this.refreshLanterns();
    });
    on('presence', (p) => {
      this.online = p.online;
      this.areas = { ...emptyAreas(), ...p.areas };
      this.emit({ type: 'presence', online: p.online, areas: this.areas });
    });
    on('incense_lit', (i) => {
      if (this.blocked.has(i.userId)) return;
      this.incense.push(i);
      this.pruneIncense();
      this.emit({ type: 'incense', entry: i, mine: i.userId === this.userId });
    });
    on('bell_rung', (b) => this.emit({ type: 'bell', force: b.force }));
    on('lantern_released', (l) => this.addLantern(l));
    on('lantern_removed', (r) => {
      this.lanterns.delete(r.id);
      this.emit({ type: 'lanternRemoved', id: r.id });
    });
    on('lantern_liked', (x) => {
      const l = this.lanterns.get(x.id);
      if (l) l.likes = x.likes;
    });
    on('room_state', (r) => {
      this.room = r;
      this.saveRoom(r.code);
      this.emit({ type: 'room', room: r });
    });
    on('room_left', () => {
      this.room = null;
      this.saveRoom(null);
      this.emit({ type: 'room', room: null });
    });
    on('rate_limited', (r) => this.emit({ type: 'rateLimited', event: String(r.event), retryAfterMs: r.retryAfterMs }));
    on('error', (e) => this.emit({ type: 'error', code: String(e.code), message: e.message }));
    c.connect({ deviceId: hello.deviceId, nickname: hello.nickname, lang: hello.lang });
  }

  stop(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.client?.disconnect();
    this.client = null;
    this.online = 0;
    this.areas = emptyAreas();
    this.incense = [];
    this.lanterns.clear();
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit(e: NetEvent): void {
    for (const l of this.listeners) l(e);
  }

  private setStatus(s: NetStatus): void {
    this.status = s;
    this.emit({ type: 'status', status: s });
  }

  private addLantern(l: LanternPayload): void {
    if (this.hidden.has(l.id) || (l.userId && this.blocked.has(l.userId))) return;
    const mine = (!!l.userId && l.userId === this.userId) || (l.nickname === this.hello?.nickname && this.myLanternTexts.has(l.text));
    const existed = this.lanterns.has(l.id);
    this.lanterns.set(l.id, l);
    if (!existed) this.emit({ type: 'lantern', lantern: l, mine });
  }

  async refreshLanterns(): Promise<void> {
    if (!this.client) return;
    try {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const list = await this.client.fetchLanterns(since);
      list.forEach((l) => this.addLantern(l));
    } catch {
      /* ngoại tuyến */
    }
  }

  /** Hương còn đang cháy (≤ 3 phút). */
  burningIncense(now = Date.now()): IncenseLitPayload[] {
    this.pruneIncense(now);
    return this.incense;
  }

  private pruneIncense(now = Date.now()): void {
    this.incense = this.incense.filter((i) => now - Date.parse(i.at) < INCENSE_BURN_MS).slice(-60);
  }

  enterArea(area: AreaId): void {
    this.area = area;
    if (this.client && this.limiter.tryConsume('enter_area').ok) this.client.emit('enter_area', { area });
  }

  lightIncense(count: number, nickname = this.hello?.nickname ?? ''): void {
    // ngoại tuyến: tự giữ hương của mình để lư vẫn còn hương khi quay lại khu
    if (!this.client) this.incense.push({ userId: 'me', nickname, count, at: new Date().toISOString() });
    this.client?.emit('light_incense', { count });
  }

  ringBell(force: number): void {
    this.client?.emit('ring_bell', { force: Math.max(0, Math.min(1, force)) });
  }

  releaseLantern(text: string, color: string): SendResult {
    const check = checkText(text);
    if (!check.ok) return { ok: false, reason: check.reason ?? 'rejected' };
    const rl = this.limiter.tryConsume('release_lantern');
    if (!rl.ok) return { ok: false, reason: 'rate', retryAfterMs: rl.retryAfterMs };
    this.myLanternTexts.add(text.trim());
    this.client?.emit('release_lantern', { text: text.trim(), color });
    return { ok: true };
  }

  likeLantern(id: string): void {
    const l = this.lanterns.get(id);
    if (l) l.likes += 1;
    this.client?.emit('like_lantern', { id });
  }

  reportLantern(id: string, reason: string): void {
    this.hidden.add(id);
    this.lanterns.delete(id);
    this.client?.emit('report', { type: 'lantern', id, reason });
    this.emit({ type: 'lanternRemoved', id });
  }

  blockUser(userId: string): void {
    this.blocked.add(userId);
    this.client?.emit('block_user', { userId });
    for (const [id, l] of this.lanterns) {
      if (l.userId === userId) {
        this.lanterns.delete(id);
        this.emit({ type: 'lanternRemoved', id });
      }
    }
    this.incense = this.incense.filter((i) => i.userId !== userId);
  }

  private saveRoom(code: string | null): void {
    this.roomCode = code;
    try {
      if (code) localStorage.setItem('chua-an-nhien:room', code);
      else localStorage.removeItem('chua-an-nhien:room');
    } catch {
      /* ignore */
    }
  }

  /** Phòng riêng "đi chùa cùng gia đình" (tính năng mở rộng của server). */
  createRoom(): void {
    this.client?.emit('room_create', {});
  }

  joinRoom(code: string): boolean {
    const c = code.trim().toUpperCase();
    if (!ROOM_CODE_RE.test(c)) return false;
    this.saveRoom(c);
    this.client?.emit('room_join', { code: c });
    return true;
  }

  leaveRoom(): void {
    this.client?.emit('room_leave', {});
    this.room = null;
    this.saveRoom(null);
    this.emit({ type: 'room', room: null });
  }

  async deleteMyData(deviceId: string): Promise<boolean> {
    if (!this.client) return true;
    return this.client.deleteMyData(deviceId);
  }
}

export const net = new NetService();
