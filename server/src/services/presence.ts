import { AREAS, emptyAreaCounts, type Area, type AreaCounts } from '../../../shared/protocol.js';

interface Conn {
  userId: string;
  area: Area | null;
  at: number;
}

/**
 * Theo dõi người online. Đếm theo userId duy nhất (một thiết bị mở nhiều tab = 1 người);
 * khu của người dùng = khu của kết nối cập nhật gần nhất.
 */
export class Presence {
  private conns = new Map<string, Conn>();
  private dirty = true;
  private cache: { online: number; areas: AreaCounts } = { online: 0, areas: emptyAreaCounts() };

  add(socketId: string, userId: string): void {
    this.conns.set(socketId, { userId, area: null, at: Date.now() });
    this.dirty = true;
  }

  setArea(socketId: string, area: Area): boolean {
    const c = this.conns.get(socketId);
    if (!c) return false;
    if (c.area !== area) this.dirty = true;
    c.area = area;
    c.at = Date.now();
    return true;
  }

  remove(socketId: string): Conn | undefined {
    const c = this.conns.get(socketId);
    if (c) {
      this.conns.delete(socketId);
      this.dirty = true;
    }
    return c;
  }

  get(socketId: string): Conn | undefined {
    return this.conns.get(socketId);
  }

  /** Xoá các kết nối không còn sống (theo hàm kiểm tra của transport). */
  sweep(isAlive: (socketId: string) => boolean): number {
    let n = 0;
    for (const id of this.conns.keys()) {
      if (!isAlive(id)) {
        this.conns.delete(id);
        n++;
      }
    }
    if (n) this.dirty = true;
    return n;
  }

  /** Có thay đổi kể từ lần snapshot trước? (dùng để chỉ phát presence khi cần) */
  get changed(): boolean {
    return this.dirty;
  }

  snapshot(): { online: number; areas: AreaCounts } {
    if (!this.dirty) return this.cache;
    const latest = new Map<string, Conn>();
    for (const c of this.conns.values()) {
      const prev = latest.get(c.userId);
      if (!prev || c.at >= prev.at) latest.set(c.userId, c);
    }
    const areas = emptyAreaCounts();
    for (const c of latest.values()) if (c.area) areas[c.area]++;
    this.cache = { online: latest.size, areas };
    this.dirty = false;
    return this.cache;
  }

  areaOf(userId: string): Area | null {
    let best: Conn | undefined;
    for (const c of this.conns.values()) if (c.userId === userId && (!best || c.at >= best.at)) best = c;
    return best?.area ?? null;
  }

  get connections(): number {
    return this.conns.size;
  }
}

export { AREAS };
