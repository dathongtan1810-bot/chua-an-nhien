import { io, type Socket } from 'socket.io-client';
import type { NetClient, NetStatus } from './client';
import {
  S2C_EVENT_NAMES,
  normalizeLanternsResponse,
  type C2SEvents,
  type EnterAreaPayload,
  type HelloPayload,
  type LanternPayload,
  type S2CEvents,
} from './protocol';
import { RateLimiter } from '../logic/ratelimit';
import { checkText } from '../logic/filter';

export interface SocketClientOptions {
  /** URL server; bỏ trống = cùng origin với trang. */
  serverUrl?: string;
  fetchTimeoutMs?: number;
  limiter?: RateLimiter;
  /** Cho phép thay io() khi test. */
  ioFactory?: (url: string | undefined, opts: Record<string, unknown>) => Socket;
  fetchImpl?: typeof fetch;
}

type AnyCb = (d: unknown) => void;

export class SocketClient implements NetClient {
  private socket: Socket | null = null;
  private readonly listeners = new Map<string, Set<AnyCb>>();
  private readonly statusListeners = new Set<(s: NetStatus) => void>();
  private status: NetStatus = 'offline';
  private hello: HelloPayload | null = null;
  private lastArea: EnterAreaPayload | null = null;
  /** Server yêu cầu hello xong (nhận welcome) mới nhận sự kiện khác → xếp hàng tới lúc đó. */
  private welcomed = false;
  private pending: [keyof C2SEvents, unknown][] = [];
  private readonly limiter: RateLimiter;
  private readonly serverUrl: string | undefined;
  private readonly fetchTimeoutMs: number;
  private readonly ioFactory: NonNullable<SocketClientOptions['ioFactory']>;
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(opts: SocketClientOptions = {}) {
    this.serverUrl = opts.serverUrl ? opts.serverUrl.replace(/\/+$/, '') : undefined;
    this.fetchTimeoutMs = opts.fetchTimeoutMs ?? 8000;
    this.limiter = opts.limiter ?? new RateLimiter();
    this.ioFactory = opts.ioFactory ?? ((url, o) => (url ? io(url, o) : io(o)));
    this.fetchImpl = opts.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
  }

  get connected(): boolean {
    return this.status === 'online';
  }

  connect(hello: HelloPayload): void {
    this.hello = hello;
    if (this.socket) {
      if (this.socket.connected) this.socket.emit('hello', hello);
      return;
    }
    this.setStatus('connecting');
    const s = this.ioFactory(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    this.socket = s;
    s.on('connect', () => {
      this.welcomed = false;
      this.setStatus('online');
      // (re)gửi hello sau mỗi lần kết nối/kết nối lại; khu đang đứng + hàng đợi gửi khi nhận welcome
      if (this.hello) s.emit('hello', this.hello);
    });
    s.on('welcome', () => {
      this.welcomed = true;
      if (this.lastArea) s.emit('enter_area', this.lastArea);
      const q = this.pending;
      this.pending = [];
      for (const [ev, data] of q) if (ev !== 'enter_area') s.emit(ev, data);
    });
    s.on('disconnect', () => {
      this.setStatus(this.socket && s.active ? 'connecting' : 'offline');
    });
    s.on('connect_error', () => {
      this.setStatus(s.active ? 'connecting' : 'offline');
    });
    for (const name of S2C_EVENT_NAMES) {
      s.on(name, (d: unknown) => this.dispatch(name, d));
    }
  }

  disconnect(): void {
    const s = this.socket;
    this.socket = null;
    if (s) {
      s.removeAllListeners();
      s.disconnect();
    }
    this.setStatus('offline');
  }

  emit<K extends keyof C2SEvents>(ev: K, data: C2SEvents[K]): void {
    if (ev === 'hello') this.hello = data as HelloPayload;
    if (ev === 'enter_area') this.lastArea = data as EnterAreaPayload;

    if (ev === 'release_lantern') {
      const text = (data as C2SEvents['release_lantern']).text;
      const r = checkText(text);
      if (!r.ok) {
        this.dispatch('error', { code: 'content_rejected', message: r.reason ?? 'rejected' });
        return;
      }
    }
    if (ev !== 'hello') {
      const rl = this.limiter.tryConsume(ev);
      if (!rl.ok) {
        this.dispatch('rate_limited', { event: ev, retryAfterMs: rl.retryAfterMs });
        return;
      }
    }
    const s = this.socket;
    // Không đệm hành động khi mất kết nối (hello/enter_area sẽ gửi lại khi reconnect)
    if (!s || !s.connected) return;
    if (ev !== 'hello' && !this.welcomed) {
      // đã kết nối nhưng server chưa xử lý xong hello: giữ lại (tối đa 10), enter_area gửi lại khi welcome
      if (ev !== 'enter_area' && this.pending.length < 10) this.pending.push([ev, data]);
      return;
    }
    s.emit(ev, data);
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

  async fetchLanterns(since?: string): Promise<LanternPayload[]> {
    const q = since ? `?since=${encodeURIComponent(since)}` : '';
    try {
      return normalizeLanternsResponse(await this.request('GET', `/api/lanterns${q}`));
    } catch {
      return [];
    }
  }

  async stats(): Promise<unknown> {
    try {
      return await this.request('GET', '/api/stats');
    } catch {
      return null;
    }
  }

  async health(): Promise<boolean> {
    try {
      const r = (await this.request('GET', '/api/health')) as { ok?: unknown } | null;
      return !!r && r.ok === true;
    } catch {
      return false;
    }
  }

  async deleteMyData(deviceId: string): Promise<boolean> {
    try {
      const r = (await this.request('POST', '/api/me/delete', { deviceId })) as { ok?: unknown } | null;
      return !!r && r.ok !== false;
    } catch {
      return false;
    }
  }

  // ---------- nội bộ ----------

  private setStatus(s: NetStatus): void {
    if (this.status === s) return;
    this.status = s;
    for (const cb of [...this.statusListeners]) cb(s);
  }

  private dispatch(name: string, d: unknown): void {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const cb of [...set]) {
      try {
        cb(d);
      } catch (err) {
        console.error('[net] listener error', name, err);
      }
    }
  }

  private async request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown> {
    if (!this.fetchImpl) throw new Error('fetch unavailable');
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl?.abort(), this.fetchTimeoutMs);
    try {
      const res = await this.fetchImpl(`${this.serverUrl ?? ''}${path}`, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl?.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return text ? (JSON.parse(text) as unknown) : null;
    } finally {
      clearTimeout(timer);
    }
  }
}
