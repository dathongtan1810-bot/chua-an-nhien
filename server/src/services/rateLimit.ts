/**
 * Bộ giới hạn tần suất trong bộ nhớ.
 *  - SlidingWindowLimiter: tối đa N lần trong cửa sổ W ms cho mỗi khoá.
 *  - CooldownLimiter: tối thiểu C ms giữa hai lần cho mỗi khoá.
 * Đồng hồ có thể tiêm vào để test.
 */
export type Clock = () => number;

export interface LimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: Clock = Date.now,
  ) {}

  /** Kiểm tra và ghi nhận một lần nếu được phép. */
  hit(key: string): LimitResult {
    const t = this.now();
    const arr = (this.hits.get(key) ?? []).filter((x) => x > t - this.windowMs);
    if (arr.length >= this.max) {
      this.hits.set(key, arr);
      return { ok: false, retryAfterMs: Math.max(1, arr[0]! + this.windowMs - t) };
    }
    arr.push(t);
    this.hits.set(key, arr);
    return { ok: true, retryAfterMs: 0 };
  }

  peek(key: string): LimitResult {
    const t = this.now();
    const arr = (this.hits.get(key) ?? []).filter((x) => x > t - this.windowMs);
    if (arr.length >= this.max) return { ok: false, retryAfterMs: Math.max(1, arr[0]! + this.windowMs - t) };
    return { ok: true, retryAfterMs: 0 };
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  /** Dọn khoá hết hạn để không rò rỉ bộ nhớ. */
  sweep(): void {
    const t = this.now();
    for (const [k, arr] of this.hits) {
      if (!arr.length || arr[arr.length - 1]! <= t - this.windowMs) this.hits.delete(k);
    }
  }

  get size(): number {
    return this.hits.size;
  }
}

export class CooldownLimiter {
  private last = new Map<string, number>();
  constructor(
    private readonly cooldownMs: number,
    private readonly now: Clock = Date.now,
  ) {}

  check(key: string): LimitResult {
    const t = this.now();
    const l = this.last.get(key);
    if (l !== undefined && t - l < this.cooldownMs) return { ok: false, retryAfterMs: this.cooldownMs - (t - l) };
    return { ok: true, retryAfterMs: 0 };
  }

  commit(key: string): void {
    this.last.set(key, this.now());
  }

  hit(key: string): LimitResult {
    const r = this.check(key);
    if (r.ok) this.commit(key);
    return r;
  }

  sweep(): void {
    const t = this.now();
    for (const [k, l] of this.last) if (t - l >= this.cooldownMs) this.last.delete(k);
  }

  get size(): number {
    return this.last.size;
  }
}
