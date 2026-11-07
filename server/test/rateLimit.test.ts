import { describe, expect, it } from 'vitest';
import { CooldownLimiter, SlidingWindowLimiter } from '../src/services/rateLimit.js';

describe('SlidingWindowLimiter', () => {
  it('cho N lần trong cửa sổ, báo retryAfter đúng', () => {
    let t = 1000;
    const l = new SlidingWindowLimiter(3, 10_000, () => t);
    expect(l.hit('a').ok).toBe(true);
    t += 1000;
    expect(l.hit('a').ok).toBe(true);
    expect(l.hit('a').ok).toBe(true);
    const r = l.hit('a');
    expect(r.ok).toBe(false);
    expect(r.retryAfterMs).toBe(9000);
    expect(l.hit('b').ok).toBe(true); // khoá độc lập
    t += 9000;
    expect(l.hit('a').ok).toBe(true);
  });
  it('peek không ghi nhận; sweep dọn khoá cũ', () => {
    let t = 0;
    const l = new SlidingWindowLimiter(1, 100, () => t);
    expect(l.peek('a').ok).toBe(true);
    expect(l.peek('a').ok).toBe(true);
    l.hit('a');
    expect(l.peek('a').ok).toBe(false);
    t = 500;
    l.sweep();
    expect(l.size).toBe(0);
  });
});

describe('CooldownLimiter', () => {
  it('khoảng tối thiểu giữa 2 lần', () => {
    let t = 0;
    const c = new CooldownLimiter(20_000, () => t);
    expect(c.hit('u').ok).toBe(true);
    t = 5000;
    expect(c.hit('u')).toEqual({ ok: false, retryAfterMs: 15_000 });
    expect(c.check('v').ok).toBe(true);
    t = 20_000;
    expect(c.hit('u').ok).toBe(true);
    t = 50_000;
    c.sweep();
    expect(c.size).toBe(0);
  });
});
