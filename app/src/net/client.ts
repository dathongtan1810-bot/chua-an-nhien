import type { C2SEvents, HelloPayload, LanternPayload, S2CEvents } from './protocol';
import { SocketClient } from './socket-client';
import { MockServerClient } from './mock-server';

export type NetStatus = 'offline' | 'connecting' | 'online';

export interface NetClient {
  readonly connected: boolean;
  connect(hello: HelloPayload): void;
  disconnect(): void;
  emit<K extends keyof C2SEvents>(ev: K, data: C2SEvents[K]): void;
  /** Đăng ký nghe sự kiện từ server; trả về hàm huỷ đăng ký. */
  on<K extends keyof S2CEvents>(ev: K, cb: (d: S2CEvents[K]) => void): () => void;
  /** Gọi cb ngay với trạng thái hiện tại, sau đó mỗi khi đổi. */
  onStatus(cb: (s: NetStatus) => void): () => void;
  fetchLanterns(since?: string): Promise<LanternPayload[]>;
  stats(): Promise<unknown>;
  deleteMyData(deviceId: string): Promise<boolean>;
}

export interface CreateNetClientOptions {
  online: boolean;
  serverUrl?: string;
  useMock: boolean;
}

/** Client rỗng khi chơi offline: không làm gì, luôn 'offline'. */
export class NullClient implements NetClient {
  readonly connected = false;
  connect(_hello: HelloPayload): void {}
  disconnect(): void {}
  emit<K extends keyof C2SEvents>(_ev: K, _data: C2SEvents[K]): void {}
  on<K extends keyof S2CEvents>(_ev: K, _cb: (d: S2CEvents[K]) => void): () => void {
    return () => {};
  }
  onStatus(cb: (s: NetStatus) => void): () => void {
    cb('offline');
    return () => {};
  }
  fetchLanterns(_since?: string): Promise<LanternPayload[]> {
    return Promise.resolve([]);
  }
  stats(): Promise<unknown> {
    return Promise.resolve(null);
  }
  deleteMyData(_deviceId: string): Promise<boolean> {
    // không có dữ liệu nào trên server
    return Promise.resolve(true);
  }
}

export function createNetClient(opts: CreateNetClientOptions): NetClient {
  if (!opts.online) return new NullClient();
  if (opts.useMock) return new MockServerClient();
  return new SocketClient({ serverUrl: opts.serverUrl });
}
