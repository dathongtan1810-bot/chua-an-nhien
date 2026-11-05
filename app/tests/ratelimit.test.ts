import { describe, expect, it } from 'vitest';
import { DEFAULT_RATE_RULES, RateLimiter } from '../src/logic/ratelimit';

describe('RateLimiter', () => {
  it('allows up to capacity then rejects with retryAfterMs', () => {
    let t = 0;
    const rl = new RateLimiter({ x: { capacity: 3, refillMs: 60_000 } }, () => t);
    expect(rl.tryConsume('x').ok).toBe(true);
    expect(rl.tryConsume('x').ok).toBe(true);
    expect(rl.tryConsume('x').ok).toBe(true);
    const r = rl.tryConsume('x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterMs).toBe(20_000);
    t = 19_999;
    expect(rl.tryConsume('x').ok).toBe(false);
    t = 20_000;
    expect(rl.tryConsume('x').ok).toBe(true);
    expect(rl.tryConsume('x').ok).toBe(false);
  });

  it('refills fully after refillMs but not above capacity', () => {
    let t = 0;
    const rl = new RateLimiter({ b: { capacity: 2, refillMs: 1000 } }, () => t);
    rl.tryConsume('b');
    rl.tryConsume('b');
    t = 100_000;
    expect(rl.tryConsume('b').ok).toBe(true);
    expect(rl.tryConsume('b').ok).toBe(true);
    expect(rl.tryConsume('b').ok).toBe(false);
  });

  it('keys are independent and unknown keys always pass', () => {
    const t = 0;
    const rl = new RateLimiter(DEFAULT_RATE_RULES, () => t);
    expect(rl.tryConsume('ring_bell').ok).toBe(true);
    const r = rl.tryConsume('ring_bell');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterMs).toBe(20000);
    expect(rl.tryConsume('light_incense').ok).toBe(true);
    for (let i = 0; i < 100; i++) expect(rl.tryConsume('unknown').ok).toBe(true);
  });

  it('has the default rules', () => {
    expect(DEFAULT_RATE_RULES).toMatchObject({
      light_incense: { capacity: 1, refillMs: 15_000 },
      ring_bell: { capacity: 1, refillMs: 20_000 },
      release_lantern: { capacity: 3, refillMs: 3_600_000 },
      like_lantern: { capacity: 30, refillMs: 60_000 },
      report: { capacity: 10, refillMs: 3_600_000 },
      enter_area: { capacity: 20, refillMs: 10_000 },
    });
  });
});
