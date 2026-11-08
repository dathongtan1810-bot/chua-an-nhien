import { hydrate, initialState, reduce, type Action, type GameState, type Reward } from './state';
import { vnDateKey } from '../logic/dates';
import { randomNickname } from '../logic/nickname';

const KEY = 'chua-an-nhien:state:v1';
type Listener = (s: GameState, reward: Reward, action: Action) => void;

function newDeviceId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'd-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load(): GameState {
  const lang = 'vi' as const; // tiếng Việt mặc định; đổi trong Cài đặt
  const fresh = initialState(newDeviceId(), randomNickname(), vnDateKey(), lang);
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? hydrate(JSON.parse(raw), fresh) : fresh;
  } catch {
    return fresh;
  }
}

class Store {
  state: GameState = load();
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  dispatch(action: Action): Reward {
    const { state, reward } = reduce(this.state, action);
    this.state = state;
    this.scheduleSave();
    for (const l of this.listeners) l(state, reward, action);
    return reward;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, 300);
  }

  saveNow(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      /* bộ nhớ đầy / chế độ riêng tư */
    }
  }

  /** "Xóa dữ liệu của tôi": tạo lại danh tính mới. */
  reset(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    const lang = this.state.lang;
    this.state = initialState(newDeviceId(), randomNickname(), vnDateKey(), lang);
    this.saveNow();
  }
}

export const store = new Store();
