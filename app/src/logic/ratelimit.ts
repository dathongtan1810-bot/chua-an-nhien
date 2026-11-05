/** Token-bucket rate limiter phía client (và mock server). */

export interface RateRule {
  /** Số token tối đa trong bucket */
  capacity: number;
  /** Thời gian để nạp đầy lại toàn bộ bucket (ms) */
  refillMs: number;
}

export type RateResult = { ok: true } | { ok: false; retryAfterMs: number };

export const DEFAULT_RATE_RULES: Record<string, RateRule> = {
  light_incense: { capacity: 3, refillMs: 60_000 },
  ring_bell: { capacity: 1, refillMs: 8_000 },
  release_lantern: { capacity: 3, refillMs: 10 * 60_000 },
  like_lantern: { capacity: 30, refillMs: 60_000 },
  report: { capacity: 10, refillMs: 60 * 60_000 },
  enter_area: { capacity: 20, refillMs: 10_000 },
};

interface Bucket {
  tokens: number;
  last: number;
}

export class RateLimiter {
  private readonly rules: Record<string, RateRule>;
  private readonly now: () => number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(rules: Record<string, RateRule> = DEFAULT_RATE_RULES, now: () => number = () => Date.now()) {
    this.rules = rules;
    this.now = now;
  }

  /** Thử tiêu 1 token. Key không có luật → luôn cho phép. */
  tryConsume(key: string): RateResult {
    const rule = this.rules[key];
    if (!rule || rule.capacity <= 0) return { ok: true };
    const t = this.now();
    const rate = rule.capacity / rule.refillMs; // token mỗi ms
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: rule.capacity, last: t };
      this.buckets.set(key, b);
    } else {
      const elapsed = Math.max(0, t - b.last);
      b.tokens = Math.min(rule.capacity, b.tokens + elapsed * rate);
      b.last = t;
    }
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return { ok: true };
    }
    const retryAfterMs = Math.max(1, Math.ceil((1 - b.tokens) / rate));
    return { ok: false, retryAfterMs };
  }

  reset(key?: string): void {
    if (key === undefined) this.buckets.clear();
    else this.buckets.delete(key);
  }
}
